import "./index.css";
import type { DataviewInlineApi } from "obsidian-dataview/lib/api/inline-api";
import { createFsRoutes, PersistentRouter } from "obsidian-react-ui";
import { mantineRender } from "obsidian-react-ui/mantine";

const routes = createFsRoutes(require.context("./routes", true, /\.(tsx|ts)$/));

export default async function (dv: DataviewInlineApi) {
	return mantineRender(dv, <PersistentRouter routes={routes} />);
}
