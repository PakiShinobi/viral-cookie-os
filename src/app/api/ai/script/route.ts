import { createAdminClient } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: Request) {
  const body = await req.json();
  const { contentId } = body;

  if (!contentId) {
    return Response.json({ error: "Missing contentId" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 503 },
    );
  }

  const supabase = createAdminClient();

  const { data: content } = await supabase
    .from("content")
    .select(
      `
      id,
      title,
      brief,
      content_type,
      script_style_id,
      target_duration_minutes,
      blueprint_id,
      script_styles (
        id,
        name,
        system_prompt,
        temperature
      )
    `,
    )
    .eq("id", contentId)
    .single();

  if (!content) {
    return Response.json({ error: "Content not found" }, { status: 404 });
  }

  // ---------------------------
  // Resolve Blueprint
  // ---------------------------

  let blueprintConfig: Record<string, unknown> | null = null;

  if (content.blueprint_id) {
    const { data: blueprint } = await supabase
      .from("script_blueprints")
      .select("section_config")
      .eq("id", content.blueprint_id)
      .single();

    blueprintConfig = blueprint?.section_config ?? null;
  } else if (content.target_duration_minutes) {
    const { data: blueprint } = await supabase
      .from("script_blueprints")
      .select("section_config")
      .lte("min_minutes", content.target_duration_minutes)
      .gte("max_minutes", content.target_duration_minutes)
      .maybeSingle();

    blueprintConfig = blueprint?.section_config ?? null;
  }

  // Fallback blueprint
  if (!blueprintConfig) {
    blueprintConfig = {
      sections: [
        { key: "hook", weight: 0.15 },
        { key: "setup", weight: 0.15 },
        { key: "core", weight: 0.4 },
        { key: "payoff", weight: 0.2 },
        { key: "cta", weight: 0.1 },
      ],
    };
  }

  const styleData = Array.isArray(content.script_styles)
    ? content.script_styles[0]
    : content.script_styles;

  const stylePrompt =
    styleData?.system_prompt ??
    "Write in a clear, engaging, high-retention style.";

  const temperature = styleData?.temperature ?? 0.7;

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const systemPrompt = `
You are a high-level YouTube script strategist.

You optimize for:
- Retention
- Curiosity gaps
- Open loops
- Escalation
- Strategic re-hooks
- Emotional pacing
- Strong CTAs

You will receive:
1. A structural blueprint (JSON)
2. A style layer
3. Creator context

You must:
- Follow the blueprint proportionally.
- Allocate depth based on section weights.
- Scale output based on target duration.
- Never artificially compress the script.
- Maintain narrative integrity.
`;

  const userPrompt = `
STYLE:
${stylePrompt}

STRUCTURAL BLUEPRINT:
${JSON.stringify(blueprintConfig, null, 2)}

TARGET DURATION (minutes):
${content.target_duration_minutes ?? "Not specified"}

CONTENT TYPE:
${content.content_type}

TITLE:
${content.title}

CREATOR NOTES:
${content.brief ?? "None provided"}

INSTRUCTIONS:
Generate a fully structured script following the blueprint.
Ensure seamless transitions between sections.
Use escalating tension.
Re-hook strategically.
Scale proportionally to target duration.
`;

  // Stream the response as SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      function send(data: string) {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      }

      try {
        const response = anthropic.messages.stream({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 4096,
          temperature,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        });

        response.on("text", (text) => {
          send(JSON.stringify({ type: "text", text }));
        });

        const finalMessage = await response.finalMessage();

        send(
          JSON.stringify({
            type: "done",
            usage: {
              model: finalMessage.model,
              input_tokens: finalMessage.usage.input_tokens,
              output_tokens: finalMessage.usage.output_tokens,
            },
          }),
        );

        send("[DONE]");
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        send(JSON.stringify({ type: "error", error: message }));
        send("[DONE]");
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
