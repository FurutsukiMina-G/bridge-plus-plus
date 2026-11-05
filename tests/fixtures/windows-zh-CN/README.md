# Windows 工具的真实输出

在中文版 Windows 11（10.0.26200）上采集，2026-11-05。文件保留原始编码，只替换了用户 SID、用户名和主目录。

- `schtasks-query-*.xml`：`schtasks /Query /TN <名称> /XML`
- `schtasks-query-missing.stderr.txt`：查询不存在的任务时的 stderr，退出码 1
- `whoami-user.csv`：`whoami /user /fo csv /nh`
- `icacls-save.txt`：`icacls <目录> /save <文件>` 写出的文件，UTF-16LE，没有 BOM
- `netstat-ano-tcp.txt`：`netstat -ano -p TCP` 的表头和两个服务端口所在的行
- `codex-exec-help.txt`、`codex-exec-resume-help.txt`：Codex CLI 0.166.0-alpha.6
- `agy-help.txt`：Antigravity CLI 1.5.0，帮助文本打印在 stderr

这些文件不是被测代码生成的。工具升级后输出变了，要重新采集，不要手改。
