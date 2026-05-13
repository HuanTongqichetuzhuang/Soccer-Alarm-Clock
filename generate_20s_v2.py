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
DURATION = 20

NOTE_FREQS = {
    'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61,
    'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
    'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23,
    'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
    'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46,
    'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
    'C6': 1046.50,
}

def generate_tone(frequency, duration, wave_type='sine', volume=0.5):
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

def ringtone_1_inspiring():
    """1. 鼓舞人心"""
    samples = []
    # 前奏
    pad = [s * 0.3 for s in generate_tone(NOTE_FREQS['C4'], 4, 'sine', 0.2)]
    samples.extend([int(s * 32767) for s in pad])
    # 主歌
    for note in ['E4', 'G4', 'A4', 'G4', 'E4', 'D4', 'C4', 'D4']:
        m = generate_tone(NOTE_FREQS[note], 0.75, 'sine', 0.5)
        c = generate_tone(NOTE_FREQS['C3'], 0.75, 'triangle', 0.15)
        samples.extend(mix_samples(m, c))
    # 副歌
    for note in ['E5', 'D5', 'C5', 'D5', 'E5', 'C5', 'E5', 'D5']:
        m = generate_tone(NOTE_FREQS[note], 0.75, 'sine', 0.6)
        c1 = generate_tone(NOTE_FREQS['C4'], 0.75, 'triangle', 0.2)
        c2 = generate_tone(NOTE_FREQS['E4'], 0.75, 'sine', 0.15)
        b = generate_tone(NOTE_FREQS['C3'], 0.75, 'triangle', 0.25)
        samples.extend(mix_samples(m, c1, c2, b))
    # 尾奏
    for note in ['C5', 'B4', 'A4', 'G4']:
        s = generate_tone(NOTE_FREQS[note], 1, 'sine', 0.4)
        s = [s[i] * (1 - i/len(s)) for i in range(len(s))]
        samples.extend([int(x * 32767) for x in s])
    return samples

def ringtone_2_gentle():
    """2. 温柔悦耳"""
    samples = []
    # 前奏
    for note in ['C4', 'E4', 'G4', 'C5']:
        s = generate_tone(NOTE_FREQS[note], 1.2, 'sine', 0.15)
        samples.extend([int(x * 32767) for x in s])
    # 主歌
    for note in ['E4', 'G4', 'A4', 'G4', 'E4', 'R', 'D4', 'C4']:
        if note == 'R':
            samples.extend([0] * int(SAMPLE_RATE * 0.4))
        else:
            s = generate_tone(NOTE_FREQS[note], 0.4, 'sine', 0.45)
            samples.extend([int(x * 32767) for x in s])
    # 副歌
    for note in ['A4', 'G4', 'E4', 'D4', 'C4', 'D4', 'E4', 'G4']:
        m = generate_tone(NOTE_FREQS[note], 0.5, 'sine', 0.5)
        b = generate_tone(NOTE_FREQS['C3'], 0.5, 'triangle', 0.2)
        samples.extend(mix_samples(m, b))
    # 尾奏
    s = generate_tone(NOTE_FREQS['C4'], 3, 'sine', 0.3)
    s = [s[i] * (1 - (i/len(s))**0.5) for i in range(len(s))]
    samples.extend([int(x * 32767) for x in s])
    return samples

def ringtone_3_upbeat():
    """3. 欢快活泼"""
    samples = []
    # 低音节奏
    for note in ['C3', 'C3', 'G3', 'G3', 'A3', 'A3', 'G3', 'R']:
        if note == 'R':
            samples.extend([0] * int(SAMPLE_RATE * 0.5))
        else:
            s = generate_tone(NOTE_FREQS[note], 0.5, 'square', 0.3)
            samples.extend([int(x * 32767) for x in s])
    # 主旋律
    for note in ['C4', 'E4', 'G4', 'E4', 'C4', 'E4', 'G4', 'C5']:
        s = generate_tone(NOTE_FREQS[note], 0.25, 'sine', 0.5)
        samples.extend([int(x * 32767) for x in s])
    # 副歌
    for note in ['E5', 'D5', 'C5', 'D5', 'E5', 'C5', 'E5', 'G5']:
        m = generate_tone(NOTE_FREQS[note], 0.25, 'triangle', 0.5)
        c = generate_tone(NOTE_FREQS['C4'], 0.25, 'sine', 0.2)
        b = generate_tone(NOTE_FREQS['C3'], 0.25, 'square', 0.25)
        samples.extend(mix_samples(m, c, b))
    # 尾奏
    for note in ['C5', 'B4', 'A4', 'G4', 'E4', 'C4']:
        s = generate_tone(NOTE_FREQS[note], 0.3, 'sine', 0.4)
        samples.extend([int(x * 32767) for x in s])
    return samples

def ringtone_4_dramatic():
    """4. 戏剧性"""
    samples = []
    # 神秘低音
    s = generate_tone(NOTE_FREQS['C3'], 4, 'sawtooth', 0.2)
    s = [x * 0.3 for x in s]
    samples.extend([int(x * 32767) for x in s])
    # 旋律浮现
    for note in ['E4', 'G4', 'A4', 'B4', 'A4', 'G4', 'E4', 'D4']:
        m = generate_tone(NOTE_FREQS[note], 0.5, 'sine', 0.5)
        p = generate_tone(NOTE_FREQS['C4'], 0.5, 'sine', 0.15)
        samples.extend(mix_samples(m, p))
    # 高潮爆发
    for note in ['E5', 'G5', 'A5', 'G5', 'E5', 'D5', 'C5', 'D5']:
        m = generate_tone(NOTE_FREQS[note], 0.5, 'sawtooth', 0.4)
        c1 = generate_tone(NOTE_FREQS['C4'], 0.5, 'sine', 0.2)
        c2 = generate_tone(NOTE_FREQS['E4'], 0.5, 'triangle', 0.15)
        b = generate_tone(NOTE_FREQS['C3'], 0.5, 'square', 0.3)
        samples.extend(mix_samples(m, c1, c2, b))
    # 平静结束
    for note in ['C5', 'B4', 'A4', 'G4']:
        s = generate_tone(NOTE_FREQS[note], 1, 'sine', 0.35)
        s = [s[i] * (1 - i/len(s)) for i in range(len(s))]
        samples.extend([int(x * 32767) for x in s])
    return samples

def ringtone_5_nostalgic():
    """5. 怀旧感"""
    samples = []
    # 前奏
    for note in ['C4', 'E4', 'G4', 'C5', 'A3', 'C4', 'E4', 'G4']:
        s = generate_tone(NOTE_FREQS[note], 0.6, 'sine', 0.15)
        samples.extend([int(x * 32767) for x in s])
    # 主歌
    melody = ['E4', 'G4', 'A4', 'G4', 'E4', 'R', 'D4', 'C4',
              'R', 'E4', 'D4', 'C4', 'R', 'D4', 'E4', 'G4']
    for note in melody:
        if note == 'R':
            samples.extend([0] * int(SAMPLE_RATE * 0.5))
        else:
            s = generate_tone(NOTE_FREQS[note], 0.5, 'sine', 0.45)
            samples.extend([int(x * 32767) for x in s])
    # 副歌
    for note in ['A4', 'B4', 'C5', 'B4', 'A4', 'G4', 'A4', 'G4']:
        m = generate_tone(NOTE_FREQS[note], 0.6, 'sine', 0.5)
        b = generate_tone(NOTE_FREQS['C3'], 0.6, 'triangle', 0.2)
        samples.extend(mix_samples(m, b))
    # 尾奏
    s = generate_tone(NOTE_FREQS['C4'], 4, 'sine', 0.25)
    s = [s[i] * (1 - (i/len(s))**0.5) for i in range(len(s))]
    samples.extend([int(x * 32767) for x in s])
    return samples

def ringtone_6_playful():
    """6. 俏皮可爱"""
    samples = []
    # 轻快低音
    for note in ['C3', 'R', 'G3', 'R', 'A3', 'R', 'G3', 'R']:
        if note == 'R':
            samples.extend([0] * int(SAMPLE_RATE * 0.25))
        else:
            s = generate_tone(NOTE_FREQS[note], 0.25, 'square', 0.25)
            samples.extend([int(x * 32767) for x in s])
    # 主旋律
    for note in ['E4', 'G4', 'E4', 'C4', 'D4', 'E4', 'D4', 'C4']:
        s = generate_tone(NOTE_FREQS[note], 0.25, 'triangle', 0.5)
        samples.extend([int(x * 32767) for x in s])
    # 副歌
    for note in ['C5', 'B4', 'A4', 'G4', 'A4', 'B4', 'C5', 'D5']:
        m = generate_tone(NOTE_FREQS[note], 0.25, 'sine', 0.5)
        a = generate_tone(NOTE_FREQS[note] * 2, 0.25, 'triangle', 0.15)
        samples.extend(mix_samples(m, a))
    # 尾奏
    for note in ['E4', 'G4', 'E4', 'C4', 'R']:
        if note == 'R':
            samples.extend([0] * int(SAMPLE_RATE * 0.2))
        else:
            s = generate_tone(NOTE_FREQS[note], 0.2, 'triangle', 0.4)
            samples.extend([int(x * 32767) for x in s])
    return samples

def ringtone_7_epic():
    """7. 史诗感"""
    samples = []
    # 铺垫
    pad = [0.0] * int(SAMPLE_RATE * 5)
    for note in ['C3', 'G3', 'C4', 'E4']:
        s = generate_tone(NOTE_FREQS[note], 5, 'sine', 0.15)
        for i in range(len(pad)):
            if i < len(s):
                pad[i] += s[i]
    samples.extend([int(max(-1, min(1, x)) * 32767) for x in pad])
    # 旋律进入
    for note in ['E4', 'G4', 'A4', 'B4', 'A4', 'G4', 'E4', 'D4']:
        m = generate_tone(NOTE_FREQS[note], 0.6, 'sine', 0.5)
        c = generate_tone(NOTE_FREQS['C4'], 0.6, 'triangle', 0.2)
        b = generate_tone(NOTE_FREQS['C3'], 0.6, 'square', 0.2)
        samples.extend(mix_samples(m, c, b))
    # 史诗高潮
    for note in ['E5', 'G5', 'A5', 'C6', 'A5', 'G5', 'E5', 'D5']:
        m = generate_tone(NOTE_FREQS[note], 0.6, 'sawtooth', 0.35)
        c1 = generate_tone(NOTE_FREQS['C4'], 0.6, 'sine', 0.2)
        c2 = generate_tone(NOTE_FREQS['E4'], 0.6, 'triangle', 0.15)
        b = generate_tone(NOTE_FREQS['C3'], 0.6, 'square', 0.3)
        samples.extend(mix_samples(m, c1, c2, b))
    # 宏大结束
    ending = [0.0] * int(SAMPLE_RATE * 3)
    for note in ['C4', 'E4', 'G4', 'C5']:
        s = generate_tone(NOTE_FREQS[note], 3, 'sine', 0.25)
        for i in range(len(ending)):
            if i < len(s):
                ending[i] += s[i]
    samples.extend([int(max(-1, min(1, x)) * 32767) for x in ending])
    return samples

def ringtone_8_dreamy():
    """8. 梦幻感"""
    samples = []
    # 梦幻铺垫
    pad = [0.0] * int(SAMPLE_RATE * 6)
    for note in ['C4', 'E4', 'G4', 'B4']:
        s = generate_tone(NOTE_FREQS[note], 6, 'sine', 0.12)
        for i in range(len(pad)):
            if i < len(s):
                pad[i] += s[i]
    samples.extend([int(max(-1, min(1, x)) * 32767) for x in pad])
    # 飘逸旋律
    melody = ['E5', 'D5', 'C5', 'D5', 'E5', 'G5', 'A5', 'G5',
              'E5', 'D5', 'C5', 'D5', 'E5', 'R', 'D5', 'C5']
    for note in melody:
        if note == 'R':
            samples.extend([0] * int(SAMPLE_RATE * 0.5))
        else:
            m = generate_tone(NOTE_FREQS[note], 0.5, 'sine', 0.4)
            sh = generate_tone(NOTE_FREQS[note] * 2, 0.5, 'sine', 0.1)
            samples.extend(mix_samples(m, sh))
    # 高潮
    for note in ['E6', 'D6', 'C6', 'D6', 'E6', 'G5', 'A5', 'G5']:
        m = generate_tone(NOTE_FREQS[note], 0.6, 'sine', 0.35)
        p = generate_tone(NOTE_FREQS['C4'], 0.6, 'sine', 0.15)
        samples.extend(mix_samples(m, p))
    # 渐弱结束
    s = generate_tone(NOTE_FREQS['C4'], 4, 'sine', 0.2)
    s = [s[i] * (1 - (i/len(s))**0.5) for i in range(len(s))]
    samples.extend([int(x * 32767) for x in s])
    return samples

def ringtone_9_rhythmic():
    """9. 节奏感强"""
    samples = []
    # 节奏低音
    for note in ['C3', 'C3', 'G3', 'G3', 'A3', 'A3', 'G3', 'R']:
        if note == 'R':
            samples.extend([0] * int(SAMPLE_RATE * 0.25))
        else:
            s = generate_tone(NOTE_FREQS[note], 0.25, 'square', 0.3)
            samples.extend([int(x * 32767) for x in s])
    # 主旋律
    for note in ['C4', 'E4', 'G4', 'E4', 'C4', 'E4', 'D4', 'C4']:
        s = generate_tone(NOTE_FREQS[note], 0.25, 'sine', 0.5)
        samples.extend([int(x * 32767) for x in s])
    # 副歌
    for note in ['E5', 'D5', 'C5', 'D5', 'E5', 'C5', 'E5', 'G5']:
        m = generate_tone(NOTE_FREQS[note], 0.25, 'triangle', 0.5)
        b = generate_tone(NOTE_FREQS['C3'], 0.25, 'square', 0.25)
        a = generate_tone(NOTE_FREQS[note] * 2, 0.25, 'sine', 0.1)
        samples.extend(mix_samples(m, b, a))
    # 尾奏
    for note in ['C5', 'G4', 'A4', 'G4', 'E4', 'C4']:
        s = generate_tone(NOTE_FREQS[note], 0.3, 'triangle', 0.4)
        samples.extend([int(x * 32767) for x in s])
    return samples

def ringtone_10_emotional():
    """10. 情感丰富"""
    samples = []
    # 温柔开始
    for note in ['C4', 'E4', 'G4', 'A4', 'G4', 'E4', 'D4', 'C4']:
        s = generate_tone(NOTE_FREQS[note], 0.6, 'sine', 0.4)
        samples.extend([int(x * 32767) for x in s])
    # 情感发展
    develop = ['E4', 'G4', 'A4', 'B4', 'C5', 'B4', 'A4', 'G4',
               'E4', 'D4', 'C4', 'D4', 'E4', 'G4', 'A4', 'G4']
    for note in develop:
        m = generate_tone(NOTE_FREQS[note], 0.5, 'sine', 0.5)
        c = generate_tone(NOTE_FREQS['C4'], 0.5, 'triangle', 0.15)
        samples.extend(mix_samples(m, c))
    # 情感高潮
    climax = ['C5', 'B4', 'A4', 'G4', 'A4', 'B4', 'C5', 'D5',
              'E5', 'D5', 'C5', 'B4', 'A4', 'G4', 'A4', 'G4']
    for note in climax:
        m = generate_tone(NOTE_FREQS[note], 0.5, 'sine', 0.6)
        b = generate_tone(NOTE_FREQS['C3'], 0.5, 'triangle', 0.2)
        c1 = generate_tone(NOTE_FREQS['E4'], 0.5, 'sine', 0.15)
        c2 = generate_tone(NOTE_FREQS['G4'], 0.5, 'triangle', 0.1)
        samples.extend(mix_samples(m, b, c1, c2))
    # 深情结束
    ending = ['E4', 'D4', 'C4', 'R', 'E4', 'G4', 'E4', 'C4']
    for note in ending:
        if note == 'R':
            samples.extend([0] * int(SAMPLE_RATE * 0.5))
        else:
            s = generate_tone(NOTE_FREQS[note], 0.6, 'sine', 0.4)
            s = [s[i] * (1 - i/len(s)) for i in range(len(s))]
            samples.extend([int(x * 32767) for x in s])
    return samples

def save_wav(filename, samples):
    target = SAMPLE_RATE * DURATION
    if len(samples) > target:
        samples = samples[:target]
    else:
        samples.extend([0] * (target - len(samples)))
    samples = [max(-32768, min(32767, int(s))) for s in samples]
    with wave.open(str(filename), 'wb') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(SAMPLE_RATE)
        for s in samples:
            f.writeframes(struct.pack('<h', s))
    max_amp = max(abs(s) for s in samples)
    print(f"✅ {filename.name} (max: {max_amp}, {max_amp/32767*100:.1f}%)")

def main():
    output_dir = Path("E:/项目/SoccerAlarmPro/ringtons")
    output_dir.mkdir(exist_ok=True)
    print("🎵 生成10段20秒结构完整、层次丰富、动听悦耳的旋律铃声")
    print("=" * 70)
    ringtones = [
        (ringtone_1_inspiring, "melody_20s_1_inspiring.wav", "鼓舞人心"),
        (ringtone_2_gentle, "melody_20s_2_gentle.wav", "温柔悦耳"),
        (ringtone_3_upbeat, "melody_20s_3_upbeat.wav", "欢快活泼"),
        (ringtone_4_dramatic, "melody_20s_4_dramatic.wav", "戏剧性"),
        (ringtone_5_nostalgic, "melody_20s_5_nostalgic.wav", "怀旧感"),
        (ringtone_6_playful, "melody_20s_6_playful.wav", "俏皮可爱"),
        (ringtone_7_epic, "melody_20s_7_epic.wav", "史诗感"),
        (ringtone_8_dreamy, "melody_20s_8_dreamy.wav", "梦幻感"),
        (ringtone_9_rhythmic, "melody_20s_9_rhythmic.wav", "节奏感强"),
        (ringtone_10_emotional, "melody_20s_10_emotional.wav", "情感丰富"),
    ]
    for func, fname, desc in ringtones:
        print(f"\n生成: {desc}")
        samples = func()
        save_wav(output_dir / fname, samples)
    print("\n" + "=" * 70)
    print("🎉 所有20秒旋律铃声生成完成！")
    print(f"📁 位置: {output_dir}")
    print("\n🎵 每段铃声结构：")
    print("  0-4s:  前奏（铺垫）")
    print("  4-10s: 主歌（旋律进入）")
    print("  10-16s: 副歌（高潮）")
    print("  16-20s: 尾奏（结束）")

if __name__ == "__main__":
    main()
