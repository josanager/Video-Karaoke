import shutil
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Dict, List, Optional, Tuple

from downloader import PROJECT_DOWNLOADS_DIR, PROJECT_ROOT


AUDIO_SEPARATOR_BIN = PROJECT_ROOT / ".venv-stems" / "bin" / "audio-separator"
MODEL_CACHE_DIR = PROJECT_ROOT / ".cache" / "audio-separator-models"
STEMS_OUTPUT_DIR = PROJECT_DOWNLOADS_DIR / "_stems"
AUDIO_EXTENSIONS = {".wav", ".mp3", ".flac", ".m4a", ".aac", ".ogg", ".opus", ".webm"}


@dataclass(frozen=True)
class StemPreset:
    key: str
    label: str
    description: str
    model: Optional[str] = None
    extra_models: Optional[List[str]] = None
    ensemble_algorithm: Optional[str] = None
    rename_map: Optional[Dict[str, str]] = None
    flow: str = "single_pass"


STEM_PRESETS: Dict[str, StemPreset] = {
    "karaoke_mdx_2": StemPreset(
        key="karaoke_mdx_2",
        label="Karaoke MDX-Net 2",
        description="Opcion principal recomendada. Suele dar el mejor equilibrio general para separar la voz principal del karaoke.",
        model="UVR_MDXNET_KARA_2.onnx",
        rename_map={
            "vocals": "lead_vocal.wav",
            "instrumental": "instrumental_con_backing_vocals.wav",
        },
    ),
    "karaoke_ensemble": StemPreset(
        key="karaoke_ensemble",
        label="Karaoke ensemble recomendado",
        description="Segunda opcion. Ensemble compatible con esta maquina: combina Karaoke 2, VR 6HP e Inst HQ 4, pero puede dejar mas mezcla residual en la pista vocal.",
        model="UVR_MDXNET_KARA_2.onnx",
        extra_models=["6_HP-Karaoke-UVR.pth", "UVR-MDX-NET-Inst_HQ_4.onnx"],
        ensemble_algorithm="avg_wave",
        rename_map={
            "vocals": "lead_vocal.wav",
            "instrumental": "instrumental_con_backing_vocals.wav",
        },
    ),
    "karaoke_vr_6hp": StemPreset(
        key="karaoke_vr_6hp",
        label="Karaoke VR 6HP",
        description="Modelo VR karaoke clasico. Se mantiene como opcion secundaria, pero no es la preferida.",
        model="6_HP-Karaoke-UVR.pth",
        rename_map={
            "vocals": "lead_vocal.wav",
            "instrumental": "instrumental_con_backing_vocals.wav",
        },
    ),
    "instrumental_hq_4": StemPreset(
        key="instrumental_hq_4",
        label="Instrumental HQ 4 (paso 1 y paso 2)",
        description="Flujo de dos pasos. Primero separa lead vocal e instrumental con backing vocals. Luego vuelve a procesar el lead vocal con Karaoke MDX-Net 2 para intentar sacar backing vocals aparte.",
        model="UVR-MDX-NET-Inst_HQ_4.onnx",
        rename_map={
            "vocals": "lead_vocal.wav",
            "instrumental": "instrumental_con_backing_vocals.wav",
        },
        flow="instrumental_hq4_two_step",
    ),
    "kim_inst": StemPreset(
        key="kim_inst",
        label="Kim Inst",
        description="Modelo MDX de apoyo orientado a instrumental. Mejor dejarlo como opcion secundaria.",
        model="Kim_Inst.onnx",
        rename_map={
            "vocals": "lead_vocal.wav",
            "instrumental": "instrumental_con_backing_vocals.wav",
        },
    ),
}


def list_downloaded_audio_files() -> List[Path]:
    PROJECT_DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)
    files = [
        path
        for path in PROJECT_DOWNLOADS_DIR.iterdir()
        if path.is_file() and path.suffix.lower() in AUDIO_EXTENSIONS
    ]
    return sorted(files, key=lambda path: path.name.lower())


def list_audio_choices() -> List[Tuple[str, str]]:
    return [(path.name, path.name) for path in list_downloaded_audio_files()]


def sanitize_stem_name(name: str) -> str:
    safe = "".join(char for char in name if char not in '<>:"/\\|?*').strip()
    return safe or "audio"


def get_audio_source_path(filename: str) -> Optional[Path]:
    for path in list_downloaded_audio_files():
        if path.name == filename:
            return path
    return None


def get_stem_output_root(source_path: Path, preset_key: str) -> Path:
    base_name = sanitize_stem_name(source_path.stem)
    return STEMS_OUTPUT_DIR / base_name / preset_key


def _run_command(command: List[str], on_log: Optional[Callable[[str], None]]) -> Tuple[bool, List[str]]:
    return _run_command_with_progress(command, on_log, None, None)


def _run_command_with_progress(
    command: List[str],
    on_log: Optional[Callable[[str], None]],
    on_progress: Optional[Callable[[int], None]],
    progress_range: Optional[Tuple[int, int]],
) -> Tuple[bool, List[str]]:
    logs: List[str] = []

    try:
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )
    except FileNotFoundError:
        message = "No se encontro audio-separator. Prepara primero el entorno de stems."
        if on_log:
            on_log(message)
        return False, [message]

    assert process.stdout is not None
    for line in process.stdout:
        line = line.rstrip()
        logs.append(line)
        if on_progress:
            progress_match = re.search(r"(\d+)%\|", line)
            if progress_match:
                raw_progress = int(progress_match.group(1))
                if progress_range:
                    start, end = progress_range
                    scaled = start + int((raw_progress / 100) * (end - start))
                    on_progress(max(start, min(end, scaled)))
                else:
                    on_progress(max(0, min(100, raw_progress)))
        if on_log:
            on_log(line)

    ok = process.wait() == 0
    if ok and on_progress:
        if progress_range:
            on_progress(progress_range[1])
        else:
            on_progress(100)
    return ok, logs


def _build_audio_separator_command(
    source_path: Path,
    output_dir: Path,
    model: Optional[str] = None,
    extra_models: Optional[List[str]] = None,
    ensemble_algorithm: Optional[str] = None,
) -> List[str]:
    MODEL_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)
    command = [
        str(AUDIO_SEPARATOR_BIN),
        str(source_path),
        "--output_dir",
        str(output_dir),
        "--output_format=WAV",
        "--model_file_dir",
        str(MODEL_CACHE_DIR),
        "--use_soundfile",
    ]

    if model:
        command.extend(["-m", model])
    else:
        raise ValueError("Se necesita model para separar audio.")

    if extra_models:
        command.extend(["--extra_models", *extra_models])

    if ensemble_algorithm:
        command.extend(["--ensemble_algorithm", ensemble_algorithm])

    return command


def _list_generated_files(output_dir: Path) -> List[Path]:
    if not output_dir.exists():
        return []
    return sorted([path for path in output_dir.iterdir() if path.is_file()])


def separate_audio_file(
    filename: str,
    preset_key: str,
    on_log: Optional[Callable[[str], None]] = None,
    on_progress: Optional[Callable[[int], None]] = None,
) -> Tuple[bool, str, List[Path]]:
    source_path = get_audio_source_path(filename)
    if source_path is None:
        return False, "El archivo seleccionado ya no existe en descargas.", []

    preset = STEM_PRESETS.get(preset_key)
    if preset is None:
        return False, "El modo de separacion no es valido.", []

    if not AUDIO_SEPARATOR_BIN.exists():
        return False, "La herramienta local de stems no esta instalada todavia.", []

    output_root = get_stem_output_root(source_path, preset_key)
    if output_root.exists():
        shutil.rmtree(output_root)
    output_root.mkdir(parents=True, exist_ok=True)

    if preset.flow == "instrumental_hq4_two_step":
        return _separate_instrumental_hq4_two_step(source_path, output_root, preset, on_log, on_progress)

    return _run_single_pass(source_path, output_root, preset, on_log, on_progress)


def _run_single_pass(
    source_path: Path,
    output_root: Path,
    preset: StemPreset,
    on_log: Optional[Callable[[str], None]] = None,
    on_progress: Optional[Callable[[int], None]] = None,
    progress_range: Optional[Tuple[int, int]] = None,
) -> Tuple[bool, str, List[Path]]:
    command = _build_audio_separator_command(
        source_path,
        output_root,
        model=preset.model,
        extra_models=preset.extra_models,
        ensemble_algorithm=preset.ensemble_algorithm,
    )
    ok, _ = _run_command_with_progress(command, on_log, on_progress, progress_range)
    files = _list_generated_files(output_root)
    if ok and files:
        if preset.rename_map:
            files = _apply_renames(files, preset.rename_map)
        return True, "Separacion completada correctamente.", files
    return False, "La separacion no genero archivos de salida.", files


def _separate_instrumental_hq4_two_step(
    source_path: Path,
    output_root: Path,
    preset: StemPreset,
    on_log: Optional[Callable[[str], None]] = None,
    on_progress: Optional[Callable[[int], None]] = None,
) -> Tuple[bool, str, List[Path]]:
    step_1_dir = output_root / "paso_1"
    step_2_dir = output_root / "paso_2"

    step_1_ok, step_1_message, step_1_files = _run_single_pass(
        source_path,
        step_1_dir,
        preset,
        on_log,
        on_progress,
        (0, 55),
    )
    if not step_1_ok:
        return False, step_1_message, step_1_files

    lead_vocal_path = step_1_dir / "lead_vocal.wav"
    if not lead_vocal_path.exists():
        return False, "El paso 1 no genero lead_vocal.wav.", step_1_files

    mdx_preset = STEM_PRESETS["karaoke_mdx_2"]
    step_2_ok, _, step_2_files = _run_single_pass(
        lead_vocal_path,
        step_2_dir,
        mdx_preset,
        on_log,
        on_progress,
        (55, 100),
    )
    if not step_2_ok:
        combined_files = sorted(step_1_files + step_2_files, key=lambda path: str(path).lower())
        return False, "El paso 2 no genero archivos de salida.", combined_files

    step_2_lead = step_2_dir / "lead_vocal.wav"
    step_2_instrumental = step_2_dir / "instrumental_con_backing_vocals.wav"

    renamed_step_2_files: List[Path] = []
    if step_2_lead.exists():
        renamed_step_2_files.append(step_2_lead)
    if step_2_instrumental.exists():
        renamed_step_2_files.append(_rename_output_file(step_2_instrumental, "backing_vocals.wav"))

    combined_files = sorted(step_1_files + renamed_step_2_files, key=lambda path: str(path).lower())
    return True, "Separacion completada correctamente.", combined_files


def _find_file(files: List[Path], keyword: str) -> Optional[Path]:
    keyword = keyword.lower()
    for path in files:
        if keyword in path.name.lower():
            return path
    return None


def _rename_output_file(source: Path, destination_name: str) -> Path:
    destination = source.with_name(destination_name)
    if destination.exists():
        destination.unlink()
    source.rename(destination)
    return destination


def _apply_renames(files: List[Path], rename_map: Dict[str, str]) -> List[Path]:
    renamed_files: List[Path] = []
    consumed_sources: set[Path] = set()

    for keyword, target_name in rename_map.items():
        matched = _find_file(files, keyword)
        if matched is not None and matched not in consumed_sources:
            renamed = _rename_output_file(matched, target_name)
            renamed_files.append(renamed)
            consumed_sources.add(matched)

    for path in files:
        if path not in consumed_sources and path.exists():
            renamed_files.append(path)

    return sorted(renamed_files, key=lambda path: path.name.lower())
