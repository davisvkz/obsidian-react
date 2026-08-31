import type React from "react";
import { createContext } from "react";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";

/** The Obsidian `App`, made available to the entire React tree. */
export const AppContext = createContext<import("obsidian").App | null>(null);

/**
 * The shadow root mount node (the `<div>` immediately inside the shadow),
 * used as `host` for pruning orphaned subscribers in the reactive hooks.
 * Provided automatically by `mountShadowReact`.
 */
export const HostContext = createContext<Node | null>(null);

export interface MountShadowReactOptions {
	/**
	 * CSS injected into the shadow root's `<style>` tag.
	 *
	 * Defaults to the build-time `__STYLE__` global when the host bundler
	 * defines one (e.g. via the `ReturnLibraryWithCSSPlugin` Rspack plugin
	 * shipped with the vault template) — pass it explicitly for any other
	 * setup.
	 */
	css?: string;
}

// Declared as a bare (non-ambient) identifier so `typeof __STYLE__` is a safe
// runtime check even when no bundler defines it — consumers get "" instead
// of a ReferenceError.
declare const __STYLE__: string | undefined;

function resolveCss(css?: string): string {
	if (css !== undefined) return css;
	return typeof __STYLE__ === "string" ? __STYLE__ : "";
}

/**
 * Generic shadow-DOM + React mount primitive.
 *
 * - Unmounts the previous root (`window.__mdRoot__`) to ensure effect cleanups
 *   run even when Dataview swaps the container without unmounting React.
 * - Creates a `host > shadow > mount` and injects the shadow root's CSS
 *   (see `MountShadowReactOptions.css`).
 * - Exposes `mount` via `HostContext` so hooks can use it as an orphan-subscriber
 *   sentinel (`mount.isConnected === false` after Dataview removes the container).
 * - `renderTree(mount)` must return the `ReactNode` to render — receives `mount`
 *   so external wrappers (e.g. MantineProvider) can reference the element.
 */
export function mountShadowReact(
	container: HTMLElement,
	renderTree: (mount: HTMLElement) => React.ReactNode,
	options: MountShadowReactOptions = {},
): HTMLElement {
	const w = window as unknown as { __mdRoot__?: Root };
	if (w.__mdRoot__) {
		try {
			w.__mdRoot__.unmount();
		} catch {
			/* root already unmounted */
		}
	}

	container.innerHTML = "";
	const host = document.createElement("div");
	container.appendChild(host);
	const shadow = host.attachShadow({ mode: "open" });

	const style = document.createElement("style");
	style.textContent = resolveCss(options.css);
	shadow.appendChild(style);

	// `mount` is the `:host>div` that the transformed CSS selectors target.
	const mount = document.createElement("div");
	shadow.appendChild(mount);

	const root = createRoot(mount);
	w.__mdRoot__ = root;
	root.render(<HostContext.Provider value={mount}>{renderTree(mount)}</HostContext.Provider>);

	return container;
}
