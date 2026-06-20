import os
import re
import subprocess
import urllib.parse
import urllib.request
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, List, Optional, Tuple


SUPPORTED_FORMATS = ("mp3", "m4a", "original")
SUPPORTED_BROWSERS = ("none", "safari", "chrome", "firefox", "edge")
PROJECT_ROOT = Path(__file__).resolve().parent
PROJECT_DOWNLOADS_DIR = PROJECT_ROOT / "descargas"


@dataclass
class DownloadRequest:
    url: str
    folder: str
    filename: str = ""
    audio_format: str = "mp3"
    browser: str = "none"


def sanitize_filename(name: str) -> str:
    cleaned = "".join(char for char in name if char not in '<>:"/\\|?*').strip()
    return cleaned[:120]


def normalize_request(request: DownloadRequest) -> DownloadRequest:
    audio_format = request.audio_format if request.audio_format in SUPPORTED_FORMATS else "mp3"
    browser = request.browser if request.browser in SUPPORTED_BROWSERS else "none"
    return DownloadRequest(
        url=request.url.strip(),
        folder=request.folder.strip(),
        filename=request.filename.strip(),
        audio_format=audio_format,
        browser=browser,
    )


def validate_request(request: DownloadRequest) -> Optional[str]:
    if not request.url:
        return "Introduce un enlace antes de descargar."
    if not request.folder:
        return "Elige una carpeta de destino."
    if not os.path.isdir(request.folder):
        return "La carpeta indicada no existe en este equipo."
    return None


def default_download_folder() -> str:
    PROJECT_DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)
    return str(PROJECT_DOWNLOADS_DIR)


def get_yt_dlp_version() -> str:
    try:
        result = subprocess.run(
            ["yt-dlp", "--version"],
            capture_output=True,
            text=True,
            check=False,
        )
    except FileNotFoundError:
        return "no disponible"

    version = (result.stdout or "").strip()
    return version or "desconocida"


def build_command(request: DownloadRequest) -> List[str]:
    output_name = sanitize_filename(request.filename) if request.filename else "%(title)s"
    output_template = os.path.join(request.folder, output_name + ".%(ext)s")

    format_selector = {
        "mp3": "bestaudio/best",
        "m4a": "m4a/bestaudio/best",
        "original": "bestaudio/best",
    }[request.audio_format]

    command = [
        "yt-dlp",
        "--newline",
        "--no-playlist",
        "--format",
        format_selector,
        "-o",
        output_template,
    ]

    if request.browser != "none":
        command.extend(["--cookies-from-browser", request.browser])

    if request.audio_format == "mp3":
        command.extend(["-x", "--audio-format", "mp3", "--audio-quality", "0"])
    elif request.audio_format == "m4a":
        command.extend(["-x", "--audio-format", "m4a"])

    command.append(request.url)
    return command


def stream_download(
    request: DownloadRequest,
    on_log: Optional[Callable[[str], None]] = None,
    on_progress: Optional[Callable[[int], None]] = None,
) -> Tuple[bool, str]:
    request = normalize_request(request)
    error = validate_request(request)
    if error:
        return False, error

    command = build_command(request)

    try:
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )
    except FileNotFoundError:
        return False, "No se encontro yt-dlp en el sistema."

    assert process.stdout is not None
    for line in process.stdout:
        line = line.rstrip()
        progress_match = re.search(r"\[download\]\s+(\d+(?:\.\d+)?)%", line)
        if progress_match and on_progress:
            on_progress(min(100, max(0, int(float(progress_match.group(1))))))
        if on_log:
            on_log(line)

    return_code = process.wait()
    if return_code == 0:
        if on_progress:
            on_progress(100)
        return True, "Descarga completada correctamente."

    if request.browser == "none":
        return (
            False,
            "La descarga fallo. Si la plataforma exige acceso autenticado, prueba a elegir tu navegador en la web.",
        )

    return False, f"La descarga fallo con codigo {return_code}."


def download_with_logs(request: DownloadRequest) -> Tuple[bool, str, List[str]]:
    logs: List[str] = []
    ok, message = stream_download(request, logs.append)
    return ok, message, logs


def extract_track_metadata(url: str) -> Tuple[str, str, str, str]:
    try:
        result = subprocess.run(
            [
                "yt-dlp",
                "--no-playlist",
                "--print",
                "%(track)s|||%(artist)s|||%(title)s|||%(uploader)s",
                url,
            ],
            capture_output=True,
            text=True,
            check=False,
        )
    except FileNotFoundError:
        return "", "", "", ""

    line = (result.stdout or "").strip().splitlines()
    if not line:
        return "", "", "", ""

    parts = line[0].split("|||")
    while len(parts) < 4:
        parts.append("")
    track, artist, title, uploader = [part.strip() for part in parts[:4]]

    def clean(value: str) -> str:
        lowered = value.strip().lower()
        if lowered in {"", "na", "n/a", "none", "null"}:
            return ""
        return value.strip()

    track = clean(track)
    artist = clean(artist)
    title = clean(title)
    uploader = clean(uploader)

    return track, artist, title, uploader


def extract_track_search_query(url: str) -> Tuple[str, str]:
    track, artist, title, uploader = extract_track_metadata(url)

    if track and artist:
        query = f"{track} {artist} letra"
    elif title:
        query = f"{title} letra"
    elif uploader:
        query = f"{uploader} letra"
    else:
        query = ""

    search_url = ""
    if query:
        search_url = "https://www.google.com/search?q=" + urllib.parse.quote_plus(query)

    return query, search_url


def fetch_lyrics_ovh(url: str) -> Tuple[bool, str, str, str, str]:
    track, artist, title, uploader = extract_track_metadata(url)
    song = track or title
    singer = artist or uploader
    if not song or not singer:
        return False, "", "", "", "No se pudo identificar artista y titulo desde el enlace."

    endpoint = "https://api.lyrics.ovh/v1/" + urllib.parse.quote(singer) + "/" + urllib.parse.quote(song)
    try:
        with urllib.request.urlopen(endpoint, timeout=12) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception:
        return False, singer, song, "", "lyrics.ovh no devolvio letra para esta cancion."

    lyrics = str(payload.get("lyrics", "")).strip()
    if not lyrics:
        return False, singer, song, "", "lyrics.ovh no devolvio letra para esta cancion."

    return True, singer, song, lyrics, "Letra encontrada."
