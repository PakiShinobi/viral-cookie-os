"use client";

import { useState } from "react";
import { updateContentTitle } from "@/app/actions/wizard";

interface Props {
  contentId: string;
  initialTitle: string;
  onNext: () => void;
}

export default function TitleStep({ contentId, initialTitle, onNext }: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!title.trim()) return;
    setLoading(true);
    await updateContentTitle(contentId, title.trim());
    setLoading(false);
    onNext();
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-foreground">
          Video Title
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm text-foreground placeholder:text-muted outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          placeholder="Enter your video title"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={loading}
        className="rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save & Continue"}
      </button>
    </div>
  );
}
