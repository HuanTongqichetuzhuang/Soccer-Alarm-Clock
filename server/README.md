# SoccerAlarmPro 数据服务器

## 快速部署

### 1. 本地运行
```bash
npm start
```

### 2. Docker 部署
```bash
# 设置 API Key（可选）
export API_FOOTBALL_KEY=你的key

# 启动
docker compose up -d
```

### 3. 部署到云服务器
```bash
# 上传
scp -r . root@你的IP:/opt/soccer-server/

# SSH 进去
ssh root@你的IP
cd /opt/soccer-server

# 安装 Node
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install nodejs -y

# 用 pm2 保活
npm install -g pm2
pm2 start server.js --name soccer
pm2 save
pm2 startup
```

## API 端点

| 端点 | 说明 |
|------|------|
| GET /api/health | 服务健康检查 |
| GET /api/live | 实时比分（自动降级） |
| GET /api/fixtures/:id | 联赛赛程 |
| GET /api/standings/:id | 积分榜 |
| GET /api/version | 应用版本信息 |
| GET /api/download | 下载最新 APK |
| GET /api/source?mode= | 切换数据源 |
| GET /api/clear-cache | 清除缓存 |

## 放置 APK

将构建好的 APK 放到 `apk/SoccerAlarmPro.apk`，更新环境变量：

```bash
export APK_DOWNLOAD_URL=https://你的域名/api/download
export APK_FILE_PATH=./apk/SoccerAlarmPro.apk
```

然后在 index.html 的服务器设置里填入你的服务器地址即可。