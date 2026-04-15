# ikey — iButton

Read, emulate, and write iButton keys.

## Commands

| Command | Arguments | Description |
|---------|-----------|-------------|
| `ikey read` | | Reads iButton keys. |
| `ikey emulate` | `<key_type> <key_data>` | Emulates the entered data. |
| `ikey write Dallas` | `<key_data>` | Writes 8-byte hex data to Dallas iButton keys. |

## Key Types & Data Lengths

| Key Type | Data Length (hex) |
|----------|-------------------|
| Dallas | 8 bytes |
| Cyfral | 2 bytes |
| Metakom | 4 bytes |
