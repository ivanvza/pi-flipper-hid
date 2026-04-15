# power — Power Management

Turn off, reboot the device, and control GPIO power supply.

## Commands

| Command | Arguments | Description |
|---------|-----------|-------------|
| `power off` | | Powers off the device. |
| `power reboot` | | Reboots the device. |
| `power reboot2dfu` | | Reboots the device into DFU mode. |
| `power 5v` | `<1/0>` | Enables (1) or disables (0) 5V power supply to GPIO pin 1. |
| `power 3v3` | `<1/0>` | Enables (1) or disables (0) 3.3V power supply to GPIO pin 9. Only available in Debug mode. |
