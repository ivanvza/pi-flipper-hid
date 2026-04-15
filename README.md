# pi-flipper-hid

A [Pi](https://github.com/badlogic/pi-mono) extension for controlling a **Flipper Zero** via CLI over USB serial.

## Features

- Connect to Flipper Zero over USB serial (auto-detect)
- Execute any CLI command and get text responses
- Write files to the Flipper (with automatic mjs linting for `.js` files)
- Run JavaScript scripts with real-time output streaming
- Interrupt stuck commands with Ctrl+C
- Keepalive to prevent idle disconnects
- Built-in mjs linter that type-checks against the official Flipper fz-sdk TypeScript declarations

## Install

Quick start — run Pi with the extension directly:

```bash
pi -e https://github.com/ivanvza/pi-flipper-hid
```

Or add to your Pi `settings.json` for permanent installation:

```json
{
  "packages": [
    "git:github.com/ivanvza/pi-flipper-hid@main"
  ]
}
```

Or copy the extension manually:

```bash
git clone https://github.com/ivanvza/pi-flipper-hid.git ~/.pi/agent/extensions/flipper
cd ~/.pi/agent/extensions/flipper && npm install
```

## Prerequisites

- Flipper Zero connected via USB
- User in the `dialout` group: `sudo usermod -aG dialout $USER` (log out/in after)
- Flipper must be unlocked

## Usage

The extension registers a `flipper` tool with these actions:

| Action | Description |
|--------|-------------|
| `connect` | Open serial connection (auto-detects Flipper) |
| `disconnect` | Close connection |
| `command` | Send a CLI command |
| `write_file` | Write a file to the Flipper |
| `status` | Check connection status |
| `interrupt` | Send Ctrl+C to unstick the CLI |

### Examples

```
flipper action:"connect"
flipper action:"command" command:"device_info"
flipper action:"command" command:"storage list /ext"
flipper action:"write_file" path:"/ext/scripts/test.js" content:"print('hello');"
flipper action:"command" command:"js /ext/scripts/test.js" timeout:60000
flipper action:"disconnect"
```

## mjs Linter

When uploading `.js` files, the extension automatically type-checks the code against the Flipper's fz-sdk TypeScript declarations. This catches:

- Functions that don't exist in the mjs engine (`.toFixed()`, `Date.now()`, `Math.floor()` without `require("math")`)
- Syntax not supported by mjs (`const`, arrow functions, template literals, `try/catch`, destructuring, `async/await`)

The linter prevents scripts from being uploaded that would crash the Flipper.

## Skills

The `skills/` directory contains comprehensive Flipper Zero documentation including:

- CLI command reference for all subsystems (storage, subghz, nfc, rfid, ir, gpio, etc.)
- JavaScript engine reference with mjs limitations
- fz-sdk TypeScript declarations (the authoritative API reference)
- Example scripts

## License

MIT
