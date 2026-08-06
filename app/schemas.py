from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator


Bucket = Literal["roles", "modes", "steps"]


class LibraryObject(BaseModel):
    bucket: Bucket
    object_id: str
    name: str
    description: str = ""
    content: str
    enabled: bool = True
    step_inputs: list[str] = Field(default_factory=list)


class LibraryObjectWrite(BaseModel):
    name: str = Field(min_length=1)
    description: str = ""
    content: str = Field(min_length=1)
    enabled: bool = True
    step_inputs: list[str] = Field(default_factory=list)


class StructuredInput(BaseModel):
    contextual_data: str = ""
    instructions_definition: str = ""
    goals_success_definition: str = ""
    payload: str = Field(min_length=1)


class RunRequest(BaseModel):
    run_id: str | None = Field(
        default=None,
        pattern=r"^[A-Za-z0-9]+$",
    )
    role_id: str
    mode_id: str
    pre_step_ids: list[str] = Field(default_factory=list)
    step_ids: list[str] = Field(min_length=1)
    post_step_ids: list[str] = Field(default_factory=list)
    loops: int = Field(default=1, ge=1)
    structured_input: StructuredInput
    model: str | None = None

    @field_validator(
        "pre_step_ids",
        "step_ids",
        "post_step_ids",
    )
    @classmethod
    def reject_duplicate_steps(cls, value: list[str]) -> list[str]:
        if len(value) != len(set(value)):
            raise ValueError(
                "Duplicate Step IDs are not supported within one sequence"
            )
        return value


class StepResult(BaseModel):
    call_index: int
    phase: Literal["pre", "loop", "post"]
    loop_number: int
    step_index: int
    step_id: str
    step_name: str
    input_session_payload: str
    output_session_payload: str
    trace_output: str = ""
    trace_markdown: str = ""
    payload_returned: bool = True
    system_prompt: str = ""
    user_prompt: str


class RunResult(BaseModel):
    run_id: str
    status: Literal[
        "queued",
        "running",
        "completed",
        "failed",
        "interrupted",
    ]
    created_at: str
    updated_at: str
    role_id: str
    mode_id: str
    pre_step_ids: list[str]
    step_ids: list[str]
    post_step_ids: list[str]
    model: str
    loops: int
    original_payload: str
    final_session_payload: str
    steps: list[StepResult]
    current_phase: Literal[
        "pre",
        "loop",
        "post",
    ] | None = None
    current_loop: int | None = None
    current_step_index: int | None = None
    current_step_id: str | None = None
    current_step_name: str | None = None
    current_call_index: int | None = None
    error: str | None = None
    error_type: str | None = None
