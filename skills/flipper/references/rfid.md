# rfid — RFID (Low Frequency)

Read, write, and emulate low-frequency RFID cards.

## Commands

| Command | Arguments | Description |
|---------|-----------|-------------|
| `rfid read` | | Reads RFID card data in ASK and PSK modes. |
| `rfid write` | `<key_type> <key_data>` | Writes the entered data. |
| `rfid emulate` | `<key_type> <key_data>` | Emulates the entered data. |
| `rfid raw_read` | `<ask/psk> <filename>` | Reads and saves card data in RAW format. |
| `rfid raw_emulate` | `<filename>` | Emulates saved RAW data from a file. Useful for debugging. |
| `rfid raw_analyze` | `<filename>` | Outputs RAW data and tries to decode it. Useful for protocol development. |

## Key Types & Data Lengths

| Key Type | Data Length (hex) |
|----------|-------------------|
| EM4100 | 5 bytes |
| EM4100/32 | 5 bytes |
| EM4100/16 | 5 bytes |
| Electra | 8 bytes |
| H10301 | 3 bytes |
| Idteck | 8 bytes |
| Indala26 | 4 bytes |
| IoProxXSF | 4 bytes |
| AWID | 9 bytes |
| FDX-A | 5 bytes |
| FDX-B | 11 bytes |
| HIDProx | 6 bytes |
| HIDExt | 12 bytes |
| Pyramid | 4 bytes |
| Viking | 4 bytes |
| Jablotron | 5 bytes |
| Paradox | 6 bytes |
| PAC/Stanley | 4 bytes |
| Keri | 4 bytes |
| Gallagher | 8 bytes |
| Nexwatch | 8 bytes |
| Radio Key | 6 bytes |
| GProxII | 12 bytes |
| Noralsy | 12 bytes |
