import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const projectRoot = process.cwd();
const standaloneDir = join(projectRoot, ".next", "standalone");

if (!existsSync(standaloneDir)) {
  throw new Error("A compilacao do Next nao gerou a pasta standalone.");
}

const packageJson = JSON.parse(await readFile(join(projectRoot, "package.json"), "utf8"));
packageJson.scripts = { ...packageJson.scripts, start: "node server.js" };

await writeFile(join(standaloneDir, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`);

const copyIfPresent = async (source, destination) => {
  if (!existsSync(source)) return;
  await mkdir(destination, { recursive: true });
  await cp(source, destination, { recursive: true, force: true });
};

await copyIfPresent(join(projectRoot, "public"), join(standaloneDir, "public"));
await copyIfPresent(join(projectRoot, ".next", "static"), join(standaloneDir, ".next", "static"));

console.log("Pacote standalone preparado para a Hostinger.");
