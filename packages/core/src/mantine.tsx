import { type MantineColorScheme, MantineProvider, type MantineThemeOverride } from "@mantine/core";
import { AppContext, mountShadowReact } from "./render";

/**
 * The subset of Dataview's `DataviewInlineApi` this module needs.
 *
 * Kept structural (rather than importing `obsidian-dataview/lib/api/inline-api`)
 * so the package has no compile-time dependency on `obsidian-dataview`'s types —
 * any object shaped like this (including a real `DataviewInlineApi`) works.
 */
export interface DataviewHost {
	app?: import("obsidian").App;
	container: HTMLElement;
}

function resolveApp(dv: DataviewHost): import("obsidian").App {
	return dv.app ?? (window as unknown as { app: import("obsidian").App }).app;
}

export interface MantineRenderOptions {
	/** CSS injected into the shadow root — see `MountShadowReactOptions.css`. */
	css?: string;
	/** Default color scheme (default: `"dark"`). */
	defaultColorScheme?: MantineColorScheme;
	/** Additional Mantine theme (merged on top of the default). */
	theme?: MantineThemeOverride;
}

/**
 * Mounts React + Mantine in an isolated shadow root inside Obsidian.
 *
 * Calls `mountShadowReact` (which handles previous root cleanup, shadow DOM
 * setup, and `HostContext`) and wraps the tree with `AppContext` + `MantineProvider`.
 */
export function mantineRender(
	dv: DataviewHost,
	children: React.ReactNode,
	options: MantineRenderOptions = {},
): HTMLElement {
	const { theme = {}, defaultColorScheme = "dark", css } = options;
	const app = resolveApp(dv);

	return mountShadowReact(
		dv.container,
		(mount) => (
			<AppContext.Provider value={app}>
				<MantineProvider
					cssVariablesSelector=":host > div"
					defaultColorScheme={defaultColorScheme}
					getRootElement={() => mount}
					theme={{
						...theme,
						components: {
							Portal: { defaultProps: { target: mount } },
							...theme.components,
						},
					}}
				>
					{children}
				</MantineProvider>
			</AppContext.Provider>
		),
		{ css },
	);
}
