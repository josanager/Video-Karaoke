# AGENTS.md

## Objetivo

Este proyecto se usa para:

1. Descargar audio de enlaces de musica.
2. Generar pistas de karaoke a partir de los audios ya guardados en el proyecto.
3. Abrir el flujo dentro de Remotion Studio para preparar el video karaoke.

El agente no necesita abrir la interfaz web ni la app de escritorio para hacer esta tarea. La descarga debe hacerse de forma interna usando la logica del proyecto.

## Carpetas obligatorias

Todas las descargas originales deben guardarse en:

`/Users/josanestrellaflores/Antigravity/Videokaraoke/descargas`

Si la carpeta no existe, hay que crearla antes de descargar.

Las salidas de karaoke deben guardarse dentro de:

`/Users/josanestrellaflores/Antigravity/Videokaraoke/descargas/_stems`

## Prioridad de formato y calidad

Regla principal:

1. Priorizar siempre `m4a`.
2. Descargar en la mejor calidad de audio disponible que permita la plataforma.
3. Si la plataforma no ofrece `m4a` directo, descargar la mejor pista disponible y convertir a `m4a`.

Notas importantes:

- YouTube Music no ofrece WAV ni formatos lossless reales en este flujo.
- La referencia operativa actual es que YouTube Music trabaja con limites de calidad tipo `256 kbps AAC/OPUS` en calidad alta.
- No prometer WAV, FLAC ni audio sin compresion si la fuente no lo ofrece.

## Flujo obligatorio cuando el usuario pegue un link

Cuando el usuario mande un enlace de musica en el chat:

1. Tomar el link del mensaje.
2. Descargar el audio usando la logica del proyecto.
3. Guardar el resultado dentro de la carpeta `descargas`.
4. Priorizar `m4a` en mejor calidad.
5. Confirmar al final:
   - si la descarga termino bien
   - nombre final del archivo
   - ruta final completa

## Implementacion recomendada

La logica compartida del proyecto esta en:

- `/Users/josanestrellaflores/Antigravity/Videokaraoke/downloader.py`
- `/Users/josanestrellaflores/Antigravity/Videokaraoke/stem_separator.py`

Usar preferentemente:

- `DownloadRequest`
- `download_with_logs(...)`
- `stream_download(...)`
- `default_download_folder()`
- `separate_audio_file(...)`
- `list_audio_choices()`

## Ejecucion esperada

Para una descarga interna, construir la solicitud con estos criterios:

- `folder`: siempre la carpeta `descargas` del proyecto
- `audio_format`: usar `m4a`
- `browser`: `none` por defecto

Usar navegador solo si el enlace falla por acceso restringido, autenticacion o cookies.

Orden de reintento recomendado:

1. Intento sin navegador.
2. Si falla por acceso o restriccion de plataforma, reintentar con cookies del navegador si el usuario lo permite o si el entorno local ya lo admite.

## Comportamiento ante errores

Si la descarga falla:

1. Revisar el log devuelto por `yt-dlp`.
2. Comprobar si `yt-dlp` esta desactualizado.
3. Comprobar si la plataforma necesita cookies del navegador.
4. No inventar razones.
5. Explicar de forma concreta por que fallo y que se intento.

## Verificacion minima

Antes de dar por terminada una descarga:

1. Verificar que el archivo existe realmente en `descargas`.
2. Confirmar el nombre final generado.
3. Informar la ruta completa al usuario.

## Respuesta final esperada al usuario

Si sale bien, responder de forma breve con:

- descarga completada
- nombre del archivo
- ruta completa dentro de `descargas`

Si falla, responder con:

- causa probable
- si se intento sin navegador o con navegador
- siguiente accion util

## Flujo de karaoke

El karaoke no se genera desde enlaces directos. Primero tiene que existir un audio dentro de `descargas`.

El panel web local ya tiene dos secciones:

1. Derecha: descarga por link.
2. Izquierda: creacion de karaoke.

La separacion debe operar solo sobre archivos existentes en `descargas`.

## Herramienta prioritaria para karaoke

La herramienta local elegida es:

- `audio-separator`

Ubicacion del binario en este proyecto:

- `/Users/josanestrellaflores/Antigravity/Videokaraoke/.venv-stems/bin/audio-separator`

Motivo:

- Permite integracion por codigo.
- Soporta modelos UVR, Roformer y Demucs.
- Permite comparar varios modelos y ensembles de karaoke.

## Motores de karaoke definidos en el proyecto

Los presets actuales estan en `stem_separator.py`.

1. `karaoke_ensemble`
   - Usa un ensemble compatible con esta maquina
   - Base: `UVR_MDXNET_KARA_2.onnx`
   - Extra:
     - `6_HP-Karaoke-UVR.pth`
     - `UVR-MDX-NET-Inst_HQ_4.onnx`
   - Algoritmo: `avg_wave`
   - Segunda opcion

2. `karaoke_mdx_2`
   - Usa `UVR_MDXNET_KARA_2.onnx`
   - Opcion principal recomendada

3. `karaoke_vr_6hp`
   - Usa `6_HP-Karaoke-UVR.pth`

4. `instrumental_hq_4`
   - Usa `UVR-MDX-NET-Inst_HQ_4.onnx`
   - Flujo especial de dos pasos
   - Paso 1:
     - `lead_vocal.wav`
     - `instrumental_con_backing_vocals.wav`
   - Paso 2:
     - toma `paso_1/lead_vocal.wav`
     - lo procesa con `karaoke_mdx_2`
     - genera:
       - `lead_vocal.wav`
       - `backing_vocals.wav`

5. `kim_inst`
   - Usa `Kim_Inst.onnx`

Todos deben producir:

- `lead_vocal.wav`
- `instrumental_con_backing_vocals.wav`

## Verificacion minima para karaoke

Antes de dar por bueno un karaoke:

1. Verificar que los archivos existen en `descargas/_stems`.
2. Confirmar que el motor usado fue el correcto.
3. Informar al usuario la carpeta final de salida.

## Remotion Studio

El proyecto ahora tiene una integracion de Remotion en la raiz.

Composiciones actuales:

1. `panel-de-control`
   - incrusta la web local de `http://127.0.0.1:5000`
   - sirve como pestaña de control dentro del Studio

2. `karaoke`
   - es la base visual para montar el video karaoke
   - ahi deben juntarse titulo, artista, lineas y demas elementos del video

## No hacer

- No guardar la descarga fuera de `descargas` salvo que el usuario lo pida expresamente.
- No priorizar `mp3` si el usuario no lo pide.
- No abrir localhost solo para descargar un enlace del chat.
- No decir que el archivo esta descargado sin comprobar que existe.
- No usar archivos fuera de `descargas` como fuente de stems, salvo que el usuario lo pida expresamente.
