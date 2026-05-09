import { PodcastProjectClient } from "./podcast-project-client";

export const metadata = {
  title: "Podcast project · Viral Cookie OS",
};

export default async function PodcastProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PodcastProjectClient projectId={id} />;
}
