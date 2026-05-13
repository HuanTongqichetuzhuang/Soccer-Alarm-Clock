#!/usr/bin/env python3
"""
测试生成的铃声文件，检查是否有音频数据
"""

import wave
import struct
import math
from pathlib import Path

def analyze_wav(filename):
    """分析WAV文件，检查是否有音频数据"""
    try:
        with wave.open(str(filename), 'r') as wav_file:
            # 读取文件信息
            nchannels = wav_file.getnchannels()
            sampwidth = wav_file.getsampwidth()
            framerate = wav_file.getframerate()
            nframes = wav_file.getnframes()
            
            print(f"\n分析文件: {filename.name}")
            print(f"  声道数: {nchannels}")
            print(f"  采样位数: {sampwidth * 8}bit")
            print(f"  采样率: {framerate}Hz")
            print(f"  帧数: {nframes}")
            print(f"  时长: {nframes / framerate:.2f}秒")
            
            # 读取所有帧
            frames = wav_file.readframes(nframes)
            
            # 解析为16位整数
            samples = []
            for i in range(0, len(frames), 2):
                sample = struct.unpack('<h', frames[i:i+2])[0]
                samples.append(sample)
            
            # 检查是否有非零样本
            non_zero = sum(1 for s in samples if s != 0)
            max_amplitude = max(abs(s) for s in samples) if samples else 0
            
            print(f"  非零样本数: {non_zero}/{len(samples)}")
            print(f"  最大振幅: {max_amplitude}")
            
            if max_amplitude == 0:
                print("  ❌ 警告: 文件没有音频数据（全为0）")
                return False
            elif max_amplitude < 1000:
                print("  ⚠️  警告: 音频音量可能太小")
                return False
            else:
                print("  ✅ 文件包含音频数据")
                return True
                
    except Exception as e:
        print(f"  ❌ 错误: {e}")
        return False

def generate_test_tone():
    """生成一个测试音调（确保有声音）"""
    output_dir = Path("E:/项目/SoccerAlarmPro/ringtons")
    output_dir.mkdir(exist_ok=True)
    
    filename = output_dir / "test_tone.wav"
    
    sample_rate = 44100
    duration = 3  # 3秒
    frequency = 440.0  # A4音符
    
    samples = []
    for i in range(sample_rate * duration):
        t = i / sample_rate
        # 使用较大的音量（0.8）
        value = math.sin(2 * math.pi * frequency * t) * 0.8
        # 转换为16位整数
        int_value = int(value * 32767)
        samples.append(int_value)
    
    # 保存为WAV
    with wave.open(str(filename), 'w') as wav_file:
        wav_file.setnchannels(1)  # 单声道
        wav_file.setsampwidth(2)  # 16位
        wav_file.setframerate(sample_rate)
        
        # 写入所有样本
        for sample in samples:
            wav_file.writeframes(struct.pack('<h', sample))
    
    print(f"\n✅ 已生成测试音调: {filename}")
    print(f"   频率: {frequency}Hz (A4)")
    print(f"   时长: {duration}秒")
    print(f"   音量: 80%")
    
    # 分析生成的文件
    analyze_wav(filename)

def main():
    """主函数"""
    output_dir = Path("E:/项目/SoccerAlarmPro/ringtons")
    
    print("=" * 60)
    print("检查生成的铃声文件")
    print("=" * 60)
    
    # 检查所有WAV文件
    wav_files = list(output_dir.glob("*.wav"))
    
    if not wav_files:
        print("\n❌ 没有找到WAV文件")
        print("先生成测试音调...")
        generate_test_tone()
        return
    
    print(f"\n找到 {len(wav_files)} 个WAV文件:")
    
    all_good = True
    for wav_file in wav_files:
        if not analyze_wav(wav_file):
            all_good = False
    
    if not all_good:
        print("\n" + "=" * 60)
        print("发现一些问题，生成测试音调用于对比...")
        print("=" * 60)
        generate_test_tone()
    else:
        print("\n✅ 所有文件都包含音频数据")

if __name__ == "__main__":
    main()
