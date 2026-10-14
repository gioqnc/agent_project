# 青禾实验室 · 资料索引

本目录是「青禾协议」（Qinghe Protocol，简称 QHP）及相关组件的内部资料。
QHP 是青禾实验室内部会话层协议，不是公开标准，答案只能从本目录文件中来。

> 本索引最后整理于 v1.2 发布时，之后新增的文件没有逐个补进来，找不到时直接看各个目录。

## 协议笔记（notes/）

- `notes/overview.md` — 协议是什么、适用场景
- `notes/timeout.md` — 超时与重试
- `notes/probe.md` — 会话建立第 1 步：探活
- `notes/handshake.md` — 会话建立第 2 步：握手
- `notes/ticket.md` — 会话建立第 3 步：票证交换
- `notes/lock.md` — 会话建立第 4 步：会话锁定
- `notes/errors.md` — 错误码
- `notes/frames.md` — 帧类型、能力字和心跳
- `notes/changelog.md` — 版本变更记录
- `notes/ops-faq.md` — 运维常见问题

## 其他目录

- `gateway/` — QHP 网关
- `sdk/` — 客户端 SDK
- `ops/` — 部署、日志、监控、告警、命令行工具
- `meetings/` — 会议纪要
- `rfc/` — 改进提案（不一定已经实施，看每篇开头的状态）
- `onboarding/` — 新人资料

## 已废弃

- `archive/` — 早期草稿和旧文档，数值已过时，不要引用
