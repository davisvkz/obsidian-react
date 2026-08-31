# obsidian-react-ui

React 19 + shadow-DOM runtime for building UIs that run **inside an Obsidian note**, evaluated by the community [Dataview](https://github.com/blacksmithgu/obsidian-dataview) plugin's inline `$=` snippets.

It provides:

- **`mountShadowReact`** — mounts a React tree into an isolated shadow DOM (so your CSS never leaks into or clashes with Obsidian's own styles).
- **`mantineRender`** (subpath `obsidian-react-ui/mantine`) — the same, pre-wired with [Mantine](https://mantine.dev/)'s `MantineProvider`.
- **`PersistentRouter`** — a `MemoryRouter` wrapper that survives Dataview's frequent re-evaluations by persisting the current path on `window`.
- **`createFsRoutes`** — turns a `require.context`-shaped object into a `react-router` `RouteObject[]`, using a file-system routing convention (`index.tsx` → `/`, `[id].tsx` → `/:id`, `_layout.tsx` → pathless layout).
- **A reactive vault store** (`useMarkdownFile`, `useFolderFiles`, `useSubfolders`, `useApp`) that subscribes to Obsidian's vault/metadata events and feeds React via `useSyncExternalStore`, with automatic pruning of orphaned subscribers across re-evals.

This package is the extracted core of [`obsidian-react-template`](https://github.com/davisvkz/ObsidianReactUI) — see that repo (`examples/vault/`) for a full working vault, or scaffold a new one with `npm create obsidian-react-app@latest`.

## Install

```bash
npm install obsidian-react-ui react react-dom react-router obsidian
# optional, only if you use mantineRender:
npm install @mantine/core
```

`react`, `react-dom`, `react-router`, and `obsidian` are peer dependencies — this package does not bundle them. `@mantine/core` is an **optional** peer, needed only for the `obsidian-react-ui/mantine` subpath; importing from the package root (`.`) never pulls in Mantine.

## Usage

```tsx
// src/index.tsx — the entry your bundler compiles into a Dataview-evaluated bundle
import type { DataviewInlineApi } from "obsidian-dataview/lib/api/inline-api";
import { createFsRoutes, PersistentRouter, type RequireContext } from "obsidian-react-ui";
import { mantineRender } from "obsidian-react-ui/mantine";

const routes = createFsRoutes(
  require.context("./routes", true, /\.(tsx|ts)$/) as RequireContext,
);

export default async function (dv: DataviewInlineApi) {
  return mantineRender(dv, <PersistentRouter routes={routes} />);
}
```

```tsx
// src/routes/index.tsx
import { useApp, useMarkdownFile, useFolderFiles, useSubfolders } from "obsidian-react-ui";

export default function HomePage() {
  const app = useApp();
  const file = useMarkdownFile("path/to/note.md");
  const files = useFolderFiles("my-folder");
  const subs = useSubfolders("my-folder");
  // ...
}
```

### The CSS contract

Because this code runs inside a shadow DOM injected via `eval`, CSS cannot be loaded with a `<link>` tag or a runtime `import "*.css"` — it has to be a **string** handed to the mount function:

```ts
mantineRender(dv, tree, { css: myBundledCssString });
// or, for the low-level primitive:
mountShadowReact(container, renderTree, { css: myBundledCssString });
```

If your bundler defines a build-time `__STYLE__` global (as the [Rspack config](https://github.com/davisvkz/ObsidianReactUI/blob/main/examples/vault/.js/rspack.config.js) shipped with the vault template does, via its `ReturnLibraryWithCSSPlugin`), `css` can be omitted and it is picked up automatically. Otherwise it defaults to `""`.

### `require.context` and bundler-agnosticism

`createFsRoutes` takes the context object as a parameter — it never calls `require.context` itself, so this package has no compile-time dependency on webpack/Rspack. The `RequireContext` type is exported so you can type your own call without relying on any ambient global:

```ts
export interface RequireContext {
  keys(): string[];
  (id: string): unknown;
  resolve(id: string): string;
}
```

For bundlers without `require.context` (Vite, esbuild), wrap `import.meta.glob` in an object matching this shape.

## Exports

| Entry | Needs | Contents |
|---|---|---|
| `obsidian-react-ui` | — | `mountShadowReact`, `AppContext`, `HostContext`, `PersistentRouter`, `createFsRoutes`, `RequireContext`, the reactive store + hooks, path/snapshot helpers |
| `obsidian-react-ui/mantine` | `@mantine/core` | `mantineRender`, `DataviewHost`, `MantineRenderOptions` |

## License

MIT — see [`LICENSE`](./LICENSE).
