import torch
import librosa

wav, sr = librosa.load("video/public/intro.wav", sr=16000)
model, utils = torch.hub.load(repo_or_dir='snakers4/silero-vad', model='silero_vad', force_reload=False, trust_repo=True)
get_speech_timestamps = utils[0]
timestamps = get_speech_timestamps(torch.from_numpy(wav), model, sampling_rate=16000)
print(timestamps)
