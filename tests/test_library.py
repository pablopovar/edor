from pathlib import Path

from app.library import LibraryRepository
from app.schemas import LibraryObjectWrite


def test_file_is_library_object(tmp_path: Path):
    repository = LibraryRepository(tmp_path)
    repository.save(
        "steps",
        "test-step",
        LibraryObjectWrite(
            name="Test Step",
            description="A test object",
            content="Transform the payload.",
            enabled=True,
        ),
    )

    object_ = repository.get("steps", "test-step")
    assert object_.object_id == "test-step"
    assert object_.name == "Test Step"
    assert object_.content == "Transform the payload."
    assert (tmp_path / "steps" / "test-step.md").exists()
