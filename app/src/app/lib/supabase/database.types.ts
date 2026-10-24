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
