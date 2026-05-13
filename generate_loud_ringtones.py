#!/usr/bin/env python3
"""
生成音量更大的有旋律的闹钟铃声
"""

import wave
import struct
import math
from pathlib import Path

# 音频参数
SAMPLE_RATE = 44100
DURATION = 5

# 音符频率表
NOTE_FREQS = {
    'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23,
    'G4': 392.00, 'A4': 440.00, 'B4': 493.88, 'C5': 523.25,
    'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99,
    'A5': 880.00, 'B5': 987.77, 'C6': 1046.50, 'D6': 1174.66,
    'E6': 1318.51, 'F6': 1396.91, 'G6': 1567.98, 'A6': 1760.00,
    'B6': 1975.53, 'C7': 2093.00
}

def generate_note(note, duration, volume=0.9):
    """生成一个音符 - 音量默认90%"""
    if isinstance(note, str):
        frequency = NOTE_FREQS.get(note, 440.0)
    else:
        frequency = note
    
    samples = []
    num_samples = int(SAMPLE_RATE * duration)
    
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        # 纯正弦波，音量大
        value = math.sin(2 * math.pi * frequency * t) * volume
        
        # 添加包络（避免爆音）
        envelope = 1.0
        if i < SAMPLE_RATE * 0.01:  # 10ms起音
            envelope = i / (SAMPLE_RATE * 0.01)
        elif i > num_samples - SAMPLE_RATE * 0.05:  # 50ms释音
            envelope = (num_samples - i) / (SAMPLE_RATE * 0.05)
        
        value *= envelope
        # 限制在16位范围内
        value = max(-32768, min(32767, int(value * 32767)))
        samples.append(value)
    
    return samples

def generate_ringtone_1():
    """铃声1: 大音量音乐盒"""
    samples = []
    melody = [
        ('C4', 0.15), ('C4', 0.15), ('G4', 0.15), ('G4', 0.15),
        ('A4', 0.15), ('A4', 0.15), ('G4', 0.3), ('R', 0.15),
        ('F4', 0.15), ('F4', 0.15), ('E4', 0.15), ('E4', 0.15),
        ('D4', 0.15), ('D4', 0.15), ('C4', 0.3), ('R', 0.15),
    ]
    
    for note, duration in melody:
        if note == 'R':
            samples.extend([0] * int(SAMPLE_RATE * duration))
        else:
            note_samples = generate_note(note, duration, volume=0.9)
            samples.extend(note_samples)
    
    return samples

def generate_ringtone_2():
    """铃声2: 大音量钢琴风格"""
    samples = []
    
    # 简单和弦
    chords = [
        ('C4', 'E4', 'G4'),
        ('F4', 'A4', 'C5'),
        ('G4', 'B4', 'D5'),
        ('C4', 'E4', 'G4'),
    ]
    
    for chord in chords:
        chord_samples = []
        for i in range(int(SAMPLE_RATE * 0.5)):
            t = i / SAMPLE_RATE
            value = 0
            for note in chord:
                freq = NOTE_FREQS[note]
                value += math.sin(2 * math.pi * freq * t) * 0.3
            envelope = 1.0
            if i < SAMPLE_RATE * 0.02:
                envelope = i / (SAMPLE_RATE * 0.02)
            chord_samples.append(int(value * 32767 * envelope))
        samples.extend(chord_samples)
    
    # 添加旋律
    melody = [('E4', 0.25), ('G4', 0.25), ('A4', 0.25), ('G4', 0.25),
              ('E4', 0.25), ('R', 0.1), ('D4', 0.25), ('C4', 0.25)]
    
    for note, duration in melody:
        if note == 'R':
            samples.extend([0] * int(SAMPLE_RATE * duration))
        else:
            note_samples = generate_note(note, duration, volume=0.8)
            samples.extend(note_samples)
    
    return samples

def generate_ringtone_3():
    """铃声3: 大音量风铃"""
    samples = []
    
    chime_notes = ['C5', 'E5', 'G5', 'C6', 'E6', 'G6']
    
    for i in range(len(chime_notes) * 2):
        note = chime_notes[i % len(chime_notes)]
        freq = NOTE_FREQS[note]
        
        note_samples = []
        for j in range(int(SAMPLE_RATE * 0.3)):
            t = j / SAMPLE_RATE
            decay = math.exp(-3 * t)
            value = math.sin(2 * math.pi * freq * t) * decay * 0.9
            note_samples.append(int(value * 32767))
        
        samples.extend(note_samples)
        samples.extend([0] * int(SAMPLE_RATE * 0.1))
    
    return samples

def generate_ringtone_4():
    """铃声4: 大音量警报旋律"""
    samples = []
    
    note_pairs = [('C5', 'E5'), ('D5', 'F5'), ('E5', 'G5'), ('F5', 'A5')]
    
    for pair in note_pairs:
        for repeat in range(2):
            for note in pair:
                note_samples = generate_note(note, 0.15, volume=0.95)
                samples.extend(note_samples)
            samples.extend([0] * int(SAMPLE_RATE * 0.05))
    
    # 高音结束
    final_samples = generate_note('C6', 1.0, volume=1.0)
    samples.extend(final_samples)
    
    return samples

def generate_ringtone_5():
    """铃声5: 大音量唤醒旋律"""
    samples = []
    
    scale = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']
    
    # 慢速
    for note in scale:
        note_samples = generate_note(note, 0.3, volume=0.8)
        samples.extend(note_samples)
    
    # 中速
    for i in range(2):
        for note in scale:
            note_samples = generate_note(note, 0.15, volume=0.9)
            samples.extend(note_samples)
    
    # 快速
    for i in range(4):
        for note in scale[:4]:
            note_samples = generate_note(note, 0.08, volume=1.0)
            samples.extend(note_samples)
    
    return samples

def generate_ringtone_6():
    """铃声6: 大音量柔和歌曲"""
    samples = []
    
    melody = [
        ('C4', 0.2), ('C4', 0.2), ('D4', 0.2), ('C4', 0.2),
        ('F4', 0.2), ('E4', 0.4), ('R', 0.1),
        ('C4', 0.2), ('C4', 0.2), ('D4', 0.2), ('C4', 0.2),
        ('G4', 0.2), ('F4', 0.4), ('R', 0.1),
    ]
    
    for note, duration in melody:
        if note == 'R':
            samples.extend([0] * int(SAMPLE_RATE * duration))
        else:
            note_samples = generate_note(note, duration, volume=0.85)
            samples.extend(note_samples)
    
    return samples

def save_wav(filename, samples):
    """保存为WAV文件"""
    target_samples = SAMPLE_RATE * DURATION
    if len(samples) > target_samples:
        samples = samples[:target_samples]
    else:
        samples.extend([0] * (target_samples - len(samples)))
    
    with wave.open(str(filename), 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(SAMPLE_RATE)
        
        for sample in samples:
            sample = max(-32768, min(32767, sample))
            wav_file.writeframes(struct.pack('<h', sample))
    
    # 检查实际音量
    max_amp = max(abs(s) for s in samples)
    print(f"Generated: {filename.name} (max amplitude: {max_amp}, {max_amp/32767*100:.1f}%)")

def main():
    output_dir = Path("E:/项目/SoccerAlarmPro/ringtons")
    output_dir.mkdir(exist_ok=True)
    
    print("Generating LOUD melody ringtones...")
    print(f"Output: {output_dir}")
    print("-" * 60)
    
    # 生成6个铃声
    ringtones = [
        (generate_ringtone_1, "loud_1_music_box.wav"),
        (generate_ringtone_2, "loud_2_piano.wav"),
        (generate_ringtone_3, "loud_3_chime.wav"),
        (generate_ringtone_4, "loud_4_alarm_melody.wav"),
        (generate_ringtone_5, "loud_5_wake_up.wav"),
        (generate_ringtone_6, "loud_6_gentle_song.wav"),
    ]
    
    for gen_func, filename in ringtones:
        print(f"Generating: {filename}")
        samples = gen_func()
        save_wav(output_dir / filename, samples)
    
    print("-" * 60)
    print("All LOUD ringtones generated!")
    print(f"Location: {output_dir}")
    print("\nThese ringtones have HIGHER volume (80-100%)")
    print("Try playing them now!")

if __name__ == "__main__":
    main()
