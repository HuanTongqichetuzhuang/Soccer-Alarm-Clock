# v2.19 存档 — 2026-05-10

## 功能
- App名称改为"足球闹钟APP"
- 浅色/深色模式切换
- 214支球队队徽（含54个Wikipedia下载）
- 铃声选择：无铃声仅震动 / 铃声静音震动关闭
- 检查更新功能（Header"更新"按钮→服务器比对版本）
- 音量键拦截到闹钟音量
- 离线检测横幅

## 安全加固
- SSL证书绕过修复
- allowBackup=false
- network_security_config限制明文流量
- R8混淆+ProGuard
- 隐私政策页面

## 权限模块
- 通知/精确闹钟/电池优化/悬浮窗权限一键检查
- OPPO等品牌ROM专项适配
- getAllPermissionStatus返回布尔值

## 服务器
- 阿里云ECS 8.154.26.92:3000
- 多数据源架构(apifootball→juhe→openfootball)
- APK下载托管 /api/download
- 版本查询 /api/version