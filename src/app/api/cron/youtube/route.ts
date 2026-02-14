import { createAdminClient } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";

interface YouTubePlaylistItem {
  snippet: {
    resourceId: { videoId: string };
    title: string;
    description: string;
    publishedAt: string;
    thumbnails?: { high?: { url: string } };
  };
}

interface YouTubePlaylistResponse {
  items?: YouTubePlaylistItem[];
  error?: { message: string };
}

interface InnerTubeCaptionTrack {
  baseUrl: string;
  languageCode: string;
  kind?: string; // "asr" for auto-generated, absent for manual
}

interface InnerTubePlayerResponse {
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: InnerTubeCaptionTrack[];
    };
  };
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const youtubeApiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;

  if (!youtubeApiKey || !channelId) {
    return Response.json(
      { error: "YOUTUBE_API_KEY and YOUTUBE_CHANNEL_ID must be configured" },
      { status: 503 },
    );
  }

  const supabase = createAdminClient();

  // Get the first user (single-tenant MVP)
  const { data: users } = await supabase.auth.admin.listUsers({ perPage: 1 });
  const userId = users?.users?.[0]?.id;

  if (!userId) {
    return Response.json({ error: "No users found" }, { status: 500 });
  }

  // --- Step 1: Poll new uploads ---
  const uploadsPlaylistId = channelId.replace(/^UC/, "UU");

  const ytUrl = new URL(
    "https://www.googleapis.com/youtube/v3/playlistItems",
  );
  ytUrl.searchParams.set("part", "snippet");
  ytUrl.searchParams.set("playlistId", uploadsPlaylistId);
  ytUrl.searchParams.set("maxResults", "5");
  ytUrl.searchParams.set("key", youtubeApiKey);

  const ytRes = await fetch(ytUrl.toString());

  if (!ytRes.ok) {
    const body = await ytRes.text();
    return Response.json(
      { error: "YouTube API error", detail: body },
      { status: 502 },
    );
  }

  const ytData: YouTubePlaylistResponse = await ytRes.json();
  const items = ytData.items ?? [];

  let polled = 0;
  let skipped = 0;

  for (const item of items) {
    const videoId = item.snippet.resourceId.videoId;

    // Check if video already exists (idempotency)
    const { data: existing } = await supabase
      .from("youtube_videos")
      .select("id")
      .eq("video_id", videoId)
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    // Create content record
    const { data: content, error: contentError } = await supabase
      .from("content")
      .insert({
        user_id: userId,
        title: item.snippet.title,
        content_type: "video",
        stage: "record",
        source: "youtube",
        auto_publish: true,
        tags: [],
      })
      .select("id")
      .single();

    if (contentError) {
      console.error("Failed to create content:", contentError.message);
      continue;
    }

    // Create youtube_videos record
    const { error: videoError } = await supabase
      .from("youtube_videos")
      .insert({
        content_id: content.id,
        video_id: videoId,
        title: item.snippet.title,
        description: item.snippet.description || null,
        published_at: item.snippet.publishedAt,
      });

    if (videoError) {
      if (videoError.code === "23505") {
        await supabase.from("content").delete().eq("id", content.id);
        skipped++;
        continue;
      }
      console.error("Failed to create youtube_video:", videoError.message);
      continue;
    }

    polled++;
  }

  // --- Step 2: Fetch transcripts for videos that don't have one yet ---
  const { data: pendingTranscripts } = await supabase
    .from("youtube_videos")
    .select("id, video_id, content_id")
    .is("transcript", null)
    .limit(3);

  let transcribed = 0;

  for (const video of pendingTranscripts ?? []) {
    const transcript = await fetchTranscript(video.video_id);

    // Store transcript (empty string marks "attempted, no captions available")
    await supabase
      .from("youtube_videos")
      .update({ transcript: transcript ?? "" })
      .eq("id", video.id);

    // If we got a real transcript, update content stage
    if (transcript && video.content_id) {
      await supabase
        .from("content")
        .update({ brief: truncate(transcript, 2000), stage: "review" })
        .eq("id", video.content_id);
    }

    transcribed++;
  }

  // --- Step 3: Generate SEO blog draft from transcript ---
  let blogGenerated = 0;

  if (process.env.ANTHROPIC_API_KEY) {
    // Find one content item with a transcript but no blog yet
    const { data: pendingBlogs } = await supabase
      .from("youtube_videos")
      .select("content_id, transcript")
      .neq("transcript", "")
      .not("transcript", "is", null)
      .not("content_id", "is", null)
      .limit(10);

    // Filter to ones where content.blog_body is null
    let target: { content_id: string; transcript: string } | null = null;

    for (const row of pendingBlogs ?? []) {
      const { data: content } = await supabase
        .from("content")
        .select("id, title, blog_body")
        .eq("id", row.content_id)
        .is("blog_body", null)
        .maybeSingle();

      if (content) {
        target = {
          content_id: content.id,
          transcript: row.transcript,
        };
        break;
      }
    }

    if (target) {
      const { data: contentRow } = await supabase
        .from("content")
        .select("title, tags")
        .eq("id", target.content_id)
        .single();

      if (contentRow) {
        const result = await generateBlog(
          contentRow.title,
          target.transcript,
          contentRow.tags?.[0] ?? "",
        );

        if (result) {
          await supabase
            .from("content")
            .update({
              blog_body: result.blogBody,
              seo_title: result.seoTitle,
              seo_description: result.seoDescription,
              target_keywords: result.targetKeywords,
              stage: "publish",
            })
            .eq("id", target.content_id);

          await supabase.from("ai_generation_logs").insert({
            content_id: target.content_id,
            user_id: userId,
            operation: "generate_blog",
            model: result.model,
            input_tokens: result.inputTokens,
            output_tokens: result.outputTokens,
            accepted: true,
          });

          blogGenerated = 1;
        }
      }
    }
  }

  return Response.json({
    polled,
    skipped,
    total: items.length,
    transcribed,
    blogGenerated,
  });
}

/**
 * Fetch transcript for a YouTube video using the InnerTube player API.
 * Uses the Android client which returns caption URLs that work server-side.
 * Prefers manual captions over auto-generated (ASR).
 * Returns plain text or null if no captions are available.
 */
async function fetchTranscript(videoId: string): Promise<string | null> {
  try {
    // Get caption track URLs via InnerTube player API (Android client)
    const playerRes = await fetch(
      "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          context: {
            client: {
              clientName: "ANDROID",
              clientVersion: "19.02.39",
              hl: "en",
              gl: "US",
              androidSdkVersion: 34,
            },
          },
        }),
      },
    );

    if (!playerRes.ok) {
      console.error(`InnerTube player failed for ${videoId}:`, playerRes.status);
      return null;
    }

    const playerData: InnerTubePlayerResponse = await playerRes.json();
    const tracks =
      playerData.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!tracks || tracks.length === 0) return null;

    // Prefer: English manual → English ASR → any manual → first available
    const enManual = tracks.find(
      (t) => t.languageCode === "en" && t.kind !== "asr",
    );
    const enAsr = tracks.find(
      (t) => t.languageCode === "en" && t.kind === "asr",
    );
    const anyManual = tracks.find((t) => t.kind !== "asr");
    const chosen = enManual ?? enAsr ?? anyManual ?? tracks[0];

    // Fetch caption XML
    const captionRes = await fetch(chosen.baseUrl);
    if (!captionRes.ok) {
      console.error(`Caption download failed for ${videoId}:`, captionRes.status);
      return null;
    }

    const xml = await captionRes.text();
    if (!xml || xml.length < 10) return null;

    return parseTimedText(xml);
  } catch (err) {
    console.error(
      `Transcript fetch error for ${videoId}:`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

interface BlogResult {
  blogBody: string;
  seoTitle: string;
  seoDescription: string;
  targetKeywords: string[];
  model: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Generate an SEO-optimized blog post from a video transcript using Claude.
 * Returns structured blog content or null on failure.
 */
async function generateBlog(
  videoTitle: string,
  transcript: string,
  niche: string,
): Promise<BlogResult | null> {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const model = "claude-sonnet-4-5-20250929";

    const systemPrompt = `You are an expert SEO content writer. You repurpose video transcripts into high-quality blog posts optimized for search engines. Your output is structured, scannable, and valuable to readers who prefer reading over watching. Always output valid markdown.`;

    const userPrompt = [
      `Repurpose this video transcript into an SEO-optimized blog post.`,
      ``,
      `Video title: ${videoTitle}`,
      niche ? `Topic/Niche: ${niche}` : "",
      ``,
      `Transcript:`,
      `---`,
      truncate(transcript, 12000),
      `---`,
      ``,
      `Generate the following as a single markdown document:`,
      ``,
      `1. Start with an SEO title on the first line as a markdown H1 (max 70 characters)`,
      `2. On the next line, write a meta description in italics (max 160 characters)`,
      `3. On the next line, write keywords as a comma-separated list in bold (5-10 keywords)`,
      `4. Then write the blog post with:`,
      `   - A short TL;DR summary (2-3 sentences) right after the intro`,
      `   - Clear H2/H3 headings for scannable structure`,
      `   - Short paragraphs (2-3 sentences max)`,
      `   - Concrete examples and actionable advice from the transcript`,
      `   - A "Key Takeaways" section near the bottom with 4-6 bullet points`,
      `   - A brief conclusion`,
      ``,
      `Do NOT include "transcript", "video", or "watch" references — write as a standalone blog post.`,
    ]
      .filter(Boolean)
      .join("\n");

    const response = await anthropic.messages.create({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    if (!text) return null;

    // Parse structured output from the markdown
    const lines = text.split("\n");

    // Extract SEO title from first H1
    const titleLine = lines.find((l) => l.startsWith("# "));
    const seoTitle = titleLine
      ? titleLine.replace(/^#\s+/, "").substring(0, 70)
      : videoTitle.substring(0, 70);

    // Extract meta description from italics line
    const descLine = lines.find((l) => /^\*[^*]/.test(l) || /^_[^_]/.test(l));
    const seoDescription = descLine
      ? descLine.replace(/^[*_]+|[*_]+$/g, "").substring(0, 160)
      : "";

    // Extract keywords from bold line
    const kwLine = lines.find(
      (l) => l.startsWith("**") && l.includes(","),
    );
    const targetKeywords = kwLine
      ? kwLine
          .replace(/^\*\*|\*\*$/g, "")
          .replace(/^keywords:\s*/i, "")
          .split(",")
          .map((k) => k.trim().toLowerCase())
          .filter(Boolean)
          .slice(0, 10)
      : [];

    return {
      blogBody: text,
      seoTitle,
      seoDescription,
      targetKeywords,
      model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  } catch (err) {
    console.error(
      "Blog generation failed:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

/** Parse YouTube XML caption format into plain text. */
function parseTimedText(xml: string): string {
  return xml
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Truncate string to maxLen, breaking at last space. */
function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const cut = text.lastIndexOf(" ", maxLen);
  return text.substring(0, cut > 0 ? cut : maxLen) + "…";
}
