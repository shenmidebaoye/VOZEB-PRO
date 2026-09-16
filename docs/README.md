# 项目文档

该目录包含 VOZEB PRO 文档站，包括产品功能、本机安装、配置、接口与数据库和项目治理说明。文档站基于 Next.js 与 Fumadocs。

## 本地开发

```bash
pnpm install
pnpm dev
```

## 生产构建

```bash
pnpm build
pnpm start
```

不提供 Docker 镜像部署。

## 目录职责

- `content/docs/`：公开文档正文与导航元数据。
- `src/app/`：文档站页面、布局和搜索接口。
- `src/lib/`：内容源、布局和站点配置。
- `public/`：文档图片与公开静态资源。
- `source.config.ts`：Fumadocs MDX 内容结构配置。
