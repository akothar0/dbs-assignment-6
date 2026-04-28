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

export type ApplicationStatus =
  | "target"
  | "applied"
  | "interviewing"
  | "offer"
  | "rejected"
  | "closed";

export type PrepItemType =
  | "company_research"
  | "coffee_chat_prep"
  | "interview_prep"
  | "behavioral_story"
  | "talking_point"
  | "thank_you_follow_up"
  | "prep_brief"
  | "raw_capture";

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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [
          {
            foreignKeyName: "interactions_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: "tasks_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: "message_drafts_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: "ai_suggestions_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_suggestions_draft_id_fkey";
            columns: ["draft_id"];
            isOneToOne: false;
            referencedRelation: "message_drafts";
            referencedColumns: ["id"];
          },
        ];
      };
      applications: {
        Row: {
          id: string;
          user_id: string;
          contact_id: string | null;
          company: string;
          role: string;
          source: string | null;
          status: ApplicationStatus;
          deadline: string | null;
          next_step: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          contact_id?: string | null;
          company: string;
          role: string;
          source?: string | null;
          status?: ApplicationStatus;
          deadline?: string | null;
          next_step?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["applications"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "applications_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
      };
      prep_items: {
        Row: {
          id: string;
          user_id: string;
          contact_id: string | null;
          application_id: string | null;
          type: PrepItemType;
          title: string;
          body: string | null;
          due_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          contact_id?: string | null;
          application_id?: string | null;
          type: PrepItemType;
          title: string;
          body?: string | null;
          due_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["prep_items"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "prep_items_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "prep_items_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      pipeline_stage: PipelineStage;
      interaction_type: InteractionType;
      task_status: TaskStatus;
      task_source: TaskSource;
      draft_goal: DraftGoal;
      ai_suggestion_status: AiSuggestionStatus;
      application_status: ApplicationStatus;
      prep_item_type: PrepItemType;
    };
    CompositeTypes: Record<string, never>;
  };
};
