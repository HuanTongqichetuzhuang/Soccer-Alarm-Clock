#!/usr/bin/env python3
"""
Generate rich, multi-layered alarm ringtones
Features: bass, chords, multiple voices, complex rhythms
"""

import wave
import struct
import math
from pathlib import Path

SAMPLE_RATE = 44100
DURATION = 8

# Note frequency table (with flat notes, extended to C7)
NOTE_FREQS = {
    'C3': 130.81, 'D3': 146.83, 'Eb3': 155.56, 'E3': 164.81, 'F3': 174.61,
    'G3': 196.00, 'A3': 220.00, 'Bb3': 233.08, 'B3': 246.94,
    'C4': 261.63, 'D4': 293.66, 'Eb4': 311.13, 'E4': 329.63, 'F4': 349.23,
    'G4': 392.00, 'A4': 440.00, 'Bb4': 466.16, 'B4': 493.88,
    'C5': 523.25, 'D5': 587.33, 'Eb5': 622.25, 'E5': 659.25, 'F5': 698.46,
    'G5': 783.99, 'A5': 880.00, 'Bb5': 932.33, 'B5': 987.77,
    'C6': 1046.50, 'D6': 1174.66, 'Eb6': 1244.51, 'E6': 1318.51,
    'F6': 1396.91, 'G6': 1567.98, 'A6': 1760.00, 'Bb6': 1864.66, 'B6': 1975.53,
    'C7': 2093.00,
}

def generate_wave(frequency, duration, wave_type='sine', volume=0.5):
    samples = []
    num_samples = int(SAMPLE_RATE * duration)
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        if wave_type == 'sine':
            value = math.sin(2 * math.pi * frequency * t)
        elif wave_type == 'square':
            value = 1.0 if math.sin(2 * math.pi * frequency * t) > 0 else -1.0
        elif wave_type == 'sawtooth':
            value = 2.0 * (frequency * t - math.floor(frequency * t + 0.5))
        elif wave_type == 'triangle':
            value = 2.0 * abs(2.0 * (frequency * t - math.floor(frequency * t + 0.5))) - 1.0
        else:
            value = math.sin(2 * math.pi * frequency * t)
        # ADSR envelope
        envelope = 1.0
        attack = 0.02
        decay = 0.1
        sustain_level = 0.7
        release = 0.1
        if t < attack:
            envelope = t / attack
        elif t < attack + decay:
            envelope = 1.0 - (1.0 - sustain_level) * (t - attack) / decay
        elif t > duration - release:
            envelope = sustain_level * (duration - t) / release
        else:
            envelope = sustain_level
        value *= envelope * volume
        samples.append(value)
    return samples

def mix_tracks(*track_lists):
    max_len = max(len(track) for track in track_lists)
    mixed = []
    for i in range(max_len):
        value = 0
        for track in track_lists:
            if i < len(track):
                value += track[i]
        value = max(-1.0, min(1.0, value))
        mixed.append(int(value * 32767))
    return mixed

def generate_orchestra():
    """Orchestra style (multi-voice + chords)"""
    samples = []
    chords = [
        ['C4', 'E4', 'G4', 'C5'],
        ['F4', 'A4', 'C5', 'F5'],
        ['G4', 'B4', 'D5', 'G5'],
        ['C4', 'E4', 'G4', 'C5'],
    ]
    for chord in chords:
        chord_samples = [0.0] * int(SAMPLE_RATE * 1.5)
        for i, note in enumerate(chord):
            freq = NOTE_FREQS[note]
            wave_type = ['sine', 'triangle', 'sine', 'triangle'][i]
            volume = [0.3, 0.2, 0.25, 0.15][i]
            note_samples = generate_wave(freq, 1.5, wave_type, volume)
            for j in range(len(chord_samples)):
                if j < len(note_samples):
                    chord_samples[j] += note_samples[j]
        for i in range(len(chord_samples)):
            chord_samples[i] = int(max(-1.0, min(1.0, chord_samples[i])) * 32767)
        samples.extend(chord_samples)
    melody = ['E4', 'G4', 'A4', 'G4', 'E4', 'R', 'D4', 'C4']
    for note in melody:
        if note == 'R':
            samples.extend([0] * int(SAMPLE_RATE * 0.25))
        else:
            note_samples = generate_wave(NOTE_FREQS[note], 0.25, 'sine', 0.4)
            samples.extend([int(s * 32767) for s in note_samples])
    return samples

def generate_pop():
    """Pop style (bass + chords + melody)"""
    samples = []
    bass_line = ['C3', 'C3', 'F3', 'F3', 'G3', 'G3', 'C3', 'C3']
    chords = [
        ['C4', 'E4', 'G4'],
        ['C4', 'E4', 'G4'],
        ['F4', 'A4', 'C5'],
        ['F4', 'A4', 'C5'],
        ['G4', 'B4', 'D5'],
        ['G4', 'B4', 'D5'],
        ['C4', 'E4', 'G4'],
        ['C4', 'E4', 'G4'],
    ]
    for i in range(len(bass_line)):
        segment_samples = [0.0] * int(SAMPLE_RATE * 0.5)
        bass_freq = NOTE_FREQS[bass_line[i]]
        bass_samples = generate_wave(bass_freq, 0.5, 'square', 0.3)
        for j in range(len(segment_samples)):
            if j < len(bass_samples):
                segment_samples[j] += bass_samples[j] * 0.5
        for note in chords[i]:
            freq = NOTE_FREQS[note]
            chord_samples = generate_wave(freq, 0.5, 'sine', 0.2)
            for j in range(len(segment_samples)):
                if j < len(chord_samples):
                    segment_samples[j] += chord_samples[j]
        for j in range(len(segment_samples)):
            segment_samples[j] = int(max(-1.0, min(1.0, segment_samples[j])) * 32767)
        samples.extend(segment_samples)
    return samples

def generate_cinematic():
    """Cinematic style (epic, rich layers)"""
    samples = []
    pad_notes = ['C3', 'G3', 'C4', 'E4']
    pad_samples = [0.0] * int(SAMPLE_RATE * 3)
    for note in pad_notes:
        freq = NOTE_FREQS[note]
        note_samples = generate_wave(freq, 3, 'sine', 0.2)
        for i in range(len(pad_samples)):
            if i < len(note_samples):
                pad_samples[i] += note_samples[i]
    pad_int = [int(max(-1.0, min(1.0, s)) * 32767) for s in pad_samples]
    samples.extend(pad_int)
    melody = ['E4', 'G4', 'A4', 'B4', 'A4', 'G4', 'E4', 'D4']
    for note in melody:
        note_samples = generate_wave(NOTE_FREQS[note], 0.3, 'triangle', 0.4)
        samples.extend([int(s * 32767) for s in note_samples])
        samples.extend([0] * int(SAMPLE_RATE * 0.05))
    climax_chord = ['C4', 'E4', 'G4', 'C5']
    climax_samples = [0.0] * int(SAMPLE_RATE * 2)
    for note in climax_chord:
        freq = NOTE_FREQS[note]
        note_samples = generate_wave(freq, 2, 'sine', 0.25)
        for i in range(len(climax_samples)):
            if i < len(note_samples):
                climax_samples[i] += note_samples[i]
    climax_int = [int(max(-1.0, min(1.0, s)) * 32767) for s in climax_samples]
    samples.extend(climax_int)
    return samples

def generate_jazz():
    """Jazz style (complex chords + syncopation)"""
    samples = []
    jazz_chords = [
        ['C4', 'E4', 'G4', 'Bb4'],
        ['A3', 'C4', 'E4', 'G4'],
        ['F3', 'A3', 'C4', 'E4'],
        ['G3', 'B3', 'D4', 'F4'],
    ]
    for chord in jazz_chords:
        chord_samples = [0.0] * int(SAMPLE_RATE * 1.2)
        for note in chord:
            freq = NOTE_FREQS[note]
            note_samples = generate_wave(freq, 1.2, 'sawtooth', 0.15)
            for i in range(len(chord_samples)):
                if i < len(note_samples):
                    chord_samples[i] += note_samples[i]
        for i in range(len(chord_samples)):
            chord_samples[i] = int(max(-1.0, min(1.0, chord_samples[i])) * 32767)
        samples.extend(chord_samples)
    jazz_melody = ['E4', 'G4', 'A4', 'Bb4', 'A4', 'G4', 'E4', 'D4']
    for note in jazz_melody:
        note_samples = generate_wave(NOTE_FREQS[note], 0.25, 'sine', 0.35)
        samples.extend([int(s * 32767) for s in note_samples])
    return samples

def generate_epic():
    """Epic style (strong bass + brass + strings)"""
    samples = []
    power_chords = [
        ['C3', 'G3', 'C4', 'G4'],
        ['F3', 'C4', 'F4', 'C5'],
        ['G3', 'D4', 'G4', 'D5'],
        ['C3', 'G3', 'C4', 'G4'],
    ]
    for chord in power_chords:
        chord_samples = [0.0] * int(SAMPLE_RATE * 1.5)
        bass_freq = NOTE_FREQS[chord[0]]
        bass_samples = generate_wave(bass_freq, 1.5, 'square', 0.4)
        for i in range(len(chord_samples)):
            if i < len(bass_samples):
                chord_samples[i] += bass_samples[i]
        for note in chord[1:3]:
            freq = NOTE_FREQS[note]
            note_samples = generate_wave(freq, 1.5, 'sawtooth', 0.25)
            for i in range(len(chord_samples)):
                if i < len(note_samples):
                    chord_samples[i] += note_samples[i]
        for note in chord[2:]:
            freq = NOTE_FREQS[note]
            note_samples = generate_wave(freq, 1.5, 'sine', 0.2)
            for i in range(len(chord_samples)):
                if i < len(note_samples):
                    chord_samples[i] += note_samples[i]
        for i in range(len(chord_samples)):
            chord_samples[i] = int(max(-1.0, min(1.0, chord_samples[i])) * 32767)
        samples.extend(chord_samples)
    epic_melody = ['E5', 'G5', 'A5', 'G5', 'E5', 'D5', 'C5', 'D5', 'E5']
    for note in epic_melody:
        note_samples = generate_wave(NOTE_FREQS[note], 0.3, 'sawtooth', 0.3)
        samples.extend([int(s * 32767) for s in note_samples])
    return samples

def generate_minimalist():
    """Minimalist style (repeating patterns + gradual complexity)"""
    samples = []
    base_pattern = ['C4', 'E4', 'G4', 'E4']
    for repeat in range(4):
        for note in base_pattern:
            note_samples = generate_wave(NOTE_FREQS[note], 0.25, 'sine', 0.3)
            samples.extend([int(s * 32767) for s in note_samples])
    bass_pattern = ['C3', 'C3', 'G3', 'G3']
    for i in range(8):
        if i % 2 == 0:
            note = bass_pattern[i // 2 % len(bass_pattern)]
            note_samples = generate_wave(NOTE_FREQS[note], 0.5, 'triangle', 0.25)
            start_idx = i * int(SAMPLE_RATE * 0.5)
            for j in range(len(note_samples)):
                if start_idx + j < len(samples):
                    samples[start_idx + j] += int(note_samples[j] * 32767 * 0.5)
    for i in range(8):
        if i % 2 == 1:
            note = ['E5', 'G5', 'C6', 'E6'][i % 4]
            start_time = 3.5 + i * 0.25
            start_idx = int(start_time * SAMPLE_RATE)
            note_samples = generate_wave(NOTE_FREQS[note], 0.2, 'sine', 0.2)
            for j in range(len(note_samples)):
                if start_idx + j < len(samples):
                    samples[start_idx + j] += int(note_samples[j] * 32767)
    final_chord = ['C4', 'E4', 'G4', 'C5']
    final_samples = [0.0] * int(SAMPLE_RATE * 2)
    for note in final_chord:
        freq = NOTE_FREQS[note]
        note_samples = generate_wave(freq, 2, 'sine', 0.3)
        for i in range(len(final_samples)):
            if i < len(note_samples):
                final_samples[i] += note_samples[i]
    final_int = [int(max(-1.0, min(1.0, s)) * 32767) for s in final_samples]
    samples.extend(final_int)
    return samples

def save_wav(filename, samples):
    target_samples = SAMPLE_RATE * DURATION
    if len(samples) > target_samples:
        samples = samples[:target_samples]
    else:
        samples.extend([0] * (target_samples - len(samples)))
    samples = [max(-32768, min(32767, s)) for s in samples]
    with wave.open(str(filename), 'wb') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(SAMPLE_RATE)
        for sample in samples:
            wav_file.writeframes(struct.pack('<h', sample))
    max_amp = max(abs(s) for s in samples)
    print(f"Generated: {filename.name} (max: {max_amp}, {max_amp/32767*100:.1f}%)")

def main():
    output_dir = Path("E:/项目/SoccerAlarmPro/ringtons")
    output_dir.mkdir(exist_ok=True)
    print("Generating RICH multi-layered ringtones...")
    print(f"Output: {output_dir}")
    print("=" * 60)
    ringtones = [
        (generate_orchestra, "rich_v2_1_orchestra.wav"),
        (generate_pop, "rich_v2_2_pop.wav"),
        (generate_cinematic, "rich_v2_3_cinematic.wav"),
        (generate_jazz, "rich_v2_4_jazz.wav"),
        (generate_epic, "rich_v2_5_epic.wav"),
        (generate_minimalist, "rich_v2_6_minimalist.wav"),
    ]
    for gen_func, filename in ringtones:
        print(f"\nGenerating: {filename}")
        samples = gen_func()
        save_wav(output_dir / filename, samples)
    print("\n" + "=" * 60)
    print("All RICH ringtones generated!")
    print(f"Location: {output_dir}")
    print("\nFeatures:")
    print("- Multiple layers (bass, chords, melody)")
    print("- Different waveforms (sine, square, sawtooth, triangle)")
    print("- ADSR envelopes for natural sound")
    print("- Complex arrangements (8 seconds each)")

if __name__ == "__main__":
    main()
