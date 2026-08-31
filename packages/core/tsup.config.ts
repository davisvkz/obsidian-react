import { defineConfig } from "tsup";

export default defineConfig({
	clean: true,
	dts: true,
	entry: { index: "src/index.ts", mantine: "src/mantine.tsx" },
	esbuildOptions(options) {
		options.jsx = "automatic";
	},
	external: [
		"react",
		"react-dom",
		"react-dom/client",
		"react-router",
		"obsidian",
		"@mantine/core",
		"@mantine/hooks",
	],
	format: ["esm"],
	platform: "browser",
	sourcemap: true,
	// Non-negotiable: `mantine.tsx` and `index.ts` both re-export symbols from
	// `render.tsx` (AppContext, HostContext, mountShadowReact). Without code
	// splitting, esbuild would inline render.tsx separately into each entry,
	// producing two distinct `createContext()` calls — mantineRender() would
	// provide one AppContext instance while useApp() reads from the other,
	// and every hook consuming it would throw. Splitting makes both entries
	// import a shared chunk instead, so the contexts stay identical.
	splitting: true,
	target: "es2020",
	treeshake: true,
});
