export type PipelineStage =
  | "cold"
  | "reached_out"
  | "replied"
  | "coffee_chat"
  | "referred_applied"
  | "closed";

export type InteractionType =
  | "coffee_chat"
  | "call"
  | "note"
  | "referral";

export type DraftGoal =
  | "cold_intro"
  | "follow_up"
  | "thank_you"
  | "referral_ask"
  | "reconnect";

export type MessageDirection = "outbound" | "inbound";
export type MessageStatus = "draft" | "sent" | "received";
export type MeetingType = "coffee_chat" | "call" | "interview" | "other";
export type MeetingStatus = "scheduled" | "completed" | "canceled";
export type OutreachChatRole = "user" | "assistant";

type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

type Table<Row, Insert = Row> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: Array<never>;
};

export type Database = {
  public: {
    Tables: {
      user_profiles: Table<{
        id: string;
        user_id: string;
        full_name: string | null;
        background_summary: string | null;
        resume_text: string | null;
        current_situation: string | null;
        voice_samples: string[];
        onboarding_completed_at: string | null;
        created_at: string;
        updated_at: string;
      }, {
        id?: string;
        user_id: string;
        full_name?: string | null;
        background_summary?: string | null;
        resume_text?: string | null;
        current_situation?: string | null;
        voice_samples?: string[];
        onboarding_completed_at?: string | null;
        created_at?: string;
        updated_at?: string;
      }>;
      companies: Table<{
        id: string;
        user_id: string;
        name: string;
        notes: string | null;
        research_cache: Json;
        is_target: boolean;
        target_roles: string[];
        last_researched_at: string | null;
        created_at: string;
        updated_at: string;
      }, {
        id?: string;
        user_id: string;
        name: string;
        notes?: string | null;
        research_cache?: Json;
        is_target?: boolean;
        target_roles?: string[];
        last_researched_at?: string | null;
        created_at?: string;
        updated_at?: string;
      }>;
      contacts: Table<{
        id: string;
        user_id: string;
        name: string;
        company_id: string | null;
        role: string | null;
        level: string | null;
        relationship: string | null;
        linkedin_url: string | null;
        email: string | null;
        stage: PipelineStage;
        priority: number;
        notes: string | null;
        last_interaction_at: string | null;
        avatar_url: string | null;
        created_at: string;
        updated_at: string;
      }, {
        id?: string;
        user_id: string;
        name: string;
        company_id?: string | null;
        role?: string | null;
        level?: string | null;
        relationship?: string | null;
        linkedin_url?: string | null;
        email?: string | null;
        stage?: PipelineStage;
        priority?: number;
        notes?: string | null;
        last_interaction_at?: string | null;
        avatar_url?: string | null;
        created_at?: string;
        updated_at?: string;
      }>;
      interactions: Table<{
        id: string;
        user_id: string;
        contact_id: string;
        type: InteractionType;
        occurred_at: string;
        summary: string;
        raw_notes: string | null;
        created_at: string;
        updated_at: string;
      }, {
        id?: string;
        user_id: string;
        contact_id: string;
        type: InteractionType;
        occurred_at?: string;
        summary: string;
        raw_notes?: string | null;
        created_at?: string;
        updated_at?: string;
      }>;
      messages: Table<{
        id: string;
        user_id: string;
        contact_id: string;
        goal: DraftGoal;
        subject: string | null;
        body: string;
        confidence: number | null;
        personalization_signals: string[];
        direction: MessageDirection;
        status: MessageStatus;
        sent_at: string | null;
        received_at: string | null;
        source: string | null;
        created_at: string;
        updated_at: string;
      }, {
        id?: string;
        user_id: string;
        contact_id: string;
        goal: DraftGoal;
        subject?: string | null;
        body: string;
        confidence?: number | null;
        personalization_signals?: string[];
        direction?: MessageDirection;
        status?: MessageStatus;
        sent_at?: string | null;
        received_at?: string | null;
        source?: string | null;
        created_at?: string;
        updated_at?: string;
      }>;
      outreach_chat_messages: Table<{
        id: string;
        user_id: string;
        contact_id: string;
        role: OutreachChatRole;
        content: string;
        created_at: string;
        updated_at: string;
      }, {
        id?: string;
        user_id: string;
        contact_id: string;
        role: OutreachChatRole;
        content: string;
        created_at?: string;
        updated_at?: string;
      }>;
      meetings: Table<{
        id: string;
        user_id: string;
        contact_id: string;
        company_id: string | null;
        meeting_type: MeetingType;
        scheduled_for: string;
        title: string | null;
        notes: string | null;
        status: MeetingStatus;
        completed_at: string | null;
        created_at: string;
        updated_at: string;
      }, {
        id?: string;
        user_id: string;
        contact_id: string;
        company_id?: string | null;
        meeting_type?: MeetingType;
        scheduled_for: string;
        title?: string | null;
        notes?: string | null;
        status?: MeetingStatus;
        completed_at?: string | null;
        created_at?: string;
        updated_at?: string;
      }>;
      prep_briefs: Table<{
        id: string;
        user_id: string;
        contact_id: string | null;
        company_id: string | null;
        meeting_id: string | null;
        title: string;
        about_them: string;
        company_context: string;
        your_pitch: string;
        questions_to_ask: string[];
        goal_for_call: string;
        follow_up_notes: string;
        generated_at: string | null;
        updated_at: string;
        created_at: string;
      }, {
        id?: string;
        user_id: string;
        contact_id?: string | null;
        company_id?: string | null;
        meeting_id?: string | null;
        title: string;
        about_them?: string;
        company_context?: string;
        your_pitch?: string;
        questions_to_ask?: string[];
        goal_for_call?: string;
        follow_up_notes?: string;
        generated_at?: string | null;
        updated_at?: string;
        created_at?: string;
      }>;
      behavioral_stories: Table<{
        id: string;
        user_id: string;
        title: string;
        situation: string | null;
        task: string | null;
        action: string | null;
        result: string | null;
        tags: string[];
        notes: string | null;
        favorite: boolean;
        created_at: string;
        updated_at: string;
      }, {
        id?: string;
        user_id: string;
        title: string;
        situation?: string | null;
        task?: string | null;
        action?: string | null;
        result?: string | null;
        tags?: string[];
        notes?: string | null;
        favorite?: boolean;
        created_at?: string;
        updated_at?: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      pipeline_stage: PipelineStage;
      interaction_type: InteractionType;
      draft_goal: DraftGoal;
      message_direction: MessageDirection;
      message_status: MessageStatus;
      meeting_type: MeetingType;
      meeting_status: MeetingStatus;
      outreach_chat_role: OutreachChatRole;
    };
    CompositeTypes: Record<string, never>;
  };
};
