#!/usr/bin/env python3
"""
生成层次丰富的闹钟铃声
包含：低音、和弦、多声部、复杂节奏
"""

import wave
import struct
import math
from pathlib import Path

SAMPLE_RATE = 44100
DURATION = 8  # 8秒，足够展示丰富层次

# 音符频率表（扩展低音区，包含降音）
NOTE_FREQS = {
    'C3': 130.81, 'D3': 146.83, 'Eb3': 155.56, 'E3': 164.81, 'F3': 174.61,
    'G3': 196.00, 'A3': 220.00, 'Bb3': 233.08, 'B3': 246.94,
    'C4': 261.63, 'D4': 293.66, 'Eb4': 311.13, 'E4': 329.63, 'F4': 349.23,
    'G4': 392.00, 'A4': 440.00, 'Bb4': 466.16, 'B4': 493.88,
    'C5': 523.25, 'D5': 587.33, 'Eb5': 622.25, 'E5': 659.25, 'F5': 698.46,
    'G5': 783.99, 'A5': 880.00, 'Bb5': 932.33, 'B5': 987.77,
    'C6': 1046.50,
}

def generate_wave(frequency, duration, wave_type='sine', volume=0.5):
    """生成不同类型的波形"""
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
        
        # ADSR包络（起音、衰减、持续、释音）
        envelope = 1.0
        attack = 0.02  # 20ms起音
        decay = 0.1   # 100ms衰减
        sustain_level = 0.7
        release = 0.1  # 100ms释音
        
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
    """混合多个音轨"""
    max_len = max(len(track) for track in track_lists)
    mixed = []
    
    for i in range(max_len):
        value = 0
        for track in track_lists:
            if i < len(track):
                value += track[i]
        # 防止溢出，限制幅度
        value = max(-1.0, min(1.0, value))
        mixed.append(int(value * 32767))
    
    return mixed

def generate_rich_1_orchestra():
    """铃声1：管弦乐风格（多声部+和弦）"""
    samples = []
    
    # 和弦进程：C - F - G - C
    chords = [
        ['C4', 'E4', 'G4', 'C5'],  # C大调
        ['F4', 'A4', 'C5', 'F5'],  # F大调
        ['G4', 'B4', 'D5', 'G5'],  # G大调
        ['C4', 'E4', 'G4', 'C5'],  # C大调
    ]
    
    for chord in chords:
        chord_samples = [0.0] * int(SAMPLE_RATE * 1.5)
        
        # 每个和弦音用不同波形
        for i, note in enumerate(chord):
            freq = NOTE_FREQS[note]
            wave_type = ['sine', 'triangle', 'sine', 'triangle'][i]
            volume = [0.3, 0.2, 0.25, 0.15][i]
            
            note_samples = generate_wave(freq, 1.5, wave_type, volume)
            for j in range(len(chord_samples)):
                if j < len(note_samples):
                    chord_samples[j] += note_samples[j]
        
        # 转换为整数
        for i in range(len(chord_samples)):
            chord_samples[i] = int(max(-1.0, min(1.0, chord_samples[i])) * 32767)
        
        samples.extend(chord_samples)
    
    # 添加旋律
    melody = ['E4', 'G4', 'A4', 'G4', 'E4', 'R', 'D4', 'C4']
    for note in melody:
        if note == 'R':
            samples.extend([0] * int(SAMPLE_RATE * 0.25))
        else:
            note_samples = generate_wave(NOTE_FREQS[note], 0.25, 'sine', 0.4)
            samples.extend([int(s * 32767) for s in note_samples])
    
    return samples

def generate_rich_2_pop():
    """铃声2：流行风格（低音+和弦+旋律）"""
    samples = []
    
    # 低音线
    bass_line = ['C3', 'C3', 'F3', 'F3', 'G3', 'G3', 'C3', 'C3']
    
    # 和弦节奏型
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
        
        # 低音（方波，有力度）
        bass_freq = NOTE_FREQS[bass_line[i]]
        bass_samples = generate_wave(bass_freq, 0.5, 'square', 0.3)
        for j in range(len(segment_samples)):
            if j < len(bass_samples):
                segment_samples[j] += bass_samples[j] * 0.5
        
        # 和弦（柔和的正弦波）
        for note in chords[i]:
            freq = NOTE_FREQS[note]
            chord_samples = generate_wave(freq, 0.5, 'sine', 0.2)
            for j in range(len(segment_samples)):
                if j < len(chord_samples):
                    segment_samples[j] += chord_samples[j]
        
        # 节奏性琶音（高音区）
        if i % 2 == 0:
            arp_note = ['C5', 'E5', 'G5', 'C6'][i % 4]
            arp_samples = generate_wave(NOTE_FREQS[arp_note], 0.5, 'triangle', 0.15)
            for j in range(len(segment_samples)):
                if j < len(arp_samples) and j % 4 == 0:  # 每4个样本加一个（创造节奏感）
                    segment_samples[j] += arp_samples[j] * 0.5
        
        # 转换为整数
        for j in range(len(segment_samples)):
            segment_samples[j] = int(max(-1.0, min(1.0, segment_samples[j])) * 32767)
        
        samples.extend(segment_samples)
    
    return samples

def generate_rich_3_cinematic():
    """铃声3：电影配乐风格（宏大、层次丰富）"""
    samples = []
    
    # 第一段：低音铺垫
    pad_notes = ['C3', 'G3', 'C4', 'E4']
    pad_samples = [0.0] * int(SAMPLE_RATE * 3)
    
    for note in pad_notes:
        freq = NOTE_FREQS[note]
        note_samples = generate_wave(freq, 3, 'sine', 0.2)
        for i in range(len(pad_samples)):
            if i < len(note_samples):
                pad_samples[i] += note_samples[i]
    
    # 转换为整数
    pad_int = [int(max(-1.0, min(1.0, s)) * 32767) for s in pad_samples]
    samples.extend(pad_int)
    
    # 第二段：旋律进入
    melody = ['E4', 'G4', 'A4', 'B4', 'A4', 'G4', 'E4', 'D4']
    for note in melody:
        note_samples = generate_wave(NOTE_FREQS[note], 0.3, 'triangle', 0.4)
        samples.extend([int(s * 32767) for s in note_samples])
        
        # 每个旋律音后加短暂停顿
        samples.extend([0] * int(SAMPLE_RATE * 0.05))
    
    # 第三段：高潮（和弦+旋律同时）
    climax_chord = ['C4', 'E4', 'G4', 'C5']
    climax_samples = [0.0] * int(SAMPLE_RATE * 2)
    
    for note in climax_chord:
        freq = NOTE_FREQS[note]
        note_samples = generate_wave(freq, 2, 'sine', 0.25)
        for i in range(len(climax_samples)):
            if i < len(note_samples):
                climax_samples[i] += note_samples[i]
    
    # 添加高潮旋律
    climax_melody = ['E5', 'D5', 'C5']
    for note in climax_melody:
        freq = NOTE_FREQS[note]
        note_samples = generate_wave(freq, 0.6, 'triangle', 0.3)
        for i in range(len(climax_samples)):
            idx = i % int(SAMPLE_RATE * 0.6)
            if idx < len(note_samples):
                climax_samples[i] += note_samples[idx] * 0.5
    
    # 转换为整数
    climax_int = [int(max(-1.0, min(1.0, s)) * 32767) for s in climax_samples]
    samples.extend(climax_int)
    
    return samples

def generate_rich_4_jazz():
    """铃声4：爵士风格（复杂和弦+切分音）"""
    samples = []
    
    # 爵士和弦进程
    jazz_chords = [
        ['C4', 'E4', 'G4', 'Bb4'],  # Cmaj7
        ['A3', 'C4', 'E4', 'G4'],   # Am7
        ['F3', 'A3', 'C4', 'E4'],   # Fmaj7
        ['G3', 'B3', 'D4', 'F4'],   # G7
    ]
    
    for chord in jazz_chords:
        chord_samples = [0.0] * int(SAMPLE_RATE * 1.2)
        
        # 和弦（柔和的锯齿波）
        for note in chord:
            freq = NOTE_FREQS[note]
            note_samples = generate_wave(freq, 1.2, 'sawtooth', 0.15)
            for i in range(len(chord_samples)):
                if i < len(note_samples):
                    chord_samples[i] += note_samples[i] * 0.5
        
        # 添加切分音节奏（高音区）
        for beat in range(4):
            start_idx = int(beat * SAMPLE_RATE * 0.3)
            if start_idx < len(chord_samples):
                arp_note = chord[beat % len(chord)]
                freq = NOTE_FREQS[arp_note] * 2  # 高八度
                for i in range(int(SAMPLE_RATE * 0.1)):
                    if start_idx + i < len(chord_samples):
                        t = i / SAMPLE_RATE
                        value = math.sin(2 * math.pi * freq * t) * 0.2
                        chord_samples[start_idx + i] += value
        
        # 转换为整数
        for i in range(len(chord_samples)):
            chord_samples[i] = int(max(-1.0, min(1.0, chord_samples[i])) * 32767)
        
        samples.extend(chord_samples)
    
    # 添加爵士旋律（蓝调音阶）
    jazz_melody = ['E4', 'G4', 'A4', 'Bb4', 'A4', 'G4', 'E4', 'D4']
    for note in jazz_melody:
        note_samples = generate_wave(NOTE_FREQS[note], 0.25, 'sine', 0.35)
        samples.extend([int(s * 32767) for s in note_samples])
    
    return samples

def generate_rich_5_epic():
    """铃声5：史诗风格（强低音+铜管+弦乐）"""
    samples = []
    
    # 第一段：强力和弦
    power_chords = [
        ['C3', 'G3', 'C4', 'G4'],  # C5和弦
        ['F3', 'C4', 'F4', 'C5'],  # F5和弦
        ['G3', 'D4', 'G4', 'D5'],  # G5和弦
        ['C3', 'G3', 'C4', 'G4'],  # C5和弦
    ]
    
    for chord in power_chords:
        chord_samples = [0.0] * int(SAMPLE_RATE * 1.5)
        
        # 低音（方波，有力）
        bass_freq = NOTE_FREQS[chord[0]]
        bass_samples = generate_wave(bass_freq, 1.5, 'square', 0.4)
        for i in range(len(chord_samples)):
            if i < len(bass_samples):
                chord_samples[i] += bass_samples[i]
        
        # 中音（锯齿波，铜管感）
        for note in chord[1:3]:
            freq = NOTE_FREQS[note]
            note_samples = generate_wave(freq, 1.5, 'sawtooth', 0.25)
            for i in range(len(chord_samples)):
                if i < len(note_samples):
                    chord_samples[i] += note_samples[i]
        
        # 高音（正弦波，弦乐感）
        for note in chord[2:]:
            freq = NOTE_FREQS[note]
            note_samples = generate_wave(freq, 1.5, 'sine', 0.2)
            for i in range(len(chord_samples)):
                if i < len(note_samples):
                    chord_samples[i] += note_samples[i]
        
        # 转换为整数
        for i in range(len(chord_samples)):
            chord_samples[i] = int(max(-1.0, min(1.0, chord_samples[i])) * 32767)
        
        samples.extend(chord_samples)
    
    # 第二段：史诗旋律（高音区）
    epic_melody = ['E5', 'G5', 'A5', 'G5', 'E5', 'D5', 'C5', 'D5', 'E5']
    for note in epic_melody:
        note_samples = generate_wave(NOTE_FREQS[note], 0.3, 'sawtooth', 0.3)
        samples.extend([int(s * 32767) for s in note_samples])
    
    return samples

def generate_rich_6_minimalist():
    """铃声6：极简主义风格（重复模式+渐进复杂化）"""
    samples = []
    
    # 基础模式
    base_pattern = ['C4', 'E4', 'G4', 'E4']
    
    # 第一阶段：简单重复
    for repeat in range(4):
        for note in base_pattern:
            note_samples = generate_wave(NOTE_FREQS[note], 0.25, 'sine', 0.3)
            samples.extend([int(s * 32767) for s in note_samples])
    
    # 第二阶段：添加低音
    bass_pattern = ['C3', 'C3', 'G3', 'G3']
    for i in range(8):
        if i % 2 == 0:
            note = bass_pattern[i // 2 % len(bass_pattern)]
            note_samples = generate_wave(NOTE_FREQS[note], 0.5, 'triangle', 0.25)
            start_idx = i * int(SAMPLE_RATE * 0.5)
            for j in range(len(note_samples)):
                if start_idx + j < len(samples):
                    # 混合到低音部分
                    if start_idx + j < len(samples):
                        samples[start_idx + j] += int(note_samples[j] * 32767 * 0.5)
    
    # 第三阶段：增加复杂度（添加高音装饰）
    for i in range(8):
        if i % 2 == 1:
            note = ['E5', 'G5', 'C6', 'E6'][i % 4]
            start_time = 3.5 + i * 0.25  # 3.5秒后开始
            start_idx = int(start_time * SAMPLE_RATE)
            note_samples = generate_wave(NOTE_FREQS[note], 0.2, 'sine', 0.2)
            for j in range(len(note_samples)):
                if start_idx + j < len(samples):
                    samples[start_idx + j] += int(note_samples[j] * 32767)
    
    # 第四阶段：全部叠加，高潮
    final_chord = ['C4', 'E4', 'G4', 'C5']
    final_samples = [0.0] * int(SAMPLE_RATE * 2)
    
    for note in final_chord:
        freq = NOTE_FREQS[note]
        note_samples = generate_wave(freq, 2, 'sine', 0.3)
        for i in range(len(final_samples)):
            if i < len(note_samples):
                final_samples[i] += note_samples[i]
    
    # 转换为整数并追加
    final_int = [int(max(-1.0, min(1.0, s)) * 32767) for s in final_samples]
    samples.extend(final_int)
    
    return samples

def save_wav(filename, samples):
    """保存为WAV文件"""
    # 确保长度正确
    target_samples = SAMPLE_RATE * DURATION
    if len(samples) > target_samples:
        samples = samples[:target_samples]
    else:
        samples.extend([0] * (target_samples - len(samples)))
    
    # 确保不溢出
    samples = [max(-32768, min(32767, s)) for s in samples]
    
    with wave.open(str(filename), 'wb') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(SAMPLE_RATE)
        
        for sample in samples:
            wav_file.writeframes(struct.pack('<h', sample))
    
    # 检查音量
    max_amp = max(abs(s) for s in samples)
    print(f"Generated: {filename.name} (max: {max_amp}, {max_amp/32767*100:.1f}%)")

def main():
    output_dir = Path("E:/项目/SoccerAlarmPro/ringtons")
    output_dir.mkdir(exist_ok=True)
    
    print("Generating RICH melody ringtones (multi-layered)...")
    print(f"Output: {output_dir}")
    print("=" * 60)
    
    ringtones = [
        (generate_rich_1_orchestra, "rich_1_orchestra.wav"),
        (generate_rich_2_pop, "rich_2_pop.wav"),
        (generate_rich_3_cinematic, "rich_3_cinematic.wav"),
        (generate_rich_4_jazz, "rich_4_jazz.wav"),
        (generate_rich_5_epic, "rich_5_epic.wav"),
        (generate_rich_6_minimalist, "rich_6_minimalist.wav"),
    ]
    
    for gen_func, filename in ringtones:
        print(f"\nGenerating: {filename}")
        samples = gen_func()
        save_wav(output_dir / filename, samples)
    
    print("\n" + "=" * 60)
    print("All RICH ringtones generated!")
    print(f"Location: {output_dir}")
    print("\nThese ringtones have:")
    print("- Multiple layers (bass, chords, melody)")
    print("- Different waveforms (sine, square, sawtooth, triangle)")
    print("- ADSR envelopes for natural sound")
    print("- Complex arrangements (8 seconds each)")

if __name__ == "__main__":
    main()
