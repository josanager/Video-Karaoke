#!/usr/bin/env python3
"""
Ultimate Karaoke Alignment Pipeline (v2.0)
Uses Stable-TS with Refinement and Integrated VAD for professional-grade synchronization.
"""

import json
import argparse
import os
import torch
import numpy as np
import librosa
import stable_whisper
from tqdm import tqdm

# --- Configuration ---
SAMPLE_RATE = 16000
OFFSET_CORRECTION = -0.15  # Increased anticipation for snappier feel
MIN_WORD_DURATION = 0.05   # 50ms min duration to avoid glitching

def load_audio(path):
    print(f"Loading audio: {path}")
    wav, sr = librosa.load(path, sr=SAMPLE_RATE, mono=True)
    return wav

def align_and_refine(audio_path, lyrics_path):
    """
    Combines Forced Alignment and Precision Refinement.
    """
    print("Step 1: Alignment & Refinement with Stable-TS...")
    
    # Load model (small is best balance for alignment)
    model = stable_whisper.load_model('small')
    
    # Read lyrics
    with open(lyrics_path, 'r', encoding='utf-8') as f:
        text = f.read()
    
    # 1. Alignment with internal VAD
    # vad=True uses Silero VAD internally for better boundaries
    print("  Running alignment...")
    result = model.align(audio_path, text, language='en', vad=True)
    
    # 2. Precision Refinement
    # This is the "secret sauce": it re-evaluates timestamps with higher resolution
    print("  Running precision refinement...")
    result = model.refine(audio_path, result)
    
    # 3. Regrouping logic (ensures words are distinct but flow naturally)
    # result.split_by_punctuation() # Optional
    
    words = []
    for segment in result.segments:
        for word in segment.words:
            words.append({
                "word": word.word.strip().upper(),
                "start": word.start,
                "end": word.end,
                "confidence": word.probability
            })
            
    print(f"  -> Processed {len(words)} words.")
    return words

def uncollapse_distribute(words):
    """
    1. Spreads out words that have identical timestamps (collapsed segments).
    2. Ensures words 'hold' their highlight if the gap to the next word is small (< 150ms).
    """
    print("Step 2: Resolving word collisions and sustaining highlights...")
    n = len(words)
    
    # --- Part 1: Uncollapse ---
    i = 0
    while i < n:
        start_val = words[i]['start']
        j = i + 1
        while j < n and words[j]['start'] == start_val:
            j += 1
            
        count = j - i
        if count > 1:
            limit = words[j]['start'] if j < n else words[n-1]['end'] + 1.0
            available_time = max(0.2 * count, limit - start_val)
            step = available_time / count
            for k in range(count):
                idx = i + k
                words[idx]['start'] = start_val + (k * step)
                words[idx]['end'] = start_val + ((k + 0.9) * step)
        i = j

    # --- Part 2: Sustain/Hold ---
    # If the gap between words is small, assume the singer is holding the note.
    # We extend the 'end' of the current word to meet the 'start' of the next.
    for i in range(n - 1):
        gap = words[i+1]['start'] - words[i]['end']
        if 0 <= gap < 0.25: # Bridge gaps up to 250ms for a smoother karaoke feel
            words[i]['end'] = words[i+1]['start']
            
    return words

def snap_to_beats(wav, words):
    """
    Onset-informed snapping for percussion-heavy tracks.
    """
    print("Step 3: Beat-aware onset snapping...")
    onset_env = librosa.onset.onset_strength(y=wav, sr=SAMPLE_RATE)
    times = librosa.times_like(onset_env, sr=SAMPLE_RATE)
    
    for w in tqdm(words, desc="Snapping"):
        curr_start = w['start']
        # 120ms search window
        win = 0.12
        idx_s = np.searchsorted(times, curr_start - win)
        idx_e = np.searchsorted(times, curr_start + win)
        
        if idx_e > idx_s:
            peak_idx = idx_s + np.argmax(onset_env[idx_s:idx_e])
            w['start'] = times[peak_idx]
            
    return words

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("audio_path", help="Path to audio file")
    parser.add_argument("lyrics_path", help="Path to lyrics file")
    parser.add_argument("output_path", help="Path to output JSON")
    args = parser.parse_args()
    
    # Process
    wav = load_audio(args.audio_path)
    
    # 1. AI Align & Refine
    words = align_and_refine(args.audio_path, args.lyrics_path)
    
    # 2. Logic Clean (Filter punctuation)
    words = [w for w in words if w['word'].strip() and any(c.isalnum() for c in w['word'])]
    
    # 3. Collision Resolution
    words = uncollapse_distribute(words)
    
    # 4. Beat Snapping (DISABLED: Was causing lag by snapping to drum hits instead of vocals)
    # words = snap_to_beats(wav, words)
    
    # 5. Final Formatting
    final_output = []
    for w in words:
        final_output.append({
            "word": w['word'],
            "start": round(max(0, w['start'] + OFFSET_CORRECTION), 3),
            "end": round(max(0, w['end'] + OFFSET_CORRECTION), 3),
            "confidence": round(w['confidence'], 2)
        })
        
    duration = librosa.get_duration(y=wav, sr=SAMPLE_RATE)
    
    output_data = {
        "duration": duration,
        "lyrics": final_output
    }
    
    with open(args.output_path, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
        
    print(f"\nDone! Optimized lyrics saved to {args.output_path}")

if __name__ == "__main__":
    main()
