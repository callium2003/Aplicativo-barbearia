import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";
const command = isWindows ? (process.env.ComSpec || "cmd.exe") : "npx";
const args = isWindows
  ? ["/d", "/s", "/c", "npx.cmd next build --webpack"]
  : ["next", "build", "--webpack"];

const child = spawn(command, args, {
  stdio: "inherit",
  env: { ...process.env, BARBEARIASP_BUILD_TARGET: "hostinger" },
});

const exitCode = await new Promise((resolve, reject) => {
  child.once("error", reject);
  child.once("exit", (code) => resolve(code ?? 1));
});

process.exitCode = exitCode;
