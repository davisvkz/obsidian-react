// path

// fs-routes: builds RouteObject[] from require.context
export { createFsRoutes, type RequireContext } from "./fsRoutes";
// NOTE: the opinionated Mantine render helper (`mantineRender`) is NOT
// re-exported here — it lives at the "./mantine" subpath so importing the
// core does not pull in `@mantine/core` for consumers who don't use it.
export { containingFolderKeys, folderFilesKey, parentOf } from "./path";
// reactive cache
export { ReactiveCache } from "./reactiveCache";
// generic render (shadow-DOM, no UI lib dependency)
export {
	AppContext,
	HostContext,
	type MountShadowReactOptions,
	mountShadowReact,
} from "./render";
// persistent router (MemoryRouter that survives Dataview re-evals)
export {
	PersistentRouter,
	type PersistentRouterProps,
} from "./router";
// snapshot
export {
	isFolder,
	type MdSnapshot,
	type Subfolder,
	stripFrontmatter,
} from "./snapshot";
// store — reactive reads
// store — mutations
export {
	ensureFolder,
	getFolderFiles,
	getSnapshot,
	getSubfolders,
	subscribeFile,
	subscribeFolderFiles,
	subscribeSubfolders,
	trashPath,
	updateBody,
	updateFrontmatter,
} from "./store";
// React hooks
export {
	type UseFolderFiles,
	type UseMarkdownFile,
	type UseSubfolders,
	useApp,
	useFolderFiles,
	useMarkdownFile,
	useSubfolders,
} from "./useMarkdownFile";
