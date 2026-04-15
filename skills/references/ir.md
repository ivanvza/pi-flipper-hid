# ir — Infrared

Read, decode, and send infrared signals.

## Commands

| Command | Arguments | Description |
|---------|-----------|-------------|
| `ir rx` | | Reads and decodes IR remote control data. |
| `ir rx raw` | | Reads IR remote control data in RAW format. |
| `ir tx` | `<protocol> <address> <command>` | Sends the entered IR command. |
| `ir tx raw` | `F:<frequency> DC:<duty_cycle> <samples>` | Sends RAW IR data. Up to 512 samples. |
| `ir decode` | `<input_file> <output_file>` | Decodes a file with RAW data. |
| `ir universal list` | `<remote_name>` | Lists commands of the entered universal remote. |
| `ir universal` | `<remote_name> <signal_name>` | Sends a command from the entered universal remote. |

## Arguments

- `<protocol>`: `NEC`, `NECext`, `NEC42`, `NEC42ext`, `Samsung32`, `RC6`, `RC5`, `RC5X`, `SIRC`, `SIRC15`, `SIRC20`, `Kaseikyo`, `RCA`
- `<address>` and `<command>`: hexadecimal format
- `<frequency>`: 10000-56000
- `<duty_cycle>`: 0-100
- `<remote_name>`: `tv`, `audio`, `ac`, `projector`
