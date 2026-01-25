# Guía para probar el Karaoke en Español (o cualquier idioma)

El sistema utiliza **WhisperX**, que detecta automáticamente el idioma del audio. Para probar con una canción en español, sigue estos pasos:

## 1. Instalar Requisitos Previos (FFmpeg)
El procesador de audio necesita `ffmpeg` instalado en tu sistema.
- **Mac (con Homebrew)**: Ejecuta `brew install ffmpeg` en tu terminal.
- **Sin Homebrew**: Descarga e instala desde [ffmpeg.org](https://ffmpeg.org/).

## 2. Preparar el Audio
1. Consigue tu archivo de canción en español (formato `.mp3`).
2. Renómbralo a: `song.mp3`
3. Colócalo en la carpeta: `video/public/`
   > Ruta completa: `/Users/josanestrellaflores/Antigravity/Videokaraoke/video/public/song.mp3`

## 3. Generar la Letra (Transcripción)
Ejecuta el script de Python para leer el audio y crear el archivo `lyrics.json`.

Abre una terminal en la carpeta del proyecto y ejecuta:

```bash
# Usa python3 (donde instalamos las dependencias)
python3 backend/transcribe.py video/public/song.mp3 video/public/lyrics.json
```

Si todo sale bien, verás un mensaje de "Done!" y se creará/actualizará el archivo `lyrics.json`.

## 4. Visualizar en el Video
1. Abre el archivo `video/src/Composition.tsx`.
2. Busca la línea comentada del audio (aprox. línea 15) y descoméntala para escuchar la música:
   ```tsx
   <Audio src={staticFile('song.mp3')} />
   ```
3. Asegúrate de que el servidor de vista previa esté corriendo:
   ```bash
   cd video
   npm run dev
   ```
4. Abre `http://localhost:3000` en tu navegador.

¡El video debería mostrar ahora la letra de tu canción en español sincronizada!
