import path from "node:path";
import { defineConfig } from "vitest/config";

const sharedAlias = {
	"@": path.resolve(__dirname, "./src"),
	// Defensive stub: markdownStore.ts only uses `import type` from obsidian,
	// but this alias ensures an accidental runtime import does not break tests.
	obsidian: path.resolve(__dirname, "./test/unit/__mocks__/obsidian.ts"),
};

export default defineConfig({
	test: {
		projects: [
			{
				resolve: { alias: sharedAlias },
				test: {
					environment: "node",
					include: ["test/unit/**/*.test.ts"],
					name: "unit",
				},
			},
			{
				resolve: { alias: sharedAlias },
				test: {
					environment: "jsdom",
					include: ["test/unit/**/*.dom.test.tsx"],
					name: "dom",
					setupFiles: ["test/unit/setup.dom.ts"],
				},
			},
		],
	},
});
