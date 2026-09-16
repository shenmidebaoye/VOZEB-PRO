# VOZEB PRO 文档索引

VOZEB PRO 是面向图片、视频、短剧与品牌物料生产的本机 AI 创作工具。当前仓库：`csyqlz/VOZEB-PRO`。

## 产品与安装

- [功能总览](/docs/overview/features)
- [项目结构与流程](/docs/overview/project-structure)
- [页面功能图册](/docs/overview/page-gallery)
- [快速开始](/docs/overview/quick-start)
- [配置说明](/docs/overview/configuration)
- [桌面应用（Tauri）](../desktop/README.md)
- [生产上线基线](/docs/overview/production-readiness)

## 创作与画布

- [画布节点操作手册](/docs/canvas/canvas-node-manual)
- [画布快捷键](/docs/canvas/canvas-shortcuts)
- [第三方提示词来源说明](/docs/overview/third-party-prompt-repositories)

## 开发与数据

- [本地开发](/docs/backend/local-development)
- [接口响应与敏感配置](/docs/backend/api-response)
- [数据库结构](/docs/backend/backend-database)
- [画布数据结构](/docs/backend/canvas-data-structure)

## 项目治理

- [社区交流与致谢](/docs/support/community)
- [赞助支持](/docs/support/donate)
- [商业落地缺口](/docs/business/commercial-launch)
- [许可证与商业使用](/docs/business/license)
- [商业授权](/docs/business/commercial-license)
- [免责声明](/docs/business/disclaimer)
- [授权与合规警示](/docs/business/legal-notice)
- [贡献者协议](/docs/business/cla)
- [商务合作](/docs/business/business)
- [安全与漏洞提交](/docs/support/security)
- [待测试](/docs/progress/pending-test)
- [TODO](/docs/progress/todo)
- [更新日志](/docs/progress/changelog)

## 重要说明

- 本机默认使用文件 Provider；可选 PostgreSQL 保存业务数据。
- 创作会话、Canvas、我的素材、短剧和工作台记录保存在服务端，不依赖浏览器业务缓存。
- 图片、视频和音频按媒体登记保存在本机数据目录或可选 S3 兼容对象存储。
- 模型密钥由服务端读取或加密保存，不通过普通用户接口下发。
- 不提供 Docker / Compose / Render 镜像部署；用 `pnpm start` 或 `pnpm run dev` 本机运行。
- 环境变量统一使用 `VOZEB_PRO_` 前缀。
