import {
  ModalView,
  SectionBlock,
  DividerBlock,
  HeaderBlock,
  ContextBlock,
  ActionsBlock,
} from "slack-cloudflare-workers";

// Custom input block interface since InputBlock is not exported
interface InputBlock {
  type: "input";
  block_id?: string;
  element: any;
  label: { type: "plain_text"; text: string };
  optional?: boolean;
}

// Feedback metadata interfaces
export interface FeedbackMetadata {
  channel_id: string;
  user_id: string;
  selected_user?: string;
  step: number;
  performance?: {
    rating: string;
    comments: string;
  };
  collaboration?: {
    rating: string;
    comments: string;
  };
  skills?: {
    rating: string;
    growth_areas: string;
  };
  overall?: {
    strengths: string;
    improvements: string;
    additional: string;
  };
}

// Specific block types for feedback forms
export type FeedbackModalBlock = SectionBlock | DividerBlock | InputBlock | ActionsBlock | ContextBlock;
export type FeedbackMessageBlock = HeaderBlock | SectionBlock | DividerBlock | ContextBlock;

// Helper types for blocks
export interface FeedbackSummaryResponse {
  text: string;
  blocks: FeedbackMessageBlock[];
}

// Type for rating options
export interface RatingOption {
  text: { type: "plain_text"; text: string };
  value: string;
}

// Type for modal view with specific blocks
export interface FeedbackModalView extends ModalView {
  blocks: FeedbackModalBlock[];
}

// Rating options
export const PERFORMANCE_RATINGS: RatingOption[] = [
  { text: { type: "plain_text", text: "Exceeds Expectations" }, value: "5" },
  { text: { type: "plain_text", text: "Above Average" }, value: "4" },
  { text: { type: "plain_text", text: "Meets Expectations" }, value: "3" },
  { text: { type: "plain_text", text: "Below Average" }, value: "2" },
  { text: { type: "plain_text", text: "Needs Improvement" }, value: "1" }
];

export const COLLABORATION_RATINGS: RatingOption[] = [
  { text: { type: "plain_text", text: "Excellent Team Player" }, value: "5" },
  { text: { type: "plain_text", text: "Very Collaborative" }, value: "4" },
  { text: { type: "plain_text", text: "Good Collaboration" }, value: "3" },
  { text: { type: "plain_text", text: "Some Collaboration Issues" }, value: "2" },
  { text: { type: "plain_text", text: "Needs Better Teamwork" }, value: "1" }
];

export const SKILLS_RATINGS: RatingOption[] = [
  { text: { type: "plain_text", text: "Exceptional Skills" }, value: "5" },
  { text: { type: "plain_text", text: "Strong Skills" }, value: "4" },
  { text: { type: "plain_text", text: "Adequate Skills" }, value: "3" },
  { text: { type: "plain_text", text: "Developing Skills" }, value: "2" },
  { text: { type: "plain_text", text: "Skills Need Work" }, value: "1" }
];

export const RATING_LABELS: Record<string, string> = {
  "5": "⭐⭐⭐⭐⭐",
  "4": "⭐⭐⭐⭐",
  "3": "⭐⭐⭐",
  "2": "⭐⭐",
  "1": "⭐"
};

export const RATING_LABELS_DETAILED: Record<string, string> = {
  "5": "⭐⭐⭐⭐⭐ Exceptional",
  "4": "⭐⭐⭐⭐ Above Average",
  "3": "⭐⭐⭐ Meets Expectations",
  "2": "⭐⭐ Below Average",
  "1": "⭐ Needs Improvement"
};