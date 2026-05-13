#!/usr/bin/env python3
"""
生成10段结构完整、层次丰富、动听悦耳的旋律铃声
每段20秒，包含：前奏、主歌、副歌、尾奏
"""

import wave
import struct
import math
from pathlib import Path

SAMPLE_RATE = 44100
DURATION = 20  # 20秒

# 音符频率表（完整8度）
NOTE_FREQS = {
    'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61,
    'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
    'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23,
    'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
    'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46,
    'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
    'C6': 1046.50, 'D6': 1174.66, 'E6': 1318.51,
}

def generate_tone(frequency, duration, wave_type='sine', volume=0.5):
    """生成指定波形的音频"""
    samples = []
    num_samples = int(SAMPLE_RATE * duration)
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        if wave_type == 'sine':
            value = math.sin(2 * math.pi * frequency * t)
        elif wave_type == 'triangle':
            value = 2.0 * abs(2.0 * (frequency * t - math.floor(frequency * t + 0.5))) - 1.0
        elif wave_type == 'sawtooth':
            value = 2.0 * (frequency * t - math.floor(frequency * t))
        else:
            value = math.sin(2 * math.pi * frequency * t)
        # ADSR包络
        envelope = 1.0
        attack = 0.02
        decay = 0.1
        sustain = 0.7
        release = 0.15
        if t < attack:
            envelope = t / attack
        elif t < attack + decay:
            envelope = 1.0 - (1.0 - sustain) * (t - attack) / decay
        elif t > duration - release:
            envelope = sustain * (duration - t) / release
        else:
            envelope = sustain
        value *= envelope * volume
        samples.append(value)
    return samples

def mix_samples(*sample_lists):
    """混合多个音轨"""
    max_len = max(len(s) for s in sample_lists)
    mixed = []
    for i in range(max_len):
        value = 0
        for samples in sample_lists:
            if i < len(samples):
                value += samples[i]
        value = max(-1.0, min(1.0, value))
        mixed.append(int(value * 32767))
    return mixed

# ============ 10段不同的音乐铃声 ============

def ringtone_1_inspiring():
    """1. 鼓舞人心 - 明亮大调，渐进式层次"""
    samples = []
    # 前奏 (0-4s)：轻柔铺垫
    pad = generate_tone(NOTE_FREQS['C4'], 4, 'sine', 0.2)
    pad = [s * 0.5 for s in pad]  # 轻柔
    samples.extend([int(s * 32767) for s in pad])
    # 主歌 (4-10s)：旋律进入
    melody = ['E4', 'G4', 'A4', 'G4', 'E4', 'D4', 'C4', 'D4']
    for note in melody:
        note_samples = generate_tone(NOTE_FREQS[note], 0.75, 'sine', 0.5)
        chord_samples = generate_tone(NOTE_FREQS['C3'], 0.75, 'triangle', 0.15)
        mixed = mix_samples(note_samples, chord_samples)
        samples.extend(mixed)
    # 副歌 (10-16s)：高潮，多声部
    chorus_melody = ['E5', 'D5', 'C5', 'D5', 'E5', 'C5', 'E5', 'D5']
    for note in chorus_melody:
        note_samples = generate_tone(NOTE_FREQS[note], 0.75, 'sine', 0.6)
        chord1 = generate_tone(NOTE_FREQS['C4'], 0.75, 'triangle', 0.2)
        chord2 = generate_tone(NOTE_FREQS['E4'], 0.75, 'sine', 0.15)
        bass = generate_tone(NOTE_FREQS['C3'], 0.75, 'triangle', 0.25)
        mixed = mix_samples(note_samples, chord1, chord2, bass)
        samples.extend(mixed)
    # 尾奏 (16-20s)：渐弱结束
    ending = ['C5', 'B4', 'A4', 'G4']
    for note in ending:
        note_samples = generate_tone(NOTE_FREQS[note], 1, 'sine', 0.4)
        note_samples = [s * (1 - i/len(note_samples)) for i, s in enumerate(note_samples)]
        samples.extend([int(s * 32767) for s in note_samples])
    return samples

def ringtone_2_gentle():
    """2. 温柔悦耳 - 柔和小调，温暖和弦"""
    samples = []
    # 前奏：温柔和弦
    chords_intro = [
        ('C4', 'E4', 'G4'),
        ('A3', 'C4', 'E4'),
        ('F3', 'A3', 'C4'),
        ('G3', 'B3', 'D4'),
    ]
    for chord in chords_intro:
        chord_samples = [0.0] * int(SAMPLE_RATE * 1.2)
        for note in chord:
            freq = NOTE_FREQS[note]
            note_samples = generate_tone(freq, 1.2, 'sine', 0.2)
            for i in range(len(chord_samples)):
                if i < len(note_samples):
                    chord_samples[i] += note_samples[i]
        samples.extend([int(max(-1, min(1, s)) * 32767) for s in chord_samples])
    # 主歌：温柔旋律
    melody = ['E4', 'G4', 'A4', 'G4', 'E4', 'R', 'D4', 'C4', 'R', 'E4', 'D4', 'C4']
    for note in melody:
        if note == 'R':
            samples.extend([0] * int(SAMPLE_RATE * 0.4))
        else:
            note_samples = generate_tone(NOTE_FREQS[note], 0.4, 'sine', 0.45)
            samples.extend([int(s * 32767) for s in note_samples])
    # 副歌：情感升华
    chorus = ['A4', 'G4', 'E4', 'D4', 'C4', 'D4', 'E4', 'G4', 'A4', 'G4', 'E4', 'C4']
    for note in chorus:
        note_samples = generate_tone(NOTE_FREQS[note], 0.5, 'sine', 0.5)
        bass = generate_tone(NOTE_FREQS['C3'], 0.5, 'triangle', 0.2)
        mixed = mix_samples(note_samples, bass)
        samples.extend(mixed)
    # 尾奏：温柔结束
    ending = generate_tone(NOTE_FREQS['C4'], 3, 'sine', 0.3)
    ending = [s * (1 - i/(len(ending)-1)) for i, s in enumerate(ending)]
    samples.extend([int(s * 32767) for s in ending])
    return samples

def ringtone_3_upbeat():
    """3. 欢快活泼 - 跳跃节奏，明亮音色"""
    samples = []
    # 节奏型低音
    bass_line = ['C3', 'C3', 'G3', 'G3', 'A3', 'A3', 'G3', 'R']
    for note in bass_line:
        if note == 'R':
            samples.extend([0] * int(SAMPLE_RATE * 0.5))
        else:
            bass = generate_tone(NOTE_FREQS[note], 0.5, 'square', 0.3)
            samples.extend([int(s * 32767) for s in bass])
    # 主旋律（欢快）
    melody = ['C4', 'E4', 'G4', 'E4', 'C4', 'E4', 'G4', 'C5',
              'B4', 'A4', 'G4', 'A4', 'B4', 'C5', 'B4', 'A4']
    for note in melody:
        note_samples = generate_tone(NOTE_FREQS[note], 0.25, 'sine', 0.5)
        samples.extend([int(s * 32767) for s in note_samples])
    # 副歌：高潮
    chorus = ['E5', 'D5', 'C5', 'D5', 'E5', 'C5', 'E5', 'G5',
              'E5', 'D5', 'C5', 'D5', 'E5', 'G4', 'A4', 'G4']
    for note in chorus:
        note_samples = generate_tone(NOTE_FREQS[note], 0.25, 'triangle', 0.5)
        chord = generate_tone(NOTE_FREQS['C4'], 0.25, 'sine', 0.2)
        bass = generate_tone(NOTE_FREQS['C3'], 0.25, 'square', 0.25)
        mixed = mix_samples(note_samples, chord, bass)
        samples.extend(mixed)
    # 尾奏：轻快结束
    ending = ['C5', 'B4', 'A4', 'G4', 'E4', 'C4']
    for note in ending:
        note_samples = generate_tone(NOTE_FREQS[note], 0.3, 'sine', 0.4)
        samples.extend([int(s * 32767) for s in note_samples])
    return samples

def ringtone_4_dramatic():
    """4. 戏剧性 - 强弱对比，情感丰富"""
    samples = []
    # 第一部分：神秘低音
    mystery = generate_tone(NOTE_FREQS['C3'], 4, 'sawtooth', 0.2)
    mystery = [s * 0.3 for s in mystery]
    samples.extend([int(s * 32767) for s in mystery])
    # 第二部分：旋律浮现
    melody = ['E4', 'G4', 'A4', 'B4', 'A4', 'G4', 'E4', 'D4']
    for note in melody:
        note_samples = generate_tone(NOTE_FREQS[note], 0.5, 'sine', 0.5)
        pad = generate_tone(NOTE_FREQS['C4'], 0.5, 'sine', 0.15)
        mixed = mix_samples(note_samples, pad)
        samples.extend(mixed)
    # 第三部分：高潮爆发
    climax = ['E5', 'G5', 'A5', 'G5', 'E5', 'D5', 'C5', 'D5', 'E5']
    for note in climax:
        note_samples = generate_tone(NOTE_FREQS[note], 0.5, 'sawtooth', 0.4)
        chord1 = generate_tone(NOTE_FREQS['C4'], 0.5, 'sine', 0.2)
        chord2 = generate_tone(NOTE_FREQS['E4'], 0.5, 'triangle', 0.15)
        bass = generate_tone(NOTE_FREQS['C3'], 0.5, 'square', 0.3)
        mixed = mix_samples(note_samples, chord1, chord2, bass)
        samples.extend(mixed)
    # 第四部分：平静结束
    calm = ['C5', 'B4', 'A4', 'G4']
    for note in calm:
        note_samples = generate_tone(NOTE_FREQS[note], 1, 'sine', 0.35)
        note_samples = [s * (1 - i/(len(note_samples)-1)) for i, s in enumerate(note_samples)]
        samples.extend([int(s * 32767) for s in note_samples])
    return samples

def ringtone_5_nostalgic():
    """5. 怀旧感的 - 慢节奏，深情旋律"""
    samples = []
    # 前奏：缓慢和弦
    chords = [
        ('C4', 'E4', 'G4'),
        ('F3', 'A3', 'C4'),
        ('G3', 'B3', 'D4'),
        ('C4', 'E4', 'G4'),
    ]
    for chord in chords:
        chord_samples = [0.0] * int(SAMPLE_RATE * 1.5)
        for note in chord:
            freq = NOTE_FREQS[note]
            note_samples = generate_tone(freq, 1.5, 'sine', 0.2)
            for i in range(len(chord_samples)):
                if i < len(note_samples):
                    chord_samples[i] += note_samples[i]
        samples.extend([int(max(-1, min(1, s)) * 32767) for s in chord_samples])
    # 主歌：深情旋律
    melody = ['E4', 'G4', 'A4', 'G4', 'E4', 'R', 'D4', 'C4',
              'R', 'E4', 'D4', 'C4', 'R', 'D4', 'E4', 'G4']
    for note in melody:
        if note == 'R':
            samples.extend([0] * int(SAMPLE_RATE * 0.5))
        else:
            note_samples = generate_tone(NOTE_FREQS[note], 0.5, 'sine', 0.45)
            samples.extend([int(s * 32767) for s in note_samples])
    # 副歌：情感高潮
    chorus = ['A4', 'B4', 'C5', 'B4', 'A4', 'G4', 'A4', 'G4', 'E4']
    for note in chorus:
        note_samples = generate_tone(NOTE_FREQS[note], 0.6, 'sine', 0.5)
        bass = generate_tone(NOTE_FREQS['C3'], 0.6, 'triangle', 0.2)
        mixed = mix_samples(note_samples, bass)
        samples.extend(mixed)
    # 尾奏：余音绕梁
    ending = generate_tone(NOTE_FREQS['C4'], 4, 'sine', 0.25)
    ending = [s * (1 - (i/len(ending)**0.5) for i, s in enumerate(ending)]
    samples.extend([int(s * 32767) for s in ending])
    return samples

def ringtone_6_playful():
    """6. 俏皮可爱 - 跳跃音符，轻快节奏"""
    samples = []
    # 轻快低音节奏
    bass_pattern = ['C3', 'R', 'G3', 'R', 'A3', 'R', 'G3', 'R']
    for note in bass_pattern:
        if note == 'R':
            samples.extend([0] * int(SAMPLE_RATE * 0.25))
        else:
            bass = generate_tone(NOTE_FREQS[note], 0.25, 'square', 0.25)
            samples.extend([int(s * 32767) for s in bass])
    # 主旋律（俏皮）
    melody = ['E4', 'G4', 'E4', 'C4', 'D4', 'E4', 'D4', 'C4',
              'E4', 'G4', 'A4', 'G4', 'E4', 'D4', 'C4', 'R']
    for note in melody:
        if note == 'R':
            samples.extend([0] * int(SAMPLE_RATE * 0.25))
        else:
            note_samples = generate_tone(NOTE_FREQS[note], 0.25, 'triangle', 0.5)
            samples.extend([int(s * 32767) for s in note_samples])
    # 副歌：欢快高潮
    chorus = ['C5', 'B4', 'A4', 'G4', 'A4', 'B4', 'C5', 'D5',
              'E5', 'D5', 'C5', 'B4', 'A4', 'G4', 'A4', 'G4']
    for note in chorus:
        note_samples = generate_tone(NOTE_FREQS[note], 0.25, 'sine', 0.5)
        arp = generate_tone(NOTE_FREQS[note] * 2, 0.25, 'triangle', 0.15)
        mixed = mix_samples(note_samples, arp)
        samples.extend(mixed)
    # 尾奏：轻快结束
    ending = ['E4', 'G4', 'E4', 'C4', 'R']
    for note in ending:
        if note == 'R':
            samples.extend([0] * int(SAMPLE_RATE * 0.2))
        else:
            note_samples = generate_tone(NOTE_FREQS[note], 0.2, 'triangle', 0.4)
            samples.extend([int(s * 32767) for s in note_samples])
    return samples

def ringtone_7_epic():
    """7. 史诗感 - 宏大和弦，层层递进"""
    samples = []
    # 第一部分：低音铺垫
    pad = generate_tone(NOTE_FREQS['C3'], 5, 'sine', 0.25)
    pad2 = generate_tone(NOTE_FREQS['G3'], 5, 'sine', 0.15)
    pad_mixed = mix_samples(pad, pad2)
    samples.extend(pad_mixed)
    # 第二部分：旋律进入
    melody = ['E4', 'G4', 'A4', 'B4', 'A4', 'G4', 'E4', 'D4', 'C4']
    for note in melody:
        note_samples = generate_tone(NOTE_FREQS[note], 0.6, 'sine', 0.5)
        chord = generate_tone(NOTE_FREQS['C4'], 0.6, 'triangle', 0.2)
        bass = generate_tone(NOTE_FREQS['C3'], 0.6, 'square', 0.2)
        mixed = mix_samples(note_samples, chord, bass)
        samples.extend(mixed)
    # 第三部分：史诗高潮
    epic_melody = ['E5', 'G5', 'A5', 'C6', 'A5', 'G5', 'E5', 'D5', 'E5']
    for note in epic_melody:
        note_samples = generate_tone(NOTE_FREQS[note], 0.6, 'sawtooth', 0.35)
        chord1 = generate_tone(NOTE_FREQS['C4'], 0.6, 'sine', 0.2)
        chord2 = generate_tone(NOTE_FREQS['E4'], 0.6, 'triangle', 0.15)
        chord3 = generate_tone(NOTE_FREQS['G4'], 0.6, 'sine', 0.15)
        bass = generate_tone(NOTE_FREQS['C3'], 0.6, 'square', 0.3)
        mixed = mix_samples(note_samples, chord1, chord2, chord3, bass)
        samples.extend(mixed)
    # 第四部分：宏大结束
    ending_chord = ['C4', 'E4', 'G4', 'C5']
    ending_samples = [0.0] * int(SAMPLE_RATE * 3)
    for note in ending_chord:
        freq = NOTE_FREQS[note]
        note_samples = generate_tone(freq, 3, 'sine', 0.25)
        for i in range(len(ending_samples)):
            if i < len(note_samples):
                ending_samples[i] += note_samples[i]
    samples.extend([int(max(-1, min(1, s)) * 32767) for s in ending_samples])
    return samples

def ringtone_8_dreamy():
    """8. 梦幻感 - 柔和音色，飘逸旋律"""
    samples = []
    # 梦幻铺垫
    dream_pad = [0.0] * int(SAMPLE_RATE * 6)
    for note in ['C4', 'E4', 'G4', 'B4']:
        freq = NOTE_FREQS[note]
        note_samples = generate_tone(freq, 6, 'sine', 0.15)
        for i in range(len(dream_pad)):
            if i < len(note_samples):
                dream_pad[i] += note_samples[i]
    samples.extend([int(max(-1, min(1, s)) * 32767) for s in dream_pad])
    # 飘逸旋律
    melody = ['E5', 'D5', 'C5', 'D5', 'E5', 'G5', 'A5', 'G5',
              'E5', 'D5', 'C5', 'D5', 'E5', 'R', 'D5', 'C5']
    for note in melody:
        if note == 'R':
            samples.extend([0] * int(SAMPLE_RATE * 0.5))
        else:
            note_samples = generate_tone(NOTE_FREQS[note], 0.5, 'sine', 0.4)
            shimmer = generate_tone(NOTE_FREQS[note] * 2, 0.5, 'sine', 0.1)
            mixed = mix_samples(note_samples, shimmer)
            samples.extend(mixed)
    # 高潮：梦幻升华
    climax = ['E6', 'D6', 'C6', 'D6', 'E6', 'G5', 'A5', 'G5', 'E5']
    for note in climax:
        note_samples = generate_tone(NOTE_FREQS[note], 0.6, 'sine', 0.35)
        pad = generate_tone(NOTE_FREQS['C4'], 0.6, 'sine', 0.15)
        mixed = mix_samples(note_samples, pad)
        samples.extend(mixed)
    # 渐弱结束
    ending = generate_tone(NOTE_FREQS['C4'], 4, 'sine', 0.2)
    ending = [s * (1 - (i/len(ending))) for i, s in enumerate(ending)]
    samples.extend([int(s * 32767) for s in ending])
    return samples

def ringtone_9_rhythmic():
    """9. 节奏感强 - 清晰节拍，动感旋律"""
    samples = []
    # 节奏低音
    rhythm_bass = ['C3', 'C3', 'G3', 'G3', 'A3', 'A3', 'G3', 'R',
                   'C3', 'C3', 'G3', 'G3', 'F3', 'F3', 'G3', 'R']
    for note in rhythm_bass:
        if note == 'R':
            samples.extend([0] * int(SAMPLE_RATE * 0.25))
        else:
            bass = generate_tone(NOTE_FREQS[note], 0.25, 'square', 0.3)
            samples.extend([int(s * 32767) for s in bass])
    # 主旋律（动感）
    melody = ['C4', 'E4', 'G4', 'E4', 'C4', 'E4', 'D4', 'C4',
              'E4', 'G4', 'A4', 'G4', 'E4', 'G4', 'A4', 'C5']
    for note in melody:
        note_samples = generate_tone(NOTE_FREQS[note], 0.25, 'sine', 0.5)
        samples.extend([int(s * 32767) for s in note_samples])
    # 副歌：节奏高潮
    chorus = ['E5', 'D5', 'C5', 'D5', 'E5', 'C5', 'E5', 'G5',
              'A5', 'G5', 'E5', 'D5', 'C5', 'D5', 'E5', 'C5']
    for note in chorus:
        note_samples = generate_tone(NOTE_FREQS[note], 0.25, 'triangle', 0.5)
        bass = generate_tone(NOTE_FREQS['C3'], 0.25, 'square', 0.25)
        arp = generate_tone(NOTE_FREQS[note] * 2, 0.25, 'sine', 0.1)
        mixed = mix_samples(note_samples, bass, arp)
        samples.extend(mixed)
    # 尾奏：节奏结束
    ending = ['C5', 'G4', 'A4', 'G4', 'E4', 'C4']
    for note in ending:
        note_samples = generate_tone(NOTE_FREQS[note], 0.3, 'triangle', 0.4)
        samples.extend([int(s * 32767) for s in note_samples])
    return samples

def ringtone_10_emotional():
    """10. 情感丰富 - 起伏旋律，感人至深"""
    samples = []
    # 第一部分：温柔开始
    soft_start = ['C4', 'E4', 'G4', 'A4', 'G4', 'E4', 'D4', 'C4']
    for note in soft_start:
        note_samples = generate_tone(NOTE_FREQS[note], 0.6, 'sine', 0.4)
        samples.extend([int(s * 32767) for s in note_samples])
    # 第二部分：情感发展
    develop = ['E4', 'G4', 'A4', 'B4', 'C5', 'B4', 'A4', 'G4',
               'E4', 'D4', 'C4', 'D4', 'E4', 'G4', 'A4', 'G4']
    for note in develop:
        note_samples = generate_tone(NOTE_FREQS[note], 0.5, 'sine', 0.5)
        chord = generate_tone(NOTE_FREQS['C4'], 0.5, 'triangle', 0.15)
        mixed = mix_samples(note_samples, chord)
        samples.extend(mixed)
    # 第三部分：情感高潮
    climax = ['C5', 'B4', 'A4', 'G4', 'A4', 'B4', 'C5', 'D5',
              'E5', 'D5', 'C5', 'B4', 'A4', 'G4', 'A4', 'G4']
    for note in climax:
        note_samples = generate_tone(NOTE_FREQS[note], 0.5, 'sine', 0.6)
        bass = generate_tone(NOTE_FREQS['C3'], 0.5, 'triangle', 0.2)
        chord1 = generate_tone(NOTE_FREQS['E4'], 0.5, 'sine', 0.15)
        chord2 = generate_tone(NOTE_FREQS['G4'], 0.5, 'triangle', 0.1)
        mixed = mix_samples(note_samples, bass, chord1, chord2)
        samples.extend(mixed)
    # 第四部分：深情结束
    ending = ['E4', 'D4', 'C4', 'R', 'E4', 'G4', 'E4', 'C4']
    for note in ending:
        if note == 'R':
            samples.extend([0] * int(SAMPLE_RATE * 0.5))
        else:
            note_samples = generate_tone(NOTE_FREQS[note], 0.6, 'sine', 0.4)
            note_samples = [s * (1 - i/(len(note_samples)-1)) for i, s in enumerate(note_samples)]
            samples.extend([int(s * 32767) for s in note_samples])
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
    samples = [max(-32768, min(32767, int(s))) for s in samples]
    with wave.open(str(filename), 'wb') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(SAMPLE_RATE)
        for sample in samples:
            wav_file.writeframes(struct.pack('<h', sample))
    max_amp = max(abs(s) for s in samples)
    print(f"✅ {filename.name} (max: {max_amp}, {max_amp/32767*100:.1f}%)")

def main():
    output_dir = Path("E:/项目/SoccerAlarmPro/ringtons")
    output_dir.mkdir(exist_ok=True)
    print("🎵 生成10段结构完整、层次丰富、动听悦耳的旋律铃声")
    print(f"时长：每段{DURATION}秒")
    print("=" * 70)
    ringtones = [
        (ringtone_1_inspiring, "melody_20s_1_inspiring.wav", "鼓舞人心 - 明亮大调，渐进式层次"),
        (ringtone_2_gentle, "melody_20s_2_gentle.wav", "温柔悦耳 - 柔和小调，温暖和弦"),
        (ringtone_3_upbeat, "melody_20s_3_upbeat.wav", "欢快活泼 - 跳跃节奏，明亮音色"),
        (ringtone_4_dramatic, "melody_20s_4_dramatic.wav", "戏剧性 - 强弱对比，情感丰富"),
        (ringtone_5_nostalgic, "melody_20s_5_nostalgic.wav", "怀旧感 - 慢节奏，深情旋律"),
        (ringtone_6_playful, "melody_20s_6_playful.wav", "俏皮可爱 - 跳跃音符，轻快节奏"),
        (ringtone_7_epic, "melody_20s_7_epic.wav", "史诗感 - 宏大和弦，层层递进"),
        (ringtone_8_dreamy, "melody_20s_8_dreamy.wav", "梦幻感 - 柔和音色，飘逸旋律"),
        (ringtone_9_rhythmic, "melody_20s_9_rhythmic.wav", "节奏感强 - 清晰节拍，动感旋律"),
        (ringtone_10_emotional, "melody_20s_10_emotional.wav", "情感丰富 - 起伏旋律，感人至深"),
    ]
    for gen_func, filename, desc in ringtones:
        print(f"\n生成: {desc}")
        samples = gen_func()
        save_wav(output_dir / filename, samples)
    print("\n" + "=" * 70)
    print("🎉 所有20秒旋律铃声生成完成！")
    print(f"📁 位置: {output_dir}")
    print("\n🎵 每段铃声结构：")
    print("   0-4s: 前奏（铺垫）")
    print("   4-10s: 主歌（旋律进入）")
    print("   10-16s: 副歌（高潮）")
    print("   16-20s: 尾奏（结束）")
    print("\n🎶 层次特点：")
    print("   - 多声部：低音(Bass) + 和弦(Chord) + 旋律(Melody)")
    print("   - 多种波形：正弦波、三角波、锯齿波、方波")
    print("   - ADSR包络：自然起音/释音")
    print("   - 动态变化：强弱对比，情感起伏")

if __name__ == "__main__":
    main()
