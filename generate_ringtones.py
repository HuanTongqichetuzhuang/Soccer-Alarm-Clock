#!/usr/bin/env python3
"""
生成足球闹钟Pro的闹钟铃声
生成4种不同风格的WAV格式铃声
"""

import numpy as np
import wave
import struct
from pathlib import Path

# 音频参数
SAMPLE_RATE = 44100  # Hz
DURATION = 3  # 秒

def generate_beep_tone(frequency, duration, volume=0.5):
    """生成简单的蜂鸣声"""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), False)
    tone = np.sin(frequency * 2 * np.pi * t) * volume
    return tone

def generate_alarm_sound_1():
    """铃声1: 渐进式警报声（由慢到快）"""
    samples = []
    
    # 第一阶段：慢速蜂鸣（0-1秒）
    for i in range(SAMPLE_RATE):
        frequency = 800 + (i / SAMPLE_RATE) * 400  # 800-1200Hz
        t = i / SAMPLE_RATE
        sample = np.sin(2 * np.pi * frequency * t) * 0.5
        samples.append(sample)
    
    # 第二阶段：快速交替（1-2秒）
    for i in range(SAMPLE_RATE):
        if (i // 1000) % 2 == 0:  # 每1000个样本切换一次
            frequency = 1000
        else:
            frequency = 800
        t = i / SAMPLE_RATE
        sample = np.sin(2 * np.pi * frequency * t) * 0.7
        samples.append(sample)
    
    # 第三阶段：持续高音（2-3秒）
    t = np.linspace(0, 1, SAMPLE_RATE)
    tone = np.sin(2 * np.pi * 1200 * t) * 0.8
    samples.extend(tone)
    
    return np.array(samples)

def generate_alarm_sound_2():
    """铃声2: 足球场警报声（类似体育场警报）"""
    samples = []
    
    # 低频嗡嗡声 + 高频警报
    t = np.linspace(0, DURATION, SAMPLE_RATE * DURATION, False)
    
    # 低频部分（200Hz）
    low_freq = 200
    low_tone = np.sin(2 * np.pi * low_freq * t) * 0.3
    
    # 高频交替部分（800-1200Hz）
    high_tone = np.zeros_like(t)
    for i in range(len(t)):
        if (i // (SAMPLE_RATE // 4)) % 2 == 0:  # 每0.25秒切换
            freq = 1200
        else:
            freq = 800
        high_tone[i] = np.sin(2 * np.pi * freq * t[i]) * 0.5
    
    # 合并
    combined = low_tone + high_tone
    return combined

def generate_alarm_sound_3():
    """铃声3: 急促蜂鸣（类似电子闹钟）"""
    samples = []
    beep_duration = 0.1  # 每次蜂鸣100ms
    silence_duration = 0.05  # 间隔50ms
    
    total_samples = SAMPLE_RATE * DURATION
    samples_per_beep = int(SAMPLE_RATE * beep_duration)
    samples_per_silence = int(SAMPLE_RATE * silence_duration)
    
    current_sample = 0
    beep_on = True
    
    while current_sample < total_samples:
        if beep_on:
            # 生成蜂鸣
            t = np.linspace(0, beep_duration, samples_per_beep, False)
            tone = np.sin(2 * np.pi * 1000 * t) * 0.7
            samples.extend(tone)
            current_sample += samples_per_beep
        else:
            # 生成静音
            silence = np.zeros(samples_per_silence)
            samples.extend(silence)
            current_sample += samples_per_silence
        
        beep_on = not beep_on
    
    return np.array(samples[:total_samples])

def generate_alarm_sound_4():
    """铃声4: 柔和铃声（渐进式，不会太刺耳）"""
    t = np.linspace(0, DURATION, SAMPLE_RATE * DURATION, False)
    
    # 多个频率叠加，产生和弦效果
    freq1 = 523.25  # C5
    freq2 = 659.25  # E5
    freq3 = 783.99  # G5
    
    tone1 = np.sin(2 * np.pi * freq1 * t) * 0.3
    tone2 = np.sin(2 * np.pi * freq2 * t) * 0.3
    tone3 = np.sin(2 * np.pi * freq3 * t) * 0.3
    
    # 添加渐进效果
    envelope = np.linspace(0.2, 1.0, len(t))  # 渐进音量
    combined = (tone1 + tone2 + tone3) * envelope
    
    return combined

def save_wav(filename, samples, sample_rate=SAMPLE_RATE):
    """保存为WAV文件"""
    # 归一化到[-1, 1]
    samples = np.array(samples)
    samples = np.clip(samples, -1, 1)
    
    # 转换为16位整数
    samples_int16 = (samples * 32767).astype(np.int16)
    
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1)  # 单声道
        wav_file.setsampwidth(2)  # 16位
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(samples_int16.tobytes())
    
    print(f"✅ 已生成: {filename}")

def main():
    """主函数"""
    # 创建输出目录
    output_dir = Path("E:/项目/SoccerAlarmPro/ringtons")
    output_dir.mkdir(exist_ok=True)
    
    print("🎵 开始生成闹钟铃声...")
    print(f"📁 输出目录: {output_dir}")
    print("-" * 50)
    
    # 生成铃声1：渐进式警报声
    print("生成铃声1: 渐进式警报声...")
    samples1 = generate_alarm_sound_1()
    save_wav(output_dir / "alarm_1_progressive.wav", samples1)
    
    # 生成铃声2：足球场警报声
    print("生成铃声2: 足球场警报声...")
    samples2 = generate_alarm_sound_2()
    save_wav(output_dir / "alarm_2_stadium.wav", samples2)
    
    # 生成铃声3：急促蜂鸣
    print("生成铃声3: 急促蜂鸣...")
    samples3 = generate_alarm_sound_3()
    save_wav(output_dir / "alarm_3_urgent.wav", samples3)
    
    # 生成铃声4：柔和铃声
    print("生成铃声4: 柔和铃声...")
    samples4 = generate_alarm_sound_4()
    save_wav(output_dir / "alarm_4_gentle.wav", samples4)
    
    print("-" * 50)
    print("🎉 所有铃声生成完成！")
    print(f"📁 文件位置: {output_dir}")
    print("\n铃声说明:")
    print("1. alarm_1_progressive.wav - 渐进式警报声（由慢到快）")
    print("2. alarm_2_stadium.wav - 足球场警报声（低频+高频交替）")
    print("3. alarm_3_urgent.wav - 急促蜂鸣（类似电子闹钟）")
    print("4. alarm_4_gentle.wav - 柔和铃声（和弦效果）")

if __name__ == "__main__":
    main()
