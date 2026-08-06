from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent


@dataclass(frozen=True)
class Settings:
    library_dir: Path = BASE_DIR / "library"
    runs_dir: Path = BASE_DIR / "data" / "runs"
    model_base_url: str = os.getenv("EDOR_MODEL_BASE_URL", "http://127.0.0.1:11434/v1")
    model_api_key: str = os.getenv("EDOR_MODEL_API_KEY", "not-needed")
    model_name: str = os.getenv("EDOR_MODEL_NAME", "qwen3:8b")
    model_timeout_seconds: float = float(os.getenv("EDOR_MODEL_TIMEOUT_SECONDS", "180"))


settings = Settings()
settings.runs_dir.mkdir(parents=True, exist_ok=True)
