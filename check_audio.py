#!/usr/bin/env python3
"""
Check WAV files and compare with test tone
"""

import wave
import struct
import os

def check_wav(filename):
    """Check if WAV file has audio data"""
    try:
        with wave.open(str(filename), 'rb') as wav_file:
            nchannels = wav_file.getnchannels()
            sampwidth = wav_file.getsampwidth()
            framerate = wav_file.getframerate()
            nframes = wav_file.getnframes()
            
            print(f"\nChecking: {os.path.basename(filename)}")
            print(f"  Channels: {nchannels}")
            print(f"  Sample width: {sampwidth * 8}bit")
            print(f"  Frame rate: {framerate}Hz")
            print(f"  Frames: {nframes}")
            print(f"  Duration: {nframes / framerate:.2f}s")
            
            # Read all frames
            frames = wav_file.readframes(nframes)
            
            # Parse as 16-bit integers
            samples = []
            for i in range(0, len(frames), 2):
                if i + 1 < len(frames):
                    sample = struct.unpack('<h', frames[i:i+2])[0]
                    samples.append(sample)
            
            if len(samples) == 0:
                print("  ERROR: No samples found!")
                return False
            
            # Check for non-zero samples
            non_zero = sum(1 for s in samples if s != 0)
            max_amp = max(abs(s) for s in samples)
            min_amp = min(samples)
            max_val = max(samples)
            
            print(f"  Total samples: {len(samples)}")
            print(f"  Non-zero samples: {non_zero}")
            print(f"  Min value: {min_amp}")
            print(f"  Max value: {max_val}")
            print(f"  Max amplitude: {max_amp}")
            
            if max_amp == 0:
                print("  RESULT: NO AUDIO (all samples are 0)")
                return False
            elif max_amp < 100:
                print("  RESULT: VERY QUIET (amplitude < 100)")
                return False
            else:
                print("  RESULT: HAS AUDIO DATA")
                return True
                
    except Exception as e:
        print(f"  ERROR: {e}")
        return False

def main():
    """Main function"""
    ringtons_dir = "E:/项目/SoccerAlarmPro/ringtons"
    
    print("=" * 60)
    print("Checking generated ringtone files")
    print("=" * 60)
    
    # Check test tone first
    test_tone = os.path.join(ringtons_dir, "test_tone.wav")
    if os.path.exists(test_tone):
        print("\n>>> Test tone (should have audio):")
        check_wav(test_tone)
    
    # Check all melody files
    print("\n>>> Melody ringtones:")
    for i in range(1, 7):
        filename = os.path.join(ringtons_dir, f"melody_{i}_*.wav")
        import glob
        files = glob.glob(filename)
        if files:
            check_wav(files[0])
        else:
            print(f"\nMelody {i}: NOT FOUND")
    
    # Check all alarm files
    print("\n>>> Alarm ringtones:")
    alarm_files = [
        "alarm_1_progressive.wav",
        "alarm_2_stadium.wav",
        "alarm_3_urgent.wav",
        "alarm_4_gentle.wav"
    ]
    
    for alarm_file in alarm_files:
        filepath = os.path.join(ringtons_dir, alarm_file)
        if os.path.exists(filepath):
            check_wav(filepath)
        else:
            print(f"\n{alarm_file}: NOT FOUND")

if __name__ == "__main__":
    main()
