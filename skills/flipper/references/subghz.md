# subghz — Sub-GHz Radio

Sub-GHz radio tools for transmitting, receiving, and chatting.

## Commands

| Command | Arguments | Description |
|---------|-----------|-------------|
| `subghz chat` | `<frequency> <device>` | Chat with other Flipper Zero users. |
| `subghz tx` | `<key_hex> <frequency> <te_us> <repeat> <device>` | Transmits a 3-byte key. |
| `subghz rx` | `<frequency> <device>` | Receives signals. |
| `subghz rx_raw` | `<frequency>` | Receives signals in RAW format. |
| `subghz decode_raw` | `<path>` | Decodes a file with RAW data. |
| `subghz tx_from_file` | `<path> <repeat> <device>` | Transmits data from a file. |

## Debug Mode Only

| Command | Arguments | Description |
|---------|-----------|-------------|
| `subghz tx_carrier` | `<frequency>` | Transmits carrier frequency. |
| `subghz rx_carrier` | `<frequency>` | Receives carrier frequency. |
| `subghz encrypt_keeloq` | `<decrypted_file> <encrypted_file> <iv_hex>` | Encrypts Keeloq manufacture keys. |
| `subghz encrypt_raw` | `<decrypted_file> <encrypted_file> <iv_hex>` | Encrypts RAW data. |

## Arguments

- `<frequency>`: Hz value in ranges: 299999755-348000000, 386999938-464000000, 778999847-928000000. Some frequencies may be unavailable in your region.
- `<device>`: `0` = built-in CC1101 antenna, `1` = external CC1101 antenna.
- `<te_us>`: quantization interval in microseconds.
- `<key_hex>`: 3-byte key in hexadecimal format.
- `<iv_hex>`: 16-byte initialization vector in hexadecimal format.

## Scripted Scanning via JavaScript

For automated frequency scanning, use a JavaScript script with the `subghz` module (Momentum firmware). See [examples/subghz_scanner.js](examples/subghz_scanner.js) for a ready-to-use scanner that sweeps all Sub-GHz bands, samples RSSI, and reports active frequencies.

Upload and run:

```
flipper action:"write_file" path:"/ext/scripts/subghz_scanner.js" content:"<script content>"
flipper action:"command" command:"js /ext/scripts/subghz_scanner.js" timeout:300000
```

The script outputs CSV: `freq_hz,rssi_dbm` for signals above the noise floor.
