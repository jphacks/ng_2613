export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      genres: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          sort_order: number | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      middle_topics: {
        Row: {
          id: string;
          genre_id: string;
          name: string;
          description: string | null;
          sort_order: number | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      topics: {
        Row: {
          id: string;
          middle_topic_id: string;
          name: string;
          description: string | null;
          sort_order: number | null;
          status: "open" | "locked" | "hidden";
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      periods: {
        Row: {
          id: string;
          code: string;
          start_date: string;
          end_date: string;
          status: "active" | "closed";
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      frames: {
        Row: {
          id: string;
          topic_id: string;
          period_id: string;
          type: "question" | "pp" | "other";
          question: string | null;
          sort_order: number | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      votes: {
        Row: {
          id: string;
          frame_id: string;
          user_id: string;
          value: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          frame_id: string;
          user_id: string;
          value: number;
        };
        Update: {
          value?: number;
        };
        Relationships: [];
      };
      threads: {
        Row: {
          id: string;
          frame_id: string;
          type: "user" | "video";
          user_id: string;
          stance: "agree" | "disagree" | null;
          title: string;
          body: string;
          video_id: string | null;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          frame_id: string;
          type: "user";
          user_id: string;
          stance: "agree" | "disagree";
          title: string;
          body: string;
          video_id?: null;
        };
        Update: never;
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          thread_id: string;
          user_id: string;
          stance: "agree" | "disagree" | null;
          body: string;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          thread_id: string;
          user_id: string;
          stance?: "agree" | "disagree" | null;
          body: string;
        };
        Update: never;
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          username: string;
          birth_date: string | null;
          gender: string | null;
          display_mode: string | null;
          role: string;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          username: string;
          birth_date?: string | null;
          gender?: string | null;
          display_mode?: string | null;
          role?: string;
          created_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          username?: string;
          birth_date?: string | null;
          gender?: string | null;
          display_mode?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      public_profiles: {
        Row: {
          id: string;
          username: string;
          created_at: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      get_frame_vote_counts: {
        Args: { target_frame_id: string };
        Returns: {
          frame_id: string;
          count_1: number;
          count_2: number;
          count_3: number;
          count_4: number;
          count_5: number;
          total_count: number;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
