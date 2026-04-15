# gpio — GPIO Pin Control

Directly control GPIO pins: set mode, read/write state.

## Commands

| Command | Arguments | Description |
|---------|-----------|-------------|
| `gpio mode` | `<pin_name> <0/1>` | Sets the GPIO pin to input (0) or output (1) mode. |
| `gpio set` | `<pin_name> <0/1>` | Sets the GPIO pin's output value. |
| `gpio read` | `<pin_name>` | Reads the GPIO pin's current value. |

## Available Pins

`PA7`, `PA6`, `PA4`, `PB3`, `PB2`, `PC3`, `PC1`, `PC0`
