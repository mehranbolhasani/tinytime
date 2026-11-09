export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      google_calendar_selections: {
        Row: {
          background_color: string | null
          calendar_id: string
          created_at: string
          enabled: boolean
          summary: string | null
          user_id: string
        }
        Insert: {
          background_color?: string | null
          calendar_id: string
          created_at?: string
          enabled?: boolean
          summary?: string | null
          user_id?: string
        }
        Update: {
          background_color?: string | null
          calendar_id?: string
          created_at?: string
          enabled?: boolean
          summary?: string | null
          user_id?: string
        }
        Relationships: []
      }
      google_integrations: {
        Row: {
          access_token: string
          access_token_expires_at: string | null
          connected_at: string
          google_email: string | null
          google_sub: string
          last_error: string | null
          refresh_token: string | null
          scopes: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          access_token_expires_at?: string | null
          connected_at?: string
          google_email?: string | null
          google_sub: string
          last_error?: string | null
          refresh_token?: string | null
          scopes?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          access_token_expires_at?: string | null
          connected_at?: string
          google_email?: string | null
          google_sub?: string
          last_error?: string | null
          refresh_token?: string | null
          scopes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      google_oauth_requests: {
        Row: {
          app_origin: string
          code_verifier: string
          created_at: string
          expires_at: string
          state: string
          user_id: string
        }
        Insert: {
          app_origin: string
          code_verifier: string
          created_at?: string
          expires_at?: string
          state: string
          user_id: string
        }
        Update: {
          app_origin?: string
          code_verifier?: string
          created_at?: string
          expires_at?: string
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          color: string
          created_at: string | null
          hourly_rate: number | null
          id: string
          name: string
          user_id: string | null
        }
        Insert: {
          color?: string
          created_at?: string | null
          hourly_rate?: number | null
          id?: string
          name: string
          user_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          hourly_rate?: number | null
          id?: string
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string
          created_at: string | null
          id: string
          name: string
          user_id: string | null
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: string
          name: string
          user_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          created_at: string | null
          description: string | null
          duration_seconds: number | null
          id: string
          project_id: string | null
          started_at: string
          stopped_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          project_id?: string | null
          started_at: string
          stopped_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          project_id?: string | null
          started_at?: string
          stopped_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entry_tags: {
        Row: {
          tag_id: string
          time_entry_id: string
        }
        Insert: {
          tag_id: string
          time_entry_id: string
        }
        Update: {
          tag_id?: string
          time_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entry_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entry_tags_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: false
            referencedRelation: "time_entries"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      google_integration_status: {
        Row: {
          connected: boolean | null
          connected_at: string | null
          google_email: string | null
          needs_reconnect: boolean | null
          scopes: string | null
          user_id: string | null
        }
        Insert: {
          connected?: never
          connected_at?: string | null
          google_email?: string | null
          needs_reconnect?: never
          scopes?: string | null
          user_id?: string | null
        }
        Update: {
          connected?: never
          connected_at?: string | null
          google_email?: string | null
          needs_reconnect?: never
          scopes?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
