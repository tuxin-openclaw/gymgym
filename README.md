# GymGym 💪 健身记录

一个给自己用的健身记录 App：**制定计划 → 记录每一组 → 回顾进步**。移动端优先的 PWA，可以「添加到主屏幕」像原生 App 一样使用，账号由管理员创建（支持 GitHub 登录），数据本地优先、联网自动同步到服务器（SQLite），断网也能照常记录。

<p>
<img src="docs/screenshots/home.jpg" width="160"> <img src="docs/screenshots/picker.jpg" width="160"> <img src="docs/screenshots/workout.jpg" width="160"> <img src="docs/screenshots/summary.jpg" width="160"> <img src="docs/screenshots/stats.jpg" width="160"> <img src="docs/screenshots/library.jpg" width="160">
</p>

## 功能

- **动作库**：876 个动作（开源 free-exercise-db），全部中文名，带两帧示范图、目标肌群和动作要领；按部位 / 器材 / 关键词筛选，或直接在人体肌肉图上点选；支持自定义动作。
- **训练计划**：选部位 → 选器材 → 选动作，设置组数、次数、重量、组间休息和训练日；5 套推荐模板一键创建。
- **训练记录**：逐组记录重量 × 次数 / 时长 / 距离，自动带出上次数据，一键完成；热身 / 递减 / 力竭组；自动组间休息倒计时（振动 + 提示音）；屏幕常亮；刷新不丢。
- **训练总结**：时长、容量、组数、个人记录（PR）提醒、练到的肌肉、感受打分。
- **记录与统计**：月历历史、训练详情、再练一次、趋势图、部位分布、个人记录、单动作进步曲线、体重曲线。
- **其他**：深色 / 浅色主题、kg / lb、JSON 备份导出导入、离线可用。

设计文档：[产品需求 PRD](docs/PRD.md) · [交互与视觉设计](docs/interaction-design.md)

## 开发

```bash
npm install
ADMIN_USERNAME=admin ADMIN_PASSWORD=admin12345 npm run dev:server  # 后端 http://localhost:3000（Node ≥ 22.18，数据在 ./data/gymgym.db）
npm run dev        # 前端 http://localhost:5173，/api 代理到后端
npm run build      # 前端产物在 dist/
npm start          # 生产模式：后端同时托管 dist/
npm run data       # 从 data-src/ 重新生成 public/data/exercises.json
```

技术栈：React 19 · TypeScript · Vite · Tailwind CSS v4 · Dexie（IndexedDB，本地缓存）· Hono + node:sqlite + Better Auth（后端）· Zustand · vite-plugin-pwa · Lucide 图标 · 自绘 SVG 人体肌肉图与图表。

## 部署

用 Dockerfile 部署为单个容器（接口 + 前端），SQLite 文件放在挂载卷 `/app/data`。Dokploy 的完整步骤见 [docs/deploy-dokploy.md](docs/deploy-dokploy.md)。

## 安装到桌面 / 主屏幕

GymGym 是标准 PWA，部署后（必须是 HTTPS）可以像 App 一样安装：

| 设备 | 方式 |
| --- | --- |
| iPhone / iPad | 用 **Safari** 打开 → 底部「分享」→「添加到主屏幕」 |
| 安卓 | Chrome / Edge / 系统浏览器打开，首页会出现「安装」提示条，点一下即可；或菜单 ⋮ →「安装应用」 |
| 电脑 | Chrome / Edge 地址栏右侧的「安装」图标；Mac Safari：文件 →「添加到程序坞」 |
| 微信 / QQ 内 | 无法直接安装，点右上角 ··· →「在浏览器中打开」 |

App 内首页提示条和「设置 → 安装到桌面 / 主屏幕」都有分平台的图文引导。安装后：全屏无地址栏、断网可用、iOS 有启动画面，长按桌面图标（安卓 / 电脑）可直接「开始训练」「训练记录」「动作库」。

重新生成图标与 iOS 启动图：`node scripts/gen-pwa-assets.cjs`。

## 致谢

- 动作数据与示范图：[yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db)（Unlicense）。中文名称由本项目翻译，见 `scripts/zh-names.txt`。
- 图标：[Lucide](https://lucide.dev)（ISC）。
