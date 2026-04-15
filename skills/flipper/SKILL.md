---
name: flipper
description: Control a Flipper Zero via CLI text commands over USB serial. Use for raw CLI commands, streaming output (log, top), and interactive tools. For structured operations (storage, apps, screen capture), prefer the flipper-rpc skill instead.
---

# Flipper Zero CLI

Control a Flipper Zero via the `flipper` tool (CLI text mode). For most operations, **use `flipper_rpc` instead** — it's more reliable. Use this CLI tool only for:
- Raw CLI commands not available via RPC
- Streaming commands (`log`, `top`)
- Direct text interaction

## Connection

```
flipper action:"connect"
flipper action:"disconnect"
flipper action:"status"
```

## Sending Commands

```
flipper action:"command" command:"<cli_command>"
flipper action:"command" command:"<cli_command>" timeout:30000
```

## Writing Files

```
flipper action:"write_file" path:"/ext/myfile.txt" content:"Hello!"
```

## Interrupt (unstick)

```
flipper action:"interrupt"
```

## Command Reference

See [references/](references/) for detailed docs on all Flipper CLI commands (storage, subghz, nfc, rfid, ir, gpio, led, vibro, buzzer, ikey, etc.).
