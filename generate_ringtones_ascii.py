#!/usr/bin/env python3
"""
Generate alarm ringtones for SoccerAlarmPro (Simple version, no dependencies)
Generates 4 different styles of WAV format ringtones
"""

import wave
import struct
import math
from pathlib import Path

# Audio parameters
SAMPLE_RATE = 44100  # Hz
DURATION = 3  # seconds

def generate_alarm_1():
    """Ringtone 1: Progressive alarm (slow to fast)"""
    samples = []
    
    # Phase 1: Slow beep (0-1 second)
    for i in range(SAMPLE_RATE):
        frequency = 800 + (i / SAMPLE_RATE) * 400  # 800-1200Hz
        t = i / SAMPLE_RATE
        value = math.sin(2 * math.pi * frequency * t) * 0.5
        samples.append(int(value * 32767))
    
    # Phase 2: Fast alternation (1-2 seconds)
    for i in range(SAMPLE_RATE):
        if (i // 1000) % 2 == 0:  # Switch every 1000 samples
            frequency = 1000
        else:
            frequency = 800
        t = i / SAMPLE_RATE
        value = math.sin(2 * math.pi * frequency * t) * 0.7
        samples.append(int(value * 32767))
    
    # Phase 3: Continuous high tone (2-3 seconds)
    for i in range(SAMPLE_RATE):
        t = i / SAMPLE_RATE
        value = math.sin(2 * math.pi * 1200 * t) * 0.8
        samples.append(int(value * 32767))
    
    return samples

def generate_alarm_2():
    """Ringtone 2: Stadium alarm (like sports venue alert)"""
    samples = []
    
    # Low frequency hum + high frequency alarm
    for i in range(SAMPLE_RATE * DURATION):
        t = i / SAMPLE_RATE
        
        # Low frequency part (200Hz)
        low_value = math.sin(2 * math.pi * 200 * t) * 0.3
        
        # High frequency alternation (800-1200Hz)
        if (i // (SAMPLE_RATE // 4)) % 2 == 0:  # Switch every 0.25 seconds
            freq = 1200
        else:
            freq = 800
        high_value = math.sin(2 * math.pi * freq * t) * 0.5
        
        # Combine
        combined = (low_value + high_value) * 0.7  # Prevent overflow
        samples.append(int(combined * 32767))
    
    return samples

def generate_alarm_3():
    """Ringtone 3: Urgent beep (like electronic alarm)"""
    samples = []
    beep_samples = int(SAMPLE_RATE * 0.1)  # 100ms beep
    silence_samples = int(SAMPLE_RATE * 0.05)  # 50ms silence
    
    total_samples = SAMPLE_RATE * DURATION
    current_sample = 0
    beep_on = True
    
    while current_sample < total_samples:
        if beep_on:
            # Generate beep
            for i in range(min(beep_samples, total_samples - current_sample)):
                t = i / SAMPLE_RATE
                value = math.sin(2 * math.pi * 1000 * t) * 0.7
                samples.append(int(value * 32767))
                current_sample += 1
        else:
            # Generate silence
            for i in range(min(silence_samples, total_samples - current_sample)):
                samples.append(0)
                current_sample += 1
        
        beep_on = not beep_on
    
    return samples

def generate_alarm_4():
    """Ringtone 4: Gentle ringtone (progressive, not too harsh)"""
    samples = []
    total_samples = SAMPLE_RATE * DURATION
    
    # Multiple frequencies combined for chord effect
    freq1 = 523.25  # C5
    freq2 = 659.25  # E5
    freq3 = 783.99  # G5
    
    for i in range(total_samples):
        t = i / SAMPLE_RATE
        
        # Calculate chord
        value1 = math.sin(2 * math.pi * freq1 * t) * 0.3
        value2 = math.sin(2 * math.pi * freq2 * t) * 0.3
        value3 = math.sin(2 * math.pi * freq3 * t) * 0.3
        
        # Progressive effect
        envelope = 0.2 + (0.8 * i / total_samples)  # Progressive volume
        combined = (value1 + value2 + value3) * envelope
        
        samples.append(int(combined * 32767))
    
    return samples

def save_wav(filename, samples, sample_rate=SAMPLE_RATE):
    """Save as WAV file"""
    with wave.open(str(filename), 'w') as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)
        
        # Write all samples
        for sample in samples:
            # Ensure sample is within 16-bit range
            sample = max(-32768, min(32767, sample))
            wav_file.writeframes(struct.pack('<h', sample))
    
    print(f"Generated: {filename.name}")

def main():
    """Main function"""
    # Create output directory
    output_dir = Path("E:/项目/SoccerAlarmPro/ringtons")
    output_dir.mkdir(exist_ok=True)
    
    print("Generating alarm ringtones...")
    print(f"Output directory: {output_dir}")
    print("-" * 50)
    
    # Generate ringtone 1: Progressive alarm
    print("Generating ringtone 1: Progressive alarm...")
    samples1 = generate_alarm_1()
    save_wav(output_dir / "alarm_1_progressive.wav", samples1)
    
    # Generate ringtone 2: Stadium alarm
    print("Generating ringtone 2: Stadium alarm...")
    samples2 = generate_alarm_2()
    save_wav(output_dir / "alarm_2_stadium.wav", samples2)
    
    # Generate ringtone 3: Urgent beep
    print("Generating ringtone 3: Urgent beep...")
    samples3 = generate_alarm_3()
    save_wav(output_dir / "alarm_3_urgent.wav", samples3)
    
    # Generate ringtone 4: Gentle ringtone
    print("Generating ringtone 4: Gentle ringtone...")
    samples4 = generate_alarm_4()
    save_wav(output_dir / "alarm_4_gentle.wav", samples4)
    
    print("-" * 50)
    print("All ringtones generated successfully!")
    print(f"Files location: {output_dir}")
    print("\nRingtone descriptions:")
    print("1. alarm_1_progressive.wav - Progressive alarm (slow to fast)")
    print("2. alarm_2_stadium.wav - Stadium alarm (low + high frequency)")
    print("3. alarm_3_urgent.wav - Urgent beep (like electronic alarm)")
    print("4. alarm_4_gentle.wav - Gentle ringtone (chord effect)")

if __name__ == "__main__":
    main()
