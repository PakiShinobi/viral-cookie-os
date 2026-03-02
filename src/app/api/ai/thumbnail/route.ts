import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  isAuthDisabled,
  getMockUser,
  assertAuthWritesAllowed,
} from "@/lib/auth/auth-bypass";

export async function POST(req: Request) {
  // Block writes in bypass mode unless AUTH_BYPASS_ALLOW_WRITES=true.
  try {
    assertAuthWritesAllowed();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 403 });
  }

  const supabase = await createServerClient();
  let userId: string;

  if (isAuthDisabled()) {
    userId = getMockUser().id;
  } else {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;
  }

  let body: any;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    contentId,
    baseImageUrl,
    avatarImageUrl,
    headlineText,
    stylePreset,
    replacePerson,
  } = body;

  if (!contentId || !baseImageUrl || !headlineText) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const apiKey = process.env.NANOBANANA_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "NanoBanana key missing" },
      { status: 503 }
    );
  }

  const prompt = `
You are editing a YouTube thumbnail.

Keep layout, lighting and framing identical.

${
  replacePerson && avatarImageUrl
    ? `Replace the existing person with the uploaded avatar image.`
    : ""
}

Change headline text to:
"${headlineText}"

Style direction:
${stylePreset || "High contrast, bold YouTube style"}

High CTR, bold, readable text, strong contrast.
`;

  const nanoRes = await fetch("https://api.nanobanana.ai/v1/edit", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      base_image: baseImageUrl,
      avatar_image: avatarImageUrl || null,
      prompt,
    }),
  });

  if (!nanoRes.ok) {
    const err = await nanoRes.text();
    return NextResponse.json({ error: err }, { status: 500 });
  }

  const result = await nanoRes.json();

  if (!result?.image_base64) {
    return NextResponse.json(
      { error: "NanoBanana returned invalid image response" },
      { status: 500 }
    );
  }

  const imageBuffer = Buffer.from(result.image_base64, "base64");

  const storagePath = `${userId}/${contentId}/v1.png`;

  const { error: uploadError } = await supabase.storage
    .from("thumbnails")
    .upload(storagePath, imageBuffer, {
      contentType: "image/png",
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: uploadError.message },
      { status: 500 }
    );
  }

  const { error: insertError } = await supabase.from("thumbnails").insert({
    content_id: contentId,
    user_id: userId,
    version: 1,
    is_primary: true,
    storage_path: storagePath,
    prompt,
  });

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    path: storagePath,
  });
}
