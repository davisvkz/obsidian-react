#!/usr/bin/env node
// create-obsidian-react-app — scaffolds an Obsidian vault that runs a React
// 19 + TypeScript SPA inside a note, evaluated by the Dataview plugin.
//
// Plain Node, zero dependencies, on purpose: `npm create`/`npx` installs
// this package before running it, so every dependency is latency in the
// user's very first interaction, and the whole point of the tool is that
// the user may not have anything but Node installed yet.

import { spawnSync } from "node:child_process";
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_ROOT = path.join(__dirname, "template", "default");

function fail(message) {
	console.error(`\n✖ ${message}\n`);
	process.exit(1);
}

// --- Node version guard --------------------------------------------------
// `engines` in package.json is only advisory for npm (a warning unless
// engine-strict is set), so an old Node produces a confusing syntax error
// deep in this file instead of a readable message. Check explicitly first.
{
	const [major, minor] = process.versions.node.split(".").map(Number);
	if (major < 18 || (major === 18 && minor < 17)) {
		fail(
			`create-obsidian-react-app requires Node.js >= 18.17 (found ${process.versions.node}).\n` +
				"  Upgrade Node, then re-run:\n  npm create obsidian-react-app@latest",
		);
	}
}

// --- CLI args --------------------------------------------------------------
// node:util.parseArgs has no automatic `--no-x` negation of a `x` boolean
// option — declare each negated flag as its own literal boolean option.
let args;
try {
	args = parseArgs({
		allowPositionals: true,
		options: {
			help: { short: "h", type: "boolean" },
			"no-build": { type: "boolean" },
			"no-git": { type: "boolean" },
			"no-install": { type: "boolean" },
			overwrite: { short: "f", type: "boolean" },
			pm: { type: "string" },
			version: { short: "v", type: "boolean" },
			yes: { short: "y", type: "boolean" },
		},
	});
} catch (err) {
	fail(`${err.message}\n  Run with --help for usage.`);
}

if (args.values.version) {
	const pkg = JSON.parse(readFileSync(path.join(__dirname, "package.json"), "utf8"));
	console.log(pkg.version);
	process.exit(0);
}

if (args.values.help) {
	console.log(`
create-obsidian-react-app [target-dir] [options]

  Scaffolds an Obsidian vault embedding a React 19 + TypeScript SPA,
  rendered inside a note via the (vendored) Dataview community plugin.

Options:
  --pm <npm|pnpm|yarn|bun>   Package manager to install with (default: autodetected)
  --no-install                Skip the install step
  --no-build                  Skip the initial build step (implied by --no-install)
  --no-git                    Skip \`git init\`
  -f, --overwrite              Remove existing files in a non-empty target directory
  -y, --yes                    Accept defaults / non-empty target without prompting
  -h, --help                   Show this help
  -v, --version                Print the version
`);
	process.exit(0);
}

const PM_NAMES = ["npm", "pnpm", "yarn", "bun"];
if (args.values.pm && !PM_NAMES.includes(args.values.pm)) {
	fail(`--pm must be one of ${PM_NAMES.join(", ")} (got "${args.values.pm}").`);
}

// --- helpers -----------------------------------------------------------

function detectPackageManager() {
	const ua = process.env.npm_config_user_agent;
	if (ua) {
		const name = ua.split(" ")[0]?.split("/")[0];
		if (PM_NAMES.includes(name)) return name;
	}
	return "npm";
}

function isNonEmptyDir(dir) {
	if (!existsSync(dir)) return false;
	if (!statSync(dir).isDirectory()) return true; // exists as a non-directory: treat as blocking
	return readdirSync(dir).some((entry) => entry !== ".git");
}

/** Reverses the sync script's `dot-<x>` → `.<x>` encoding, per path segment. */
function dotDecode(name) {
	return name.startsWith("dot-") ? `.${name.slice(4)}` : name;
}

function copyTemplate(srcDir, destDir) {
	mkdirSync(destDir, { recursive: true });
	for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
		const destName = dotDecode(entry.name);
		const srcPath = path.join(srcDir, entry.name);
		const destPath = path.join(destDir, destName);
		if (entry.isDirectory()) {
			copyTemplate(srcPath, destPath);
		} else {
			mkdirSync(path.dirname(destPath), { recursive: true });
			copyFileSync(srcPath, destPath);
		}
	}
}

/** Sanitizes an arbitrary directory name into a valid npm package name. */
function toPackageName(name) {
	const sanitized = name
		.trim()
		.toLowerCase()
		.replace(/^[._]+/, "")
		.replace(/[^a-z0-9-~]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return sanitized || "my-obsidian-app";
}

function run(cmd, cmdArgs, cwd) {
	const result = spawnSync(cmd, cmdArgs, {
		cwd,
		shell: process.platform === "win32",
		stdio: "inherit",
	});
	return result.status === 0;
}

// --- main ----------------------------------------------------------------

async function main() {
	let targetArg = args.positionals[0];

	if (!targetArg) {
		if (process.stdout.isTTY && process.stdin.isTTY) {
			const rl = createInterface({ input: process.stdin, output: process.stdout });
			const answer = await rl.question("Target directory (my-obsidian-app): ");
			rl.close();
			targetArg = answer.trim() || "my-obsidian-app";
		} else {
			fail(
				"No target directory given and stdin is not a TTY.\n  Usage: create-obsidian-react-app <target-dir>",
			);
		}
	}

	const targetDir = path.resolve(process.cwd(), targetArg);
	const dirLabel = targetArg === "." ? "the current directory" : targetArg;

	if (isNonEmptyDir(targetDir)) {
		if (args.values.overwrite) {
			for (const entry of readdirSync(targetDir)) {
				if (entry === ".git") continue;
				rmSync(path.join(targetDir, entry), { force: true, recursive: true });
			}
		} else if (args.values.yes) {
			// proceed, writing into/over whatever is already there
		} else if (process.stdout.isTTY && process.stdin.isTTY) {
			const rl = createInterface({ input: process.stdin, output: process.stdout });
			console.log(`\n${dirLabel} is not empty.`);
			console.log("  1) Remove existing files and continue");
			console.log("  2) Write into it anyway (may overwrite files)");
			console.log("  3) Cancel");
			const choice = (await rl.question("Choice [3]: ")).trim() || "3";
			rl.close();
			if (choice === "1") {
				for (const entry of readdirSync(targetDir)) {
					if (entry === ".git") continue;
					rmSync(path.join(targetDir, entry), { force: true, recursive: true });
				}
			} else if (choice !== "2") {
				console.log("Cancelled.");
				process.exit(0);
			}
		} else {
			fail(
				`${dirLabel} is not empty. Re-run with --overwrite or --yes, or choose an empty directory.`,
			);
		}
	}

	console.log(`\nScaffolding an Obsidian React app in ${dirLabel}...\n`);
	copyTemplate(TEMPLATE_ROOT, targetDir);

	// Rewrite the generated project's dot-js/package.json: strip the template
	// author's own repo metadata, and give it this project's own identity.
	const appPkgPath = path.join(targetDir, ".js", "package.json");
	const appPkg = JSON.parse(readFileSync(appPkgPath, "utf8"));
	appPkg.name = toPackageName(path.basename(targetDir));
	appPkg.version = "0.0.0";
	appPkg.private = true;
	delete appPkg.repository;
	delete appPkg.bugs;
	delete appPkg.homepage;
	writeFileSync(appPkgPath, `${JSON.stringify(appPkg, null, "\t")}\n`);

	// git init
	if (!args.values["no-git"]) {
		const alreadyRepo =
			spawnSync("git", ["rev-parse", "--is-inside-work-tree"], {
				cwd: targetDir,
			}).status === 0;
		if (!alreadyRepo) {
			const gitOk = run("git", ["init"], targetDir) && run("git", ["add", "-A"], targetDir);
			if (gitOk) {
				spawnSync("git", ["commit", "-q", "-m", "chore: scaffold obsidian-react-app"], {
					cwd: targetDir,
				});
			} else {
				console.warn("  (git init failed — skipping; you can run it yourself later)");
			}
		}
	}

	// install + build
	const pm = args.values.pm ?? detectPackageManager();
	const appDir = path.join(targetDir, ".js");
	let installed = false;

	if (!args.values["no-install"]) {
		console.log(`\nInstalling dependencies with ${pm}...\n`);
		installed = run(pm, ["install"], appDir);
		if (!installed) {
			console.warn(`\n  ${pm} install failed — you can retry manually, see next steps below.`);
		}
	}

	if (installed && !args.values["no-build"]) {
		console.log("\nBuilding the initial bundle...\n");
		const built = run(pm, ["run", "build"], appDir);
		if (!built) {
			console.warn("\n  Initial build failed — you can retry manually, see next steps below.");
		}
	}

	console.log(`
Done! Next steps:

  1. Open Obsidian → "Open folder as vault" → select:
       ${targetDir}
  2. Obsidian will ask to trust the vault's plugins — choose
     "Trust author and enable plugins". Dataview is vendored and
     pre-configured to enable; if you decline the prompt, turn it on
     later via Settings → Community plugins → enable Dataview.
  3. Open the note "index.md" — your React app renders inside it.

  Rebuild after editing source:
       cd ${targetArg}/.js && ${pm} run build

  All source lives in ".js/". Do not move it out of the vault root: the
  build writes to "../.obsidian/scripts/bundle.js" and only resolves
  correctly as a direct child of the vault.
`);
}

main().catch((err) => {
	fail(err instanceof Error ? err.message : String(err));
});
