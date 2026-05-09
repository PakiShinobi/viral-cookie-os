import { EditorPageClient } from "./editor-page-client";

export const metadata = {
  title: "Editor · Viral Cookie OS",
};

export default async function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditorPageClient projectId={id} />;
}
