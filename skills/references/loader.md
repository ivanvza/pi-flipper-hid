# loader — Application Loader

Enumerate and run compiled-in apps, open internal or external (.fap) applications.

## Commands

| Command | Arguments | Description |
|---------|-----------|-------------|
| `loader list` | | Lists available applications. |
| `loader open` | `<application_name>` | Runs the entered application. |
| `loader info` | | Displays the loader's current state. |
| `loader close` | | Closes the running application. |
| `loader signal` | `<signal_number> <arg_hex>` | Sends a signal with an optional argument in hexadecimal. |
