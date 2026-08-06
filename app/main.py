from __future__ import annotations

import asyncio
import logging

from fastapi import (
    FastAPI,
    HTTPException,
    Request,
    status,
)

from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from .config import BASE_DIR, settings
from .library import (
    LibraryError,
    LibraryRepository,
)

from .model_client import (
    OpenAICompatibleClient,
)

from .orchestrator import EdOrOrchestrator

from .schemas import (
    Bucket,
    LibraryObjectWrite,
    RunRequest,
)


app = FastAPI(
    title="EdOr Web",
    version="0.1.0",
)

app.mount(
    "/static",
    StaticFiles(
        directory=BASE_DIR / "app" / "static"
    ),
    name="static",
)

templates = Jinja2Templates(
    directory=BASE_DIR / "app" / "templates"
)

library = LibraryRepository(
    settings.library_dir
)

model_client = OpenAICompatibleClient(
    base_url=settings.model_base_url,
    api_key=settings.model_api_key,
    timeout_seconds=(
        settings.model_timeout_seconds
    ),
)

orchestrator = EdOrOrchestrator(
    library=library,
    model_client=model_client,
    runs_dir=settings.runs_dir,
    default_model=settings.model_name,
)

logger = logging.getLogger(__name__)
active_run_tasks: set[asyncio.Task] = set()
orchestrator.recover_incomplete_runs()


def _release_run_task(task: asyncio.Task) -> None:
    active_run_tasks.discard(task)

    if task.cancelled():
        return

    exception = task.exception()
    if exception is not None:
        logger.error(
            "Unhandled EdOr background-run failure",
            exc_info=(
                type(exception),
                exception,
                exception.__traceback__,
            ),
        )


async def _execute_run(
    run_id: str,
    request: RunRequest,
) -> None:
    await orchestrator.execute(
        request,
        run_id=run_id,
    )


@app.get(
    "/",
    response_class=HTMLResponse,
)
async def index(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={
            "default_model":
                settings.model_name
        },
    )


@app.get("/api/models")
async def list_models():
    try:
        models = (
            await model_client.list_models()
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc

    if settings.model_name not in models:
        models.insert(
            0,
            settings.model_name,
        )

    return {
        "models": models,
        "default_model":
            settings.model_name,
    }


@app.get("/api/library")
async def list_library():
    return library.list_all()


@app.get(
    "/api/library/{bucket}/{object_id}"
)
async def get_library_object(
    bucket: Bucket,
    object_id: str,
):
    try:
        return library.get(
            bucket,
            object_id,
        )
    except (
        FileNotFoundError,
        LibraryError,
    ) as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc


@app.put(
    "/api/library/{bucket}/{object_id}"
)
async def save_library_object(
    bucket: Bucket,
    object_id: str,
    value: LibraryObjectWrite,
):
    try:
        return library.save(
            bucket,
            object_id,
            value,
        )
    except LibraryError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc


@app.delete(
    "/api/library/{bucket}/{object_id}",
    status_code=(
        status.HTTP_204_NO_CONTENT
    ),
)
async def delete_library_object(
    bucket: Bucket,
    object_id: str,
):
    try:
        library.delete(
            bucket,
            object_id,
        )
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc


@app.post(
    "/api/runs",
    status_code=status.HTTP_202_ACCEPTED,
)
async def run_sequence(
    request: RunRequest,
):
    try:
        result, created = (
            orchestrator.initialize(
                request,
                run_id=request.run_id,
            )
        )
    except (
        FileNotFoundError,
        LibraryError,
        ValueError,
    ) as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    if created:
        task = asyncio.create_task(
            _execute_run(
                result.run_id,
                request,
            ),
            name=f"edor-run-{result.run_id}",
        )
        active_run_tasks.add(task)
        task.add_done_callback(
            _release_run_task
        )

    return {
        "run_id": result.run_id,
        "status": result.status,
    }


@app.get("/api/runs")
async def list_runs(limit: int = 20):
    bounded_limit = max(1, min(limit, 100))
    return {
        "runs": orchestrator.list_runs(
            bounded_limit
        )
    }


@app.get("/api/runs/{run_id}")
async def get_run(run_id: str):
    try:
        return orchestrator.read_run(
            run_id
        )
    except (
        FileNotFoundError,
        ValueError,
    ) as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc
