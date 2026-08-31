# obsidian-react-template

> **A template + library for building React 19 + TypeScript single-page apps that run inside an Obsidian note.**

This is **not an Obsidian plugin**. It's a way to embed a full React SPA in a **note**, by compiling it into a self-contained JS bundle that the community [Dataview](https://github.com/blacksmithgu/obsidian-dataview) plugin evaluates at runtime — one note (`index.md`) holds a single inline DataviewJS line that loads and runs your compiled app.

This repository is a monorepo with three parts:

| | What | Published as |
|---|---|---|
| [`packages/core`](packages/core) | The reusable runtime: shadow-DOM mount, reactive vault store + hooks, `PersistentRouter`, file-system routing | [`obsidian-react-ui`](https://www.npmjs.com/package/obsidian-react-ui) on npm |
| [`packages/create-obsidian-react-app`](packages/create-obsidian-react-app) | A scaffolding CLI that generates a ready-to-open vault | [`create-obsidian-react-app`](https://www.npmjs.com/package/create-obsidian-react-app) on npm |
| [`examples/vault`](examples/vault) | A full example vault (a recursive to-do app) consuming the library — also the e2e test target | not published; it's the source `create-obsidian-react-app`'s template is generated from |

---

## Quickstart — scaffold your own vault

```bash
npm create obsidian-react-app@latest my-vault
# or: npx create-obsidian-react-app my-vault / pnpm create / yarn create / bun create
```

Then open `my-vault` as a vault in Obsidian (`File → Open Vault → Open folder as vault`), trust it, and open `index.md`. See [`packages/create-obsidian-react-app/README.md`](packages/create-obsidian-react-app/README.md) for CLI options.

## Quickstart — already have a vault

```bash
npm install obsidian-react-ui react react-dom react-router obsidian
```

See [`packages/core/README.md`](packages/core/README.md) for usage, the CSS contract (why styles have to be handed in as a string), and the full API.

## Tech stack

| Layer | Technology |
|---|---|
| UI framework | React 19 + TypeScript ~5.8 |
| Router | react-router 7 (MemoryRouter mode) |
| UI components | Mantine 8, Tabler icons |
| Styling | Tailwind CSS 4, Mantine PostCSS preset |
| Bundler (example vault) | **Rspack** 1.5 (+ SWC loader) |
| Library bundler | **tsup** (esbuild + rollup-plugin-dts) |
| Package manager | **npm** workspaces |
| Linter / formatter | **Biome** 2.4 |
| Unit tests | **Vitest** 3 (node + jsdom projects) |
| E2E tests | **WebdriverIO** 9 against a real Obsidian instance |
| Runtime host | **Dataview** community plugin (vendored in `examples/vault/`) |

---

## Developing in this monorepo

```bash
npm install
npm run build          # builds obsidian-react-ui, then examples/vault/.js
npm run test:unit       # unit tests for both packages
npm run lint            # biome check
```

### Project structure

```
.
├── package.json                          workspace root (private)
├── packages/
│   ├── core/                             obsidian-react-ui — the published library
│   │   └── src/                          render, router, fsRoutes, store, hooks…
│   └── create-obsidian-react-app/        the scaffolding CLI
│       ├── index.js                      zero-dependency Node CLI
│       └── template/                     GENERATED — gitignored, see scripts/sync-template.mjs
├── examples/vault/                       the example Obsidian vault
│   ├── index.md                          the note that renders the app
│   ├── .obsidian/                        vendored Dataview plugin + config
│   └── .js/                              app source, consumes obsidian-react-ui via workspace
└── scripts/sync-template.mjs             generates the CLI's template/ from examples/vault/
```

`examples/vault/` is the **single source of truth** for the scaffolder's template — `scripts/sync-template.mjs` regenerates `packages/create-obsidian-react-app/template/` from it (via `git ls-files`, so build artifacts and caches are never swept in), and runs automatically on `npm pack`/`npm publish` through that package's `prepack` script.

### How the vault app works

```
Obsidian opens index.md
    └─▶ Dataview evaluates the inline $= snippet
            └─▶ reads .obsidian/scripts/bundle.js from disk
                    └─▶ eval(bundle)  →  returns the default export (an async function)
                            └─▶ calls lib(dv)  where dv = DataviewInlineApi
                                    └─▶ mantineRender(dv, <PersistentRouter routes={routes} />)
                                            └─▶ mounts React inside an isolated shadow DOM
```

`examples/vault/.js/rspack.config.js` compiles `src/index.tsx`, inlines all CSS into a `const __STYLE__ = "..."` string, and wraps the output in an IIFE that returns the default export — so `eval(bundle)` produces the callable function directly. `.js/` must stay a direct child of the vault root: the build output path (`../.obsidian/scripts/bundle.js`) is resolved relative to it.

### Testing

```bash
npm run test:unit                          # vitest, both packages
npm run test -w examples/vault/.js          # wdio e2e against a real Obsidian instance
```

## License

MIT — see [`LICENSE`](LICENSE). The vendored Dataview plugin (`examples/vault/.obsidian/plugins/dataview/`) is included under its own MIT license — see the `LICENSE` file alongside it.
