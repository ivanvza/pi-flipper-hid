# js — JavaScript Engine

Run JavaScript files on the Flipper and send console output to the CLI. The Flipper uses the **mjs** engine. This device runs **Momentum firmware**, which includes extra modules beyond official firmware.

Source: [Momentum Firmware JS modules](https://github.com/Next-Flip/Momentum-Firmware/tree/dev/applications/system/js_app/modules), [Official JS docs](https://developer.flipper.net/flipperzero/doxygen/js.html)

## Authoritative API Reference

The TypeScript declaration files in [fz-sdk/](fz-sdk/) are the **definitive source** for what functions, methods, and types exist in the Flipper's JS engine. When writing JS for the Flipper, **always check the `.d.ts` files** — if a function isn't declared there, it doesn't exist.

Key files:
- [fz-sdk/global.d.ts](fz-sdk/global.d.ts) — Built-in globals (print, delay, parseInt, Array, String, Number methods, etc.)
- [fz-sdk/subghz.d.ts](fz-sdk/subghz.d.ts) — Sub-GHz radio module
- [fz-sdk/math.d.ts](fz-sdk/math.d.ts) — Math module (must `require("math")`)
- [fz-sdk/storage.d.ts](fz-sdk/storage.d.ts) — File system module
- [fz-sdk/gpio.d.ts](fz-sdk/gpio.d.ts) — GPIO module
- [fz-sdk/serial.d.ts](fz-sdk/serial.d.ts) — UART serial module
- [fz-sdk/notification.d.ts](fz-sdk/notification.d.ts) — LED/vibro/sound
- [fz-sdk/badusb.d.ts](fz-sdk/badusb.d.ts) — USB HID keyboard
- [fz-sdk/blebeacon.d.ts](fz-sdk/blebeacon.d.ts) — BLE beacon (Momentum only)
- [fz-sdk/infrared.d.ts](fz-sdk/infrared.d.ts) — IR transmit (Momentum only)
- [fz-sdk/i2c.d.ts](fz-sdk/i2c.d.ts) — I2C bus (Momentum only)
- [fz-sdk/spi.d.ts](fz-sdk/spi.d.ts) — SPI bus (Momentum only)
- [fz-sdk/vgm.d.ts](fz-sdk/vgm.d.ts) — Video Game Module (Momentum only)
- [fz-sdk/usbdisk.d.ts](fz-sdk/usbdisk.d.ts) — Virtual USB drive (Momentum only)
- [fz-sdk/event_loop.d.ts](fz-sdk/event_loop.d.ts) — Event loop
- [fz-sdk/flipper.d.ts](fz-sdk/flipper.d.ts) — Device info

**Read the relevant `.d.ts` file before writing any JS script.** It tells you exactly what functions exist, what parameters they take, and what they return.

## Running Scripts

Upload a script with `write_file`, then run it:

```
flipper action:"write_file" path:"/ext/scripts/myscript.js" content:"print('Hello!');"
flipper action:"command" command:"js /ext/scripts/subghz_scanner.js" timeout:30000
```

Use a higher timeout for long-running scripts.

## Built-in Functions (no import needed)

| Function | Description |
|----------|-------------|
| `print(...)` | Print to console (appears in CLI output) |
| `console.log/warn/error/debug(...)` | Print to serial console with severity level |
| `delay(ms)` | Sleep for milliseconds |
| `parseInt(str, [base])` | Parse integer from string, optional radix |
| `chr(code)` | Convert ASCII code to character |
| `die(message)` | Terminate script with error |
| `load(path, [globalScope])` | Execute another JS file and return its value |
| `require(moduleName)` | Load a module |
| `doesSdkSupport(["feature"])` | Check if SDK feature is available (returns bool) |
| `checkSdkFeatures(["feature"])` | Check features, warn user if missing |
| `sdkCompatibilityStatus(major, minor)` | Returns "compatible", "firmwareTooOld", or "firmwareTooNew" |
| `isSdkCompatible(major, minor)` | Boolean compatibility check |
| `__dirname` | Current script's directory path |
| `__filename` | Current script's file path |

### Data Types

`string` (no UTF8), `number`, `boolean`, `undefined`, `null`, `Object`, `Array`, `ArrayBuffer`, `DataView` (Uint8Array, Int8Array, Uint16Array, Int16Array, Uint32Array, Int32Array)

### String Methods
`.length`, `charCodeAt(i)`, `at(i)`, `indexOf(sub, [start])`, `slice(start, [end])`, `toUpperCase()`, `toLowerCase()`

### Array Methods
`.length`, `[index]` access, `push(val)`, `splice(start, [count])`

### Number Methods
`toString([base])` — e.g. `(255).toString(16)` → `"ff"`

### Object Access
`obj.prop`, `obj["prop"]` — standard property access works. No `Object.keys()`, `Object.values()`, `Object.entries()`, `for...in`.

---

## Core Modules (all firmware versions)

### flipper — Device Info

```javascript
let flipper = require("flipper");
flipper.getModel();          // "Flipper Zero"
flipper.getName();           // Device name e.g. "MyFlipper"
flipper.getBatteryCharge();  // Battery percentage (0-100)
flipper.firmwareVendor;      // Firmware vendor string
flipper.jsSdkVersion;        // JS SDK version
```

### event_loop — Event-Based Programming

**Must be imported before gui or gpio if using events.**

```javascript
let eventLoop = require("event_loop");

// Timers
let timer = eventLoop.timer("periodic", 1000);  // "oneshot" or "periodic", interval ms
let sub = eventLoop.subscribe(timer, function(subscription, item, eventLoop) {
    print("tick");
}, eventLoop);
sub.cancel();  // unsubscribe

// Queues
let queue = eventLoop.queue(10);  // max length
queue.send("message");
eventLoop.subscribe(queue.input, callback);

eventLoop.run();   // Start loop (blocks until stop)
eventLoop.stop();  // Stop loop
```

### gpio — GPIO Pin Control

```javascript
let gpio = require("gpio");
let pin = gpio.get("pc3");  // Pins: pa7, pa6, pa4, pb3, pb2, pc3, pc1, pc0

// Output
pin.init({ direction: "out", outMode: "push_pull" });  // or "open_drain"
pin.write(true);

// Digital input
pin.init({ direction: "in", inMode: "plain_digital", pull: "up" });  // pull: "up", "down", or omit
let val = pin.read();  // boolean

// Analog input
pin.init({ direction: "in", inMode: "analog" });
let mv = pin.readAnalog();  // millivolts

// Interrupts (use with event_loop)
pin.init({ direction: "in", inMode: "interrupt", edge: "rising", pull: "up" });  // edge: "rising", "falling", "both"
eventLoop.subscribe(pin.interrupt(), callback);

// PWM
if (pin.isPwmSupported()) {
    pin.pwmWrite(1000, 50);  // freq Hz, duty cycle %
    pin.isPwmRunning();
    pin.pwmStop();
}
```

### serial — UART Communication

```javascript
let serial = require("serial");
serial.setup("usart", 115200);  // "usart" or "lpuart", baudrate
// Optional 3rd arg: framing config object

serial.write("AT\r\n");          // string
serial.write(0x0A);              // single byte
serial.write([0x01, 0x02]);      // byte array

let line = serial.readln(5000);       // read until newline, timeout ms → string or undefined
let data = serial.read(10, 5000);     // read N chars → string or undefined
let any = serial.readAny(5000);       // read whatever is available → string or undefined
let bytes = serial.readBytes(4);      // read N bytes → ArrayBuffer or undefined
let idx = serial.expect(["OK", "ERROR"], 5000);  // wait for pattern → index or undefined

serial.end();  // release UART
```

### storage — File System

```javascript
let storage = require("storage");

// Open file: accessMode "r"/"w"/"rw", openMode "open_existing"/"create_always"/etc.
let file = storage.openFile("/ext/test.txt", "rw", "create_always");
file.write("Hello");                    // returns bytes written
file.seekAbsolute(0);
let content = file.read("ascii", 100);  // mode "ascii" or "binary", bytecount
file.size();                            // file size in bytes
file.tell();                            // current position
file.eof();                             // boolean
file.seekRelative(10);
file.truncate();
file.isOpen();
file.copyTo(otherFile, 512);            // copy N bytes to another File
file.close();

// Queries
storage.fileExists("/ext/test.txt");
storage.directoryExists("/ext/scripts");
storage.fileOrDirExists("/ext/something");
storage.stat("/ext/file.txt");          // { path, isDirectory, size, accessTime }
storage.fsInfo("/ext");                 // { totalSpace, freeSpace }

// Directory operations
storage.makeDirectory("/ext/mydir");
storage.readDirectory("/ext");          // array of { path, isDirectory, size, accessTime }

// File management
storage.copy("/ext/src.txt", "/ext/dst.txt");
storage.rename("/ext/old.txt", "/ext/new.txt");
storage.remove("/ext/unwanted.txt");
storage.rmrf("/ext/whole_dir");         // recursive delete
storage.nextAvailableFilename("/ext", "file", ".txt", 20);  // → "file1.txt" etc.
```

### notification — LEDs & Feedback

```javascript
let notify = require("notification");
notify.success();                     // success pattern (green LED + sound)
notify.error();                       // error pattern (red LED + sound)
notify.blink("red", "short");        // colors: blue, red, green, yellow, cyan, magenta
notify.blink("green", "long");       // duration: short, long
```

### math — Math Functions

```javascript
let math = require("math");
// Standard math: abs, floor, ceil, round, random, sqrt, pow, min, max, PI, E, etc.
```

### badusb — USB HID Keyboard

```javascript
let badusb = require("badusb");
badusb.setup({ vid: 0xAAAA, pid: 0xBBBB, mfrName: "Test", prodName: "Test" });
// All setup fields optional. layoutPath for keyboard layout file.

if (badusb.isConnected()) {
    badusb.print("Hello", 10);         // type text, optional delay ms between chars
    badusb.println("World");           // type + ENTER
    badusb.press("ENTER");             // single key
    badusb.press("CTRL", "a");         // combo (up to 5 keys + modifiers)
    badusb.hold("SHIFT");              // hold key down
    badusb.release("SHIFT");           // release specific key
    badusb.release();                  // release all keys
    badusb.altPrint("special");        // Windows Alt+Numpad input
    badusb.altPrintln("special");
}
badusb.quit();  // release USB
```

### gui — Graphical User Interface

**Requires event_loop to be imported first.**

```javascript
let eventLoop = require("event_loop");
let gui = require("gui");
```

GUI submodules (import separately):

| Module | Description |
|--------|-------------|
| `gui/submenu` | Scrollable list of clickable text entries |
| `gui/dialog` | Dialog with up to 3 option buttons (left/center/right) |
| `gui/text_input` | Keyboard-like text input |
| `gui/byte_input` | Keyboard-like hex byte input |
| `gui/text_box` | Multiline text display |
| `gui/empty_screen` | Empty screen |
| `gui/loading` | Animated hourglass icon |
| `gui/file_picker` | File selection prompt |
| `gui/icon` | Icon loading and display |
| `gui/widget` | Combination of custom elements (text, shapes, buttons) |

View management:
```javascript
gui.viewDispatcher.switchTo(view);
gui.viewDispatcher.sendTo("front");  // or "back"
gui.viewDispatcher.sendCustom(42);   // custom event
```

---

## Momentum-Exclusive Modules

These are only on Momentum firmware. Use `doesSdkSupport(["modulename"])` for compatibility.

### blebeacon — BLE Beacon

**Note:** This module only supports **broadcasting** BLE beacons, not scanning/detecting.

```javascript
let blebeacon = require("blebeacon");

blebeacon.isActive();                                    // boolean
blebeacon.setConfig(mac, power, minInterval, maxInterval);
// mac: Uint8Array (6 bytes), power: number, intervals: ms (all optional except mac)
blebeacon.setData(Uint8Array([0x02, 0x01, 0x06, ...])); // advertisement payload
blebeacon.start();
blebeacon.stop();
blebeacon.keepAlive(true);  // if true, beacon persists after script ends
```

### subghz — Sub-GHz Radio

```javascript
let subghz = require("subghz");

subghz.setup();                          // initialize radio (tries external CC1101 first)
subghz.setFrequency(433920000);          // set frequency in Hz, returns actual freq
subghz.getFrequency();                   // current frequency
subghz.setRx();                          // enter receive mode
subghz.getRssi();                        // signal strength (float), must be in RX mode
subghz.getState();                       // "RX", "TX", or "IDLE"
subghz.setIdle();                        // enter idle mode
subghz.isExternal();                     // boolean, true if using external antenna
subghz.transmitFile("/ext/subghz/file.sub");  // transmit a .sub file
subghz.transmitFile("/ext/subghz/file.sub", 5);  // with repeat count
subghz.end();                            // release radio
```

Frequency ranges: 299999755-348000000, 386999938-464000000, 778999847-928000000 Hz.

### infrared — IR Transmit

```javascript
let infrared = require("infrared");

// Send protocol signal
infrared.sendSignal("NEC", 0x04, 0x08);  // protocol, address, command
infrared.sendSignal("NEC", 0x04, 0x08, { repeat: true, times: 3 });

// Send raw signal (array of timings in microseconds)
infrared.sendRawSignal([9000, 4500, 560, 560, ...]);  // timings array
infrared.sendRawSignal(timings, true);  // startFromMark (default true)
infrared.sendRawSignal(timings, true, { frequency: 38000, dutyCycle: 0.33 });
```

Protocols: NEC, NECext, NEC42, NEC42ext, Samsung32, RC6, RC5, RC5X, SIRC, SIRC15, SIRC20, Kaseikyo, RCA.

### i2c — I2C Bus

```javascript
let i2c = require("i2c");

i2c.isDeviceReady(0x68, 1);           // addr, timeout → boolean
i2c.write(0x68, [0x00, 0x01], 1);     // addr, data (array/ArrayBuffer), timeout → boolean
let data = i2c.read(0x68, 4, 1);      // addr, length, timeout → ArrayBuffer or undefined
let resp = i2c.writeRead(0x68, [0x00], 4, 1);  // addr, data, readLen, timeout → ArrayBuffer or undefined
```

### spi — SPI Bus

```javascript
let spi = require("spi");

spi.acquire();                                // acquire bus exclusively
spi.write([0x01, 0x02], timeout);             // data, optional timeout → boolean
let data = spi.read(4, timeout);              // length, optional timeout → ArrayBuffer or undefined
let resp = spi.writeRead([0x01], timeout);    // simultaneous TX/RX → ArrayBuffer or undefined
spi.release();                                // release bus
```

### vgm — Video Game Module (IMU)

Requires the Video Game Module hardware attached.

```javascript
let vgm = require("vgm");

vgm.getPitch();                       // number (degrees) or undefined if no VGM
vgm.getRoll();                        // number (degrees) or undefined
vgm.getYaw();                         // number (degrees) or undefined
vgm.deltaYaw(angle, timeout);         // wait for yaw change > angle degrees
// timeout in ms (default 3000), returns signed diff or 0 on timeout
```

### widget — Complex Screen Rendering

```javascript
let eventLoop = require("event_loop");
let gui = require("gui");
let widget = require("gui/widget");

let view = widget.makeWith({}, [
    { element: "string", x: 64, y: 10, align: "center", text: "Title" },
    { element: "string_multiline", x: 0, y: 26, align: "left", text: "Line 1\nLine 2" },
    { element: "rect", x: 0, y: 0, w: 128, h: 64 },
    { element: "circle", x: 64, y: 32, r: 10 },
    { element: "line", x1: 0, y1: 0, x2: 128, y2: 64 },
    { element: "icon", x: 0, y: 0, icon: "StatusBTConnected" },
    { element: "button", button: "center", text: "OK" },
    { element: "text_box", x: 0, y: 16, w: 128, h: 48, text: "Scrollable text..." },
    { element: "text_scroll", x: 0, y: 0, w: 128, h: 64, text: "Long text..." },
]);
gui.viewDispatcher.switchTo(view);
```

### usbdisk — Virtual USB Drive

```javascript
let usbdisk = require("usbdisk");

usbdisk.start("/ext/disk.img");       // mount image file as USB mass storage
while (!usbdisk.wasEjected()) {
    delay(1000);
}
usbdisk.stop();                        // unmount

// Momentum: create image if doesSdkSupport(["usbdisk-createimage"])
```

---

## mjs Engine Limitations — CRITICAL

The Flipper uses **mjs**, a minimal JavaScript engine. It is NOT full ES6/Node.js. Many common JavaScript features **do not work** and will cause parse errors.

### NOT supported (will cause parse errors or silent failures):

- **`try` / `catch` / `finally`** — no exception handling
- **`class`** — no class syntax
- **`const`** — use `let` instead for all variables
- **Template literals** — no backticks `` `hello ${name}` ``, use `"hello " + name`
- **Arrow functions** — no `() => {}`, use `function() {}`
- **`async` / `await` / `Promise`** — no async support
- **Destructuring** — no `let {a, b} = obj` or `let [x, y] = arr`
- **Spread operator** — no `...args`
- **`for...of`** — no `for (let x of arr)`, use `for (let i = 0; i < arr.length; i++)`
- **`for...in`** — limited, avoid
- **Default parameters** — no `function foo(x = 5)`
- **RegExp** — no regular expressions
- **`Map` / `Set` / `Symbol` / `WeakMap`** — none of these exist
- **`JSON.parse` / `JSON.stringify`** — not available
- **`Object.keys` / `Object.values` / `Object.entries`** — not available
- **`Function.call` / `Function.apply` / `Function.bind`** — not available
- **`delete` operator** — may not work reliably
- **`setTimeout` / `setInterval`** — use `delay(ms)` or `event_loop.timer()` instead
- **Multi-line strings** — no backtick multi-line, use `"line1\nline2"`
- **Optional chaining** — no `obj?.prop`
- **Nullish coalescing** — no `??`
- **`.toFixed()`** — does not exist. Use `toString()` for number-to-string, or manual rounding
- **`Date` / `Date.now()`** — no Date object, no clock/time API whatsoever
- **`Math.floor()` etc. as globals** — Math is NOT global. You must `let math = require("math");` then use `math.floor()`, `math.max()`, etc. Using `Math.floor()` directly will crash
- **Compound assignment (`+=`, `-=`, `*=`, `/=`)** — may not work. Use `x = x + y` instead
- **`++` / `--`** — use `i = i + 1` instead

### Supported:

- `let` for variables
- `function` declarations and expressions
- `if/else`, `while`, `for` (C-style), `do/while`, `switch`
- Objects `{}`, Arrays `[]`
- `typeof`, `instanceof`
- Basic string/number/boolean/array operations
- `print()`, `delay()`, `require()`
- ArrayBuffer, Uint8Array, DataView

### Write scripts like ES5 with `let`:

```javascript
// GOOD — mjs compatible
let subghz = require("subghz");
subghz.setup();

let frequencies = [315000000, 433920000, 868000000, 915000000];
for (let i = 0; i < frequencies.length; i++) {
    subghz.setFrequency(frequencies[i]);
    subghz.setRx();
    delay(50);
    let rssi = subghz.getRssi();
    print(frequencies[i] + "," + rssi);
    subghz.setIdle();
}
subghz.end();
```

```javascript
// BAD — will crash
const CONFIG = { ... };           // const not supported
try { ... } catch(e) { ... }      // try/catch not supported
let msg = `freq: ${f}`;           // template literals not supported
arr.forEach((x) => print(x));     // arrow functions not supported
```

## Debugging Scripts

When a script fails, the Flipper outputs a parse error with a line number and the offending token. Common errors:

| Error | Cause | Fix |
|-------|-------|-----|
| `parse error at line N: [try {` | Used try/catch | Remove all try/catch blocks |
| `parse error at line N: [const` | Used const | Replace `const` with `let` |
| `parse error at line N: [=>` | Used arrow function | Use `function() {}` |
| `parse error at line N: [\`]` | Used template literal | Use string concatenation |
| `parse error at line N: [...` | Used spread operator | Manually copy arrays |

**Debugging workflow:**
1. Read the error message — it tells you the line number and token
2. Read the script on the Flipper: `storage read /ext/scripts/yourscript.js`
3. Fix the issue, re-upload with `write_file`, and re-run
4. Keep scripts simple — mjs is very limited, write plain ES5-style code

## Hardware Limitations

JavaScript on the Flipper **cannot** access:
- BLE scanning/detection (blebeacon is broadcast-only)
- D-pad button input directly (use gui views instead)
- NFC/RFID/iButton protocols (use CLI commands instead)
- Precision timers
- Audio playback beyond notification patterns

## Tips

- Use `print()` for output — it goes to the CLI and is captured by the flipper tool.
- Always `require("event_loop")` before `require("gui")` or using GPIO interrupts/events.
- Scripts run until completion or error — there's no REPL.
- For BLE scanning, use the `bt` CLI command instead of JS.
- Use `doesSdkSupport(["blebeacon"])` to check for Momentum features.
- Set higher timeouts when running scripts: `flipper action:"command" command:"js /ext/script.js" timeout:60000`
- **ALWAYS write mjs-compatible code** — no const, no try/catch, no arrow functions, no template literals, no classes. Think ES5 with `let`.
