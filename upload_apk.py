"""Upload APK to server + update server.js version info"""
import paramiko, time, json, os, sys

sys.stdout.reconfigure(encoding='utf-8')

v = json.loads(open(r'E:\项目\SoccerAlarmPro\version.json', encoding='utf-8-sig').read())
apk_path = rf'E:\项目\SoccerAlarmPro\SoccerAlarmPro_v{v["versionName"]}.apk'

if not os.path.exists(apk_path):
    print(f'APK not found: {apk_path}')
    sys.exit(1)

print(f'Uploading {os.path.basename(apk_path)} ({os.path.getsize(apk_path)//1024//1024}MB)...')

t = paramiko.Transport(('8.154.26.92', 22))
t.connect(username='root', password='Dd26554032')
sftp = paramiko.SFTPClient.from_transport(t)
sftp.put(apk_path, f'/opt/soccer-server/apk/SoccerAlarmPro_v{v["versionName"]}.apk')
print('APK uploaded')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('8.154.26.92', 22, 'root', 'Dd26554032')

# Update server.js version line
stdin, stdout, stderr = c.exec_command('cat /opt/soccer-server/server.js')
content = stdout.read().decode('utf-8')

import re
pattern = r"return json\(res, \{ versionCode: \d+, versionName: '[^']*', changelog: '[^']*', forceUpdate: (true|false), downloadUrl: 'http://8\.154\.26\.92:3000/apk/SoccerAlarmPro_v[^']*\.apk' \}\);"
old_match = re.search(pattern, content)
if old_match:
    old_line = old_match.group()
    new_line = f"return json(res, {{ versionCode: {v['versionCode']}, versionName: '{v['versionName']}', changelog: '{v['changelog']}', forceUpdate: false, downloadUrl: 'http://8.154.26.92:3000/apk/SoccerAlarmPro_v{v['versionName']}.apk' }});"
    content = content.replace(old_line, new_line)
    print(f'Updated version line')
else:
    print('WARNING: version line pattern not found')

tmp = os.path.join(os.environ['TEMP'], 'srv_upload.js')
with open(tmp, 'w', encoding='utf-8') as f:
    f.write(content)
sftp.put(tmp, '/opt/soccer-server/server.js')

c.exec_command('pm2 restart soccer-server')
time.sleep(2)

stdin2, stdout2, stderr2 = c.exec_command('curl -s http://localhost:3000/api/version')
print(f'Version: {stdout2.read().decode()[:150]}')

c.close()
sftp.close()
print('DONE.')
