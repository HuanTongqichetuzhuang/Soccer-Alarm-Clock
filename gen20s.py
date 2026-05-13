#!/usr/bin/env python3
import wave, struct, math
from pathlib import Path

SR = 44100
DUR = 20

FREQS = {
    'C3':130.81,'D3':146.83,'E3':164.81,'F3':174.61,
    'G3':196.00,'A3':220.00,'B3':246.94,
    'C4':261.63,'D4':293.66,'E4':329.63,'F4':349.23,
    'G4':392.00,'A4':440.00,'B4':493.88,
    'C5':523.25,'D5':587.33,'E5':659.25,'F5':698.46,
    'G5':783.99,'A5':880.00,'B5':987.77,
    'C6':1046.50,'D6':1174.66,'E6':1318.51,
    'F6':1396.91,'G6':1567.98,'A6':1760.00,
}

def tone(freq, dur, wtype='sine', vol=0.5):
    samples = []
    n = int(SR * dur)
    for i in range(n):
        t = i / SR
        if wtype == 'sine': v = math.sin(2*math.pi*freq*t)
        elif wtype == 'tri': v = 2*abs(2*(freq*t - math.floor(freq*t+0.5)))-1
        elif wtype == 'saw': v = 2*(freq*t - math.floor(freq*t))
        else: v = math.sin(2*math.pi*freq*t)
        # ADSR
        env = 1.0
        if t < 0.02: env = t/0.02
        elif t < 0.12: env = 1.0 - 0.3*(t-0.02)/0.1
        elif t > dur-0.15: env = 0.7*(dur-t)/0.15
        else: env = 0.7
        samples.append(v * env * vol)
    return samples

def mix(*tracks):
    mx = []
    for i in range(max(len(t) for t in tracks)):
        v = sum(t[i] for t in tracks if i < len(t))
        mx.append(int(max(-1,min(1,v)) * 32767))
    return mx

def sec1():  # 0-4s
    s = [x*0.3 for x in tone(FREQS['C4'],4,'sine',0.2)]
    return [int(x*32767) for x in s]

def sec2():  # 4-10s
    s = []
    for n in ['E4','G4','A4','G4','E4','D4','C4','D4']:
        a = tone(FREQS[n],0.75,'sine',0.5)
        b = tone(FREQS['C3'],0.75,'tri',0.15)
        s.extend(mix(a,b))
    return s

def sec3():  # 10-16s
    s = []
    for n in ['E5','D5','C5','D5','E5','C5','E5','D5']:
        a = tone(FREQS[n],0.75,'sine',0.6)
        b = tone(FREQS['C4'],0.75,'tri',0.2)
        c = tone(FREQS['E4'],0.75,'sine',0.15)
        d = tone(FREQS['C3'],0.75,'tri',0.25)
        s.extend(mix(a,b,c,d))
    return s

def sec4():  # 16-20s
    s = []
    for n in ['C5','B4','A4','G4']:
        a = tone(FREQS[n],1,'sine',0.4)
        a = [a[i]*(1-i/len(a)) for i in range(len(a))]
        s.extend([int(x*32767) for x in a])
    return s

def gen1():
    return sec1() + sec2() + sec3() + sec4()

def gen2():
    s = []
    # pad
    for n in ['C4','E4','G4','C5']:
        a = tone(FREQS[n],1.2,'sine',0.15)
        s.extend([int(x*32767) for x in a])
    # melody
    for n in ['E4','G4','A4','G4','E4','R','D4','C4']:
        if n=='R': s.extend([0]*int(SR*0.4))
        else: s.extend([int(x*32767) for x in tone(FREQS[n],0.4,'sine',0.45)])
    # chorus
    for n in ['A4','G4','E4','D4','C4','D4','E4','G4']:
        a = tone(FREQS[n],0.5,'sine',0.5)
        b = tone(FREQS['C3'],0.5,'tri',0.2)
        s.extend(mix(a,b))
    # ending
    a = tone(FREQS['C4'],3,'sine',0.3)
    a = [a[i]*(1-(i/len(a))**0.5) for i in range(len(a))]
    s.extend([int(x*32767) for x in a])
    return s

def gen3():
    s = []
    # bass
    for n in ['C3','C3','G3','G3','A3','A3','G3','R']:
        if n=='R': s.extend([0]*int(SR*0.5))
        else: s.extend([int(x*32767) for x in tone(FREQS[n],0.5,'sqr',0.3)])
    # melody
    for n in ['C4','E4','G4','E4','C4','E4','G4','C5']:
        s.extend([int(x*32767) for x in tone(FREQS[n],0.25,'sine',0.5)])
    # chorus
    for n in ['E5','D5','C5','D5','E5','C5','E5','G5']:
        a = tone(FREQS[n],0.25,'tri',0.5)
        b = tone(FREQS['C4'],0.25,'sine',0.2)
        c = tone(FREQS['C3'],0.25,'sqr',0.25)
        s.extend(mix(a,b,c))
    # ending
    for n in ['C5','B4','A4','G4','E4','C4']:
        s.extend([int(x*32767) for x in tone(FREQS[n],0.3,'sine',0.4)])
    return s

def gen4():
    s = []
    # mystery
    a = tone(FREQS['C3'],4,'saw',0.2)
    a = [x*0.3 for x in a]
    s.extend([int(x*32767) for x in a])
    # melody
    for n in ['E4','G4','A4','B4','A4','G4','E4','D4']:
        a = tone(FREQS[n],0.5,'sine',0.5)
        b = tone(FREQS['C4'],0.5,'sine',0.15)
        s.extend(mix(a,b))
    # climax
    for n in ['E5','G5','A5','G5','E5','D5','C5','D5','E5']:
        a = tone(FREQS[n],0.5,'saw',0.4)
        b = tone(FREQS['C4'],0.5,'sine',0.2)
        c = tone(FREQS['E4'],0.5,'tri',0.15)
        d = tone(FREQS['C3'],0.5,'sqr',0.3)
        s.extend(mix(a,b,c,d))
    # calm
    for n in ['C5','B4','A4','G4']:
        a = tone(FREQS[n],1,'sine',0.35)
        a = [a[i]*(1-i/len(a)) for i in range(len(a))]
        s.extend([int(x*32767) for x in a])
    return s

def gen5():
    s = []
    # chords
    for ch in [('C4','E4','G4'),('F3','A3','C4'),('G3','B3','D4'),('C4','E4','G4')]:
        t = [0.0]*int(SR*1.5)
        for n in ch:
            a = tone(FREQS[n],1.5,'sine',0.2)
            for i in range(len(t)):
                if i < len(a): t[i] += a[i]
        s.extend([int(max(-1,min(1,x))*32767) for x in t])
    # melody
    for n in ['E4','G4','A4','G4','E4','R','D4','C4']:
        if n=='R': s.extend([0]*int(SR*0.5))
        else: s.extend([int(x*32767) for x in tone(FREQS[n],0.5,'sine',0.45)])
    # chorus
    for n in ['A4','B4','C5','B4','A4','G4','A4','G4','E4']:
        a = tone(FREQS[n],0.6,'sine',0.5)
        b = tone(FREQS['C3'],0.6,'tri',0.2)
        s.extend(mix(a,b))
    # ending
    a = tone(FREQS['C4'],4,'sine',0.25)
    a = [a[i]*(1-(i/len(a))**0.5) for i in range(len(a))]
    s.extend([int(x*32767) for x in a])
    return s

def gen6():
    s = []
    # bass
    for n in ['C3','R','G3','R','A3','R','G3','R']:
        if n=='R': s.extend([0]*int(SR*0.25))
        else: s.extend([int(x*32767) for x in tone(FREQS[n],0.25,'sqr',0.25)])
    # melody
    for n in ['E4','G4','E4','C4','D4','E4','D4','C4']:
        s.extend([int(x*32767) for x in tone(FREQS[n],0.25,'tri',0.5)])
    # chorus
    for n in ['C5','B4','A4','G4','A4','B4','C5','D5']:
        a = tone(FREQS[n],0.25,'sine',0.5)
        b = tone(FREQS[n]*2,0.25,'tri',0.15)
        s.extend(mix(a,b))
    # ending
    for n in ['E4','G4','E4','C4','R']:
        if n=='R': s.extend([0]*int(SR*0.2))
        else: s.extend([int(x*32767) for x in tone(FREQS[n],0.2,'tri',0.4)])
    return s

def gen7():
    s = []
    # pad
    t = [0.0]*int(SR*5)
    for n in ['C3','G3','C4','E4']:
        a = tone(FREQS[n],5,'sine',0.15)
        for i in range(len(t)):
            if i < len(a): t[i] += a[i]
    s.extend([int(max(-1,min(1,x))*32767) for x in t])
    # melody
    for n in ['E4','G4','A4','B4','A4','G4','E4','D4','C4']:
        a = tone(FREQS[n],0.6,'sine',0.5)
        b = tone(FREQS['C4'],0.6,'tri',0.2)
        c = tone(FREQS['C3'],0.6,'sqr',0.2)
        s.extend(mix(a,b,c))
    # epic
    for n in ['E5','G5','A5','C6','A5','G5','E5','D5','E5']:
        a = tone(FREQS[n],0.6,'saw',0.35)
        b = tone(FREQS['C4'],0.6,'sine',0.2)
        c = tone(FREQS['E4'],0.6,'tri',0.15)
        d = tone(FREQS['C3'],0.6,'sqr',0.3)
        s.extend(mix(a,b,c,d))
    # ending chord
    t = [0.0]*int(SR*3)
    for n in ['C4','E4','G4','C5']:
        a = tone(FREQS[n],3,'sine',0.25)
        for i in range(len(t)):
            if i < len(a): t[i] += a[i]
    s.extend([int(max(-1,min(1,x))*32767) for x in t])
    return s

def gen8():
    s = []
    # dreamy pad
    t = [0.0]*int(SR*6)
    for n in ['C4','E4','G4','B4']:
        a = tone(FREQS[n],6,'sine',0.12)
        for i in range(len(t)):
            if i < len(a): t[i] += a[i]
    s.extend([int(max(-1,min(1,x))*32767) for x in t])
    # melody
    for n in ['E5','D5','C5','D5','E5','G5','A5','G5']:
        a = tone(FREQS[n],0.5,'sine',0.4)
        b = tone(FREQS[n]*2,0.5,'sine',0.1)
        s.extend(mix(a,b))
    # climax
    for n in ['E6','D6','C6','D6','E6','G5','A5','G5','E5']:
        a = tone(FREQS[n],0.6,'sine',0.35)
        b = tone(FREQS['C4'],0.6,'sine',0.15)
        s.extend(mix(a,b))
    # fade ending
    a = tone(FREQS['C4'],4,'sine',0.2)
    a = [a[i]*(1-(i/len(a))**0.5) for i in range(len(a))]
    s.extend([int(x*32767) for x in a])
    return s

def gen9():
    s = []
    # rhythm bass
    for n in ['C3','C3','G3','G3','A3','A3','G3','R']:
        if n=='R': s.extend([0]*int(SR*0.25))
        else: s.extend([int(x*32767) for x in tone(FREQS[n],0.25,'sqr',0.3)])
    # melody
    for n in ['C4','E4','G4','E4','C4','E4','D4','C4']:
        s.extend([int(x*32767) for x in tone(FREQS[n],0.25,'sine',0.5)])
    # chorus
    for n in ['E5','D5','C5','D5','E5','C5','E5','G5']:
        a = tone(FREQS[n],0.25,'tri',0.5)
        b = tone(FREQS['C3'],0.25,'sqr',0.25)
        c = tone(FREQS[n]*2,0.25,'sine',0.1)
        s.extend(mix(a,b,c))
    # ending
    for n in ['C5','G4','A4','G4','E4','C4']:
        s.extend([int(x*32767) for x in tone(FREQS[n],0.3,'tri',0.4)])
    return s

def gen10():
    s = []
    # soft start
    for n in ['C4','E4','G4','A4','G4','E4','D4','C4']:
        s.extend([int(x*32767) for x in tone(FREQS[n],0.6,'sine',0.4)])
    # develop
    for n in ['E4','G4','A4','B4','C5','B4','A4','G4']:
        a = tone(FREQS[n],0.5,'sine',0.5)
        b = tone(FREQS['C4'],0.5,'tri',0.15)
        s.extend(mix(a,b))
    # climax
    for n in ['C5','B4','A4','G4','A4','B4','C5','D5']:
        a = tone(FREQS[n],0.5,'sine',0.6)
        b = tone(FREQS['C3'],0.5,'tri',0.2)
        c = tone(FREQS['E4'],0.5,'sine',0.15)
        d = tone(FREQS['G4'],0.5,'tri',0.1)
        s.extend(mix(a,b,c,d))
    # ending
    for n in ['E4','D4','C4','R','E4','G4','E4','C4']:
        if n=='R': s.extend([0]*int(SR*0.5))
        else:
            a = tone(FREQS[n],0.6,'sine',0.4)
            a = [a[i]*(1-i/len(a)) for i in range(len(a))]
            s.extend([int(x*32767) for x in a])
    return s

def save(name, samples):
    target = SR * DUR
    if len(samples) > target: samples = samples[:target]
    else: samples.extend([0]*(target-len(samples)))
    samples = [max(-32768,min(32767,int(x))) for x in samples]
    with wave.open(str(name),'wb') as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR)
        for s in samples: f.writeframes(struct.pack('<h',s))
    mx = max(abs(s) for s in samples)
    print(f"  {name.name} (max:{mx}, {mx/32767*100:.0f}%)")

def main():
    d = Path("E:/项目/SoccerAlarmPro/ringtons")
    d.mkdir(exist_ok=True)
    print("Generating 10 rich 20s ringtones...")
    gens = [
        (gen1, "rich20_1_inspiring.wav"),
        (gen2, "rich20_2_gentle.wav"),
        (gen3, "rich20_3_upbeat.wav"),
        (gen4, "rich20_4_dramatic.wav"),
        (gen5, "rich20_5_nostalgic.wav"),
        (gen6, "rich20_6_playful.wav"),
        (gen7, "rich20_7_epic.wav"),
        (gen8, "rich20_8_dreamy.wav"),
        (gen9, "rich20_9_rhythmic.wav"),
        (gen10,"rich20_10_emotional.wav"),
    ]
    for g,n in gens:
        print(f"  Generating: {n}")
        save(d/n, g())
    print("Done!")

if __name__ == "__main__":
    main()
