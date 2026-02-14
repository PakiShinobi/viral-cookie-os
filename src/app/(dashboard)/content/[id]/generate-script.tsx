"use client";

import { updateContentScript } from "@/app/actions/content";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function GenerateScript({
  contentId,
  hasExisting = false,
}: {
  contentId: string;
  hasExisting?: boolean;
}) {
  const [generating, setGenerating] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleGenerate() {
    setGenerating(true);
    setStreamedText("");
    setError("");

    try {
      const res = await fetch("/api/ai/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Generation failed");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let fullText = "";
      let metadata: { model: string; input_tokens: number; output_tokens: number } | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "text") {
                fullText += parsed.text;
                setStreamedText(fullText);
              } else if (parsed.type === "done") {
                metadata = parsed.usage;
              } else if (parsed.type === "error") {
                throw new Error(parsed.error || "Generation failed");
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }
      }

      if (fullText && metadata) {
        await updateContentScript(contentId, fullText, metadata);
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  if (generating) {
    return (
      <div>
        <div className="mb-3 flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-accent" />
          <span className="text-sm text-muted">Generating script...</span>
        </div>
        {streamedText && (
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {streamedText}
            <span className="inline-block h-4 w-0.5 animate-pulse bg-accent" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {error && <p className="mb-3 text-sm text-error">{error}</p>}
      <button
        onClick={handleGenerate}
        className={
          hasExisting
            ? "text-sm text-muted transition-colors hover:text-accent"
            : "rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        }
      >
        {hasExisting ? "Regenerate script" : "Generate Script"}
      </button>
      {!hasExisting && (
        <p className="mt-2 text-xs text-muted">
          AI will generate a script based on your title and notes
        </p>
      )}
    </div>
  );
}
