# log — System Log Viewer

View device or application logs at various verbosity levels.

## Commands

| Command | Description |
|---------|-------------|
| `log` | Starts logging with the current log level. |
| `log error` | Logs only critical errors and important messages. |
| `log warn` | Logs non-critical errors and warnings (includes error logs). |
| `log info` | Logs non-critical information (includes warn logs). |
| `log default` | Default system log level (equivalent to info). |
| `log debug` | Logs debug information (includes info logs). Will impact performance. |
| `log trace` | Logs system traces (includes debug logs). Will impact performance. |

## Notes

- Press Ctrl+C to stop logging.
- This is a streaming command — it will run until interrupted or timed out.
- When using via the flipper tool, set a higher timeout and expect the output to contain whatever was captured before timeout.
