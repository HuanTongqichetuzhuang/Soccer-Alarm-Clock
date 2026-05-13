#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
足球闹钟Pro队徽自动下载脚本
通过Wikipedia API下载真实队徽图片

使用方法：
1. 开启VPN
2. 运行此脚本: python download_badges_auto.py
3. 脚本会自动下载所有缺失队徽，保存到badges目录
4. 下载完成后通知开发者构建新版APP

作者: WorkBuddy AI
日期: 2026-05-04
"""

import requests
import os
import time
import hashlib
import json
from datetime import datetime

# 配置
BADGES_DIR = 'E:/项目/SoccerAlarmPro/SoccerAlarmAPK/app/src/main/assets/badges'
LOG_FILE = 'E:/项目/SoccerAlarmPro/SoccerAlarmAPK/download_log.txt'
WIKI_API = 'https://en.wikipedia.org/w/api.php'
REQUEST_DELAY = 5  # 每次请求间隔秒数（避免限流）
MAX_RETRIES = 3    # 失败重试次数

# 需要下载的队徽列表（目标文件名, Wikipedia球队名）
BADGES_TO_DOWNLOAD = [
    # ===== 英格兰球队 =====
    ('middlesbrough.png', 'Middlesbrough F.C.'),
    ('millwall.png', 'Millwall F.C.'),
    ('stoke_city.png', 'Stoke City F.C.'),
    ('west_bromwich_albion.png', 'West Bromwich Albion F.C.'),
    ('queens_park_rangers.png', 'Queens Park Rangers F.C.'),
    ('reading.png', 'Reading F.C.'),
    ('norwich_city.png', 'Norwich City F.C.'),
    ('watford.png', 'Watford F.C.'),
    ('wigan_athletic.png', 'Wigan Athletic F.C.'),
    ('huddersfield_town.png', 'Huddersfield Town A.F.C.'),
    ('derby_county.png', 'Derby County F.C.'),
    ('coventry_city.png', 'Coventry City F.C.'),
    ('cardiff_city.png', 'Cardiff City F.C.'),
    ('preston_north_end.png', 'Preston North End F.C.'),
    ('sheffield_wednesday.png', 'Sheffield Wednesday F.C.'),
    ('portsmouth_fc.png', 'Portsmouth F.C.'),
    ('swansea_city.png', 'Swansea City A.F.C.'),
    ('wrexham_afc.png', 'Wrexham A.F.C.'),
    ('blackburn_rovers.png', 'Blackburn Rovers F.C.'),
    ('bristol_city.png', 'Bristol City F.C.'),
    ('hull_city.png', 'Hull City A.F.C.'),
    ('fleetwood_town.png', 'Fleetwood Town F.C.'),
    ('lincoln_city.png', 'Lincoln City F.C.'),
    ('macclesfield_town.png', 'Macclesfield Town F.C.'),
    ('mansfield_town.png', 'Mansfield Town F.C.'),
    ('salford_city.png', 'Salford City F.C.'),
    ('wycombe_wanderers.png', 'Wycombe Wanderers F.C.'),
    ('weston_super_mare.png', 'Weston-super-Mare A.F.C.'),
    ('boreham_wood.png', 'Boreham Wood F.C.'),
    ('cambridge_united.png', 'Cambridge United F.C.'),
    ('charlton_athletic.png', 'Charlton Athletic F.C.'),
    ('cheltenham_town.png', 'Cheltenham Town F.C.'),
    ('doncaster_rovers.png', 'Doncaster Rovers F.C.'),
    ('exeter_city.png', 'Exeter City F.C.'),
    ('grimsby_town.png', 'Grimsby Town F.C.'),
    ('oxford_united.png', 'Oxford United F.C.'),
    ('port_vale.png', 'Port Vale F.C.'),
    ('shrewsbury_town.png', 'Shrewsbury Town F.C.'),
    ('swindon_town.png', 'Swindon Town F.C.'),
    ('walsall_fc.png', 'Walsall F.C.'),
    ('burton_albion.png', 'Burton Albion F.C.'),
    ('bradford_city.png', 'Bradford City A.F.C.'),
    
    # ===== 西班牙球队 =====
    ('granada_cf.png', 'Granada CF'),
    ('sd_eibar.png', 'SD Eibar'),
    ('sd_huesca.png', 'SD Huesca'),
    ('sporting_gijon.png', 'Sporting Gijon'),
    ('albacete_balompie.png', 'Albacete Balompie'),
    ('racing_santander.png', 'Racing Santander'),
    ('real_murcia.png', 'Real Murcia CF'),
    ('burgos_cf.png', 'Burgos CF'),
    ('cultural_leonesa.png', 'Cultural Leonesa'),
    ('deportivo_la_coruna.png', 'Deportivo La Coruna'),
    ('cd_eldense.png', 'CD Eldense'),
    ('cd_ourense.png', 'CD Ourense'),
    ('cd_teruel.png', 'CD Teruel'),
    ('baleares_cf.png', 'Baleares CF'),
    
    # ===== 德国球队 =====
    ('1_fc_magdeburg.png', '1. FC Magdeburg'),
    ('arminia_bielefeld.png', 'Arminia Bielefeld'),
    ('karlsruher_sc.png', 'Karlsruher SC'),
    ('sc_paderborn_07.png', 'SC Paderborn 07'),
    ('sv_elversberg.png', 'SV Elversberg'),
    ('fc_08_homburg.png', 'FC 08 Homburg'),
    ('energie_cottbus.png', 'FC Energie Cottbus'),
    
    # ===== 法国球队 =====
    ('estac_troyes.png', 'ES Troyes AC'),
    ('fc_istres.png', 'FC Istres'),
    ('fc_sochaux.png', 'FC Sochaux-Montbeliard'),
    ('le_mans_fc.png', 'Le Mans FC'),
    ('amiens_sc.png', 'Amiens SC'),
    ('as_nancy_lorraine.png', 'AS Nancy'),
    ('sc_bastia.png', 'SC Bastia'),
    ('stade_lavallois.png', 'Stade Lavallois'),
    ('us_orleans.png', 'US Orleans'),
    ('le_puy_foot_43.png', 'Le Puy Foot 43'),
]

# 已下载成功的队徽（跳过）
ALREADY_DOWNLOADED = [
    'barnsley.png', 'birmingham_city.png', 'blackpool_fc.png', 
    'sheffield_united.png', 'norwich_city.png', 'huddersfield_town.png',
    'derby_county.png', 'coventry_city.png', 'cardiff_city.png',
    'preston_north_end.png', 'sheffield_wednesday.png', 'portsmouth_fc.png',
    'mansfield_town.png', 'salford_city.png', 'albacete_balompie.png',
    'racing_santander.png', 'real_murcia.png', 'burgos_cf.png',
    'deportivo_la_coruna.png', '1_fc_magdeburg.png', 'arminia_bielefeld.png',
    'sc_paderborn_07.png', 'sv_elversberg.png',
]


def log(message):
    """写入日志并打印"""
    timestamp = datetime.now().strftime('%H:%M:%S')
    log_line = f'[{timestamp}] {message}'
    print(log_line)
    with open(LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(log_line + '\n')


def find_badge_file(session, team_name):
    """通过Wikipedia搜索API查找队徽文件名"""
    params = {
        'action': 'query',
        'format': 'json',
        'list': 'search',
        'srsearch': f'{team_name} logo file',
        'srnamespace': '6',  # File namespace
        'srlimit': '5',
    }
    
    for retry in range(MAX_RETRIES):
        try:
            resp = session.get(WIKI_API, params=params, timeout=30)
            data = resp.json()
            
            if data.get('query', {}).get('search'):
                for result in data['query']['search']:
                    title = result['title']
                    lower = title.lower()
                    
                    # 排除非队徽文件
                    exclude_keywords = ['kit', 'flag', 'stadium', 'performance', 
                                        'plaque', 'commons-logo', 'old', 'shirt', 'uniform']
                    if any(kw in lower for kw in exclude_keywords):
                        continue
                    
                    # 匹队徽文件
                    include_keywords = ['logo', 'badge', 'crest', 'fc.svg', 'fc.png', 
                                        'a.f.c', '.svg', '.png', '.jpg']
                    if any(kw in lower for kw in include_keywords):
                        return title
            
            return None
            
        except Exception as e:
            if retry < MAX_RETRIES - 1:
                log(f'  搜索失败 ({retry+1}/{MAX_RETRIES}): {str(e)[:30]}')
                time.sleep(REQUEST_DELAY * 2)
            else:
                return None


def download_badge(session, wiki_file, filename):
    """下载队徽PNG缩略图"""
    params = {
        'action': 'query',
        'format': 'json',
        'titles': wiki_file,
        'prop': 'imageinfo',
        'iiprop': 'url',
        'iiurlwidth': '200',  # 请求200px PNG缩略图
    }
    
    for retry in range(MAX_RETRIES):
        try:
            resp = session.get(WIKI_API, params=params, timeout=30)
            data = resp.json()
            
            pages = data['query']['pages']
            for page_id, page in pages.items():
                if 'imageinfo' in page:
                    thumb_url = page['imageinfo'][0].get('thumburl')
                    if not thumb_url:
                        # 如果没有缩略图，用原图URL
                        thumb_url = page['imageinfo'][0].get('url')
                    
                    if thumb_url:
                        # 下载图片
                        img_resp = session.get(thumb_url, timeout=30)
                        if img_resp.status_code == 200:
                            content = img_resp.content
                            
                            # 验证文件大小和内容
                            if len(content) > 3000:
                                md5 = hashlib.md5(content).hexdigest()
                                # 排除默认错误图片
                                if md5 != '4649ee6af8d396380a40fbf66a601b85':
                                    filepath = os.path.join(BADGES_DIR, filename)
                                    with open(filepath, 'wb') as f:
                                        f.write(content)
                                    return True, len(content)
            
            return False, 0
            
        except Exception as e:
            if retry < MAX_RETRIES - 1:
                log(f'  下载失败 ({retry+1}/{MAX_RETRIES}): {str(e)[:30]}')
                time.sleep(REQUEST_DELAY * 2)
            else:
                return False, 0


def main():
    """主函数"""
    # 创建badges目录（如果不存在）
    os.makedirs(BADGES_DIR, exist_ok=True)
    
    # 初始化session
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    })
    
    # 统计
    total = len(BADGES_TO_DOWNLOAD)
    success_count = 0
    failed_list = []
    skipped_count = 0
    
    # 清空日志
    with open(LOG_FILE, 'w', encoding='utf-8') as f:
        f.write(f'队徽下载日志 - {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}\n')
        f.write(f'目标: {total} 个队徽\n')
        f.write('=' * 60 + '\n')
    
    log(f'开始下载队徽，共 {total} 个目标')
    log(f'保存目录: {BADGES_DIR}')
    log(f'请求间隔: {REQUEST_DELAY} 秒')
    log('=' * 60)
    
    for i, (filename, team_name) in enumerate(BADGES_TO_DOWNLOAD):
        idx = i + 1
        
        # 检查是否已下载
        filepath = os.path.join(BADGES_DIR, filename)
        if filename in ALREADY_DOWNLOADED or os.path.exists(filepath):
            # 检查文件大小是否有效
            if os.path.exists(filepath):
                size = os.path.getsize(filepath)
                if size > 5000:
                    log(f'[{idx}/{total}] ⏭️  {filename} 已存在 ({size} bytes)')
                    skipped_count += 1
                    continue
        
        log(f'[{idx}/{total}] 🔍 {filename} ({team_name})')
        
        # 查找队徽文件
        wiki_file = find_badge_file(session, team_name)
        
        if not wiki_file:
            log(f'  ❌ 未找到队徽文件')
            failed_list.append((filename, 'not_found'))
            time.sleep(REQUEST_DELAY)
            continue
        
        log(f'  找到: {wiki_file}')
        
        # 下载队徽
        ok, size = download_badge(session, wiki_file, filename)
        
        if ok:
            log(f'  ✅ 下载成功 ({size} bytes)')
            success_count += 1
            ALREADY_DOWNLOADED.append(filename)
        else:
            log(f'  ❌ 下载失败')
            failed_list.append((filename, 'download_failed'))
        
        # 间隔等待
        time.sleep(REQUEST_DELAY)
    
    # 输出统计
    log('=' * 60)
    log(f'下载完成!')
    log(f'  成功: {success_count}')
    log(f'  跳过: {skipped_count}')
    log(f'  失败: {len(failed_list)}')
    
    if failed_list:
        log('失败列表:')
        for fn, reason in failed_list:
            log(f'  {fn} ({reason})')
    
    # 检查最终队徽总数
    badges_count = len([f for f in os.listdir(BADGES_DIR) if f.endswith('.png')])
    log(f'当前队徽总数: {badges_count}')
    
    # 输出下一步指示
    if len(failed_list) < total * 0.3:  # 失败少于30%
        log('')
        log('✅ 下载基本完成！请通知开发者构建新版APP')
    else:
        log('')
        log('⚠️  失败较多，请检查VPN连接后重新运行此脚本')


if __name__ == '__main__':
    print('=' * 60)
    print('足球闹钟Pro队徽自动下载脚本')
    print('=' * 60)
    print('')
    print('使用说明:')
    print('1. 确保VPN已开启且稳定')
    print('2. 运行此脚本将自动下载所有缺失队徽')
    print('3. 每次请求间隔5秒，避免Wikipedia限流')
    print('4. 下载完成后查看日志文件确认结果')
    print('5. 完成后通知开发者构建新版APP')
    print('')
    print('按 Ctrl+C 可随时中断')
    print('=' * 60)
    print('')
    
    try:
        main()
    except KeyboardInterrupt:
        print('\n用户中断，下载已停止')
        print('可以重新运行脚本继续下载')