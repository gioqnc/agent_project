# SDK 常见问题

**Q：用 qhp-py 发比较大的 bin 帧，对端收到的数据不完整？**
qhp-py 1.3.0 和 1.3.1 有一个分片问题：单个 `bin` 帧超过 **32 KB** 时，超出的部分会被截断，而且不报错。1.3.2 已修复，升级即可。
协议本身允许的单帧上限更大，见 `notes/frames.md`。

**Q：`open()` 报 QHE-305？**
票夹里还放着旧的 V1 票证。删掉旧票证，换成当前格式的票证。可以用 `qhpctl ticket inspect` 查看一张票证是哪个版本，用法见 `ops/qhpctl.md`。

**Q：TypeScript SDK 断线以后不会自己恢复？**
`autoReconnect` 默认是关闭的，需要显式打开，见 `sdk/typescript.md`。

**Q：两个 SDK 能混用吗？**
可以。两边说的都是同一个协议，Python 发起、TypeScript 接收没有问题。

**Q：SDK 支持哪些协议版本？**
qhp-py 1.3.x 和 @qhlab/qhp 1.3.x 都对应协议 v1.3，也能和 v1.2 的 qhpd 通信，但 v1.2 节点不检查 `bin` 帧大小。
