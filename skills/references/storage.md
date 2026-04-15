# storage — File System

Interact with the device's file system. All paths must start with `/int` (internal) or `/ext` (SD card).

## Writing Files

The Flipper's `storage write` command is interactive — it reads from stdin until Ctrl+C, which does NOT work through the normal `command` action (it will timeout waiting for a prompt that never comes).

Use the dedicated **`write_file` action** instead, which handles the interactive protocol automatically:

```
flipper action:"write_file" path:"/ext/myfile.txt" content:"Hello, Flipper!"
```

For multiline content, use `\n` for newlines:

```
flipper action:"write_file" path:"/ext/scripts/test.js" content:"let x = 1;\nprint(x);\n"
```

To write binary-like data or larger files, the same approach works — just pass the full content string. Set a higher timeout for large files:

```
flipper action:"write_file" path:"/ext/data/config.json" content:"{\"key\": \"value\"}" timeout:10000
```

**Important:**
- **NEVER** use `flipper action:"command" command:"storage write ..."` — it will always timeout.
- **ALWAYS** use `flipper action:"write_file"` with `path` and `content` parameters.
- **Parent directories MUST exist** — `write_file` will FAIL if the parent directory doesn't exist. Create them first with `storage mkdir`.
- `write_file` overwrites the file if it exists (it deletes first, then writes).

## Reading Files

Reading works through the normal `command` action:

```
flipper action:"command" command:"storage read /ext/myfile.txt"
```

For large files, read in chunks:

```
flipper action:"command" command:"storage read_chunks /ext/largefile.bin 512"
```

## Listing & Browsing

```
flipper action:"command" command:"storage list /ext"
flipper action:"command" command:"storage tree /ext/subghz"
flipper action:"command" command:"storage stat /ext/myfile.txt"
```

## All Commands

| Command | Arguments | Description |
|---------|-----------|-------------|
| `storage info` | `</ext>` | Gets general info about the file system. |
| `storage format` | `</ext>` | Formats the file system on the SD card. |
| `storage list` | `<path>` | Lists files and directories. |
| `storage tree` | `<path>` | Lists all files and directories recursively. |
| `storage remove` | `<path>` | Deletes a file or directory. Directory must be empty. |
| `storage read` | `<path>` | Reads text from a file and prints size and content. |
| `storage read_chunks` | `<path> <1-512>` | Reads file in blocks of N bytes. |
| `storage write` | | **Interactive — use `write_file` action instead.** |
| `storage write_chunk` | | **Interactive — use `write_file` action instead.** |
| `storage copy` | `<src> <dst>` | Copies a file to a new location. |
| `storage rename` | `<old> <new>` | Renames or moves a file/directory. |
| `storage mkdir` | `<path>` | Creates a new directory. |
| `storage md5` | `<path>` | Displays the MD5 hash of a file. |
| `storage stat` | `<path>` | Displays info about a file or directory. |
| `storage timestamp` | `<path>` | Displays the last modification timestamp. |
| `storage extract` | `<archive> <dir>` | Extracts a .tar archive to a directory. |

## Examples

```
storage list /ext
storage read /ext/nfc/mycard.nfc
storage mkdir /ext/scripts
storage copy /ext/file.txt /ext/backup/file.txt
storage md5 /ext/firmware.bin
storage tree /ext/subghz
storage info /ext
storage remove /ext/old_file.txt
storage rename /ext/old_name.txt /ext/new_name.txt
```
