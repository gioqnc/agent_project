# qhpd 部署

## 目录和文件

| 内容 | 位置 |
|------|------|
| 程序 | `/opt/qhp/bin/qhpd` |
| 配置 | `/etc/qhp/qhpd.toml` |
| 环境变量 | `/etc/qhp/qhpd.env` |
| 准入名单 | `/etc/qhp/allow.list` |
| 日志 | `/var/log/qhp/` |

运行用户是 `qhp`，不要用 root 跑。

## qhpd.toml

```toml
listen  = "0.0.0.0:4721"
metrics = "127.0.0.1:9091"
qhx     = "txt,bin,hb,ack"
```

## systemd

qhpd 由 systemd 管理，服务名 `qhpd.service`。unit 文件的关键几行：

```ini
[Service]
User=qhp
EnvironmentFile=/etc/qhp/qhpd.env
ExecStart=/opt/qhp/bin/qhpd --config /etc/qhp/qhpd.toml
Restart=on-failure
RestartSec=5
```

- `Restart=on-failure` 加 `RestartSec=5`：进程异常退出后，systemd 等 5 秒把它重新启动；用 `systemctl stop` 正常停止的不会被重新启动
- `EnvironmentFile`：`QHP_TIMEOUT_MS`、`QHP_LOG_LEVEL` 这类环境变量写在 `/etc/qhp/qhpd.env` 里。改完要 `systemctl restart qhpd`

## 部署前检查

1. 4721 端口没有被占用：`ss -ltnp | grep 4721`
2. `/etc/qhp/allow.list` 已经写好，空名单会拒绝所有地址（见 `notes/access.md`）
3. 部署后 `qhpctl status` 能看到版本号
