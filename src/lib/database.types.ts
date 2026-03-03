/**
 * Minimal hand-written Supabase database types.
 * Run `supabase gen types typescript --project-id <ref>` to replace with the
 * auto-generated version once the project is created.
 */

export interface Database {
  public: {
    Tables: {
      day_records: {
        Row: {
          id: string;
          user_id: string;
          date: string;         // ISO date "YYYY-MM-DD"
          slots: Record<string, unknown>;
          today_tasks: unknown[];
          tomorrow_tasks: unknown[];
          evening_review: unknown | null;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['day_records']['Row'], 'id' | 'updated_at'> & {
          id?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['day_records']['Insert']>;
      };
      app_settings: {
        Row: {
          user_id: string;
          data: Record<string, unknown>;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['app_settings']['Row'], 'updated_at'> & {
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['app_settings']['Insert']>;
      };
    };
  };
}
