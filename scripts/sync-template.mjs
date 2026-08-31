#!/usr/bin/env node
// Generates packages/create-obsidian-react-app/template/ from
// examples/vault/ — the vault IS the template's source of truth. The
// generated template/ directory is gitignored and never hand-edited; this
// script runs automatically via the package's `prepack` script, so a
// published tarball can never ship a stale template.
//
// Why not just `fs.cp` the vault directory: `.js/` also holds `node_modules/`
// and (once wdio has run) a multi-hundred-MB `.obsidian-cache/`. We enumerate
// via `git ls-files` instead, so only what's actually tracked in the repo is
// considered — anything git doesn't track is a bug to fix (in .gitignore or
// here), never something to accidentally ship in an npm tarball.
//
// npm silently drops files named `.gitignore`/`.npmignore` from a published
// tarball (see npm-packlist's default ignore rules), and dot-directories are
// invisible to a vault/editor/tool that walks the filesystem looking for
// "real" files. So every path segment that starts with `.` is stored under
// `template/` as `dot-<rest>` and renamed back to `.<rest>` by the CLI when
// it writes the scaffolded project to disk.

import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TEMPLATE_DIR = path.join(ROOT, "packages/create-obsidian-react-app/template");

/** Renames every leading-dot path segment to `dot-<segment>`. */
function dotEncode(relPath) {
	return relPath
		.split("/")
		.map((segment) => (segment.startsWith(".") ? `dot-${segment.slice(1)}` : segment))
		.join("/");
}

function listTrackedFiles(dir) {
	return execFileSync("git", ["ls-files", "-z", dir], { cwd: ROOT })
		.toString("utf8")
		.split("\0")
		.filter(Boolean);
}

function main() {
	const tracked = listTrackedFiles("examples/vault");
	if (tracked.length === 0) {
		throw new Error(
			"`git ls-files examples/vault` returned nothing — run this from a git checkout, " +
				"and make sure examples/vault/ is committed (or at least staged).",
		);
	}

	rmSync(TEMPLATE_DIR, { force: true, recursive: true });

	let count = 0;
	for (const gitRelPath of tracked) {
		const relToVault = path.relative("examples/vault", gitRelPath);

		// Safety net: fail loudly rather than silently double-encoding, in case
		// a future file is added whose name genuinely starts with "dot-".
		for (const segment of relToVault.split(path.sep)) {
			if (segment.startsWith("dot-")) {
				throw new Error(
					`${gitRelPath}: path segment "${segment}" already starts with "dot-" — ` +
						"the dot-encoding transform would not be reversible. Rename it or adjust this script.",
				);
			}
		}

		const encoded = dotEncode(relToVault.split(path.sep).join("/"));
		const dest = path.join(TEMPLATE_DIR, "default", encoded);
		mkdirSync(path.dirname(dest), { recursive: true });
		cpSync(path.join(ROOT, gitRelPath), dest);
		count++;
	}

	writeFileSync(
		path.join(TEMPLATE_DIR, ".generated-from-commit"),
		`${execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT }).toString("utf8").trim()}\n`,
	);

	console.log(`Wrote ${count} files to ${path.relative(ROOT, TEMPLATE_DIR)}/default/`);
}

main();
