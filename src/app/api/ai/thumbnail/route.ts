import { createServerClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const {
    contentId,
    baseImageUrl,
    avatarImageUrl,
    headlineText,
    stylePreset,
    replacePerson
  } = body;

  const apiKey = process.env.NANOBANANA_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "NanoBanana key missing" }, { status: 503 });
  }

  const prompt = `
You are editing a YouTube thumbnail.

Keep layout, lighting and framing identical.

${replacePerson && avatarImageUrl ? 
`Replace the existing person with the uploaded avatar image.` : ""}

Change headline text to:
"${headlineText}"

Style direction:
${stylePreset}

High CTR, bold, readable text, strong contrast.
`;

  const nanoRes = await fetch("https://api.nanobanana.ai/v1/edit", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      base_image: baseImageUrl,
      avatar_image: avatarImageUrl,
      prompt
    })
  });

  if (!nanoRes.ok) {
    const err = await nanoRes.text();
    return NextResponse.json({ error: err }, { status: 500 });
  }

  const result = await nanoRes.json();
  const imageBuffer = Buffer.from(result.image_base64, "base64");

  const storagePath = `thumbnails/${user.id}/${contentId}/v1.png`;

  await supabase.storage
    .from("thumbnails")
    .upload(storagePath, imageBuffer, {
      contentType: "image/png",
      upsert: true
    });

  await supabase.from("thumbnails").insert({
    content_id: contentId,
    user_id: user.id,
    version: 1,
    is_primary: true,
    storage_path: storagePath,
    prompt
  });

  return NextResponse.json({ success: true, path: storagePath });
}
