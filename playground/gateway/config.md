# 网关配置

配置文件：`/etc/qhp/qhp-gw.toml`

```toml
listen       = "0.0.0.0:4722"     # 客户端连接的地址和端口
admin        = "127.0.0.1:9090"   # 管理接口
berth_max    = 64                 # 每个上游最多几个泊位
berth_idle_s = 300                # 泊位多久没有帧经过就回收，单位秒
queue_max    = 128                # 等候队列上限
queue_wait_s = 10                 # 在等候队列里最多等几秒
redial_max   = 5                  # 上游断开后最多回连几次
cooldown_s   = 600                # 摘除后冷却多久再加回，单位秒
```

## 修改后怎么生效

- 大部分配置：执行 `qhpctl gw reload` 热加载，不中断现有会话
- `listen`、`admin` 这两项例外：改了必须重启网关才生效，命令是 `systemctl restart qhp-gw`，重启会断开网关上的全部会话

## 上游列表

上游节点写在同目录的 `/etc/qhp/qhp-gw.upstreams`，每行一个 `地址:端口`，修改后同样用 `qhpctl gw reload` 生效。
