# input — Input Subsystem

Displays input events and allows injecting input events.

## Commands

| Command | Arguments | Description |
|---------|-----------|-------------|
| `input dump` | | Displays the pressed buttons in real time. |
| `input send` | `<key> <type>` | Emulates a button press. |

## Arguments

- `<key>`: `up`, `down`, `left`, `right`, `back`, `ok`
- `<type>`: `press`, `release`, `short`, `long`

## Emulating Button Presses

To emulate a **short press**, run these commands in order:

```
input send <key> press
input send <key> short
input send <key> release
```

To emulate a **long press**, run these commands in order:

```
input send <key> press
input send <key> long
input send <key> release
```

All three commands must be sent in sequence, otherwise the input will be discarded.
