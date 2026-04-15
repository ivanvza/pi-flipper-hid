# led — LED & Backlight Control

Control the status LED color and LCD backlight brightness.

Set the LED color by adjusting each color component (red, green, blue) independently using values 0-255.

## Commands

| Command | Arguments | Description |
|---------|-----------|-------------|
| `led r` | `<0-255>` | Sets the brightness of the red component. |
| `led g` | `<0-255>` | Sets the brightness of the green component. |
| `led b` | `<0-255>` | Sets the brightness of the blue component. |
| `led bl` | `<0-255>` | Turns on the display backlight and sets its brightness. |

## Examples

Set LED to 100% red:

```
led r 255
led g 0
led b 0
```

Set backlight to 50% brightness:

```
led bl 128
```
