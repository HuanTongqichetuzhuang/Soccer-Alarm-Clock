#!/usr/bin/env python3
"""
生成有旋律的闹钟铃声
包含音乐盒、钢琴、铃声等多种风格
"""

import wave
import struct
import math
from pathlib import Path

# 音频参数
SAMPLE_RATE = 44100  # Hz
DURATION = 5  # 秒（旋律铃声可以长一点）

# 音符频率表（C4到C7）
NOTE_FREQS = {
    'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23,
    'G4': 392.00, 'A4': 440.00, 'B4': 493.88, 'C5': 523.25,
    'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99,
    'A5': 880.00, 'B5': 987.77, 'C6': 1046.50, 'D6': 1174.66,
    'E6': 1318.51, 'F6': 1396.91, 'G6': 1567.98, 'A6': 1760.00,
    'B6': 1975.53, 'C7': 2093.00
}

def generate_note(note, duration, volume=0.5, sample_rate=SAMPLE_RATE):
    """生成一个音符（note可以是音符名称如'C6'或频率数值）"""
    # 如果note是字符串（音符名称），则获取频率
    if isinstance(note, str):
        frequency = NOTE_FREQS.get(note, 440.0)
    else:
        frequency = note
    
    samples = []
    num_samples = int(sample_rate * duration)
    
    for i in range(num_samples):
        t = i / sample_rate
        # 使用纯正弦波
        value = math.sin(2 * math.pi * frequency * t) * volume
        
        # 添加包络（起音和释音）
        envelope = 1.0
        if i < sample_rate * 0.01:  # 10ms起音
            envelope = i / (sample_rate * 0.01)
        elif i > num_samples - sample_rate * 0.05:  # 50ms释音
            envelope = (num_samples - i) / (sample_rate * 0.05)
        
        value *= envelope
        samples.append(int(value * 32767))
    
    return samples

def generate_melody(notes, note_duration=0.2, volume=0.5):
    """生成一段旋律"""
    samples = []
    for note in notes:
        if note == 'R':  # 休止符
            samples.extend([0] * int(SAMPLE_RATE * note_duration))
        else:
            freq = NOTE_FREQS.get(note, 440)  # 默认A4
            note_samples = generate_note(freq, note_duration, volume)
            samples.extend(note_samples)
    return samples

def generate_ringtone_1_music_box():
    """铃声1: 音乐盒风格（简单欢快的旋律）"""
    # 小星星变奏
    melody = [
        'C4', 'C4', 'G4', 'G4', 'A4', 'A4', 'G4', 'R',
        'F4', 'F4', 'E4', 'E4', 'D4', 'D4', 'C4', 'R',
        'G4', 'G4', 'F4', 'F4', 'E4', 'E4', 'D4', 'R',
        'G4', 'G4', 'F4', 'F4', 'E4', 'E4', 'D4', 'R',
        'C4', 'C4', 'G4', 'G4', 'A4', 'A4', 'G4', 'R',
        'F4', 'F4', 'E4', 'E4', 'D4', 'D4', 'C4', 'R'
    ]
    return generate_melody(melody, note_duration=0.15, volume=0.4)

def generate_ringtone_2_piano():
    """铃声2: 钢琴风格（简单和弦+旋律）"""
    samples = []
    
    # 简单的前奏
    chords = [
        ('C4', 'E4', 'G4'),  # C大调
        ('F4', 'A4', 'C5'),  # F大调
        ('G4', 'B4', 'D5'),  # G大调
        ('C4', 'E4', 'G4'),  # C大调
    ]
    
    for chord in chords:
        # 播放和弦
        chord_samples = []
        for i in range(int(SAMPLE_RATE * 0.5)):  # 每个和弦0.5秒
            t = i / SAMPLE_RATE
            value = 0
            for note in chord:
                freq = NOTE_FREQS[note]
                value += math.sin(2 * math.pi * freq * t) * 0.2
            chord_samples.append(int(value * 32767))
        samples.extend(chord_samples)
    
    # 添加简单旋律
    melody = ['E4', 'G4', 'A4', 'G4', 'E4', 'R', 'D4', 'C4']
    melody_samples = generate_melody(melody, note_duration=0.25, volume=0.3)
    samples.extend(melody_samples)
    
    return samples

def generate_ringtone_3_chime():
    """铃声3: 风铃风格（清脆的高音）"""
    samples = []
    
    # 高频风铃音
    chime_notes = ['C5', 'E5', 'G5', 'C6', 'E6', 'G6']
    
    for i in range(len(chime_notes) * 2):  # 重复两次
        note = chime_notes[i % len(chime_notes)]
        freq = NOTE_FREQS[note]
        
        # 风铃音短促清脆
        note_samples = []
        for j in range(int(SAMPLE_RATE * 0.3)):
            t = j / SAMPLE_RATE
            # 快速衰减
            decay = math.exp(-3 * t)
            value = math.sin(2 * math.pi * freq * t) * decay * 0.5
            note_samples.append(int(value * 32767))
        
        samples.extend(note_samples)
        # 短暂停顿
        samples.extend([0] * int(SAMPLE_RATE * 0.1))
    
    return samples

def generate_ringtone_4_alarm_melody():
    """铃声4: 警报旋律（有旋律的警报声）"""
    samples = []
    
    # 两音交替的警报旋律
    note_pairs = [('C5', 'E5'), ('D5', 'F5'), ('E5', 'G5'), ('F5', 'A5')]
    
    for pair in note_pairs:
        for repeat in range(2):  # 每对重复2次
            for note in pair:
                freq = NOTE_FREQS[note]
                note_samples = generate_note(freq, 0.15, volume=0.6)
                samples.extend(note_samples)
            # 短暂停顿
            samples.extend([0] * int(SAMPLE_RATE * 0.05))
    
    # 最后以高音结束
    final_samples = generate_note('C6', 1.0, volume=0.7)
    samples.extend(final_samples)
    
    return samples

def generate_ringtone_5_wake_up():
    """铃声5: 唤醒旋律（渐进式，越来越快）"""
    samples = []
    
    # 简单的上行音阶
    scale = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']
    
    # 第一阶段：慢速
    for note in scale:
        freq = NOTE_FREQS[note]
        note_samples = generate_note(freq, 0.3, volume=0.4)
        samples.extend(note_samples)
    
    # 第二阶段：中速
    for i in range(2):
        for note in scale:
            freq = NOTE_FREQS[note]
            note_samples = generate_note(freq, 0.15, volume=0.5)
            samples.extend(note_samples)
    
    # 第三阶段：快速
    for i in range(4):
        for note in scale[:4]:  # 只播放前4个音符
            freq = NOTE_FREQS[note]
            note_samples = generate_note(freq, 0.08, volume=0.6)
            samples.extend(note_samples)
    
    return samples

def generate_ringtone_6_gentle_song():
    """铃声6: 柔和歌曲片段（简单悦耳的旋律）"""
    # 简单的 melody（类似生日歌）
    melody = [
        'C4', 'C4', 'D4', 'C4', 'F4', 'E4', 'R',
        'C4', 'C4', 'D4', 'C4', 'G4', 'F4', 'R',
        'C4', 'C4', 'C5', 'A4', 'F4', 'E4', 'D4', 'R',
        'B4', 'B4', 'A4', 'F4', 'G4', 'F4', 'R'
    ]
    return generate_melody(melody, note_duration=0.2, volume=0.4)

def save_wav(filename, samples, sample_rate=SAMPLE_RATE):
    """保存为WAV文件"""
    # 确保长度正确
    target_samples = sample_rate * DURATION
    if len(samples) > target_samples:
        samples = samples[:target_samples]
    else:
        samples.extend([0] * (target_samples - len(samples)))
    
    with wave.open(str(filename), 'w') as wav_file:
        wav_file.setnchannels(1)  # 单声道
        wav_file.setsampwidth(2)  # 16位
        wav_file.setframerate(sample_rate)
        
        # 写入所有样本
        for sample in samples:
            # 确保样本在16位范围内
            sample = max(-32768, min(32767, sample))
            wav_file.writeframes(struct.pack('<h', sample))
    
    print(f"Generated: {filename.name} ({len(samples)/sample_rate:.1f}s)")

def main():
    """主函数"""
    # 创建输出目录
    output_dir = Path("E:/项目/SoccerAlarmPro/ringtons")
    output_dir.mkdir(exist_ok=True)
    
    print("Generating melody ringtones...")
    print(f"Output directory: {output_dir}")
    print("-" * 60)
    
    # 生成铃声1：音乐盒风格
    print("1. Music box style...")
    samples1 = generate_ringtone_1_music_box()
    save_wav(output_dir / "melody_1_music_box.wav", samples1)
    
    # 生成铃声2：钢琴风格
    print("2. Piano style...")
    samples2 = generate_ringtone_2_piano()
    save_wav(output_dir / "melody_2_piano.wav", samples2)
    
    # 生成铃声3：风铃风格
    print("3. Wind chime style...")
    samples3 = generate_ringtone_3_chime()
    save_wav(output_dir / "melody_3_chime.wav", samples3)
    
    # 生成铃声4：警报旋律
    print("4. Alarm melody...")
    samples4 = generate_ringtone_4_alarm_melody()
    save_wav(output_dir / "melody_4_alarm_melody.wav", samples4)
    
    # 生成铃声5：唤醒旋律
    print("5. Wake-up melody...")
    samples5 = generate_ringtone_5_wake_up()
    save_wav(output_dir / "melody_5_wake_up.wav", samples5)
    
    # 生成铃声6：柔和歌曲
    print("6. Gentle song...")
    samples6 = generate_ringtone_6_gentle_song()
    save_wav(output_dir / "melody_6_gentle_song.wav", samples6)
    
    print("-" * 60)
    print("All melody ringtones generated successfully!")
    print(f"Files location: {output_dir}")
    print("\nRingtone descriptions:")
    print("1. melody_1_music_box.wav - Music box (simple cheerful melody)")
    print("2. melody_2_piano.wav - Piano (chord + melody)")
    print("3. melody_3_chime.wav - Wind chime (crisp high notes)")
    print("4. melody_4_alarm_melody.wav - Alarm melody (melodic alarm)")
    print("5. melody_5_wake_up.wav - Wake-up (progressive, getting faster)")
    print("6. melody_6_gentle_song.wav - Gentle song (pleasant melody)")

if __name__ == "__main__":
    main()
