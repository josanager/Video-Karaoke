import stable_whisper

model = stable_whisper.load_model('small')
text = "Woke up whistling like the wind blows"
audio = "video/public/intro.wav"

print(f"Aligning '{text}' to '{audio}'")
result = model.align(audio, text, language='en')

for s in result.segments:
    for w in s.words:
        print(f"{w.word}: {w.start:.2f} - {w.end:.2f} ({w.probability:.2f})")
