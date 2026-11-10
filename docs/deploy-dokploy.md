# 用 Dokploy 部署 GymGym

整个应用是**一个容器**：Node 服务同时提供 `/api` 接口和前端页面，数据存在容器内 `/app/data/gymgym.db`（SQLite）。

## 1. 创建应用

1. Dokploy 里进入项目 → **Create Service → Application**。
2. **Provider** 选 GitHub，仓库 `tuxin-openclaw/gymgym`，分支选你要部署的分支。
3. **Build Type** 选 **Dockerfile**，Dockerfile Path 填 `Dockerfile`，Context 填 `.`。

## 2. 挂载数据卷（必须）

**Advanced → Mounts → Add Mount**：

| 字段 | 值 |
|---|---|
| Type | Volume Mount |
| Volume Name | `gymgym-data` |
| Mount Path | `/app/data` |

> 不挂载的话，每次重新部署都会得到一个全新的空数据库，所有账号和训练数据都会丢失。

## 3. 环境变量（Environment）

账号系统用的是 [Better Auth](https://www.better-auth.com)：**不开放注册**，账号由管理员在应用里创建；支持用户名密码和 GitHub 登录。

### 必填：初始管理员

| 变量 | 说明 |
|---|---|
| `ADMIN_USERNAME` | 管理员用户名。启动时如果这个账号不存在就自动创建；已存在则确保它是管理员 |
| `ADMIN_PASSWORD` | 管理员初始密码（至少 8 位）。**只在首次创建时使用**，之后改这个变量不会改密码 |

登录后在「设置 → 用户管理」里创建其他账号、重置密码、停用或删除账号、设置管理员。

### 选填：GitHub 登录

| 变量 | 说明 |
|---|---|
| `GITHUB_CLIENT_ID` | GitHub OAuth App 的 Client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App 的 Client Secret |
| `BETTER_AUTH_URL` | 你的访问地址，如 `https://gym.example.com`。**启用 GitHub 登录时必须设置**，否则回调地址可能变成 http |

创建 OAuth App：GitHub → Settings → Developer settings → OAuth Apps → New OAuth App

- Homepage URL：`https://gym.example.com`
- Authorization callback URL：`https://gym.example.com/api/auth/callback/github`

GitHub 登录**不会自动创建账号**，只能登录已关联的账号。关联方式有两种：

1. 管理员创建账号时填写对方 GitHub 账号里**已验证的邮箱**，对方即可直接用 GitHub 登录（这种账号可以不设密码）；
2. 用户先用用户名密码登录，在「设置 → GitHub 登录」里自己绑定。

### 其他

| 变量 | 默认值 | 说明 |
|---|---|---|
| `BETTER_AUTH_SECRET` | 首次启动随机生成，存在数据库里 | 会话签名密钥。想自己管理就配一个 32 位以上的随机串；**换掉它会让所有人退出登录** |
| `COOKIE_SECURE` | 生产环境为 `true` | 只有用纯 HTTP（没有 HTTPS）访问时才设为 `false`，否则登录后 Cookie 存不下来 |
| `PORT` | `3000` | 容器内监听端口 |
| `DB_PATH` | `/app/data/gymgym.db` | 一般不用改 |

登录安全方面：密码用 scrypt 加密保存；同一 IP 短时间内连续输错密码会被限流（返回 429）；同步接口会校验请求来源，防跨站请求；被停用的账号会立即在所有设备上退出。

## 4. 域名

**Domains → Add Domain**：

- Host：你的域名（DNS A 记录指向 Dokploy 服务器）
- Container Port：`3000`
- 开启 **HTTPS**，证书选 Let's Encrypt

> 一定要用 HTTPS：PWA 安装、离线缓存（Service Worker）都只在 HTTPS 下可用。

## 5. 部署

点 **Deploy**。完成后访问 `https://你的域名/api/health`，返回 `{"ok":true}` 即正常。

## 备份

数据全部在卷 `gymgym-data` 的 `gymgym.db`（以及运行时的 `-wal`、`-shm` 文件）里，账号和训练数据都在这一个文件。可以在 Dokploy 的 Volume Backups 里配置定时备份到 S3，或者在服务器上：

```bash
docker run --rm -v gymgym-data:/data -v $PWD:/backup alpine \
  tar czf /backup/gymgym-$(date +%F).tgz -C /data .
```

## 本地开发

需要 Node ≥ 22.18（直接运行 TypeScript 和使用内置 `node:sqlite`）。

```bash
npm install
ADMIN_USERNAME=admin ADMIN_PASSWORD=admin12345 npm run dev:server   # 后端 http://localhost:3000，数据在 ./data/gymgym.db
npm run dev          # 前端 http://localhost:5173，/api 自动代理到后端
```

手机调试：两个都启动后，用终端里 `Network:` 那行的局域网地址访问前端即可。
