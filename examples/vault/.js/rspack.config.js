import { rspack } from "@rspack/core";
import PreactRefreshPlugin from "@rspack/plugin-preact-refresh";
import tailwindcss from "@tailwindcss/postcss";
import autoprefixer from "autoprefixer";
import fs from "fs";
import path from "path";
import postcssPresetMantine from "postcss-preset-mantine";
import postcssSimpleVars from "postcss-simple-vars";
import { fileURLToPath } from "url";

const removePreflightMargin = (root) => {
	root.walkRules((rule) => {
		if (rule.selector === "*,:after,:before,::backdrop") {
			rule.walkDecls("margin", (decl) => {
				decl.remove();
			});
		}
	});
};
// Custom PostCSS plugin to remove `@layer` rules but keep the CSS inside
const removeLayerRules = (root) => {
	root.walkAtRules("layer", (rule) => {
		rule.replaceWith(rule.nodes);
	});
};

// Custom PostCSS plugin to remove `@property` rules
const removePropertyRules = (root) => {
	root.walkAtRules("property", (rule) => {
		rule.remove();
	});
};

// Custom PostCSS plugin to remove `@supports` rules (handle nested)
const removeSupportsRules = (root) => {
	let hasSupports = true;

	while (hasSupports) {
		hasSupports = false;

		root.walkAtRules("supports", (rule) => {
			hasSupports = true;
			rule.replaceWith(rule.nodes);
		});
	}
};

const replaceRootWithHost = (root) => {
	root.walkRules((rule) => {
		const updated = rule.selectors.map((selector) => {
			// Starts with :root[
			if (selector.startsWith(":root[")) {
				return selector.replace(/^:root\[(.+)\]$/, ":host>div[$1]");
			}
			// Is just :root
			if (selector === ":root") {
				return ":host>div";
			}
			return selector;
		});
		if (updated.some((s, i) => s !== rule.selectors[i])) {
			rule.selectors = [...rule.selectors, ...updated];
		}
	});
};

// Fix __dirname and __filename in ESM environments:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Toggles a marker file after each build so Dataview's file-watcher notices a
// change and re-evaluates the bundle (Dataview doesn't watch bundle.js itself).
class AddFilePlugin {
	apply(compiler) {
		compiler.hooks.done.tap("AddFilePlugin", () => {
			const outputPath = compiler.options.output.path;
			const filePath = path.join(outputPath, "a.md");

			fs.mkdirSync(outputPath, { recursive: true });
			const content = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
			fs.writeFileSync(filePath, content === "" ? " " : "");
		});
	}
}

export class ReturnLibraryWithCSSPlugin {
	constructor(options = {}) {
		this.name = options.name || "exports"; // internal name for the lib object
	}

	apply(compiler) {
		compiler.hooks.thisCompilation.tap("ReturnLibraryWithCSSPlugin", (compilation) => {
			compilation.hooks.processAssets.tap(
				{
					name: "ReturnLibraryWithCSSPlugin",
					stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE,
				},
				(assets) => {
					// Collect all generated CSS (there may be one per entry) into a single string
					let cssSource = "";
					for (const assetName of Object.keys(assets)) {
						if (!assetName.endsWith(".css")) continue;
						cssSource += assets[assetName].source().toString();
						compilation.deleteAsset(assetName);
					}

					// Update the JS
					for (const file of Object.keys(assets)) {
						if (!file.endsWith(".js")) continue;
						const originalSource = assets[file].source().toString();

						const wrapped = `(() => {
${cssSource ? `const __STYLE__ = ${JSON.stringify(cssSource)};\n` : ""}
${originalSource}

// Return the default export
return typeof ${this.name} !== "undefined" && ${this.name}.default ? ${this.name}.default : ${this.name};
})();`;

						compilation.updateAsset(file, new compiler.webpack.sources.RawSource(wrapped));
					}
				},
			);
		});
	}
}

/** Custom plugin to inline the CSS */

export default {
	cache: true,
	entry: {
		bundle: "./src/index.tsx",
	},
	experiments: {
		cache: {
			storage: {
				directory: "node_modules/.cache/rspack",
				type: "filesystem",
			},
			type: "persistent",
		},
	},
	mode: "development",
	module: {
		rules: [
			{
				loader: "builtin:swc-loader",
				options: {
					jsc: {
						parser: { syntax: "typescript", tsx: true },
						transform: { react: { runtime: "automatic" } },
					},
				},
				test: /\.[jt]sx?$/,
			},
			{
				test: /\.css$/,
				type: "javascript/auto",
				use: [
					rspack.CssExtractRspackPlugin.loader,
					"css-loader",
					{
						loader: "postcss-loader",
						options: {
							postcssOptions: {
								plugins: [
									tailwindcss({
										optimize: true,
									}),
									autoprefixer,
									removeLayerRules,
									removePropertyRules,
									removeSupportsRules,
									removePreflightMargin,
									replaceRootWithHost,
									postcssPresetMantine(),
									postcssSimpleVars({
										variables: {
											"mantine-breakpoint-lg": "75em",
											"mantine-breakpoint-md": "62em",
											"mantine-breakpoint-sm": "48em",
											"mantine-breakpoint-xl": "88em",
											"mantine-breakpoint-xs": "36em",
										},
									}),
								],
							},
						},
					},
				],
			},
		],
	},
	output: {
		filename: "[name].js",
		library: { name: "exports", type: "var" },
		path: path.resolve(__dirname, "../.obsidian/scripts"),
	},
	plugins: [
		new PreactRefreshPlugin(),
		new rspack.CssExtractRspackPlugin(),
		new ReturnLibraryWithCSSPlugin(),
		new AddFilePlugin(),
	],
	resolve: {
		alias: { "@": path.resolve(__dirname, "./src") },
		extensions: [".ts", ".tsx", ".js"],
	},
};
