#!/usr/bin/env python3
"""
Simple test to generate a WAV file with audible tone
"""

import wave
import struct
import math

def generate_test_tone():
    """Generate a simple test tone"""
    filename = "E:/项目/SoccerAlarmPro/ringtons/test_tone.wav"
    
    sample_rate = 44100
    duration = 3  # 3 seconds
    frequency = 440.0  # A4 note
    volume = 0.8  # 80% volume
    
    samples = []
    for i in range(sample_rate * duration):
        t = i / sample_rate
        value = math.sin(2 * math.pi * frequency * t) * volume
        int_value = int(value * 32767)
        samples.append(int_value)
    
    # Save as WAV
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)
        
        for sample in samples:
            wav_file.writeframes(struct.pack('<h', sample))
    
    print(f"Generated: {filename}")
    print(f"Frequency: {frequency}Hz")
    print(f"Duration: {duration}s")
    print(f"Volume: {volume*100}%")
    print(f"Total samples: {len(samples)}")
    
    # Verify file was created
    import os
    if os.path.exists(filename):
        file_size = os.path.getsize(filename)
        print(f"File size: {file_size} bytes")
        if file_size > 1000:
            print("SUCCESS: File created with audio data")
        else:
            print("WARNING: File might be too small")
    else:
        print("ERROR: File was not created")

if __name__ == "__main__":
    generate_test_tone()
