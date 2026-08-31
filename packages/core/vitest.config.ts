import path from "node:path";
import { defineConfig } from "vitest/config";

const sharedAlias = {
	// Defensive stub: several modules only use `import type` from obsidian,
	// but this alias ensures an accidental runtime import does not break tests.
	obsidian: path.resolve(__dirname, "./test/__mocks__/obsidian.ts"),
};

export default defineConfig({
	test: {
		projects: [
			{
				resolve: { alias: sharedAlias },
				test: {
					environment: "node",
					include: ["test/**/*.test.ts"],
					name: "unit",
				},
			},
			{
				resolve: { alias: sharedAlias },
				test: {
					environment: "jsdom",
					include: ["test/**/*.dom.test.tsx"],
					name: "dom",
					setupFiles: ["test/setup.dom.ts"],
				},
			},
		],
	},
});
