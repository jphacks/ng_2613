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
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
