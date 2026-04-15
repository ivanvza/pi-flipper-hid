# buzzer — Piezo Speaker

Play sounds using the piezo speaker.

## Commands

| Command | Arguments | Description |
|---------|-----------|-------------|
| `buzzer freq` | `<frequency_hz> <duration>` | Plays a sound at the given frequency. |
| `buzzer note` | `<note> <duration>` | Plays a musical note. |

## Arguments

- `<frequency_hz>`: Frequency in Hz.
- `<note>`: A musical note. Sharps use `s` instead of `#` (e.g., `cs3` for C#3). Flats are not supported.
- `<duration>`: Duration with unit — `ms` (milliseconds), `s` (seconds), `m` (minutes), or `h` (hours). Example: `buzzer note cs3 500ms`.

## Examples

```
buzzer freq 440 1000ms
buzzer note a4 500ms
buzzer note cs3 1s
```
