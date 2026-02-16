"use client";

import { useState } from "react";
import { updateContentTitle } from "@/app/actions/wizard";

interface Props {
  contentId: string;
  initialTitle: string;
  onNext: () => void;
}

export default function TitleStep({
  contentId,
  initialTitle,
  onNext,
}: Props) {
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
    <div className="space-y-6">
      <div>
        <label className="block text-sm text-slate-400 mb-2">
          Video Title
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded px-4 py-3 text-white focus:outline-none focus:border-blue-500"
          placeholder="Enter your video title"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded"
      >
        {loading ? "Saving..." : "Save & Continue"}
      </button>
    </div>
  );
}
