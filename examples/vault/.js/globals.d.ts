declare const __STYLE__: string;

interface RequireContext {
	keys(): string[];
	resolve(id: string): string;
	(id: string): unknown;
}

declare const require: {
	context(directory: string, useSubdirectories?: boolean, regExp?: RegExp): RequireContext;
};

interface Window {
	/** Root React do render anterior, para desmontagem antes de remontar. */
	__mdRoot__?: import("react-dom/client").Root;
	/** Rota atual do PersistentRouter, persistida entre re-evals do Dataview. */
	__mdRouterPath__?: string;
	/** Store singleton de markdown, persistente entre re-evals do bundle. */
	__mdStore__?: unknown;
}
declare module "*.css";
declare module "*.css?raw" {
	const content: string;
	export default content;
}
