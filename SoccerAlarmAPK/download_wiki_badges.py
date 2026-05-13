#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
通过Wikipedia API下载真实队徽图片（SVG转PNG缩略图）
需要VPN/代理访问Wikipedia
"""
import requests
import os
import time
import hashlib
import sys
import re

BADGES_DIR = 'E:/项目/SoccerAlarmPro/SoccerAlarmAPK/app/src/main/assets/badges'
BADGE_MAP_FILE = 'E:/项目/SoccerAlarmPro/SoccerAlarmAPK/app/src/main/assets/badge_map.js'

# TheSportsDB返回的错误默认队徽MD5
BAD_MD5 = '4649ee6af8d396380a40fbf66a601b85'

session = requests.Session()
session.headers.update({'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'})

wiki_api = 'https://en.wikipedia.org/w/api.php'

# 78个缺失队徽：文件名 -> Wikipedia页面名 -> 备选页面名列表
# 格式: (目标文件名, Wikipedia标准页面名)
missing_badges = [
    # 英格兰球队
    ('barnsley.png', 'Barnsley_F.C.'),
    ('birmingham_city.png', 'Birmingham_City_F.C.'),
    ('blackburn_rovers.png', 'Blackburn_Rovers_F.C.'),
    ('blackpool_fc.png', 'Blackpool_F.C.'),
    ('boreham_wood.png', 'Boreham_Wood_F.C.'),
    ('bradford_city.png', 'Bradford_City_A.F.C.'),
    ('bristol_city.png', 'Bristol_City_F.C.'),
    ('burton_albion.png', 'Burton_Albion_F.C.'),
    ('cambridge_united.png', 'Cambridge_United_F.C.'),
    ('cardiff_city.png', 'Cardiff_City_F.C.'),
    ('charlton_athletic.png', 'Charlton_Athletic_F.C.'),
    ('cheltenham_town.png', 'Cheltenham_Town_F.C.'),
    ('coventry_city.png', 'Coventry_City_F.C.'),
    ('derby_county.png', 'Derby_County_F.C.'),
    ('doncaster_rovers.png', 'Doncaster_Rovers_F.C.'),
    ('exeter_city.png', 'Exeter_City_F.C.'),
    ('fleetwood_town.png', 'Fleetwood_Town_F.C.'),
    ('grimsby_town.png', 'Grimsby_Town_F.C.'),
    ('huddersfield_town.png', 'Huddersfield_Town_A.F.C.'),
    ('hull_city.png', 'Hull_City_A.F.C.'),
    ('lincoln_city.png', 'Lincoln_City_F.C.'),
    ('macclesfield_town.png', 'Macclesfield_Town_F.C.'),
    ('mansfield_town.png', 'Mansfield_Town_F.C.'),
    ('middlesbrough.png', 'Middlesbrough_F.C.'),
    ('millwall.png', 'Millwall_F.C.'),
    ('milton_keynes_dons.png', 'Milton_Keynes_Dons_F.C.'),
    ('norwich_city.png', 'Norwich_City_F.C.'),
    ('oxford_united.png', 'Oxford_United_F.C.'),
    ('port_vale.png', 'Port_Vale_F.C.'),
    ('portsmouth_fc.png', 'Portsmouth_F.C.'),
    ('preston_north_end.png', 'Preston_North_End_F.C.'),
    ('queens_park_rangers.png', 'Queens_Park_Rangers_F.C.'),
    ('reading.png', 'Reading_F.C.'),
    ('salford_city.png', 'Salford_City_F.C.'),
    ('sheffield_united.png', 'Sheffield_United_F.C.'),
    ('sheffield_wednesday.png', 'Sheffield_Wednesday_F.C.'),
    ('shrewsbury_town.png', 'Shrewsbury_Town_F.C.'),
    ('stoke_city.png', 'Stoke_City_F.C.'),
    ('swansea_city.png', 'Swansea_City_A.F.C.'),
    ('swindon_town.png', 'Swindon_Town_F.C.'),
    ('watford.png', 'Watford_F.C.'),
    ('walsall_fc.png', 'Walsall_F.C.'),
    ('west_bromwich_albion.png', 'West_Bromwich_Albion_F.C.'),
    ('wigan_athletic.png', 'Wigan_Athletic_F.C.'),
    ('wrexham_afc.png', 'Wrexham_A.F.C.'),
    ('wycombe_wanderers.png', 'Wycombe_Wanderers_F.C.'),
    ('weston_super_mare.png', 'Weston-super-Mare_A.F.C.'),
    # 西班牙球队
    ('granada_cf.png', 'Granada_CF'),
    ('sd_eibar.png', 'SD_Eibar'),
    ('sd_huesca.png', 'SD_Huesca'),
    ('sporting_gijon.png', 'Sporting_Gijón'),
    ('albacete_balompie.png', 'Albacete_Balompié'),
    ('racing_santander.png', 'Racing_de_Santander'),
    ('real_murcia.png', 'Real_Murcia_CF'),
    ('cultural_leonesa.png', 'Cultural_y_Deportiva_Leonesa'),
    ('burgos_cf.png', 'Burgos_CF'),
    ('cd_eldense.png', 'CD_Eldense'),
    ('cd_ourense.png', 'CD_Ourense'),
    ('cd_teruel.png', 'CD_Teruel'),
    ('baleares_cf.png', 'RCD_Mallorca'),  # Baleares可能无独立页面，备选
    ('deportivo_la_coruna.png', 'Deportivo_de_La_Coruña'),
    # 德国球队
    ('1_fc_magdeburg.png', '1._FC_Magdeburg'),
    ('arminia_bielefeld.png', 'Arminia_Bielefeld'),
    ('karlsruher_sc.png', 'Karlsruher_SC'),
    ('sc_paderborn_07.png', 'SC_Paderborn_07'),
    ('sv_elversberg.png', 'SV_Elversberg'),
    ('fc_08_homburg.png', 'FC_08_Homburg'),
    ('energie_cottbus.png', 'Energie_Cottbus'),
    # 法国球队
    ('estac_troyes.png', 'ES_Troyes_AC'),
    ('fc_istres.png', 'FC_Istres'),
    ('fc_sochaux.png', 'FC_Sochaux-Montbéliard'),
    ('le_mans_fc.png', 'Le_Mans_FC'),
    ('amiens_sc.png', 'Amiens_SC'),
    ('as_nancy_lorraine.png', 'AS_Nancy'),
    ('sc_bastia.png', 'SC_Bastia'),
    ('stade_lavallois.png', 'Stade_Lavallois'),
    ('us_orleans.png', 'US_Orléans'),
    ('le_puy_foot_43.png', 'Le_Puy_Foot_43_Auvergne'),
]


def find_logo_file(wiki_page):
    """从Wikipedia页面查找队徽文件名"""
    params = {
        'action': 'query',
        'format': 'json',
        'titles': wiki_page,
        'prop': 'images',
        'imlimit': '50',
    }
    try:
        resp = session.get(wiki_api, params=params, timeout=15)
        data = resp.json()
        pages = data['query']['pages']
        for page_id, page in pages.items():
            if 'images' in page:
                for img in page['images']:
                    title = img['title']
                    # 优先匹配logo/badge/crest关键字
                    lower = title.lower()
                    if ('logo' in lower or 'badge' in lower or 'crest' in lower) and 'kit' not in lower:
                        # 排除国旗、标志等非队徽文件
                        if 'flag' not in lower and 'icon' not in lower and 'symbol' not in lower:
                            return title
    except Exception as e:
        print(f'  查询页面失败: {str(e)[:40]}')
    return None


def download_badge_as_png(file_title, target_path):
    """下载队徽并转为PNG"""
    params = {
        'action': 'query',
        'format': 'json',
        'titles': file_title,
        'prop': 'imageinfo',
        'iiprop': 'url',
        'iiurlwidth': 200,
    }
    try:
        resp = session.get(wiki_api, params=params, timeout=15)
        data = resp.json()
        pages = data['query']['pages']
        for page_id, page in pages.items():
            if 'imageinfo' in page:
                info = page['imageinfo'][0]
                thumb_url = info.get('thumburl')
                if thumb_url:
                    img_resp = session.get(thumb_url, timeout=15)
                    if img_resp.status_code == 200 and len(img_resp.content) > 500:
                        content = img_resp.content
                        # 验证不是默认图片
                        md5 = hashlib.md5(content).hexdigest()[:16]
                        if md5 != BAD_MD5[:16]:
                            with open(target_path, 'wb') as f:
                                f.write(content)
                            return True, len(content)
    except Exception as e:
        print(f'  下载失败: {str(e)[:40]}')
    return False, 0


def main():
    os.makedirs(BADGES_DIR, exist_ok=True)
    
    success = 0
    failed = []
    results = {}  # filename -> wiki_file_title 映射
    
    print(f'开始下载 {len(missing_badges)} 个队徽...')
    print('=' * 60)
    
    for i, (filename, wiki_page) in enumerate(missing_badges):
        target_path = os.path.join(BADGES_DIR, filename)
        idx = i + 1
        
        # 如果文件已存在且不是错误默认图，跳过
        if os.path.exists(target_path):
            with open(target_path, 'rb') as f:
                content = f.read()
            if len(content) > 500 and hashlib.md5(content).hexdigest() != BAD_MD5:
                print(f'[{idx:02d}/{len(missing_badges)}] ⏭️  {filename} (已存在，跳过)')
                continue
        
        # 步骤1: 查找队徽文件
        print(f'[{idx:02d}/{len(missing_badges)}] 🔍 {filename} <- {wiki_page}')
        file_title = find_logo_file(wiki_page)
        
        if not file_title:
            # 尝试备选页面名
            alt_pages = {
                'baleares_cf.png': ['RCD_Mallorca_B', 'Baleares_CF'],
                'le_puy_foot_43.png': ['Le_Puy_en_Velay', 'Le_Puy_Foot'],
                'weston_super_mare.png': ['Weston-super-Mare_A.F.C.', 'Weston-super-Mare'],
                'macclesfield_town.png': ['Macclesfield'],
            }
            alts = alt_pages.get(filename, [])
            for alt in alts:
                file_title = find_logo_file(alt)
                if file_title:
                    print(f'  备选页面找到: {alt}')
                    break
        
        if not file_title:
            print(f'  ❌ 未找到队徽文件')
            failed.append(filename)
            time.sleep(0.3)
            continue
        
        print(f'  找到文件: {file_title}')
        
        # 步骤2: 下载PNG缩略图
        ok, size = download_badge_as_png(file_title, target_path)
        if ok:
            print(f'  ✅ 下载成功 ({size} bytes)')
            success += 1
            results[filename] = file_title
        else:
            print(f'  ❌ 下载失败')
            failed.append(filename)
        
        time.sleep(0.5)
    
    print('=' * 60)
    print(f'下载完成: 成功 {success}/{len(missing_badges)}')
    if failed:
        print(f'失败列表 ({len(failed)}):')
        for f in failed:
            print(f'  {f}')
    
    return success, failed, results


if __name__ == '__main__':
    success, failed, results = main()
