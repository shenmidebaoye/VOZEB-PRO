# VOZEB PRO Desktop

Tauri 壳 + Next.js 本机 sidecar。默认使用 **预构建 standalone**，冷启动不再走 `next dev` 按路由现编。

## 为什么不先换成 Vite？

| 方案 | 冷启动 / 点路由 | 代价 |
|------|-----------------|------|
| Next `dev`（旧） | 慢，点路由才编译 | 无 |
| **Next standalone（当前默认）** | 快，页面已预构建 | 首次要 build；改 UI 需 `desktop:rebuild` |
| Vite SPA + 另起 API | UI HMR 很快 | 需拆掉 App Router / 全部 Route Handler，接近重写 |

后端业务、Agent SSE、媒体、Worker 都在 Next Route Handler 与 `lib/server`。只换 Vite 不能带走这些；要迁就等于前后端拆分重做。桌面体验优先用 standalone，不要先做框架迁移。

## 前置

- Node.js 22+
- Rust（`rustc` / `cargo`）
- Windows 上需 WebView2

## 开发（推荐：快冷启动）

首次会自动生产构建（较久一次）；之后打开应用应在数秒内进 `/create`。

```bash
pnpm --dir desktop install
pnpm desktop:dev
```

强制重建 standalone：

```bash
pnpm desktop:rebuild
pnpm desktop:dev
```

仅验证 sidecar：

```bash
pnpm desktop:sidecar
```

## 需要热更新时（慢）

改 UI 并要 HMR 时再用（会回到按路由现编）：

```bash
pnpm desktop:dev:hmr
```

或：

```bash
set VOZEB_PRO_DESKTOP_MODE=dev
pnpm desktop:dev
```

## 数据目录

桌面模式默认把 `VOZEB_PRO_DATA_DIR` 指到系统 AppData。加密密钥与 Worker 令牌在 `desktop-runtime.json`。

## 说明

当前仍使用系统已安装的 Node 拉起 sidecar。正式安装包还需把 Node 运行时与 standalone 产物打进 bundle。

桌面窗口已关闭系统标题栏，使用应用内自定义顶栏（跟随浅/深主题，可拖动，含最小化/最大化/关闭）。改 UI 后请 `pnpm desktop:rebuild`。
