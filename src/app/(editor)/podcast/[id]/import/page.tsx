import { ImportStudioClient } from "./import-studio-client";

export const metadata = {
  title: "Import · Viral Cookie OS",
};

export default async function ImportStudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ImportStudioClient projectId={id} />;
}
