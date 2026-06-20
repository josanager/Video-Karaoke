# Descargador de musica

Aplicacion simple para descargar audio desde un enlace y elegir la carpeta de destino.

Por defecto, las descargas van a `/Users/josanestrellaflores/Antigravity/Videokaraoke/descargas`.

La separacion de stems se guarda en `/Users/josanestrellaflores/Antigravity/Videokaraoke/descargas/_stems`.

## Abrir version de escritorio

```bash
python3 app.py
```

## Abrir version web local

```bash
python3 web.py
```

Luego abre `http://127.0.0.1:5000`.

## Abrir Remotion Studio

```bash
npm install
npm run studio
```

Luego abre `http://127.0.0.1:3000`.

Composiciones:

- `panel-de-control`: muestra la herramienta actual dentro de Remotion Studio
- `karaoke`: base para construir el video karaoke

## Separacion para karaoke

La web local tiene dos paneles:

- derecha: descarga por link
- izquierda: separacion para karaoke a partir de archivos ya guardados en `descargas`

Herramienta elegida para stems:

- `audio-separator` dentro de `.venv-stems`

Motores de karaoke disponibles:

- `Karaoke MDX-Net 2` (principal)
- `Karaoke ensemble recomendado` (segunda opcion)
- `Karaoke VR 6HP`
- `Instrumental HQ 4`
- `Kim Inst`

Todos buscan producir:

- `lead_vocal.wav`
- `instrumental_con_backing_vocals.wav`

Caso especial:

- `Instrumental HQ 4` ahora usa flujo de dos pasos:
  - `paso_1/lead_vocal.wav`
  - `paso_1/instrumental_con_backing_vocals.wav`
  - `paso_2/lead_vocal.wav`
  - `paso_2/backing_vocals.wav`

En ese segundo paso, el `lead_vocal.wav` del paso 1 se vuelve a procesar con `Karaoke MDX-Net 2`.

Nota:

- El `Karaoke ensemble recomendado` es un ensemble compatible con esta maquina, no el preset oficial `karaoke` de `audio-separator`, porque ese preset intenta cargar modelos Roformer que fallan en este entorno Python.

## Requisitos

- `python3`
- `yt-dlp`
- `ffmpeg`

## Calidad de audio

La app intenta descargar la mejor pista de audio que la plataforma ponga a disposicion para ese enlace y para tu nivel de acceso.

- `original`: guarda la mejor pista de audio disponible sin convertirla.
- `m4a`: prioriza `m4a` si existe y, si no, convierte desde la mejor fuente disponible.
- `mp3`: convierte desde la mejor fuente disponible a `mp3`.

Si una plataforma exige sesion iniciada, usa la opcion de navegador para reutilizar el acceso local del navegador.

## Uso

1. Pega el enlace.
2. Elige la carpeta donde guardar el archivo.
3. Si quieres, escribe un nombre personalizado.
4. Selecciona el formato.
5. Pulsa `Descargar`.

Usa solo enlaces y contenido para los que tengas permiso de descarga.
