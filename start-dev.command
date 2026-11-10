#!/bin/zsh -l
# 临时启动器：双击运行。启动后保持此窗口打开，关闭窗口即停止服务。
cd "$(dirname "$0")"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
ok_node() { node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||(a===22&&b>=18)?0:1)' 2>/dev/null; }
if ! ok_node; then
  if command -v nvm >/dev/null; then
    echo "当前 Node $(node -v 2>/dev/null) 版本太低，用 nvm 切换到 Node 22…"
    nvm install 22 && nvm use 22
  fi
fi
if ! ok_node; then echo "❌ 需要 Node ≥ 22.18，当前 $(node -v 2>/dev/null)。按回车退出"; read; exit 1; fi
echo "✅ Node $(node -v)"
if command -v pnpm >/dev/null; then pnpm install
elif [ -d node_modules/.pnpm ] && command -v corepack >/dev/null; then corepack pnpm install
else npm install; fi || { echo "❌ 依赖安装失败，按回车退出"; read; exit 1; }
echo ""
echo "🚀 前端 http://localhost:5173   管理员账号 admin / admin12345"
echo ""
npm run dev:all
