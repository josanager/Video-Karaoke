import stable_whisper

model = stable_whisper.load_model('small')
text = "Woke up whistling like the wind blows"
audio = "Musica/Vocals.wav"

print(f"Aligning '{text}' to '{audio}'")
result = model.align(audio, text, language='en')

for s in result.segments:
    for w in s.words:
        print(f"{w.word}: {w.start:.3f} - {w.end:.3f} (conf: {w.probability:.2f})")
