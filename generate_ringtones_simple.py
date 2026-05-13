#!/usr/bin/env python3
"""
生成足球闹钟Pro的闹钟铃声（简化版，不依赖numpy）
生成4种不同风格的WAV格式铃声
"""

import wave
import struct
import math
from pathlib import Path

# 音频参数
SAMPLE_RATE = 44100  # Hz
DURATION = 3  # 秒

def generate_sine_wave(frequency, duration, volume=0.5, sample_rate=SAMPLE_RATE):
    """生成正弦波"""
    samples = []
    num_samples = int(sample_rate * duration)
    
    for i in range(num_samples):
        t = i / sample_rate
        value = math.sin(2 * math.pi * frequency * t) * volume
        # 转换为16位整数
        int_value = int(value * 32767)
        samples.append(int_value)
    
    return samples

def generate_alarm_1():
    """铃声1: 渐进式警报声（由慢到快）"""
    samples = []
    
    # 第一阶段：慢速蜂鸣（0-1秒）
    for i in range(SAMPLE_RATE):
        frequency = 800 + (i / SAMPLE_RATE) * 400  # 800-1200Hz
        t = i / SAMPLE_RATE
        value = math.sin(2 * math.pi * frequency * t) * 0.5
        samples.append(int(value * 32767))
    
    # 第二阶段：快速交替（1-2秒）
    for i in range(SAMPLE_RATE):
        if (i // 1000) % 2 == 0:  # 每1000个样本切换一次
            frequency = 1000
        else:
            frequency = 800
        t = i / SAMPLE_RATE
        value = math.sin(2 * math.pi * frequency * t) * 0.7
        samples.append(int(value * 32767))
    
    # 第三阶段：持续高音（2-3秒）
    for i in range(SAMPLE_RATE):
        t = i / SAMPLE_RATE
        value = math.sin(2 * math.pi * 1200 * t) * 0.8
        samples.append(int(value * 32767))
    
    return samples

def generate_alarm_2():
    """铃声2: 足球场警报声（类似体育场警报）"""
    samples = []
    
    # 低频嗡嗡声 + 高频警报
    for i in range(SAMPLE_RATE * DURATION):
        t = i / SAMPLE_RATE
        
        # 低频部分（200Hz）
        low_value = math.sin(2 * math.pi * 200 * t) * 0.3
        
        # 高频交替部分（800-1200Hz）
        if (i // (SAMPLE_RATE // 4)) % 2 == 0:  # 每0.25秒切换
            freq = 1200
        else:
            freq = 800
        high_value = math.sin(2 * math.pi * freq * t) * 0.5
        
        # 合并
        combined = (low_value + high_value) * 0.7  # 防止溢出
        samples.append(int(combined * 32767))
    
    return samples

def generate_alarm_3():
    """铃声3: 急促蜂鸣（类似电子闹钟）"""
    samples = []
    beep_samples = int(SAMPLE_RATE * 0.1)  # 每次蜂鸣100ms
    silence_samples = int(SAMPLE_RATE * 0.05)  # 间隔50ms
    
    total_samples = SAMPLE_RATE * DURATION
    current_sample = 0
    beep_on = True
    
    while current_sample < total_samples:
        if beep_on:
            # 生成蜂鸣
            for i in range(min(beep_samples, total_samples - current_sample)):
                t = i / SAMPLE_RATE
                value = math.sin(2 * math.pi * 1000 * t) * 0.7
                samples.append(int(value * 32767))
                current_sample += 1
        else:
            # 生成静音
            for i in range(min(silence_samples, total_samples - current_sample)):
                samples.append(0)
                current_sample += 1
        
        beep_on = not beep_on
    
    return samples

def generate_alarm_4():
    """铃声4: 柔和铃声（渐进式，不会太刺耳）"""
    samples = []
    total_samples = SAMPLE_RATE * DURATION
    
    # 多个频率叠加，产生和弦效果
    freq1 = 523.25  # C5
    freq2 = 659.25  # E5
    freq3 = 783.99  # G5
    
    for i in range(total_samples):
        t = i / SAMPLE_RATE
        
        # 计算和弦
        value1 = math.sin(2 * math.pi * freq1 * t) * 0.3
        value2 = math.sin(2 * math.pi * freq2 * t) * 0.3
        value3 = math.sin(2 * math.pi * freq3 * t) * 0.3
        
        # 渐进效果
        envelope = 0.2 + (0.8 * i / total_samples)  # 渐进音量
        combined = (value1 + value2 + value3) * envelope
        
        samples.append(int(combined * 32767))
    
    return samples

def save_wav(filename, samples, sample_rate=SAMPLE_RATE):
    """保存为WAV文件"""
    with wave.open(str(filename), 'w') as wav_file:
        wav_file.setnchannels(1)  # 单声道
        wav_file.setsampwidth(2)  # 16位
        wav_file.setframerate(sample_rate)
        
        # 写入所有样本
        for sample in samples:
            # 确保样本在16位范围内
            sample = max(-32768, min(32767, sample))
            wav_file.writeframes(struct.pack('<h', sample))
    
    print(f"✅ 已生成: {filename.name}")

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
    samples1 = generate_alarm_1()
    save_wav(output_dir / "alarm_1_progressive.wav", samples1)
    
    # 生成铃声2：足球场警报声
    print("生成铃声2: 足球场警报声...")
    samples2 = generate_alarm_2()
    save_wav(output_dir / "alarm_2_stadium.wav", samples2)
    
    # 生成铃声3：急促蜂鸣
    print("生成铃声3: 急促蜂鸣...")
    samples3 = generate_alarm_3()
    save_wav(output_dir / "alarm_3_urgent.wav", samples3)
    
    # 生成铃声4：柔和铃声
    print("生成铃声4: 柔和铃声...")
    samples4 = generate_alarm_4()
    save_wav(output_dir / "alarm_4_gentle.wav", samples4)
    
    print("-" * 50)
    print("🎉 所有铃声生成完成！")
    print(f"📁 文件位置: {output_dir}")
    print("\n铃声说明:")
    print("1. alarm_1_progressive.wav - 渐进式警报声（由慢到快）")
    print("2. alarm_2_stadium.wav - 足球场警报声（低频+高频交替）")
    print("3. alarm_3_urgent.wav - 急促蜂鸣（类似电子闹钟）")
    print("4. alarm_4_gentle.wav - 柔和铃声（和弦效果）")
    print("\n💡 提示: 可以将这些WAV文件转换为MP3以减小文件大小")

if __name__ == "__main__":
    main()
