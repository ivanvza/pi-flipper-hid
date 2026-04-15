// Sub-GHz Frequency Scanner for Flipper Zero (Momentum firmware)
// Sweeps frequency bands, samples RSSI, reports active signals.
// Usage: js /ext/scripts/subghz_scanner.js
//
// Output format: CSV lines "frequency_hz,rssi_dbm"
// Only prints frequencies with RSSI above the noise floor threshold.
//
// mjs compatible: no const, no arrow functions, no toFixed, no Date,
// no +=, Math via require("math"), C-style for loops only.

let subghz = require("subghz");
let math = require("math");

// --- Configuration ---
let threshold = -75;
let step = 250000;
let dwell = 30;
let samples = 3;

// Frequency bands (Hz)
let bands = [
    [300000000, 348000000],
    [387000000, 464000000],
    [779000000, 928000000]
];

// --- Helpers ---

function fmtFreq(hz) {
    let mhz = hz / 1000000;
    return mhz.toString() + " MHz";
}

function avgRssi(freq, n) {
    let total = 0;
    let s = 0;
    while (s < n) {
        total = total + subghz.getRssi();
        if (s < n - 1) {
            delay(5);
        }
        s = s + 1;
    }
    return total / n;
}

// --- Scanner ---
subghz.setup();
print("SCAN_START");
print("freq_hz,rssi_dbm");

let b = 0;
while (b < bands.length) {
    let lo = bands[b][0];
    let hi = bands[b][1];
    print("# Band: " + fmtFreq(lo) + " - " + fmtFreq(hi));

    let freq = lo;
    while (freq <= hi) {
        subghz.setFrequency(freq);
        subghz.setRx();
        delay(dwell);

        let avg = avgRssi(freq, samples);

        if (avg > threshold) {
            print(freq + "," + avg);
        }

        subghz.setIdle();
        freq = freq + step;
    }

    b = b + 1;
}

subghz.end();
print("SCAN_END");
