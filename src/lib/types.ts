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
