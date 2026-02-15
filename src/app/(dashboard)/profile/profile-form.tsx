"use client";

import { upsertProfile } from "@/app/actions/profile";
import type { Profile } from "@/lib/types";
import { useState } from "react";

const NICHE_OPTIONS = [
  "Business & Finance",
  "Tech & Software",
  "Health & Fitness",
  "Education",
  "Entertainment",
  "Gaming",
  "Lifestyle & Vlogs",
  "Marketing",
  "Personal Development",
  "Science",
];

const TONE_OPTIONS = [
  "Direct",
  "Storytelling",
  "Educational",
  "Conversational",
  "Motivational",
  "Humorous",
  "Professional",
];

const inputClass =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent";

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const [ctas, setCtas] = useState<string[]>(
    profile?.ctas?.length ? profile.ctas : [""],
  );
  const [nicheCustom, setNicheCustom] = useState(
    profile?.niche && !NICHE_OPTIONS.includes(profile.niche)
      ? profile.niche
      : "",
  );
  const [nicheSelect, setNicheSelect] = useState(
    profile?.niche && NICHE_OPTIONS.includes(profile.niche)
      ? profile.niche
      : profile?.niche
        ? "other"
        : "",
  );
  const [toneSelect, setToneSelect] = useState(profile?.tone ?? "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function addCta() {
    setCtas([...ctas, ""]);
  }

  function removeCta(index: number) {
    setCtas(ctas.filter((_, i) => i !== index));
  }

  function updateCta(index: number, value: string) {
    const updated = [...ctas];
    updated[index] = value;
    setCtas(updated);
  }

  async function handleSubmit(formData: FormData) {
    setError("");
    setSubmitting(true);

    // Inject resolved niche
    const resolvedNiche =
      nicheSelect === "other" ? nicheCustom : nicheSelect;
    formData.set("niche", resolvedNiche);

    // Inject tone
    formData.set("tone", toneSelect);

    // Inject CTAs
    ctas.forEach((cta, i) => {
      formData.set(`cta_${i}`, cta);
    });

    try {
      await upsertProfile(formData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* YouTube Channel URL */}
      <div>
        <label className="mb-1 block text-sm font-medium">
          YouTube Channel URL
          <span className="ml-1 text-xs text-muted">(optional)</span>
        </label>
        <input
          name="youtube_channel_url"
          type="url"
          defaultValue={profile?.youtube_channel_url ?? ""}
          placeholder="https://youtube.com/@yourchannel"
          className={inputClass}
        />
      </div>

      {/* YouTube Channel ID */}
      <div>
        <label className="mb-1 block text-sm font-medium">
          YouTube Channel ID
          <span className="ml-1 text-xs text-muted">(optional)</span>
        </label>
        <input
          name="youtube_channel_id"
          defaultValue={profile?.youtube_channel_id ?? ""}
          placeholder="UCxxxxxxxxxx"
          className={inputClass}
        />
      </div>

      {/* Niche */}
      <div>
        <label className="mb-1 block text-sm font-medium">
          Niche <span className="text-red-500">*</span>
        </label>
        <select
          value={nicheSelect}
          onChange={(e) => setNicheSelect(e.target.value)}
          className={inputClass}
        >
          <option value="" disabled>
            Select a niche...
          </option>
          {NICHE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
          <option value="other">Other</option>
        </select>
        {nicheSelect === "other" && (
          <input
            value={nicheCustom}
            onChange={(e) => setNicheCustom(e.target.value)}
            placeholder="Enter your niche"
            className={`${inputClass} mt-2`}
          />
        )}
      </div>

      {/* Channel Goal */}
      <div>
        <label className="mb-1 block text-sm font-medium">
          Channel Goal <span className="text-red-500">*</span>
        </label>
        <textarea
          name="channel_goal"
          defaultValue={profile?.channel_goal ?? ""}
          placeholder="What are you trying to achieve with your channel?"
          rows={3}
          className={inputClass}
        />
      </div>

      {/* CTAs */}
      <div>
        <label className="mb-1 block text-sm font-medium">
          Repeatable CTAs
          <span className="ml-1 text-xs text-muted">(optional)</span>
        </label>
        <div className="space-y-2">
          {ctas.map((cta, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={cta}
                onChange={(e) => updateCta(i, e.target.value)}
                placeholder="e.g. Subscribe for more"
                className={`${inputClass} flex-1`}
              />
              {ctas.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeCta(i)}
                  className="text-sm text-muted hover:text-red-500"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addCta}
          className="mt-2 text-sm text-accent hover:text-accent-hover"
        >
          + Add CTA
        </button>
      </div>

      {/* Tone */}
      <div>
        <label className="mb-1 block text-sm font-medium">
          Tone
          <span className="ml-1 text-xs text-muted">(optional)</span>
        </label>
        <select
          value={toneSelect}
          onChange={(e) => setToneSelect(e.target.value)}
          className={inputClass}
        >
          <option value="">Select tone...</option>
          {TONE_OPTIONS.map((t) => (
            <option key={t} value={t.toLowerCase()}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Audience */}
      <div>
        <label className="mb-1 block text-sm font-medium">
          Target Audience
          <span className="ml-1 text-xs text-muted">(optional)</span>
        </label>
        <textarea
          name="audience"
          defaultValue={profile?.audience ?? ""}
          placeholder="Describe your target audience"
          rows={2}
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {submitting ? "Saving..." : profile ? "Update Profile" : "Complete Setup"}
      </button>
    </form>
  );
}
