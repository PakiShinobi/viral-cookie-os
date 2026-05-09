import { NewPodcastClient } from "./new-podcast-client";

export const metadata = {
  title: "New podcast project · Viral Cookie OS",
};

/**
 * `/podcast/new` no longer renders a setup form.
 *
 * The pivot to editor-first means the user lands directly in the import
 * studio. We auto-create a project with a placeholder title and route to
 * `/podcast/[id]/import`. The title can be renamed inside the editor.
 */
export default function NewPodcastPage() {
  return <NewPodcastClient />;
}
