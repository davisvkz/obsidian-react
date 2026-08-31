# create-obsidian-react-app

Scaffolds a ready-to-open [Obsidian](https://obsidian.md/) vault that embeds a React 19 + TypeScript SPA, rendered inside a note by the community [Dataview](https://github.com/blacksmithgu/obsidian-dataview) plugin (vendored, pre-configured to enable).

## Usage

```bash
npm create obsidian-react-app@latest my-vault
# or
npx create-obsidian-react-app my-vault
# pnpm/yarn/bun equivalents also work:
pnpm create obsidian-react-app my-vault
yarn create obsidian-react-app my-vault
bun create obsidian-react-app my-vault
```

Then:

1. Open Obsidian → **Open folder as vault** → select `my-vault`.
2. Trust the vault when prompted, and enable community plugins (Dataview is pre-vendored and pre-configured to enable).
3. Open `index.md` — your React app renders inside it.

## What you get

```
my-vault/
├── index.md              the note that renders your app
├── .obsidian/             Obsidian config + the vendored Dataview plugin
└── .js/                   all source code, config, and tests
    ├── package.json
    ├── rspack.config.js
    └── src/
        ├── index.tsx
        ├── lib/           the reusable core (also published as obsidian-react-ui)
        ├── routes/         example to-do app — delete and write your own
        └── examples/
```

`.js/` must stay a direct child of the vault root — the build writes its output to `../.obsidian/scripts/bundle.js`, resolved relative to `.js/`.

## Options

```
create-obsidian-react-app [target-dir] [options]

  --pm <npm|pnpm|yarn|bun>   Package manager to install with (default: autodetected)
  --no-install                Skip the install step
  --no-build                  Skip the initial build step (implied by --no-install)
  --no-git                    Skip `git init`
  -f, --overwrite              Remove existing files in a non-empty target directory
  -y, --yes                    Accept defaults / non-empty target without prompting
  -h, --help                   Show help
  -v, --version                Print the version
```

## Where this comes from

The generated project is a snapshot of [`examples/vault/`](https://github.com/davisvkz/ObsidianReactUI/tree/main/examples/vault) in the [`obsidian-react-template`](https://github.com/davisvkz/ObsidianReactUI) monorepo, which is also the demo/e2e target for [`obsidian-react-ui`](https://www.npmjs.com/package/obsidian-react-ui), the extracted library this template's `lib/` is built on.

## Third-party plugin

The vendored Dataview plugin (`.obsidian/plugins/dataview/`) is included under its own MIT license — see `.obsidian/plugins/dataview/LICENSE` in the generated project.

## License

MIT — see [`LICENSE`](./LICENSE).
