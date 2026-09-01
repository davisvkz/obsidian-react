import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { browser, expect } from "@wdio/globals";
import { after, before, describe, it } from "mocha";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUNDLE_PATH = path.resolve(__dirname, "../../../.obsidian/scripts/bundle.js");
const VAULT_BUNDLE_PATH = ".obsidian/scripts/bundle.js";
// The real production snippet, read fresh from the repo root so this suite
// never drifts from what actually ships in index.md.
const SNIPPET_PATH = path.resolve(__dirname, "../../../index.md");

const ROOT = "nested-vault-test";

// ---------------------------------------------------------------------------
// Vault helpers
// ---------------------------------------------------------------------------

/** Writes `content` to `vaultPath`, creating any missing parent folders. */
async function writeFile(vaultPath: string, content: string) {
	await browser.executeObsidian(
		async ({ app }, vaultPath, content) => {
			const adapter = app.vault.adapter;
			const dir = vaultPath.split("/").slice(0, -1).join("/");
			if (dir) {
				const parts = dir.split("/");
				let acc = "";
				for (const part of parts) {
					acc = acc ? `${acc}/${part}` : part;
					if (!(await adapter.exists(acc))) await adapter.mkdir(acc);
				}
			}
			await adapter.write(vaultPath, content);
		},
		vaultPath,
		content,
	);
}

async function removePath(vaultPath: string) {
	await browser.executeObsidian(async ({ app }, p) => {
		if (await app.vault.adapter.exists(p)) await app.vault.adapter.rmdir(p, true);
	}, vaultPath);
}

async function openPreview(filePath: string) {
	await browser.executeObsidian(async ({ app, obsidian }, filePath) => {
		const file = app.vault.getAbstractFileByPath(filePath);
		if (file instanceof obsidian.TFile) {
			const leaf = app.workspace.getLeaf(false);
			await leaf.openFile(file, { state: { mode: "preview" } });
		}
	}, filePath);
}

/** Waits until `text` shows up anywhere in the rendered document. */
async function waitForMarker(text: string) {
	await browser.waitUntil(
		async () =>
			browser.executeObsidian((_o, t) => document.body.textContent?.includes(t) ?? false, text),
		{ timeout: 10_000, timeoutMsg: `expected marker "${text}" to appear in the rendered note` },
	);
}

/** Waits for the real app's home screen ("New to-do" input), piercing shadow roots. */
async function waitForRealAppHome() {
	await browser.waitUntil(
		async () =>
			browser.executeObsidian(() => {
				const walk = (node: Document | ShadowRoot): boolean => {
					for (const inp of Array.from(node.querySelectorAll<HTMLInputElement>("input"))) {
						if (inp.placeholder.startsWith("New to-do")) return true;
					}
					for (const el of Array.from(node.querySelectorAll("*"))) {
						const sr = (el as HTMLElement).shadowRoot;
						if (sr && walk(sr)) return true;
					}
					return false;
				};
				return walk(document);
			}),
		{ timeout: 10_000, timeoutMsg: "expected the real app's home page to appear" },
	);
}

/** A fake bundle: evaluates to a function that stamps a visible, unique marker. */
function fakeBundleSource(marker: string) {
	return `(dv) => { dv.container.innerHTML = '<div data-testid="nested-vault-marker">${marker}</div>'; }`;
}

async function expectNoDataviewError() {
	const errorEl = browser.$(".dataview-error");
	await expect(errorEl).not.toExist();
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("Nested vault .obsidian resolution", () => {
	before(async () => {
		// Keep the vault root's bundle real, exactly like the other suites, so
		// "falls back to root" tests exercise the actual production app.
		const bundle = await fs.readFile(BUNDLE_PATH, "utf-8");
		await writeFile(VAULT_BUNDLE_PATH, bundle);
	});

	after(async () => {
		await removePath(ROOT);
	});

	it("prefers a nested .obsidian/scripts/bundle.js over the vault root's, even though both exist", async () => {
		const snippet = await fs.readFile(SNIPPET_PATH, "utf-8");
		await writeFile(
			`${ROOT}/own-obsidian/.obsidian/scripts/bundle.js`,
			fakeBundleSource("NESTED_OWN_FOLDER"),
		);
		await writeFile(`${ROOT}/own-obsidian/index.md`, snippet);

		await openPreview(`${ROOT}/own-obsidian/index.md`);

		await waitForMarker("NESTED_OWN_FOLDER");
		await expectNoDataviewError();
	});

	it("walks up multiple levels to find the nearest ancestor's .obsidian, skipping levels without one", async () => {
		const snippet = await fs.readFile(SNIPPET_PATH, "utf-8");
		await writeFile(
			`${ROOT}/deep/.obsidian/scripts/bundle.js`,
			fakeBundleSource("NESTED_TWO_LEVELS_UP"),
		);
		// child/grandchild have no .obsidian of their own.
		await writeFile(`${ROOT}/deep/child/grandchild/index.md`, snippet);

		await openPreview(`${ROOT}/deep/child/grandchild/index.md`);

		await waitForMarker("NESTED_TWO_LEVELS_UP");
		await expectNoDataviewError();
	});

	it("a note with no ancestor .obsidian of its own falls back to the real vault root app", async () => {
		const snippet = await fs.readFile(SNIPPET_PATH, "utf-8");
		await writeFile(`${ROOT}/plain-subfolder/index.md`, snippet);

		await openPreview(`${ROOT}/plain-subfolder/index.md`);

		await waitForRealAppHome();
		await expectNoDataviewError();
	});

	it("two nested vaults resolve independently to their own bundles, not each other's", async () => {
		const snippet = await fs.readFile(SNIPPET_PATH, "utf-8");
		await writeFile(`${ROOT}/vaultA/.obsidian/scripts/bundle.js`, fakeBundleSource("VAULT_A"));
		await writeFile(`${ROOT}/vaultA/index.md`, snippet);
		await writeFile(`${ROOT}/vaultB/.obsidian/scripts/bundle.js`, fakeBundleSource("VAULT_B"));
		await writeFile(`${ROOT}/vaultB/index.md`, snippet);

		await openPreview(`${ROOT}/vaultA/index.md`);
		await waitForMarker("VAULT_A");
		await expectNoDataviewError();

		await openPreview(`${ROOT}/vaultB/index.md`);
		await waitForMarker("VAULT_B");
		await expectNoDataviewError();
	});
});
