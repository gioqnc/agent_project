# 监控指标

Prometheus 每 15 秒抓一次指标。

## 从哪抓

- qhpd：`127.0.0.1:9091/metrics`
- 网关：`127.0.0.1:9090/metrics`

两个端口只差一位，配置采集任务时别填反。

## qhpd 指标

| 指标 | 含义 |
|------|------|
| `qhp_sessions_active` | 当前已经锁定的会话数 |
| `qhp_establish_total` | 会话建立尝试次数 |
| `qhp_establish_fail_total{step}` | 各步骤失败次数，`step` 取 `probe`、`handshake`、`ticket`、`lock` |
| `qhp_hb_miss_total` | 心跳缺失次数 |

## 网关指标

| 指标 | 含义 |
|------|------|
| `qhpgw_berth_in_use{upstream}` | 每个上游正在使用的泊位数 |
| `qhpgw_queue_len` | 等候队列长度 |
| `qhpgw_upstream_removed` | 当前被摘除的上游数量 |

告警规则见 `ops/alerts.md`。
