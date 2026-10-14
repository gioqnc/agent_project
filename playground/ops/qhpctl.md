# qhpctl 命令参考

`qhpctl` 是 qhpd 和网关的命令行管理工具，安装在 `/opt/qhp/bin/qhpctl`。需要用 `qhp` 用户执行，或者加 `sudo -u qhp`。

`qhpctl` 通过本机的管理接口和 qhpd、网关通信，所以只能在 qhpd 或网关所在的机器上执行，不能远程操作别的机器。

## 通用选项

| 选项 | 说明 |
|------|------|
| `--json` | 输出 JSON，方便脚本处理 |
| `--timeout <秒>` | qhpctl 自己等待 qhpd 或网关回应的时间，默认 3 秒 |
| `--quiet` | 只输出结果，不输出提示信息 |

注意：`--timeout` 只管 qhpctl 这个命令行工具自己等多久，和协议的默认超时（`notes/timeout.md`）没有关系。

## 环境变量

| 变量 | 说明 |
|------|------|
| `QHPCTL_TIMEOUT` | 相当于默认的 `--timeout`，命令行里写了 `--timeout` 时以命令行为准 |
| `QHPCTL_COLOR` | 设为 `never` 时输出不带颜色，写脚本时建议设置 |

## qhpctl version

```text
$ qhpctl version
qhpctl     1.3.0
qhpd       v1.3
qhp-gw     1.1.2
```

显示 qhpctl 自己、本机 qhpd 和本机网关的版本。本机没有装网关时，`qhp-gw` 一行显示 `not installed`。升级完第一件事就是跑一下这个命令，确认版本对得上。

## qhpctl check-config

```text
$ qhpctl check-config /etc/qhp/qhpd.toml
ok
```

检查配置文件的语法和取值范围，只检查，不加载。改完配置先跑一遍，通过了再 `qhpctl reload`。常见的报错有：端口超出范围、`qhx` 里出现了不认识的短名、同一个配置项写了两次。

网关的配置文件也能检查：`qhpctl check-config /etc/qhp/qhp-gw.toml`。

## qhpctl status

查看 qhpd 的运行状态。

```text
$ qhpctl status
qhpd       running (pid 2817)
version    v1.3
listen     0.0.0.0:4721
sessions   37 locked, 2 establishing
uptime     6d 03:12:45
```

- `sessions` 里的 `locked` 是已经锁定、可以传业务帧的会话数，和指标 `qhp_sessions_active` 一致
- `establishing` 是正在建立、还没走完 4 步的会话数

## qhpctl sessions list

列出当前的会话。

```text
$ qhpctl sessions list
ID        PEER              STEP     EPOCH  AGE
s-9f21    10.20.3.17:51022  locked   12     00:41:07
s-9f22    10.20.3.18:40310  locked   3      00:12:55
s-9f2a    10.20.5.2:61770   ticket   -      00:00:01
```

可选参数：

- `--step <probe|handshake|ticket|lock|locked>`：只看停在某一步的会话
- `--peer <地址>`：只看某个对端的会话

`STEP` 一列显示会话当前所在的步骤。长时间停在 `ticket` 的会话，一般是票证有问题；停在 `handshake` 的，先看能力字。

## qhpctl sessions stats

按步骤统计最近一段时间的会话建立情况，默认统计最近 10 分钟。

```text
$ qhpctl sessions stats
STEP       TOTAL  FAIL  FAIL%
probe      1204   3     0.2%
handshake  1201   40    3.3%
ticket     1161   2     0.2%
lock       1159   0     0.0%
```

`--since <分钟>` 可以改统计范围。某一步的失败率明显比其他步骤高，就从那一步开始查。

## qhpctl sessions kill

```text
$ qhpctl sessions kill s-9f21
```

强制拆除一个会话。qhpctl 会让 qhpd 向对端发 `QHP-BYE`，流程和正常拆除一样（见 `notes/teardown.md`）。一次只能拆一个。

## qhpctl reload

重新读取 qhpd 的配置文件和准入名单 `/etc/qhp/allow.list`，不中断已经建立的会话。

不会重新读取环境变量。环境变量只在进程启动时读一次，改了环境变量要重启 qhpd。

## qhpctl loglevel

```text
$ qhpctl loglevel debug
log level: info -> debug
```

在线调整日志级别，可选 `debug`、`info`、`warn`、`error`，立即生效。进程重启后恢复成环境变量 `QHP_LOG_LEVEL` 的值。

## qhpctl trace

查看会话建立的过程。有两种用法。

按会话看，显示这个会话建立时每一步的耗时和结果：

```text
$ qhpctl trace --session s-9f2a
STEP       RESULT   COST
probe      ok       81 ms
handshake  ok       12 ms
ticket     waiting  1.8 s
lock       -        -
```

按步骤看，显示最近 N 次这一步的记录，默认 20 次：

```text
$ qhpctl trace --step handshake --last 5
TIME      PEER              RESULT   CODE
21:04:11  10.20.3.17:51022  ok       -
21:04:12  10.20.9.40:33001  fail     QHE-203
21:04:15  10.20.3.18:40310  ok       -
21:04:20  10.20.9.40:33002  fail     QHE-203
21:04:31  10.20.5.2:61770   ok       -
```

`--step` 可选 `probe`、`handshake`、`ticket`、`lock`。

## qhpctl gw status

查看网关状态，包括每个上游的泊位使用数、是否被摘除。

```text
$ qhpctl gw status
qhp-gw     running (pid 1904)
version    1.1.2
queue      0 / 128
UPSTREAM          STATE    BERTHS
10.20.1.11:4721   active   41 / 64
10.20.1.12:4721   active   38 / 64
10.20.1.13:4721   removed  -
```

## qhpctl gw reload

网关热加载配置文件 `/etc/qhp/qhp-gw.toml` 和上游列表。`listen`、`admin` 两项除外，这两项改了要重启网关。

## qhpctl gw drain

排空网关：网关不再接受新会话，已有会话继续，直到自然结束。升级网关或上游之前使用。

```text
$ qhpctl gw drain
draining... 129 sessions left
```

排空期间新会话会被拒绝。

## qhpctl gw resume

```text
$ qhpctl gw resume
accepting new sessions
```

结束排空，网关恢复接受新会话。如果排空以后重启了网关，重启会自动结束排空，不用再执行这个命令。

## qhpctl gw upstreams

```text
$ qhpctl gw upstreams
10.20.1.11:4721   active
10.20.1.12:4721   active
10.20.1.13:4721   removed  (cooldown 412s left)
```

列出网关当前的上游和状态。被摘除的上游会显示冷却还剩多久。上游列表来自 `/etc/qhp/qhp-gw.upstreams`。

## qhpctl gw readd

```text
$ qhpctl gw readd 10.20.1.13:4721
```

把一个被摘除的上游立即加回转发列表，不用等冷却结束。加回前先确认这个上游的 qhpd 已经恢复，否则回连失败后又会被摘除。

## qhpctl purge

```text
$ qhpctl purge --all --yes
```

清空 qhpd 上的全部会话。**危险操作**，所有客户端都要重新建立会话。必须同时带 `--all` 和 `--yes`，执行前要得到值班负责人同意（见 `ops/oncall.md`）。日常排查不要用。

## qhpctl metrics

```text
$ qhpctl metrics
qhp_sessions_active 37
qhp_establish_total 18842
qhp_establish_fail_total{step="probe"} 51
qhp_establish_fail_total{step="handshake"} 213
qhp_establish_fail_total{step="ticket"} 17
qhp_establish_fail_total{step="lock"} 4
qhp_hb_miss_total 960
```

打印 qhpd 当前的监控指标快照，内容和管理接口 `/metrics` 一样。Prometheus 挂了、看不到监控面板时，可以用它临时看数。指标的含义见 `ops/monitoring.md`。

## 在脚本里使用

加 `--json` 以后，所有命令都输出 JSON，适合配合 `jq` 写脚本。比如找出停在票证交换这一步超过 10 秒的会话：

```bash
qhpctl sessions list --step ticket --json \
  | jq -r '.[] | select(.age_s > 10) | .id'
```

写脚本时注意：

- 检查退出码，不要只看输出
- 设置 `QHPCTL_COLOR=never`，避免颜色控制字符混进输出
- 会修改状态的命令（`sessions kill`、`gw drain`、`purge`）不要放进定时任务

## qhpctl ticket inspect

查看一张票证文件的内容，不需要 qhpd 在运行。

```text
$ qhpctl ticket inspect ~/.qhp/tickets/lab-client.qht
format     QH-TICKET-V2
issuer     qinghe-lab
subject    lab-client
check      ok
```

- `format` 是票证版本。显示 `QH-TICKET-V1` 的票证已经不能用了，出示会被拒绝（`QHE-305`）
- `check` 只表示文件格式正确，不检查签名

## 退出码

| 退出码 | 含义 |
|--------|------|
| 0 | 成功 |
| 1 | 参数错误 |
| 2 | 连不上 qhpd 或网关的管理接口 |
| 3 | 等待回应超过 `--timeout` |
