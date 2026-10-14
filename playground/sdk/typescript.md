# TypeScript SDK（@qhlab/qhp）

## 安装

```bash
npm i @qhlab/qhp@1.3.0
```

## 最小示例

```ts
import { createSession } from "@qhlab/qhp";

const s = await createSession({ host: "qh-gw-stg", port: 4722 });
await s.sendText("hello");
await s.close();
```

## 选项

| 选项 | 默认值 | 说明 |
|------|--------|------|
| `host` | 必填 | qhpd 或网关的地址 |
| `port` | 4721 | 端口 |
| `timeoutMs` | 读 `QHP_TIMEOUT_MS`，没有就是 2700 | 等待对端应答的超时 |
| `autoReconnect` | `false` | 断开后是否自动重连 |

## 自动重连

`autoReconnect` 默认关闭。打开后：

- 第一次在断开 500 毫秒后重连
- 之后每次间隔翻倍，最长 8 秒
- 不限次数，直到成功或调用 `close()`
- 每次重连都是一次完整的会话建立（从探活开始），成功后 epoch 加一

## 事件

- `drop`：判定连接断开时触发（比如连续 4 次没收到心跳）
- `locked`：会话锁定成功时触发
