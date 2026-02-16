export type ContentType =
  | "video"
  | "podcast"
  | "blog_post"
  | "short_form"
  | "newsletter";

export type Stage =
  | "idea"
  | "brief"
  | "script"
  | "record"
  | "edit"
  | "review"
  | "publish"
  | "distribute"
  | "archived";

export type AiOperation =
  | "expand_idea"
  | "generate_script"
  | "generate_blog"
  | "refine";

export interface Content {
  id: string;
  user_id: string;
  title: string;
  content_type: ContentType;
  stage: Stage;
  brief: string | null;
  script: string | null;
  blog_body: string | null;
  seo_title: string | null;
  seo_description: string | null;
  target_keywords: string[] | null;
  tags: string[];
  due_date: string | null;
  auto_publish: boolean;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface YouTubeVideo {
  id: string;
  content_id: string | null;
  video_id: string;
  title: string;
  description: string | null;
  published_at: string | null;
  transcript: string | null;
  created_at: string;
}

export interface PublishingRecord {
  id: string;
  content_id: string;
  platform: string;
  external_id: string | null;
  external_url: string | null;
  status: "pending" | "published" | "failed";
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  youtube_channel_id: string | null;
  youtube_channel_url: string | null;
  niche: string;
  channel_goal: string;
  ctas: string[];
  tone: string;
  audience: string;
  created_at: string;
  updated_at: string;
}

export interface CronRun {
  id: string;
  route: string;
  status: "running" | "success" | "failed";
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  summary: Record<string, number>;
  error: string | null;
  created_at: string;
}

export interface AiGenerationLog {
  id: string;
  content_id: string | null;
  user_id: string;
  operation: AiOperation;
  model: string;
  input_tokens: number;
  output_tokens: number;
  accepted: boolean | null;
  created_at: string;
}

export type VideoStyle =
  | "documentary"
  | "how_to"
  | "news"
  | "opinion"
  | "breakdown"
  | "story"
  | "educational";

export type TitleIdeaStatus = "draft" | "recorded" | "published" | "deleted";

export type CalendarSlotStatus = "planned" | "in_progress" | "done" | "skipped";

export interface TitleIdea {
  id: string;
  user_id: string;
  title: string;
  video_style: VideoStyle;
  target_duration_minutes: number | null;
  status: TitleIdeaStatus;
  content_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarSlot {
  id: string;
  user_id: string;
  slot_date: string;
  title_idea_id: string | null;
  content_id: string | null;
  status: CalendarSlotStatus;
  created_at: string;
  updated_at: string;
  title_idea?: TitleIdea;
}
/* ===============================
   Phase 6A – Guided Wizard Types
================================ */

export type WizardStep =
  | "title"
  | "thumbnail"
  | "script"
  | "review"
  | "complete";

export type WizardStatus =
  | "in_progress"
  | "complete"
  | "abandoned";

export interface WizardSession {
  id: string;
  user_id: string;
  content_id: string;
  current_step: WizardStep;
  status: WizardStatus;
  created_at: string;
  updated_at: string;
}
