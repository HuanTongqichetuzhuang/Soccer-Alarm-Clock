#!/usr/bin/env python3
"""
从7m.com.cn抓取国内杯赛数据并转换为openfootball兼容格式
数据源: https://data.7m.com.cn/matches_data/{ID}/gb/matches.js

7m杯赛ID对照:
  - 足总杯 (FA Cup): 55
  - 联赛杯 (Carabao Cup): 53
  - 德国杯 (DFB-Pokal): 52
  - 国王杯 (Copa del Rey): 54
  - 法国杯 (Coupe de France): 101
"""

import re
import json
import urllib.request
import ssl
import os
import sys

# 忽略SSL证书验证
ssl._create_default_https_context = ssl._create_unverified_context

# 7m杯赛配置
CUPS_7M = {
    55: {"name_en": "FA Cup", "name_cn": "足总杯", "league_id": "FAC", "country": "eng"},
    53: {"name_en": "Carabao Cup", "name_cn": "联赛杯", "league_id": "LC", "country": "eng"},
    52: {"name_en": "DFB-Pokal", "name_cn": "德国杯", "league_id": "DFB", "country": "de"},
    54: {"name_en": "Copa del Rey", "name_cn": "国王杯", "league_id": "CDR", "country": "es"},
    101: {"name_en": "Coupe de France", "name_cn": "法国杯", "league_id": "CDF", "country": "fr"},
}

# 7m中文队名 → openfootball标准英文名映射
# 仅映射五大联赛常见球队，小球队保留中文名
TEAM_CN_TO_EN = {
    # 英超
    "曼彻斯特城": "Manchester City", "曼城": "Manchester City",
    "阿森纳": "Arsenal", "利物浦": "Liverpool",
    "切尔西": "Chelsea", "曼彻斯特联": "Manchester United", "曼联": "Manchester United",
    "托特纳姆热刺": "Tottenham Hotspur", "热刺": "Tottenham Hotspur",
    "纽卡斯尔联": "Newcastle United", "纽卡斯尔": "Newcastle United",
    "阿斯顿维拉": "Aston Villa", "布莱顿": "Brighton & Hove Albion",
    "西汉姆联": "West Ham United", "西汉姆": "West Ham United",
    "水晶宫": "Crystal Palace", "布伦特福德": "Brentford",
    "富勒姆": "Fulham", "伯恩茅斯": "AFC Bournemouth",
    "埃弗顿": "Everton", "诺丁汉森林": "Nottingham Forest",
    "狼队": "Wolverhampton Wanderers", "莱斯特城": "Leicester City",
    "伊普斯维奇": "Ipswich Town", "南安普顿": "Southampton",
    "利兹联": "Leeds United", "伯恩利": "Burnley",
    "桑德兰": "Sunderland", "谢菲尔德联": "Sheffield United",
    "沃特福德": "Watford", "诺维奇": "Norwich City",
    "伯明翰": "Birmingham City", "雷丁": "Reading",
    "米德尔斯堡": "Middlesbrough", "斯托克城": "Stoke City",
    "斯旺西": "Swansea City", "赫尔城": "Hull City",
    "普利茅斯": "Plymouth Argyle", "卢顿": "Luton Town",
    "考文垂": "Coventry City", "布里斯托尔城": "Bristol City",
    "卡迪夫城": "Cardiff City", "德比郡": "Derby County",
    "QPR": "Queens Park Rangers", "巡游者": "Queens Park Rangers",
    "维冈竞技": "Wigan Athletic", "巴恩斯利": "Barnsley",
    "罗瑟勒姆": "Rotherham United", "哈德斯菲尔德": "Huddersfield Town",
    "布莱克本": "Blackburn Rovers", "米尔沃尔": "Millwall",
    "女王公园巡游者": "Queens Park Rangers",
    "维尔港": "Port Vale", "韦康比流浪者": "Wycombe Wanderers",
    "什鲁斯伯里": "Shrewsbury Town", "保顿艾尔宾": "Burton Albion",
    "切尔滕汉姆": "Cheltenham Town", "剑桥联": "Cambridge United",
    "博雷汉姆": "Boreham Wood", "唐卡斯特": "Doncaster Rovers",
    "埃克塞特城": "Exeter City", "布莱克浦": "Blackpool FC",
    "布里斯托城": "Bristol City", "弗利特伍德": "Fleetwood Town",
    "斯文登": "Swindon Town", "普雷斯顿": "Preston North End",
    "曼斯菲特": "Mansfield Town", "朴茨茅斯": "Portsmouth FC",
    "查尔顿": "Charlton Athletic", "格林斯比": "Grimsby Town",
    "沃尔索尔": "Walsall FC", "牛津联": "Oxford United",
    "米尔顿凯恩斯": "Milton Keynes Dons", "威科姆流浪者": "Wycombe Wanderers",
    "布拉德福德": "Bradford City", "林肯城": "Lincoln City",
    "谢菲尔德星期三": "Sheffield Wednesday", "雷克斯汉姆": "Wrexham AFC",
    "麦克尔斯菲尔德": "Macclesfield Town", "威斯通": "Weston-super-Mare",
    "弗利特伍德": "Fleetwood Town",

    # 西甲
    "巴塞罗那": "FC Barcelona", "巴萨": "FC Barcelona",
    "皇家马德里": "Real Madrid", "皇马": "Real Madrid",
    "马德里竞技": "Atletico Madrid", "马竞": "Atletico Madrid",
    "塞维利亚": "Sevilla FC", "比利亚雷亚尔": "Villarreal CF",
    "皇家社会": "Real Sociedad", "皇家贝蒂斯": "Real Betis",
    "毕尔巴鄂竞技": "Athletic Bilbao",
    "瓦伦西亚": "Valencia CF", "赫塔菲": "Getafe CF",
    "赫塔费": "Getafe CF", "巴伦西亚": "Valencia CF",
    "埃瓦尔": "SD Eibar", "埃登斯": "CD Eldense",
    "巴利阿里": "Baleares CF", "布尔戈斯": "Burgos CF",
    "拉科鲁尼亚": "Deportivo La Coruna", "桑坦德竞技": "Racing Santander",
    "欧伦塞": "CD Ourense", "穆尔西亚": "Real Murcia",
    "莱昂文化体育": "Cultural Leonesa", "阿尔瓦塞特": "Albacete Balompie",
    "韦斯卡": "SD Huesca", "达拉维拉瑞纳": "CD Teruel",
    "塞尔塔": "Celta Vigo", "奥萨苏纳": "CA Osasuna",
    "西班牙人": "RCD Espanyol", "马洛卡": "RCD Mallorca",
    "阿拉维斯": "Deportivo Alaves", "赫罗纳": "Girona FC",
    "拉斯帕尔马斯": "UD Las Palmas",
    "巴列卡诺": "Rayo Vallecano", "莱加内斯": "CD Leganes",
    "巴拉多利德": "Real Valladolid", "加的斯": "Cadiz CF",
    "格拉纳达": "Granada CF", "埃尔切": "Elche CF",
    "莱万特": "Levante UD", "阿尔梅里亚": "UD Almeria",
    "特内里费": "CD Tenerife", "希洪竞技": "Sporting Gijon",
    "萨拉戈萨": "Real Zaragoza", "拉斯彭马斯": "UD Las Palmas",
    "蓬费拉迪纳": "SD Ponferradina", "米兰德斯": "CD Mirandes",
    "皇家联合": "Real Union Club", "休达": "AD Ceuta",
    "伊维萨": "UD Ibiza", "安道尔": "FC Andorra",
    "阿莫雷别塔": "Amorebieta", "阿尔科亚诺": "CD Alcoyano",

    # 德甲
    "拜仁慕尼黑": "FC Bayern Munich", "拜仁": "FC Bayern Munich",
    "多特蒙德": "Borussia Dortmund", "多蒙特": "Borussia Dortmund",
    "勒沃库森": "Bayer Leverkusen", "莱比锡": "RB Leipzig",
    "RB莱比锡": "RB Leipzig", "斯图加特": "VfB Stuttgart",
    "法兰克福": "Eintracht Frankfurt", "弗赖堡": "SC Freiburg",
    "沃尔夫斯堡": "VfL Wolfsburg", "霍芬海姆": "TSG Hoffenheim",
    "门兴格拉德巴赫": "Borussia M'gladbach", "门兴": "Borussia M'gladbach",
    "柏林联合": "FC Union Berlin", "美因茨": "1. FSV Mainz 05",
    "云达不莱梅": "Werder Bremen", "不莱梅": "Werder Bremen",
    "波鸿": "VfL Bochum", "奥格斯堡": "FC Augsburg",
    "海登海姆": "1. FC Heidenheim", "达姆施塔特": "SV Darmstadt 98",
    "科隆": "1. FC Koln", "汉堡": "Hamburger SV",
    "沙尔克04": "FC Schalke 04", "汉诺威96": "Hannover 96",
    "纽伦堡": "1. FC Nurnberg", "帕德博恩": "SC Paderborn 07",
    "卡尔斯鲁厄": "Karlsruher SC", "圣保利": "FC St. Pauli",
    "基尔": "Holstein Kiel", "杜塞尔多夫": "Fortuna Dusseldorf",
    "马格德堡": "1. FC Magdeburg", "桑德豪森": "SV Sandhausen",
    "韦恩威斯巴登": "SV Wehen Wiesbaden",
    "不伦瑞克": "Eintracht Braunschweig",
    "奥斯纳布吕克": "VfL Osnabruck",
    "比勒费尔德": "Arminia Bielefeld",
    "凯泽斯劳滕": "1. FC Kaiserslautern",
    "罗斯托克": "Hansa Rostock",
    "德累斯顿": "Dynamo Dresden",
    "乌尔姆": "SSV Ulm 1846",
    "雷根斯堡": "Jahn Regensburg",
    "明斯特": "Preussen Munster",

    # 法甲
    "巴黎圣日耳曼": "Paris Saint-Germain", "巴黎": "Paris Saint-Germain",
    "马赛": "Olympique Marseille", "里昂": "Olympique Lyon",
    "摩纳哥": "AS Monaco", "里尔": "Lille OSC",
    "尼斯": "OGC Nice", "朗斯": "Racing Club Lens",
    "雷恩": "Stade Rennais", "斯特拉斯堡": "Racing Strasbourg",
    "图卢兹": "Toulouse FC", "蒙彼利埃": "Montpellier HSC",
    "南特": "FC Nantes", "兰斯": "Stade de Reims",
    "洛里昂": "FC Lorient", "布雷斯特": "Stade Brestois",
    "勒阿弗尔": "FC Le Havre", "梅斯": "FC Metz",
    "克莱蒙": "Clermont Foot", "波尔多": "FC Girondins Bordeaux",
    "圣埃蒂安": "AS Saint-Etienne", "昂热": "Angers SCO",
    "欧塞尔": "AJ Auxerre", "特鲁瓦": "ESTAC Troyes",
    "索肖": "FC Sochaux-Montbeliard", "卡昂": "SM Caen",
    "亚眠": "Amiens SC", "勒芒": "Le Mans FC",
    "尼姆": "Nimes Olympique", "第戎": "Dijon FCO",
    "甘冈": "En Avant Guingamp", "瓦朗谢讷": "Valenciennes FC",
    "波城": "Pau FC", "阿纳西": "FC Annecy",
    "巴斯蒂亚": "SC Bastia", "罗德兹": "Rodez AF",
    "拉瓦勒": "Stade Lavallois", "阿雅克肖": "AC Ajaccio",
    "奎维利": "US Quevilly-Rouen", "敦刻尔克": "USL Dunkerque",
    "格勒诺布尔": "Grenoble Foot 38", "马尔蒂格": "FC Martigues",
    "尚布利": "FC Chambly",

    # 意甲 (备用)
    "国际米兰": "Inter Milan", "AC米兰": "AC Milan", "米兰": "AC Milan",
    "尤文图斯": "Juventus", "尤文": "Juventus",
    "那不勒斯": "SSC Napoli", "罗马": "AS Roma",
    "拉齐奥": "SS Lazio", "亚特兰大": "Atalanta BC",
    "佛罗伦萨": "ACF Fiorentina", "都灵": "Torino FC",
    "博洛尼亚": "Bologna FC", "蒙扎": "AC Monza",
    "乌迪内斯": "Udinese Calcio", "萨索洛": "Sassuolo Calcio",
    "恩波利": "Empoli FC", "卡利亚里": "Cagliari Calcio",
    "热那亚": "Genoa CFC", "维罗纳": "Hellas Verona",
    "莱切": "US Lecce", "弗洛西诺内": "Frosinone Calcio",
    "萨勒尼塔纳": "US Salernitana", "斯佩齐亚": "Spezia Calcio",
    "克雷莫纳": "US Cremonese", "桑普多利亚": "UC Sampdoria",
    "帕尔马": "Parma Calcio 1913", "威尼斯": "Venezia FC",
    "科莫": "Como 1907", "巴勒莫": "US Citta di Palermo",
    "巴里": "SSC Bari", "卡塔尼亚": "Calcio Catania",
    "布雷西亚": "Brescia Calcio", "佩鲁贾": "AC Perugia",
    "比萨": "Pisa SC", "摩德纳": "Modena FC",
    "雷吉亚纳": "AC Reggiana", "苏迪路": "US Sudtirol",
    "切塞纳": "Cesena FC",
    # 德国低级别
    "柏林赫塔": "Hertha BSC", "莱比锡红牛": "RB Leipzig",
    "比勒菲尔德": "Arminia Bielefeld", "科特布斯": "Energie Cottbus",
    "菲尔特": "Greuther Furth", "达姆斯塔特": "SV Darmstadt 98",
    "勒蒂森": "FC 08 Homburg", "埃尔沃斯堡": "SV Elversberg",
    # 英格兰低级别
    "索尔福德市": "Salford City", "西布罗姆维奇": "West Bromwich Albion",
    # 法国低级别
    "巴黎FC": "Paris FC", "南锡": "AS Nancy-Lorraine",
    "勒皮": "Le Puy Foot 43", "奥兰斯": "US Orleans",
    "伊斯特": "FC Istres",
}

def fetch_matches_js(cup_id):
    """下载7m.com.cn的matches.js文件"""
    url = f"https://data.7m.com.cn/matches_data/{cup_id}/gb/matches.js"
    print(f"  下载 {url} ...")
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': f'https://data.7m.com.cn/matches_data/{cup_id}/gb/index.shtml'
        })
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"  ❌ 下载失败: {e}")
        return None


def parse_js_indexed_arrays(js_text, var_name):
    """解析JS中 varname[idx] = [...] 格式的二维数组
    返回 dict: {0: [...], 1: [...], ...}
    """
    result = {}
    # 匹配 varname[0] = [...]; 格式
    pattern = rf"{var_name}\[(\d+)\]\s*=\s*(\[.*?\]);"
    for m in re.finditer(pattern, js_text, re.DOTALL):
        idx = int(m.group(1))
        arr_str = m.group(2)
        try:
            result[idx] = json.loads(arr_str)
        except json.JSONDecodeError:
            # 尝试提取引号内的字符串
            if "'" in arr_str:
                items = re.findall(r"'([^']*)'", arr_str)
                result[idx] = items
            else:
                result[idx] = []
    return result


def parse_js_string_array(js_text, var_name):
    """从JavaScript文本中解析字符串数组 varname = ['xxx','yyy',...]"""
    pattern = rf"{var_name}\s*=\s*\[(.*?)\];"
    m = re.search(pattern, js_text, re.DOTALL)
    if m:
        arr_str = m.group(1)
        # 提取单引号中的字符串
        items = re.findall(r"'([^']*)'", arr_str)
        return items
    return None


def parse_js_number_var(js_text, var_name):
    """解析JS数字变量"""
    pattern = rf'{var_name}\s*=\s*(\d+);'
    m = re.search(pattern, js_text)
    if m:
        return int(m.group(1))
    return None


def parse_start_time(time_arr):
    """将7m的时间数组转换为日期时间字符串
    格式: '年,月,日,时,分,秒' → '2026-01-10 22:00'
    注意: 7m的时间已经是GMT+0800(北京时间)
    """
    if not time_arr or time_arr == '':
        return None, None

    parts = time_arr.split(',')
    if len(parts) >= 5:
        year = parts[0].strip()
        month = parts[1].strip().zfill(2)
        day = parts[2].strip().zfill(2)
        hour = parts[3].strip().zfill(2)
        minute = parts[4].strip().zfill(2)
        date_str = f"{year}-{month}-{day}"
        time_str = f"{hour}:{minute}"
        return date_str, time_str
    return None, None


def parse_score(score_str):
    """解析7m比分格式
    格式: '3-1(1-0)' → (3, 1)
    格式: 'VS' → (None, None) 未开始
    """
    if not score_str or score_str == 'VS' or score_str == 'VS ':
        return None, None

    # 提取全场比分 (在括号前的部分)
    m = re.match(r'(\d+)-(\d+)', score_str)
    if m:
        return int(m.group(1)), int(m.group(2))
    return None, None


def parse_memo(memo_str):
    """解析7m备注(Memo)，提取加时/点球信息"""
    if not memo_str:
        return None

    result = {}
    # 90分钟[1-1],120分钟[2-1],点球[5-3]
    for phase in ['90分钟', '120分钟', '点球']:
        pattern = rf'{phase}\[(\d+)-(\d+)\]'
        m = re.search(pattern, memo_str)
        if m:
            result[phase] = (int(m.group(1)), int(m.group(2)))

    return result if result else None


def convert_team_name(cn_name):
    """将中文队名转换为英文"""
    # 去除"(中)"标记（中立场地）
    cn_name = cn_name.replace('(中)', '').strip()

    if cn_name in TEAM_CN_TO_EN:
        return TEAM_CN_TO_EN[cn_name]

    # 未映射的返回原始中文名
    return cn_name


def convert_round_name(s_name):
    """将7m轮次名转换为英文"""
    round_map = {
        '资格赛1': 'Qualifying Round 1',
        '资格赛1附加': 'Qualifying Round 1 Replay',
        '资格赛2': 'Qualifying Round 2',
        '资格赛2附加': 'Qualifying Round 2 Replay',
        '资格赛3': 'Qualifying Round 3',
        '资格赛3附加': 'Qualifying Round 3 Replay',
        '资格赛4': 'Qualifying Round 4',
        '资格赛4附加': 'Qualifying Round 4 Replay',
        '第一圈': '1st Round',
        '第一圈附加': '1st Round Replay',
        '第二圈': '2nd Round',
        '第二圈附加': '2nd Round Replay',
        '第三圈': '3rd Round',
        '第三圈附加': '3rd Round Replay',
        '第四圈': '4th Round',
        '第四圈附加': '4th Round Replay',
        '第五圈': '5th Round',
        '第五圈附加': '5th Round Replay',
        '半准决赛': 'Quarter-finals',
        '半决赛': 'Semi-finals',
        '决赛': 'Final',
        # 西班牙杯特有轮次
        '第一轮': '1st Round',
        '第二轮': '2nd Round',
        '第三轮': '3rd Round',
        '第四轮': '4th Round',
        '第五轮': '5th Round',
        '第六轮': '6th Round',
        # 德国杯特有轮次
        '第一圈(2)': '1st Round',
        '第二圈(2)': '2nd Round',
        # 法国杯
        '第七圈': '7th Round',
        '第八圈': '8th Round',
        '第九圈': '9th Round',
        '第十圈': '10th Round',
        '六十四强': 'Round of 64',
        '三十二强': 'Round of 32',
        '十六强': 'Round of 16',
        '准决赛': 'Semi-finals',
        # 通用
        '预赛': 'Preliminary Round',
        '预选赛': 'Preliminary Round',
    }
    return round_map.get(s_name, s_name)


def scrape_cup(cup_id, cup_info):
    """抓取单个杯赛数据并转换为openfootball格式"""
    print(f"\n{'='*60}")
    print(f"抓取: {cup_info['name_cn']} ({cup_info['name_en']}) - 7m ID: {cup_id}")
    print(f"{'='*60}")

    js_text = fetch_matches_js(cup_id)
    if not js_text:
        return None

    # 解析关键变量
    s_name_arr = parse_js_string_array(js_text, 's_name_arr')
    start_time_arr = parse_js_indexed_arrays(js_text, 'Start_time_arr')
    team_a_arr = parse_js_indexed_arrays(js_text, 'TeamA_arr')
    team_b_arr = parse_js_indexed_arrays(js_text, 'TeamB_arr')
    score_arr = parse_js_indexed_arrays(js_text, 'score_arr')
    memo_arr = parse_js_indexed_arrays(js_text, 'Memo_arr')
    default_ord = parse_js_number_var(js_text, 'defaultord')

    if not s_name_arr or not start_time_arr or not team_a_arr:
        print(f"  ❌ 解析失败：缺少必要数据")
        print(f"     s_name_arr: {s_name_arr is not None}, start_time: {len(start_time_arr)}, team_a: {len(team_a_arr)}")
        return None

    print(f"  轮次: {len(s_name_arr)} 个阶段")
    print(f"  默认显示: 第{default_ord}阶段 ({s_name_arr[default_ord] if default_ord < len(s_name_arr) else '?'})")

    # 转换为openfootball格式
    matches = []

    for round_idx in range(len(s_name_arr)):
        round_name_cn = s_name_arr[round_idx]
        round_name_en = convert_round_name(round_name_cn)

        # 获取该轮次的比赛数据
        times = start_time_arr.get(round_idx, [])
        teams_a = team_a_arr.get(round_idx, [])
        teams_b = team_b_arr.get(round_idx, [])
        scores = score_arr.get(round_idx, [])

        if not times or not teams_a:
            continue

        match_count = len(teams_a)
        print(f"  阶段 {round_idx} ({round_name_cn}/{round_name_en}): {match_count} 场比赛")

        for i in range(match_count):
            # 解析时间
            time_data = times[i] if i < len(times) else ''
            date_str, time_str = parse_start_time(time_data)

            # 解析队名
            home_cn = teams_a[i] if i < len(teams_a) else ''
            away_cn = teams_b[i] if i < len(teams_b) else ''
            home_en = convert_team_name(home_cn)
            away_en = convert_team_name(away_cn)

            # 解析比分
            score_data = scores[i] if i < len(scores) else 'VS'
            home_score, away_score = parse_score(score_data)

            # 构建比赛记录
            match = {
                "round": round_name_en,
                "date": date_str,
                "time": time_str,
                "team1": home_en,
                "team2": away_en,
            }

            # 添加比分（如果有）
            if home_score is not None:
                match["score"] = {"ft": [home_score, away_score]}

            # 添加中文队名（用于显示）
            match["team1_cn"] = home_cn.replace('(中)', '').strip()
            match["team2_cn"] = away_cn.replace('(中)', '').strip()

            # 添加7m原始数据引用
            match["_source"] = f"7m.com.cn ID:{cup_id} R:{round_idx} M:{i}"

            matches.append(match)

    print(f"\n  ✅ 总计: {len(matches)} 场比赛")

    return {
        "name": cup_info['name_en'],
        "name_cn": cup_info['name_cn'],
        "league_id": cup_info['league_id'],
        "country": cup_info['country'],
        "season": "2025-26",
        "source": f"https://data.7m.com.cn/matches_data/{cup_id}/gb/index.shtml",
        "matches": matches
    }


def filter_major_rounds(data):
    """过滤掉低级别轮次，只保留有五大联赛球队参与的轮次
    对于足总杯: 第3圈(3rd Round)开始有英超球队
    对于联赛杯: 第3圈(3rd Round)开始有英超球队
    对于德国杯: 第2圈(2nd Round)开始有德甲球队
    对于国王杯: 第3轮(3rd Round)开始有西甲球队
    对于法国杯: 第7圈(7th Round)开始有法甲球队
    """
    # 定义各大杯赛的关键轮次（从这些轮次开始有顶级联赛球队）
    key_rounds = {
        "FAC": ["3rd Round", "3rd Round Replay", "4th Round", "4th Round Replay",
                "5th Round", "5th Round Replay", "Quarter-finals", "Semi-finals", "Final"],
        "LC": ["3rd Round", "3rd Round Replay", "4th Round", "4th Round Replay",
               "Quarter-finals", "Semi-finals", "Final"],
        "DFB": ["2nd Round", "3rd Round", "4th Round", "Quarter-finals",
                "Semi-finals", "Final"],
        "CDR": ["3rd Round", "4th Round", "5th Round", "6th Round",
                "Quarter-finals", "Semi-finals", "Final"],
        "CDF": ["Round of 32", "Round of 16", "Quarter-finals", "Semi-finals", "Final"],
    }

    league_id = data["league_id"]
    if league_id not in key_rounds:
        return data

    allowed = key_rounds[league_id]
    original_count = len(data["matches"])
    data["matches"] = [m for m in data["matches"] if m["round"] in allowed]
    filtered_count = len(data["matches"])
    print(f"  过滤: {original_count} → {filtered_count} 场（仅保留有顶级联赛球队的轮次）")

    return data


def main():
    output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cup_data")
    os.makedirs(output_dir, exist_ok=True)

    all_results = {}

    for cup_id, cup_info in CUPS_7M.items():
        data = scrape_cup(cup_id, cup_info)
        if data:
            # 过滤低级别轮次
            data = filter_major_rounds(data)

            # 保存完整JSON
            output_file = os.path.join(output_dir, f"{cup_info['league_id'].lower()}_2025-26.json")
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"  💾 已保存: {output_file}")

            # 统计
            mapped = sum(1 for m in data["matches"] if m["team1"] != m["team1_cn"] or m["team2"] != m["team2_cn"])
            unmapped = sum(1 for m in data["matches"] if m["team1"] == m["team1_cn"] or m["team2"] == m["team2_cn"])
            print(f"  📊 队名映射: {mapped} 已映射, {unmapped} 未映射(保留中文)")

            # 列出未映射的队名
            unmapped_teams = set()
            for m in data["matches"]:
                if m["team1"] == m["team1_cn"]:
                    unmapped_teams.add(m["team1_cn"])
                if m["team2"] == m["team2_cn"]:
                    unmapped_teams.add(m["team2_cn"])
            if unmapped_teams:
                print(f"  ⚠️ 未映射队名: {', '.join(sorted(unmapped_teams)[:20])}{'...' if len(unmapped_teams) > 20 else ''}")

            all_results[cup_info['league_id']] = data

    # 生成汇总
    print(f"\n{'='*60}")
    print("汇总:")
    print(f"{'='*60}")
    for league_id, data in all_results.items():
        print(f"  {data['name_cn']} ({data['name']}): {len(data['matches'])} 场比赛")

    # 生成合并文件（用于APP嵌入）
    merged = {}
    for league_id, data in all_results.items():
        merged[league_id] = {
            "name": data["name"],
            "name_cn": data["name_cn"],
            "country": data["country"],
            "season": data["season"],
            "source": data["source"],
            "matchCount": len(data["matches"]),
            "matches": data["matches"]
        }

    merged_file = os.path.join(output_dir, "all_cups_2025-26.json")
    with open(merged_file, 'w', encoding='utf-8') as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)
    print(f"\n💾 合并文件已保存: {merged_file}")


if __name__ == "__main__":
    main()
