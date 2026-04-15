# nfc — NFC

Read, emulate, and interact with NFC cards. The `nfc` command opens a separate shell — use `help` or `?` inside it to list commands, and `exit` to leave.

**Important:** Since `nfc` opens a sub-shell, commands must be sent as `nfc` first, then individual commands within the shell. Use `<command> -h` for detailed help inside the shell.

## dump — Dump Card Data

| Command | Arguments | Description |
|---------|-----------|-------------|
| `dump` | `-f <path>` | Dumps physical card data to a .nfc file. |

Optional arguments: `-k <key>`, `-p <protocol>`, `-t <timeout>`

## raw — Send Raw Bytes

| Command | Arguments | Description |
|---------|-----------|-------------|
| `raw` | `-p <protocol> -d <data>` | Sends raw bytes using different protocols. |

Optional flags: `-t <timeout>`, `-k` (keep field on), `-c` (calculate CRC), `-s` (activation sequence)

## mfu — MIFARE Ultralight

| Command | Arguments | Description |
|---------|-----------|-------------|
| `mfu info` | | Basic info about a MIFARE Ultralight tag. |
| `mfu rdbl` | `-b <block_number>` | Reads a specific block. |
| `mfu wrbl` | `-b <block_number> -d <data>` | Writes 4-byte hex data to a block. |

## Other Commands

| Command | Arguments | Description |
|---------|-----------|-------------|
| `field` | | Enables the HF NFC field. Ctrl+C to stop. |
| `emulate` | `-f <path>` | Emulates a .nfc file. |
| `scanner` | | Identifies supported protocols. Optional: `-t` for tree view. |
| `apdu` | `-d <data>` | Sends APDU data to ISO14443-4A/4B/ISO15693-3 tags. Optional: `-p <protocol>` |

## Protocols

For `raw -p` and `dump -p`:

| Protocol | Alias |
|----------|-------|
| `14_3a` / `14a` / `iso14a` | ISO 14443-3A |
| `14_3b` / `14b` / `iso14b` | ISO 14443-3B |
| `14_4a` / `4a` | ISO 14443-4A |
| `14_4b` / `4b` | ISO 14443-4B |
| `15` | ISO 15693-3 |
| `felica` | FeliCa |
| `mfu` | MIFARE Ultralight |
| `mfc` | MIFARE Classic |
| `mfp` | MIFARE Plus |
| `des` | MIFARE DESFire |
| `slix` | ICODE SLIX |
| `st25` | ST25TB |
