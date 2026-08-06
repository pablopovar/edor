from pathlib import Path
import xml.etree.ElementTree as ET

import pytest

from app.library import LibraryRepository
from app.model_client import ModelTurn
from app.orchestrator import EdOrOrchestrator
from app.schemas import LibraryObjectWrite, RunRequest, StructuredInput


def cdata(value: str) -> str:
    return value.replace("]]>", "]]]]><![CDATA[>")


def xml_result(trace: str, material: str) -> ModelTurn:
    return ModelTurn(
        content=(
            "<edor_step_result>"
            f"<trace_output><![CDATA[{cdata(trace)}]]></trace_output>"
            f"<material><![CDATA[{cdata(material)}]]></material>"
            "</edor_step_result>"
        )
    )


class RecordingModelClient:
    def __init__(self, responses=None):
        self.calls = []
        self.responses = list(responses or [])

    async def generate(self, *, model: str, messages: list[dict]) -> ModelTurn:
        self.calls.append({"model": model, "messages": messages})
        if self.responses:
            return self.responses.pop(0)
        call_number = len(self.calls)
        return xml_result(
            f"trace-{call_number}",
            f"output-{call_number}",
        )


def add_object(repository, bucket, object_id, name, content):
    repository.save(
        bucket,
        object_id,
        LibraryObjectWrite(name=name, content=content),
    )


def build_orchestrator(tmp_path, client, step_count=2):
    repository = LibraryRepository(tmp_path / "library")
    add_object(repository, "roles", "role", "Writer", "ROLE DEFINITION")
    add_object(repository, "modes", "mode", "Analytic", "MODE DEFINITION")
    add_object(repository, "steps", "one", "First", "FIRST EXECUTION LOGIC")
    if step_count == 2:
        add_object(repository, "steps", "two", "Second", "SECOND EXECUTION LOGIC")
    return EdOrOrchestrator(
        library=repository,
        model_client=client,
        runs_dir=tmp_path / "runs",
        default_model="test-model",
    )


def request(step_count=2, loops=2, payload="ORIGINAL"):
    return RunRequest(
        role_id="role",
        mode_id="mode",
        step_ids=["one", "two"] if step_count == 2 else ["one"],
        loops=loops,
        structured_input=StructuredInput(
            contextual_data="CONTEXT",
            instructions_definition="INSTRUCTIONS",
            goals_success_definition="SUCCESS",
            payload=payload,
        ),
    )


def turn_material(prompt: str) -> str:
    root = ET.fromstring(prompt)
    element = root.find("./context-document/material")
    assert element is not None
    return element.text.strip()


@pytest.mark.asyncio
async def test_sequence_and_loops_chain_only_structured_material(tmp_path: Path):
    client = RecordingModelClient()
    orchestrator = build_orchestrator(tmp_path, client)

    result = await orchestrator.execute(request())

    assert result.status == "completed"
    assert len(client.calls) == 4
    prompts = [call["messages"][0]["content"] for call in client.calls]

    for call, prompt in zip(client.calls, prompts):
        assert [message["role"] for message in call["messages"]] == ["user"]
        root = ET.fromstring(prompt)
        assert root.tag == "documents"
        assert root.find("./context-document/specialist") is not None
        assert root.find("./context-document/material") is not None
        assert root.find("./context-document/response-contract") is not None
        assert root.find("./observable-document/inert-context") is not None
        assert "ROLE DEFINITION" in prompt
        assert "MODE DEFINITION" in prompt
        assert "return_payload" not in prompt
        assert "<<<EDOR_MATERIAL>>>" not in prompt

    assert turn_material(prompts[0]) == "## The Material\n\nORIGINAL"
    assert turn_material(prompts[1]) == "## The Material\n\noutput-1"
    assert turn_material(prompts[2]) == "## The Material\n\noutput-2"
    assert turn_material(prompts[3]) == "## The Material\n\noutput-3"
    assert "FIRST EXECUTION LOGIC" in prompts[0]
    assert "SECOND EXECUTION LOGIC" not in prompts[0]
    assert "SECOND EXECUTION LOGIC" in prompts[1]
    assert "FIRST EXECUTION LOGIC" not in prompts[1]

    assert result.final_session_payload == "output-4"
    assert [step.trace_output for step in result.steps] == [
        "trace-1",
        "trace-2",
        "trace-3",
        "trace-4",
    ]
    assert [step.loop_number for step in result.steps] == [1, 1, 2, 2]
    assert [step.step_index for step in result.steps] == [1, 2, 1, 2]


@pytest.mark.asyncio
async def test_structured_trace_and_material_are_separated(tmp_path: Path):
    client = RecordingModelClient([
        xml_result("Visible explanation.", "REFORMULATED"),
    ])
    orchestrator = build_orchestrator(tmp_path, client, step_count=1)

    result = await orchestrator.execute(request(step_count=1, loops=1))

    assert result.status == "completed"
    assert result.final_session_payload == "REFORMULATED"
    assert result.steps[0].trace_output == "Visible explanation."
    assert result.steps[0].output_session_payload == "REFORMULATED"
    assert result.steps[0].payload_returned is True


@pytest.mark.asyncio
async def test_invalid_xml_gets_one_same_conversation_repair(tmp_path: Path):
    client = RecordingModelClient([
        ModelTurn(content="Initial explanation without XML."),
        xml_result("Initial explanation without XML.", "REPAIRED"),
    ])
    orchestrator = build_orchestrator(tmp_path, client, step_count=1)

    result = await orchestrator.execute(request(step_count=1, loops=1))

    assert result.status == "completed"
    assert result.final_session_payload == "REPAIRED"
    assert result.steps[0].trace_output == "Initial explanation without XML."
    assert len(client.calls) == 2
    retry_messages = client.calls[1]["messages"]
    assert [message["role"] for message in retry_messages] == [
        "user",
        "assistant",
        "user",
    ]
    assert retry_messages[1]["content"] == "Initial explanation without XML."
    assert "Do not perform the Mission again" in retry_messages[2]["content"]
    assert "<edor_step_result>" in retry_messages[2]["content"]


@pytest.mark.asyncio
async def test_invalid_xml_twice_fails_before_next_step(tmp_path: Path):
    client = RecordingModelClient([
        ModelTurn(content="First invalid response."),
        ModelTurn(content="Second invalid response."),
    ])
    orchestrator = build_orchestrator(tmp_path, client)

    result = await orchestrator.execute(request(loops=1))

    assert result.status == "failed"
    assert len(client.calls) == 2
    assert len(result.steps) == 1
    assert result.steps[0].step_id == "one"
    assert result.steps[0].payload_returned is False
    assert "Attempt 1:\nFirst invalid response." in result.steps[0].trace_output
    assert "Attempt 2:\nSecond invalid response." in result.steps[0].trace_output
    assert result.final_session_payload == "ORIGINAL"
    assert "valid <edor_step_result>" in result.error
    assert "stopped before the next Step" in result.error


@pytest.mark.asyncio
async def test_turn_document_preserves_xml_significant_material(tmp_path: Path):
    source_material = "A ]]> boundary, <tag>, and A & B."
    client = RecordingModelClient([xml_result("", "DONE")])
    orchestrator = build_orchestrator(tmp_path, client, step_count=1)

    result = await orchestrator.execute(
        request(step_count=1, loops=1, payload=source_material)
    )

    assert result.status == "completed"
    prompt = client.calls[0]["messages"][0]["content"]
    assert turn_material(prompt) == "## The Material\n\n" + source_material


def test_step_result_rejects_nested_material_elements(tmp_path: Path):
    client = RecordingModelClient()
    orchestrator = build_orchestrator(tmp_path, client, step_count=1)

    with pytest.raises(ValueError, match="CDATA"):
        orchestrator._parse_step_result(
            "<edor_step_result>"
            "<trace_output>Trace</trace_output>"
            "<material><h1>Nested</h1></material>"
            "</edor_step_result>"
        )
