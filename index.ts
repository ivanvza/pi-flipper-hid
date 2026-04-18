/**
 * Flipper CLI Extension
 *
 * Connects to a Flipper Zero over USB serial and executes CLI commands.
 * Uses text-based CLI protocol with robust prompt detection.
 *
 * Tool: flipper
 *   Actions: connect, disconnect, command, status, write_file, interrupt
 *
 * Commands:
 *   /flipper — Show connection status
 */

import { StringEnum } from "@mariozechner/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";
import { SerialPort } from "serialport";
import * as ts from "typescript";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve as pathResolve } from "node:path";

// ── Types ──────────────────────────────────────────────────────────────

const FlipperParams = Type.Object({
	action: StringEnum(["connect", "disconnect", "command", "status", "write_file", "interrupt"] as const),
	port: Type.Optional(Type.String({ description: "Serial device path. Auto-detects Flipper if omitted." })),
	command: Type.Optional(Type.String({ description: "CLI command to send to the Flipper (for 'command' action)." })),
	path: Type.Optional(Type.String({ description: "File path on the Flipper, e.g. /ext/myfile.txt (for 'write_file' action)." })),
	content: Type.Optional(Type.String({ description: "File content to write (for 'write_file' action)." })),
	timeout: Type.Optional(Type.Number({ description: "Command timeout in ms. Defaults to 5000." })),
});

// ── Constants ──────────────────────────────────────────────────────────

const ANSI_RE = /\x1b\[[0-9;]*[a-zA-Z]/g;
const PROMPT_RE = />\s*:\s*$/;
const QUIET_PERIOD_MS = 300;
const WRITE_STDIN_DELAY_MS = 500;
const WRITE_CTRL_C_DELAY_MS = 200;

// ── State ──────────────────────────────────────────────────────────────

let port: SerialPort | null = null;
let connectedPath: string | null = null;
let onSerialData: ((chunk: Buffer) => void) | null = null;
let busy = false;
let keepaliveInterval: ReturnType<typeof setInterval> | null = null;

// ── Helpers ────────────────────────────────────────────────────────────

function stripAnsi(str: string): string {
	return str.replace(ANSI_RE, "");
}

function autoDetectFlipper(): string | null {
	// Linux: stable symlinks under /dev/serial/by-id.
	try {
		const dir = "/dev/serial/by-id";
		const entries = readdirSync(dir);
		const flipper = entries.find((e) => e.startsWith("usb-Flipper"));
		if (flipper) return `${dir}/${flipper}`;
	} catch {}

	// macOS: Flipper exposes /dev/cu.usbmodemflip_<Name><N>. Prefer cu.* over tty.*
	// because cu.* devices don't block on carrier-detect when opening.
	if (process.platform === "darwin") {
		try {
			const entries = readdirSync("/dev");
			const flipper = entries.find((e) => e.startsWith("cu.usbmodemflip_"));
			if (flipper) return `/dev/${flipper}`;
		} catch {}
	}

	return null;
}

function stopKeepalive() {
	if (keepaliveInterval) {
		clearInterval(keepaliveInterval);
		keepaliveInterval = null;
	}
}

function startKeepalive() {
	stopKeepalive();
	// Send a harmless empty line every 30 seconds to keep the CLI session
	// alive and prevent USB CDC buffer stalls. Only sends when no command
	// is in flight to avoid interfering with active operations.
	keepaliveInterval = setInterval(() => {
		if (port?.isOpen && !busy) {
			port.write("\r\n");
		}
	}, 30000);
}

function cleanup(ctx?: ExtensionContext) {
	stopKeepalive();
	onSerialData = null;
	busy = false;
	if (port?.isOpen) {
		try { port.close(); } catch {}
	}
	port = null;
	connectedPath = null;
	ctx?.ui.setStatus("flipper", undefined);
}

// ── Serial helpers ─────────────────────────────────────────────────────

function installListeners() {
	if (!port) return;
	port.on("data", (chunk: Buffer) => {
		if (onSerialData) onSerialData(chunk);
	});
	port.on("close", () => {
		onSerialData = null;
		busy = false;
		port = null;
		connectedPath = null;
	});
	port.on("error", () => {
		onSerialData = null;
		busy = false;
	});
}

function writeBytes(data: Buffer | string): Promise<void> {
	return new Promise((resolve, reject) => {
		if (!port?.isOpen) return reject(new Error("Port not open"));
		port.write(data, (err) => {
			if (err) reject(new Error(`Write failed: ${err.message}`));
			else resolve();
		});
	});
}

function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

// ── Core: collect serial data until prompt or timeout ──────────────────
// This is the single function all commands go through. No separate
// implementations for different command types.

interface CollectOptions {
	timeoutMs: number;
	signal?: AbortSignal;
	noQuietPeriod?: boolean;     // for long-running commands (js, log, top)
	onChunk?: (buffer: string) => void;
}

function collectUntilPrompt(opts: CollectOptions): Promise<string> {
	return new Promise((resolve, reject) => {
		if (!port?.isOpen) return reject(new Error("Not connected"));

		let buffer = "";
		let settled = false;
		let quietTimer: ReturnType<typeof setTimeout> | null = null;

		const finish = () => {
			if (settled) return;
			settled = true;
			busy = false;
			onSerialData = null;
			if (quietTimer) clearTimeout(quietTimer);
			clearTimeout(deadline);
			resolve(buffer);
		};

		const fail = (err: Error) => {
			if (settled) return;
			settled = true;
			busy = false;
			onSerialData = null;
			if (quietTimer) clearTimeout(quietTimer);
			clearTimeout(deadline);
			reject(err);
		};

		// Hard deadline — always fires, always resolves (never leaves hanging)
		const deadline = setTimeout(() => {
			if (settled) return;
			// Try to recover by sending Ctrl+C
			if (port?.isOpen) {
				port.write(Buffer.from([0x03]));
			}
			settled = true;
			busy = false;
			onSerialData = null;
			if (quietTimer) clearTimeout(quietTimer);
			resolve(buffer + "\n[timed out after " + opts.timeoutMs + "ms]");
		}, opts.timeoutMs);

		// Abort signal
		if (opts.signal) {
			if (opts.signal.aborted) {
				clearTimeout(deadline);
				return reject(new Error("Aborted"));
			}
			const onAbort = () => {
				if (port?.isOpen) port.write(Buffer.from([0x03]));
				fail(new Error("Aborted"));
			};
			opts.signal.addEventListener("abort", onAbort, { once: true });
		}

		onSerialData = (chunk: Buffer) => {
			buffer += chunk.toString("utf-8");

			if (opts.onChunk) opts.onChunk(buffer);

			// Check for prompt
			if (PROMPT_RE.test(stripAnsi(buffer))) {
				finish();
				return;
			}

			// Quiet period: if data stops arriving, assume done
			if (!opts.noQuietPeriod) {
				if (quietTimer) clearTimeout(quietTimer);
				quietTimer = setTimeout(() => {
					if (!settled) finish();
				}, QUIET_PERIOD_MS);
			}
		};
	});
}

// ── sendCommand: the single entry point for all CLI operations ─────────

async function sendCommand(
	cmd: string,
	opts: CollectOptions,
): Promise<string> {
	if (!port?.isOpen) throw new Error("Not connected to Flipper.");
	if (busy) throw new Error("Another command is in progress.");

	busy = true;

	try {
		await writeBytes(cmd + "\r\n");
		const raw = await collectUntilPrompt(opts);

		// Clean response: strip ANSI, echoed command, prompt, trailing blanks
		let lines = stripAnsi(raw).replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

		// Strip echoed command (may be fragmented across lines, so check first non-empty)
		if (lines.length > 0 && lines[0].trim() === cmd.trim()) {
			lines = lines.slice(1);
		}

		// Strip trailing prompt
		if (lines.length > 0 && PROMPT_RE.test(lines[lines.length - 1])) {
			lines = lines.slice(0, -1);
		}

		// Trim trailing empty lines
		while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
			lines.pop();
		}

		return lines.join("\n");
	} catch (err) {
		busy = false;
		throw err;
	}
}

// ── syncPrompt: establish a known-good CLI state ───────────────────────

async function syncPrompt(timeoutMs = 3000): Promise<boolean> {
	if (!port?.isOpen) return false;

	// Start collecting BEFORE sending Ctrl+C so we don't miss the response
	busy = true;
	const collectPromise = collectUntilPrompt({ timeoutMs });

	// Send Ctrl+C to break out of any interactive mode, then \r\n for a fresh prompt
	await writeBytes(Buffer.from([0x03, 0x03, 0x03]));
	await sleep(100);
	await writeBytes("\r\n");

	try {
		const raw = await collectPromise;
		const clean = stripAnsi(raw);
		return PROMPT_RE.test(clean);
	} catch {
		return false;
	}
}

// ── writeFile: handles the interactive storage write protocol ──────────

async function writeFile(
	filePath: string,
	content: string,
	timeoutMs: number,
	signal?: AbortSignal,
): Promise<string> {
	if (!port?.isOpen) throw new Error("Not connected");
	if (busy) throw new Error("Another command is in progress.");

	busy = true;

	try {
		// 1. Send storage write command
		await writeBytes(`storage write ${filePath}\r\n`);

		// 2. Wait for Flipper to enter stdin mode
		await sleep(WRITE_STDIN_DELAY_MS);

		// 3. Send content
		await writeBytes(content);

		// 4. Brief pause then Ctrl+C to finish
		await sleep(WRITE_CTRL_C_DELAY_MS);
		await writeBytes(Buffer.from([0x03]));

		// 5. Collect response until prompt
		const raw = await collectUntilPrompt({ timeoutMs, signal });

		let lines = stripAnsi(raw).replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
		if (lines.length > 0 && PROMPT_RE.test(lines[lines.length - 1])) {
			lines = lines.slice(0, -1);
		}
		while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
			lines.pop();
		}
		return lines.join("\n");
	} catch (err) {
		// Try to recover: send Ctrl+C and drain
		if (port?.isOpen) {
			port.write(Buffer.from([0x03, 0x03]));
		}
		busy = false;
		throw err;
	}
}

// ── mjs linter ────────────────────────────────────────────────────────

const FZ_SDK_DIR = pathResolve(__dirname, "skills/flipper/references/fz-sdk");

interface MjsIssue { line: number; text: string; error: string; }

function lintMjs(source: string): MjsIssue[] {
	const issues: MjsIssue[] = [];
	const lines = source.split("\n");

	// Phase 1: mjs syntax restrictions
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();
		const num = i + 1;
		if (trimmed.startsWith("//")) continue;

		if (/\bconst\s+/.test(trimmed))
			issues.push({ line: num, text: trimmed, error: "mjs: 'const' not supported. Use 'let'." });
		if (/^\s*try\s*\{/.test(line) || /\}\s*catch\s*[\({]/.test(line) || /\}\s*finally\s*\{/.test(line))
			issues.push({ line: num, text: trimmed, error: "mjs: try/catch/finally not supported." });
		if (/\bclass\s+\w+/.test(trimmed))
			issues.push({ line: num, text: trimmed, error: "mjs: classes not supported." });
		if (/\(?[^)]*\)?\s*=>/.test(trimmed) && !trimmed.startsWith("//") && !/\/.*=>.*\//.test(trimmed))
			issues.push({ line: num, text: trimmed, error: "mjs: arrow functions not supported." });
		if (/`[^`]*`/.test(trimmed))
			issues.push({ line: num, text: trimmed, error: "mjs: template literals not supported." });
		if (/(?:let|var)\s*[\[{]/.test(trimmed))
			issues.push({ line: num, text: trimmed, error: "mjs: destructuring not supported." });
		if (/\.\.\.[\w\[]/.test(trimmed) && !trimmed.startsWith("//"))
			issues.push({ line: num, text: trimmed, error: "mjs: spread operator not supported." });
		if (/\basync\s+function\b/.test(trimmed) || /\bawait\s+/.test(trimmed))
			issues.push({ line: num, text: trimmed, error: "mjs: async/await not supported." });
		if (/\bfor\s*\(\s*(?:let|var)\s+\w+\s+of\s+/.test(trimmed))
			issues.push({ line: num, text: trimmed, error: "mjs: for...of not supported." });
	}
	if (issues.length > 0) return issues;

	// Phase 2: TypeScript type-check against fz-sdk
	try {
		const dtsFiles: Record<string, string> = {};
		let sdkFiles: string[];
		try { sdkFiles = readdirSync(FZ_SDK_DIR).filter((f) => f.endsWith(".d.ts")); }
		catch { return issues; }

		for (const f of sdkFiles) {
			dtsFiles[join(FZ_SDK_DIR, f)] = readFileSync(join(FZ_SDK_DIR, f), "utf-8");
		}

		let preamble = "";
		let rewrittenSource = source;
		const requireRe = /let\s+(\w+)\s*=\s*require\s*\(\s*["'](\w+)["']\s*\)/g;
		let match: RegExpExecArray | null;
		while ((match = requireRe.exec(source)) !== null) {
			const dtsPath = join(FZ_SDK_DIR, `${match[2]}.d.ts`);
			if (dtsFiles[dtsPath]) {
				preamble += `declare const ${match[1]}: typeof import("${dtsPath}");\n`;
				rewrittenSource = rewrittenSource.replace(match[0], `// ${match[0]}`);
			}
		}

		const virtualFileName = "/virtual/script.ts";
		const fullSource = preamble + rewrittenSource;
		const fileMap = new Map<string, string>();
		fileMap.set(virtualFileName, fullSource);
		for (const [path, content] of Object.entries(dtsFiles)) fileMap.set(path, content);

		const compilerOptions: ts.CompilerOptions = {
			target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS,
			strict: false, noEmit: true, allowJs: true, checkJs: true,
			noLib: true, types: [], moduleResolution: ts.ModuleResolutionKind.Node10,
		};

		const host = ts.createCompilerHost(compilerOptions);
		const origGet = host.getSourceFile.bind(host);
		host.getSourceFile = (name, ver) => {
			const c = fileMap.get(name);
			return c !== undefined ? ts.createSourceFile(name, c, ver) : origGet(name, ver);
		};
		host.fileExists = (n) => fileMap.has(n) || ts.sys.fileExists(n);
		host.readFile = (n) => fileMap.get(n) ?? ts.sys.readFile(n);
		host.getDefaultLibFileName = () => join(FZ_SDK_DIR, "global.d.ts");

		const program = ts.createProgram([virtualFileName, ...Object.keys(dtsFiles)], compilerOptions, host);
		const preambleLines = preamble.split("\n").length - 1;

		for (const d of ts.getPreEmitDiagnostics(program).filter((d) => d.file?.fileName === virtualFileName)) {
			if (d.file && d.start !== undefined) {
				const pos = d.file.getLineAndCharacterOfPosition(d.start);
				const lineNum = pos.line + 1 - preambleLines;
				if (lineNum < 1) continue;
				issues.push({
					line: lineNum,
					text: lines[lineNum - 1]?.trim() ?? "",
					error: ts.flattenDiagnosticMessageText(d.messageText, "\n"),
				});
			}
		}
	} catch {}

	return issues;
}

// ── Extension ──────────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
	// Process-level cleanup
	const closePort = () => { stopKeepalive(); if (port?.isOpen) { try { port.close(); } catch {} } };
	process.on("exit", closePort);
	process.on("SIGTERM", closePort);
	process.on("SIGINT", closePort);

	pi.on("session_shutdown", async (_event, ctx) => { cleanup(ctx); });

	pi.registerTool({
		name: "flipper",
		label: "Flipper",
		description:
			"Connect to a Flipper Zero over USB serial and execute CLI commands. " +
			"Actions: connect, disconnect, command, status, write_file, interrupt. " +
			"The Flipper must be unlocked and connected via USB.",
		promptSnippet: "Connect to and control a Flipper Zero over USB serial",
		promptGuidelines: [
			"Always connect before sending commands. Check status if unsure.",
			"Common CLI commands: device_info, bt info, storage list /ext, storage read, gpio set, led <r> <g> <b>, vibro <on|off>.",
			"To write files, use action 'write_file' with 'path' and 'content'. Do NOT use 'storage write' via 'command'.",
			"To read files, use action 'command' with command 'storage read <path>'.",
			"If stuck, use action 'interrupt' to send Ctrl+C and reset.",
			"For long-running commands (js scripts), set a higher timeout.",
		],
		parameters: FlipperParams,

		async execute(toolCallId, params, signal, onUpdate, ctx) {
			const { action } = params;
			const timeoutMs = params.timeout ?? 5000;

			switch (action) {
				case "connect": {
					if (port?.isOpen) {
						return {
							content: [{ type: "text", text: `Already connected to ${connectedPath}` }],
							details: { connected: true, port: connectedPath },
						};
					}

					const devicePath = params.port ?? autoDetectFlipper();
					if (!devicePath) throw new Error("No Flipper found. Is it plugged in and unlocked?");

					onUpdate?.({ content: [{ type: "text", text: `Connecting to ${devicePath}...` }] });

					await new Promise<void>((resolve, reject) => {
						port = new SerialPort({ path: devicePath, baudRate: 230400 }, (err) => {
							if (err) { port = null; reject(new Error(`Failed to open: ${err.message}`)); }
							else resolve();
						});
					});

					installListeners();
					connectedPath = devicePath;
					ctx.ui.setStatus("flipper", "Flipper connected");
					startKeepalive();

					// Verify CLI is responsive
					const gotPrompt = await syncPrompt(3000);
					if (!gotPrompt) {
						ctx.ui.notify("Warning: CLI prompt not detected", "warning");
					}

					return {
						content: [{ type: "text", text: `Connected to Flipper at ${devicePath}` }],
						details: { connected: true, port: devicePath, promptDetected: gotPrompt },
					};
				}

				case "disconnect": {
					if (!port?.isOpen) {
						return { content: [{ type: "text", text: "Not connected." }], details: { connected: false } };
					}
					const prevPath = connectedPath;
					cleanup(ctx);
					return { content: [{ type: "text", text: `Disconnected from ${prevPath}` }], details: { connected: false } };
				}

				case "command": {
					if (!params.command) throw new Error("Missing 'command' parameter.");
					if (!port?.isOpen) throw new Error("Not connected.");

					onUpdate?.({ content: [{ type: "text", text: `> ${params.command}` }] });

					const isLongRunning = /^\s*(js|log|top)\s/.test(params.command);
					const output = await sendCommand(params.command, {
						timeoutMs,
						signal,
						noQuietPeriod: isLongRunning,
						onChunk: isLongRunning ? (buf) => {
							// Strip echoed command for streaming display
							let lines = stripAnsi(buf).replace(/\r\n/g, "\n").split("\n");
							if (lines.length > 0 && lines[0].trim() === params.command!.trim()) lines = lines.slice(1);
							const cleaned = lines.join("\n").trim();
							if (cleaned) onUpdate?.({ content: [{ type: "text", text: cleaned }] });
						} : undefined,
					});

					return {
						content: [{ type: "text", text: output || "(no output)" }],
						details: { command: params.command, output },
					};
				}

				case "write_file": {
					if (!params.path) throw new Error("Missing 'path' parameter.");
					if (params.content === undefined || params.content === null) throw new Error("Missing 'content' parameter.");
					if (!port?.isOpen) throw new Error("Not connected.");

					// mjs linter
					if (params.path.endsWith(".js")) {
						ctx.ui.notify("Linting against fz-sdk...", "info");
						const issues = lintMjs(params.content);
						if (issues.length > 0) {
							ctx.ui.notify(`mjs lint FAILED: ${issues.length} issue(s)`, "error");
							const report = issues.map((i) => `  Line ${i.line}: ${i.error}\n    ${i.text}`).join("\n");
							throw new Error(`mjs issues (${issues.length}):\n${report}\n\nFix before uploading.`);
						}
						ctx.ui.notify("mjs lint OK!", "success");
					}

					onUpdate?.({ content: [{ type: "text", text: `Writing to ${params.path}...` }] });

					// Delete existing file, sync prompt, then write
					try { await sendCommand(`storage remove ${params.path}`, { timeoutMs: 3000 }); } catch {}
					const gotPrompt = await syncPrompt(2000);
					if (!gotPrompt) {
						ctx.ui.notify("Warning: prompt not synced before write", "warning");
					}

					const writeOutput = await writeFile(params.path, params.content, timeoutMs, signal);

					return {
						content: [{ type: "text", text: writeOutput || `Wrote ${params.content.length} bytes to ${params.path}` }],
						details: { path: params.path, bytesWritten: params.content.length },
					};
				}

				case "status": {
					const connected = port?.isOpen ?? false;
					let text = connected ? `Connected to ${connectedPath}` : "Not connected";
					const detected = autoDetectFlipper();
					if (detected && !connected) text += `\nFlipper detected at: ${detected}`;
					return { content: [{ type: "text", text }], details: { connected, port: connectedPath, detected } };
				}

				case "interrupt": {
					if (!port?.isOpen) throw new Error("Not connected.");

					// Force-clear state
					onSerialData = null;
					busy = false;

					// Send Ctrl+C twice
					await writeBytes(Buffer.from([0x03]));
					await sleep(200);
					await writeBytes(Buffer.from([0x03]));

					// Try to get a prompt
					const gotPrompt = await syncPrompt(3000);
					return {
						content: [{ type: "text", text: gotPrompt ? "Interrupted. CLI ready." : "Interrupted. Prompt not detected." }],
						details: { interrupted: true, promptDetected: gotPrompt },
					};
				}

				default:
					throw new Error(`Unknown action: ${action}`);
			}
		},

		renderCall(args, theme, context) {
			const text = (context.lastComponent as Text | undefined) ?? new Text("", 0, 0);
			let content = theme.fg("toolTitle", theme.bold("flipper "));
			content += theme.fg("muted", args.action ?? "");
			if (args.command) content += " " + theme.fg("dim", `> ${args.command}`);
			if (args.path) content += " " + theme.fg("dim", args.path);
			text.setText(content);
			return text;
		},

		renderResult(result, { expanded, isPartial }, theme, context) {
			const text = (context.lastComponent as Text | undefined) ?? new Text("", 0, 0);
			if (isPartial) { text.setText(theme.fg("warning", "Working...")); return text; }

			const details = result.details as Record<string, unknown> | undefined;
			const action = context.args?.action;

			if (action === "connect" || action === "disconnect" || action === "status") {
				const connected = details?.connected as boolean;
				const icon = connected ? "●" : "○";
				const color = connected ? "success" : "muted";
				text.setText(theme.fg(color, `${icon} ${result.content?.[0]?.type === "text" ? result.content[0].text : ""}`));
				return text;
			}

			const output = (details?.output as string) ?? (result.content?.[0]?.type === "text" ? result.content[0].text : "");
			const cmd = (details?.command as string) ?? "";
			const lines = output.split("\n");
			const preview = lines.length <= 5 || expanded
				? output : lines.slice(0, 5).join("\n") + `\n... (${lines.length - 5} more lines)`;

			let content = cmd ? theme.fg("success", "$ ") + theme.fg("accent", cmd) + "\n" + preview : preview;
			text.setText(content);
			return text;
		},
	});

	pi.registerCommand("flipper", {
		description: "Show Flipper connection status",
		handler: async (_args, ctx) => {
			if (port?.isOpen) {
				ctx.ui.notify(`Flipper connected at ${connectedPath}`, "info");
			} else {
				const detected = autoDetectFlipper();
				ctx.ui.notify(detected ? `Flipper at ${detected} (not connected)` : "No Flipper detected", detected ? "info" : "warning");
			}
		},
	});
}
