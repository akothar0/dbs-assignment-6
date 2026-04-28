export type PipelineStage =
  | "cold"
  | "reached_out"
  | "replied"
  | "coffee_chat"
  | "referred_applied"
  | "closed";

export type InteractionType =
  | "email"
  | "linkedin"
  | "coffee_chat"
  | "call"
  | "note"
  | "application"
  | "referral";

export type TaskStatus = "open" | "completed" | "dismissed";
export type TaskSource = "manual" | "rule" | "ai";

export type DraftGoal =
  | "cold_intro"
  | "follow_up"
  | "thank_you"
  | "referral_ask"
  | "reconnect";

export type AiSuggestionStatus = "pending" | "accepted" | "dismissed";

type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          full_name: string | null;
          background_summary: string | null;
          resume_text: string | null;
          target_roles: string[];
          target_companies: string[];
          writing_preferences: string | null;
          recruiting_deadline: string | null;
          onboarding_completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name?: string | null;
          background_summary?: string | null;
          resume_text?: string | null;
          target_roles?: string[];
          target_companies?: string[];
          writing_preferences?: string | null;
          recruiting_deadline?: string | null;
          onboarding_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_profiles"]["Insert"]>;
      };
      contacts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          company: string | null;
          role: string | null;
          level: string | null;
          relationship: string | null;
          linkedin_url: string | null;
          email: string | null;
          stage: PipelineStage;
          priority: number;
          notes: string | null;
          last_interaction_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          company?: string | null;
          role?: string | null;
          level?: string | null;
          relationship?: string | null;
          linkedin_url?: string | null;
          email?: string | null;
          stage?: PipelineStage;
          priority?: number;
          notes?: string | null;
          last_interaction_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["contacts"]["Insert"]>;
      };
      interactions: {
        Row: {
          id: string;
          user_id: string;
          contact_id: string;
          type: InteractionType;
          occurred_at: string;
          summary: string;
          raw_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          contact_id: string;
          type: InteractionType;
          occurred_at?: string;
          summary: string;
          raw_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["interactions"]["Insert"]>;
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          contact_id: string | null;
          title: string;
          description: string | null;
          due_at: string | null;
          status: TaskStatus;
          source: TaskSource;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          contact_id?: string | null;
          title: string;
          description?: string | null;
          due_at?: string | null;
          status?: TaskStatus;
          source?: TaskSource;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Insert"]>;
      };
      message_drafts: {
        Row: {
          id: string;
          user_id: string;
          contact_id: string;
          goal: DraftGoal;
          subject: string | null;
          body: string;
          confidence: number | null;
          personalization_signals: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          contact_id: string;
          goal: DraftGoal;
          subject?: string | null;
          body: string;
          confidence?: number | null;
          personalization_signals?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["message_drafts"]["Insert"]>;
      };
      ai_suggestions: {
        Row: {
          id: string;
          user_id: string;
          contact_id: string | null;
          draft_id: string | null;
          suggested_task: Json | null;
          suggested_stage: PipelineStage | null;
          reasoning: string | null;
          status: AiSuggestionStatus;
          accepted_at: string | null;
          dismissed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          contact_id?: string | null;
          draft_id?: string | null;
          suggested_task?: Json | null;
          suggested_stage?: PipelineStage | null;
          reasoning?: string | null;
          status?: AiSuggestionStatus;
          accepted_at?: string | null;
          dismissed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_suggestions"]["Insert"]>;
      };
    };
  };
};
