import { createServerClient } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";
import type { Content } from "@/lib/types";

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not configured. Add it to your environment variables." },
      { status: 503 },
    );
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { contentId } = await request.json();
  if (!contentId) {
    return Response.json({ error: "contentId is required" }, { status: 400 });
  }

  const { data: content } = await supabase
    .from("content")
    .select("*")
    .eq("id", contentId)
    .single<Content>();

  if (!content) {
    return Response.json({ error: "Content not found" }, { status: 404 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const niche = content.tags.length > 0 ? content.tags[0] : "";
  const contentType = content.content_type.replace("_", " ");

  const systemPrompt = `You are an expert retention-optimized content scriptwriter. You write scripts engineered for maximum viewer retention using proven psychological patterns. Your output is always a ready-to-read script — no meta-commentary, no explanations, just the script itself. Write in a conversational, high-energy tone.`;

  const userPrompt = [
    `Write a retention-optimized ${contentType} script.`,
    ``,
    `Title: ${content.title}`,
    niche ? `Niche/Topic: ${niche}` : "",
    content.brief ? `Creator's notes: ${content.brief}` : "",
    ``,
    `Structure the script using these exact sections:`,
    ``,
    `**HOOK** (first 3 seconds)`,
    `A pattern-interrupting opening line that stops the scroll. Use a bold claim, surprising fact, or direct challenge. No greetings, no intros.`,
    ``,
    `**CURIOSITY LOOP**`,
    `Immediately after the hook, plant an open loop — tease what's coming without revealing it. Make the viewer need to keep watching.`,
    ``,
    `**CORE VALUE**`,
    `Deliver the main content. Be specific, use concrete examples. Each point should flow naturally into the next. Keep paragraphs short and punchy.`,
    ``,
    `**PATTERN INTERRUPT**`,
    `Mid-script, shift energy — change tone, pose a question, introduce a counterpoint, or use a brief story. This re-engages attention.`,
    ``,
    `**PAYOFF**`,
    `Deliver on the promise from the hook and curiosity loop. Make the viewer feel rewarded for staying.`,
    ``,
    `**CTA**`,
    `End with a single, clear call to action. Make it feel natural, not salesy.`,
  ]
    .filter(Boolean)
    .join("\n");

  const model = "claude-sonnet-4-5-20250929";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await anthropic.messages.create({
          model,
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
          stream: true,
        });

        let inputTokens = 0;
        let outputTokens = 0;

        for await (const event of response) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const data = JSON.stringify({
              type: "text",
              text: event.delta.text,
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }

          if (event.type === "message_delta" && event.usage) {
            outputTokens = event.usage.output_tokens;
          }

          if (event.type === "message_start" && event.message.usage) {
            inputTokens = event.message.usage.input_tokens;
          }
        }

        const doneData = JSON.stringify({
          type: "done",
          usage: {
            model,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
          },
        });
        controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      } catch (err) {
        const errorData = JSON.stringify({
          type: "error",
          error: err instanceof Error ? err.message : "Generation failed",
        });
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
