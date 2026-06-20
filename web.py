import threading
import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from flask import Flask, jsonify, render_template, request

from downloader import (
    DownloadRequest,
    default_download_folder,
    fetch_lyrics_ovh,
    extract_track_search_query,
    get_yt_dlp_version,
    stream_download,
)
from stem_separator import STEM_PRESETS, list_audio_choices, separate_audio_file


app = Flask(__name__)


@dataclass
class TaskState:
    id: str
    kind: str
    state: str = "running"
    progress: int = 0
    message: str = "Preparando..."
    logs: List[str] = field(default_factory=list)
    files: List[str] = field(default_factory=list)
    lyrics_query: str = ""
    lyrics_url: str = ""
    lyrics_text: str = ""
    lyrics_title: str = ""
    lyrics_artist: str = ""


TASKS: Dict[str, TaskState] = {}
TASKS_LOCK = threading.Lock()


def create_task(kind: str) -> TaskState:
    task = TaskState(id=str(uuid.uuid4()), kind=kind)
    with TASKS_LOCK:
        TASKS[task.id] = task
    return task


def update_task(
    task_id: str,
    *,
    state: Optional[str] = None,
    progress: Optional[int] = None,
    message: Optional[str] = None,
    append_log: Optional[str] = None,
    files: Optional[List[str]] = None,
    lyrics_query: Optional[str] = None,
    lyrics_url: Optional[str] = None,
    lyrics_text: Optional[str] = None,
    lyrics_title: Optional[str] = None,
    lyrics_artist: Optional[str] = None,
) -> None:
    with TASKS_LOCK:
        task = TASKS[task_id]
        if state is not None:
            task.state = state
        if progress is not None:
            task.progress = max(0, min(100, progress))
        if message is not None:
            task.message = message
        if append_log:
            task.logs.append(append_log)
        if files is not None:
            task.files = files
        if lyrics_query is not None:
            task.lyrics_query = lyrics_query
        if lyrics_url is not None:
            task.lyrics_url = lyrics_url
        if lyrics_text is not None:
            task.lyrics_text = lyrics_text
        if lyrics_title is not None:
            task.lyrics_title = lyrics_title
        if lyrics_artist is not None:
            task.lyrics_artist = lyrics_artist


def read_task(task_id: str) -> TaskState:
    with TASKS_LOCK:
        return TASKS[task_id]


def run_download_task(task_id: str, url: str) -> None:
    default_folder = default_download_folder()
    download_request = DownloadRequest(
        url=url,
        folder=default_folder,
        filename="",
        audio_format="m4a",
        browser="none",
    )

    def on_log(line: str) -> None:
        update_task(task_id, append_log=line)

    def on_progress(progress: int) -> None:
        update_task(task_id, progress=progress, message=f"Descargando {progress}%")

    ok, message = stream_download(download_request, on_log=on_log, on_progress=on_progress)
    if ok:
        lyrics_query, lyrics_url = extract_track_search_query(url)
        update_task(
            task_id,
            state="success",
            progress=100,
            message=message,
            lyrics_query=lyrics_query,
            lyrics_url=lyrics_url,
        )
    else:
        update_task(task_id, state="error", message=message)


def run_separation_task(task_id: str, filename: str, preset_key: str) -> None:
    def on_log(line: str) -> None:
        update_task(task_id, append_log=line)

    def on_progress(progress: int) -> None:
        update_task(task_id, progress=progress, message=f"Procesando {progress}%")

    ok, message, files = separate_audio_file(
        filename=filename,
        preset_key=preset_key,
        on_log=on_log,
        on_progress=on_progress,
    )
    file_list = [str(path) for path in files]
    if ok:
        update_task(task_id, state="success", progress=100, message=message, files=file_list)
    else:
        update_task(task_id, state="error", message=message, files=file_list)


@app.route("/", methods=["GET"])
def index():
    preset_meta = {
        key: {
            "label": preset.label,
            "description": preset.description,
        }
        for key, preset in STEM_PRESETS.items()
    }
    return render_template(
        "index.html",
        stem_choices=list_audio_choices(),
        stem_presets=STEM_PRESETS,
        preset_meta=preset_meta,
        yt_dlp_version=get_yt_dlp_version(),
        default_folder=default_download_folder(),
        default_preset="karaoke_mdx_2",
    )


@app.post("/api/download")
def api_download():
    url = request.get_json(silent=True) or {}
    task = create_task("download")
    link = str(url.get("url", "")).strip()
    threading.Thread(target=run_download_task, args=(task.id, link), daemon=True).start()
    return jsonify({"task_id": task.id})


@app.post("/api/separate")
def api_separate():
    payload = request.get_json(silent=True) or {}
    task = create_task("separate")
    filename = str(payload.get("audio_file", "")).strip()
    preset_key = str(payload.get("preset", "karaoke_mdx_2")).strip() or "karaoke_mdx_2"
    threading.Thread(
        target=run_separation_task,
        args=(task.id, filename, preset_key),
        daemon=True,
    ).start()
    return jsonify({"task_id": task.id})


@app.get("/api/task/<task_id>")
def api_task(task_id: str):
    task = read_task(task_id)
    return jsonify(
        {
            "id": task.id,
            "kind": task.kind,
            "state": task.state,
            "progress": task.progress,
            "message": task.message,
            "logs": task.logs[-80:],
            "files": task.files,
            "lyrics_query": task.lyrics_query,
            "lyrics_url": task.lyrics_url,
            "lyrics_text": task.lyrics_text,
            "lyrics_title": task.lyrics_title,
            "lyrics_artist": task.lyrics_artist,
        }
    )


@app.post("/api/lyrics")
def api_lyrics():
    payload = request.get_json(silent=True) or {}
    url = str(payload.get("url", "")).strip()
    ok, artist, title, lyrics, message = fetch_lyrics_ovh(url)
    lyrics_query, lyrics_url = extract_track_search_query(url)
    return jsonify(
        {
            "ok": ok,
            "artist": artist,
            "title": title,
            "lyrics": lyrics,
            "message": message,
            "lyrics_query": lyrics_query,
            "lyrics_url": lyrics_url,
        }
    )


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
