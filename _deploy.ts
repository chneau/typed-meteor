import { $ } from "bun";
import z from "zod";
import { dependencies, name } from "./package.json";

await $`rm -rf dist`;
await $`bun build --outfile=dist/index.js --target=node --production --no-bundle index.ts`;
await $`tsc --outFile dist/index.d.ts --declaration --emitDeclarationOnly --skipLibCheck index.ts`;
await $`cp README.md dist/`;

const vSchema = z.object({ version: z.string() });
const mmpSchema = z.tuple([z.number(), z.number(), z.number()]);
const latest = await fetch(`https://registry.npmjs.org/${name}/latest`)
	.then((x) => x.json().then((x) => vSchema.parse(x).version))
	.catch(() => "0.0.0");
const [major, minor, patch] = mmpSchema.parse(latest.split(".").map(Number));
const version = `${major}.${minor}.${patch + 1}`;

await Bun.write(
	"dist/package.json",
	JSON.stringify({
		name,
		version,
		main: "index.js",
		types: "index.d.ts",
		dependencies,
	}),
);
await $`bun publish --access public`.cwd("dist");
await $`rm -rf dist`;
