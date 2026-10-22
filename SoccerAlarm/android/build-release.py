#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SoccerAlarmPro 发版构建 + 自动校验

用法：
    python build-release.py                # 构建两个渠道并校验
    python build-release.py --skip-build   # 跳过构建，仅校验已有产物
    python build-release.py --out D:/dist  # 指定交付目录（默认 ./dist）

它把发版时踩过的坑都变成了硬性断言：
  1. versionCode / versionName 必须与 build.gradle 一致
  2. official 渠道必须包含 REQUEST_INSTALL_PACKAGES（否则自更新失效）
  3. store  渠道必须不含 REQUEST_INSTALL_PACKAGES（否则商店拒审）
  4. assets/ 下不允许残留 .bak / ~ / .orig 临时文件（会被打进 APK）
  5. badge_map.js 里每条映射指向的图片必须真实存在于包内
"""
import os
import re
import sys
import glob
import shutil
import hashlib
import zipfile
import argparse
import subprocess

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

HERE = os.path.dirname(os.path.abspath(__file__))
GRADLE = os.path.join(HERE, 'gradlew.bat' if os.name == 'nt' else 'gradlew')
ASSETS_BASE = 'file:///android_asset/'

CHANNELS = [
    # (渠道, APK 相对路径, 是否应包含 REQUEST_INSTALL_PACKAGES)
    ('official', 'app/build/outputs/apk/official/release/app-official-release.apk', True),
    ('store',    'app/build/outputs/apk/store/release/app-store-release.apk',       False),
]

GREEN, RED, YELLOW, DIM, RESET = '\033[32m', '\033[31m', '\033[33m', '\033[90m', '\033[0m'
if os.name == 'nt' and not os.environ.get('WT_SESSION'):
    GREEN = RED = YELLOW = DIM = RESET = ''


def find_aapt2():
    """优先用环境变量，其次自动探测 Android SDK build-tools 里最高的版本。"""
    env = os.environ.get('AAPT2')
    if env and os.path.isfile(env):
        return env
    candidates = []
    for base in (r'C:/Android/build-tools', os.path.expanduser('~/AppData/Local/Android/Sdk/build-tools')):
        if os.path.isdir(base):
            for d in os.listdir(base):
                p = os.path.join(base, d, 'aapt2.exe' if os.name == 'nt' else 'aapt2')
                if os.path.isfile(p):
                    candidates.append((d, p))
    if not candidates:
        return None
    candidates.sort(key=lambda x: [int(n) if n.isdigit() else 0 for n in re.split(r'[.\-]', x[0])], reverse=True)
    return candidates[0][1]


def read_gradle_version():
    p = os.path.join(HERE, 'app', 'build.gradle')
    s = open(p, encoding='utf-8').read()
    code = re.search(r'versionCode\s+(\d+)', s)
    name = re.search(r'versionName\s+["\']([^"\']+)["\']', s)
    if not code or not name:
        raise SystemExit('无法从 app/build.gradle 解析版本号')
    return int(code.group(1)), name.group(1)


def md5(path):
    h = hashlib.md5()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def inspect_apk(aapt2, apk, expect_install):
    """返回 (info dict, [问题列表])"""
    problems = []
    r = subprocess.run([aapt2, 'dump', 'badging', apk], capture_output=True, text=True,
                       encoding='utf-8', errors='replace')
    out = r.stdout
    m = re.search(r"package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'", out)
    if not m:
        return None, ['无法解析 APK badging 输出']
    pkg, code, name = m.group(1), int(m.group(2)), m.group(3)
    perms = re.findall(r"uses-permission: name='([^']+)'", out)
    has_install = 'android.permission.REQUEST_INSTALL_PACKAGES' in perms

    if has_install != expect_install:
        if expect_install:
            problems.append('official 渠道缺少 REQUEST_INSTALL_PACKAGES —— 应用内自更新会失效')
        else:
            problems.append('store 渠道仍含 REQUEST_INSTALL_PACKAGES —— 应用商店会拒审')

    # 包内容检查
    z = zipfile.ZipFile(apk)
    names = set(z.namelist())
    junk = [n for n in names if '.bak' in n or n.endswith('~') or n.endswith('.orig')]
    if junk:
        problems.append('assets 里混入了备份/临时文件（会被打进 APK）：' + ', '.join(junk[:5]))

    badge_ok, badge_total, badge_missing = 0, 0, []
    if 'assets/badge_map.js' in names:
        s = z.read('assets/badge_map.js').decode('utf-8')
        mm = re.search(r'TEAM_BADGE_LOCAL\s*=\s*\{(.*?)\n\};', s, re.S)
        if mm:
            pairs = re.findall(r"['\"]([^'\"]+)['\"]\s*:\s*['\"]([^'\"]+)['\"]", mm.group(1))
            badge_total = len(pairs)
            for k, v in pairs:
                if v.startswith(ASSETS_BASE):
                    if ('assets/' + v[len(ASSETS_BASE):]) in names:
                        badge_ok += 1
                    else:
                        badge_missing.append(k)
    if badge_missing:
        problems.append('队徽映射指向的图片缺失 %d 个：%s' % (len(badge_missing), ', '.join(badge_missing[:5])))

    info = {
        'pkg': pkg, 'code': code, 'name': name,
        'perms': len(perms), 'has_install': has_install,
        'size': os.path.getsize(apk), 'md5': md5(apk),
        'badge_total': badge_total, 'badge_ok': badge_ok,
        'badge_imgs': len([n for n in names if n.startswith('assets/badges/')]),
    }
    return info, problems


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--skip-build', action='store_true', help='跳过 gradle 构建，仅校验已有产物')
    ap.add_argument('--out', default=os.path.join(HERE, 'dist'), help='交付目录（默认 ./dist）')
    args = ap.parse_args()

    aapt2 = find_aapt2()
    if not aapt2:
        raise SystemExit('找不到 aapt2，请设置环境变量 AAPT2 指向可执行文件')

    code, name = read_gradle_version()
    print('═' * 62)
    print('  SoccerAlarmPro v%s  (versionCode %d)' % (name, code))
    print('  aapt2: %s' % aapt2)
    print('═' * 62)

    if not args.skip_build:
        print('\n▸ 构建 official + store release ...')
        r = subprocess.run([GRADLE, 'assembleOfficialRelease', 'assembleStoreRelease', '--console=plain'],
                           cwd=HERE)
        if r.returncode != 0:
            print(RED + '\n✗ gradle 构建失败' + RESET)
            sys.exit(1)

    os.makedirs(args.out, exist_ok=True)
    failed = []

    for channel, rel, expect_install in CHANNELS:
        apk = os.path.join(HERE, rel)
        print('\n' + '─' * 62)
        print('[%s]' % channel)
        if not os.path.isfile(apk):
            print(RED + '  ✗ 产物不存在: %s' % rel + RESET)
            failed.append(channel)
            continue

        info, problems = inspect_apk(aapt2, apk, expect_install)

        if info['code'] != code or info['name'] != name:
            problems.append('版本不一致：APK 里是 %s/%s，build.gradle 里是 %s/%s'
                            % (info['code'], info['name'], code, name))

        dest = os.path.join(args.out, 'SoccerAlarmPro_v%s_%s.apk' % (name, channel))
        shutil.copy2(apk, dest)

        print('  文件    %s' % os.path.basename(dest))
        print('  %-7s %s / %s' % ('版本', info['code'], info['name']))
        print('  %-7s %.2f MB' % ('大小', info['size'] / 1048576))
        print('  MD5     %s' % info['md5'])
        print('  权限    %d 项 —— REQUEST_INSTALL_PACKAGES %s'
              % (info['perms'],
                 (GREEN + '有 ✓ 自更新可用' + RESET) if info['has_install']
                 else (DIM + '无（商店版）' + RESET)))
        if info['badge_total']:
            print('  队徽    映射 %d 条 / 图片 %d 张 / 缺失 %d'
                  % (info['badge_total'], info['badge_imgs'],
                     info['badge_total'] - info['badge_ok']))

        if problems:
            for p in problems:
                print(RED + '  ✗ ' + p + RESET)
            failed.append(channel)
        else:
            print(GREEN + '  ✓ 校验通过' + RESET)

    print('\n' + '═' * 62)
    if failed:
        print(RED + '✗ 以下渠道未通过：%s' % ', '.join(failed) + RESET)
        sys.exit(1)

    print(GREEN + '✓ 全部通过' + RESET)
    print(DIM + '  官网 / Gitee Release / 服务器直链  →  用 *_official.apk' + RESET)
    print(DIM + '  应用商店上架                        →  用 *_store.apk' + RESET)
    print('  交付目录: %s' % args.out)
    print('═' * 62)


if __name__ == '__main__':
    main()
