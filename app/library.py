from __future__ import annotations

import os
import re
import tempfile
from pathlib import Path

from .schemas import Bucket, LibraryObject, LibraryObjectWrite


OBJECT_ID_RE = re.compile(r"^[a-z0-9][a-z0-9._-]*$")
VALID_BUCKETS = {"roles", "modes", "steps"}


class LibraryError(ValueError):
    pass


class LibraryRepository:
    def __init__(self, root: Path):
        self.root = root
        for bucket in VALID_BUCKETS:
            (self.root / bucket).mkdir(parents=True, exist_ok=True)

    def _bucket_dir(self, bucket: Bucket) -> Path:
        if bucket not in VALID_BUCKETS:
            raise LibraryError(f"Unknown bucket: {bucket}")
        return self.root / bucket

    def _path(self, bucket: Bucket, object_id: str) -> Path:
        self._validate_id(object_id)
        return self._bucket_dir(bucket) / f"{object_id}.md"

    @staticmethod
    def _validate_id(object_id: str) -> None:
        if not OBJECT_ID_RE.fullmatch(object_id):
            raise LibraryError(
                "Object ID must start with a lowercase letter or number and may "
                "contain lowercase letters, numbers, dots, underscores, or hyphens"
            )

    def list(self, bucket: Bucket) -> list[LibraryObject]:
        objects: list[LibraryObject] = []
        for path in sorted(self._bucket_dir(bucket).glob("*.md")):
            try:
                objects.append(self._read_path(bucket, path))
            except LibraryError:
                # One malformed object must not make the entire bucket unusable.
                continue
        return objects

    def list_all(self) -> dict[str, list[LibraryObject]]:
        return {bucket: self.list(bucket) for bucket in sorted(VALID_BUCKETS)}

    def get(self, bucket: Bucket, object_id: str) -> LibraryObject:
        path = self._path(bucket, object_id)
        if not path.exists():
            raise FileNotFoundError(f"{bucket}/{object_id} does not exist")
        return self._read_path(bucket, path)

    def save(
        self,
        bucket: Bucket,
        object_id: str,
        value: LibraryObjectWrite,
    ) -> LibraryObject:
        path = self._path(bucket, object_id)

        existing_step_inputs: list[str] = []
        if path.exists():
            existing_step_inputs = self.get(
                bucket,
                object_id,
            ).step_inputs

        if not value.step_inputs and existing_step_inputs:
            value = value.model_copy(
                update={
                    "step_inputs": existing_step_inputs,
                }
            )

        serialized = self._serialize(value)

        fd, temporary_name = tempfile.mkstemp(
            prefix=f".{object_id}.", suffix=".tmp", dir=path.parent
        )
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as handle:
                handle.write(serialized)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temporary_name, path)
        finally:
            if os.path.exists(temporary_name):
                os.unlink(temporary_name)

        return self.get(bucket, object_id)

    def delete(self, bucket: Bucket, object_id: str) -> None:
        path = self._path(bucket, object_id)
        if not path.exists():
            raise FileNotFoundError(f"{bucket}/{object_id} does not exist")
        path.unlink()

    def _read_path(self, bucket: Bucket, path: Path) -> LibraryObject:
        raw = path.read_text(encoding="utf-8")
        metadata, content = self._parse(raw)
        object_id = path.stem
        default_name = object_id.replace("-", " ").replace("_", " ").title()
        return LibraryObject(
            bucket=bucket,
            object_id=object_id,
            name=metadata.get("name", default_name),
            description=metadata.get("description", ""),
            enabled=self._parse_bool(metadata.get("enabled", "true")),
            step_inputs=self._parse_csv(
                metadata.get("step_inputs", "")
            ),
            content=content.strip(),
        )

    @staticmethod
    def _parse(raw: str) -> tuple[dict[str, str], str]:
        if not raw.startswith("---\n"):
            return {}, raw

        closing = raw.find("\n---\n", 4)
        if closing == -1:
            raise LibraryError("Opening front matter delimiter has no closing delimiter")

        header = raw[4:closing]
        content = raw[closing + 5 :]
        metadata: dict[str, str] = {}
        for line_number, line in enumerate(header.splitlines(), start=2):
            if not line.strip():
                continue
            key, separator, value = line.partition(":")
            if not separator:
                raise LibraryError(f"Invalid front matter at line {line_number}")
            metadata[key.strip()] = value.strip()
        return metadata, content

    @staticmethod
    def _parse_csv(value: str) -> list[str]:
        return [
            item.strip()
            for item in value.split(",")
            if item.strip()
        ]

    @staticmethod
    def _parse_bool(value: str) -> bool:
        normalized = value.strip().lower()
        if normalized in {"true", "yes", "1"}:
            return True
        if normalized in {"false", "no", "0"}:
            return False
        raise LibraryError(f"Invalid Boolean value: {value}")

    @staticmethod
    def _serialize(value: LibraryObjectWrite) -> str:
        def clean(text: str) -> str:
            return " ".join(
                text.replace("\r", " ")
                .replace("\n", " ")
                .split()
            )

        step_inputs_line = ""
        if value.step_inputs:
            step_inputs_line = (
                "step_inputs: "
                + clean(", ".join(value.step_inputs))
                + "\n"
            )

        return (
            "---\n"
            f"name: {clean(value.name)}\n"
            f"description: {clean(value.description)}\n"
            f"enabled: {'true' if value.enabled else 'false'}\n"
            f"{step_inputs_line}"
            "---\n\n"
            f"{value.content.rstrip()}\n"
        )
