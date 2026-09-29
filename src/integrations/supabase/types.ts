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
      layout_zones: {
        Row: {
          config: Json
          created_at: string
          h: number
          id: string
          kind: Database["public"]["Enums"]["zone_kind"]
          layout_id: string
          name: string
          org_id: string
          playlist_id: string | null
          position: number
          radius: number
          source_id: string | null
          style: Json
          w: number
          x: number
          y: number
          z: number
        }
        Insert: {
          config?: Json
          created_at?: string
          h?: number
          id?: string
          kind: Database["public"]["Enums"]["zone_kind"]
          layout_id: string
          name?: string
          org_id: string
          playlist_id?: string | null
          position?: number
          radius?: number
          source_id?: string | null
          style?: Json
          w?: number
          x?: number
          y?: number
          z?: number
        }
        Update: {
          config?: Json
          created_at?: string
          h?: number
          id?: string
          kind?: Database["public"]["Enums"]["zone_kind"]
          layout_id?: string
          name?: string
          org_id?: string
          playlist_id?: string | null
          position?: number
          radius?: number
          source_id?: string | null
          style?: Json
          w?: number
          x?: number
          y?: number
          z?: number
        }
        Relationships: [
          {
            foreignKeyName: "layout_zones_layout_id_fkey"
            columns: ["layout_id"]
            isOneToOne: false
            referencedRelation: "layouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "layout_zones_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "layout_zones_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "layout_zones_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      layouts: {
        Row: {
          background: string
          created_at: string
          id: string
          name: string
          org_id: string
          orientation: string
          template: string | null
        }
        Insert: {
          background?: string
          created_at?: string
          id?: string
          name: string
          org_id: string
          orientation?: string
          template?: string | null
        }
        Update: {
          background?: string
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          orientation?: string
          template?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "layouts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          created_at: string
          duration_s: number | null
          height: number | null
          id: string
          mime: string | null
          name: string
          org_id: string
          path: string
          size_bytes: number | null
          tags: string[]
          url: string
          width: number | null
        }
        Insert: {
          created_at?: string
          duration_s?: number | null
          height?: number | null
          id?: string
          mime?: string | null
          name: string
          org_id: string
          path: string
          size_bytes?: number | null
          tags?: string[]
          url: string
          width?: number | null
        }
        Update: {
          created_at?: string
          duration_s?: number | null
          height?: number | null
          id?: string
          mime?: string | null
          name?: string
          org_id?: string
          path?: string
          size_bytes?: number | null
          tags?: string[]
          url?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          created_at: string
          org_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          org_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          org_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          config_version: number
          created_at: string
          id: string
          logo_url: string | null
          max_screens: number | null
          name: string
          notes: string | null
          suspended: boolean
          theme: Json
        }
        Insert: {
          config_version?: number
          created_at?: string
          id?: string
          logo_url?: string | null
          max_screens?: number | null
          name: string
          notes?: string | null
          suspended?: boolean
          theme?: Json
        }
        Update: {
          config_version?: number
          created_at?: string
          id?: string
          logo_url?: string | null
          max_screens?: number | null
          name?: string
          notes?: string | null
          suspended?: boolean
          theme?: Json
        }
        Relationships: []
      }
      playlist_items: {
        Row: {
          created_at: string
          data: Json
          date_from: string | null
          date_to: string | null
          days: number[]
          duration_s: number | null
          enabled: boolean
          id: string
          kind: Database["public"]["Enums"]["item_kind"]
          org_id: string
          playlist_id: string
          position: number
          time_from: string | null
          time_to: string | null
        }
        Insert: {
          created_at?: string
          data?: Json
          date_from?: string | null
          date_to?: string | null
          days?: number[]
          duration_s?: number | null
          enabled?: boolean
          id?: string
          kind: Database["public"]["Enums"]["item_kind"]
          org_id: string
          playlist_id: string
          position?: number
          time_from?: string | null
          time_to?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          date_from?: string | null
          date_to?: string | null
          days?: number[]
          duration_s?: number | null
          enabled?: boolean
          id?: string
          kind?: Database["public"]["Enums"]["item_kind"]
          org_id?: string
          playlist_id?: string
          position?: number
          time_from?: string | null
          time_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "playlist_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_items_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          created_at: string
          default_duration_s: number
          id: string
          name: string
          org_id: string
          shuffle: boolean
          transition: string
        }
        Insert: {
          created_at?: string
          default_duration_s?: number
          id?: string
          name: string
          org_id: string
          shuffle?: boolean
          transition?: string
        }
        Update: {
          created_at?: string
          default_duration_s?: number
          id?: string
          name?: string
          org_id?: string
          shuffle?: boolean
          transition?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlists_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          created_at: string
          date_from: string | null
          date_to: string | null
          days: number[]
          enabled: boolean
          id: string
          layout_id: string
          name: string | null
          org_id: string
          priority: number
          screen_id: string
          time_from: string | null
          time_to: string | null
        }
        Insert: {
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          days?: number[]
          enabled?: boolean
          id?: string
          layout_id: string
          name?: string | null
          org_id: string
          priority?: number
          screen_id: string
          time_from?: string | null
          time_to?: string | null
        }
        Update: {
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          days?: number[]
          enabled?: boolean
          id?: string
          layout_id?: string
          name?: string | null
          org_id?: string
          priority?: number
          screen_id?: string
          time_from?: string | null
          time_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedules_layout_id_fkey"
            columns: ["layout_id"]
            isOneToOne: false
            referencedRelation: "layouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screens"
            referencedColumns: ["id"]
          },
        ]
      }
      screens: {
        Row: {
          config_version: number
          created_at: string
          default_layout_id: string | null
          enabled: boolean
          height: number
          id: string
          last_seen_at: string | null
          name: string
          notes: string | null
          org_id: string
          orientation: string
          pending_command: string | null
          player_info: Json
          theme_override: Json
          timezone: string
          token: string
          width: number
        }
        Insert: {
          config_version?: number
          created_at?: string
          default_layout_id?: string | null
          enabled?: boolean
          height?: number
          id?: string
          last_seen_at?: string | null
          name: string
          notes?: string | null
          org_id: string
          orientation?: string
          pending_command?: string | null
          player_info?: Json
          theme_override?: Json
          timezone?: string
          token?: string
          width?: number
        }
        Update: {
          config_version?: number
          created_at?: string
          default_layout_id?: string | null
          enabled?: boolean
          height?: number
          id?: string
          last_seen_at?: string | null
          name?: string
          notes?: string | null
          org_id?: string
          orientation?: string
          pending_command?: string | null
          player_info?: Json
          theme_override?: Json
          timezone?: string
          token?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "screens_default_layout_id_fkey"
            columns: ["default_layout_id"]
            isOneToOne: false
            referencedRelation: "layouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screens_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          created_at: string
          fallback_media_id: string | null
          fit: string
          id: string
          kind: Database["public"]["Enums"]["source_kind"]
          loop: boolean
          media_id: string | null
          muted: boolean
          name: string
          org_id: string
          retry_s: number
          url: string | null
          volume: number
        }
        Insert: {
          created_at?: string
          fallback_media_id?: string | null
          fit?: string
          id?: string
          kind?: Database["public"]["Enums"]["source_kind"]
          loop?: boolean
          media_id?: string | null
          muted?: boolean
          name: string
          org_id: string
          retry_s?: number
          url?: string | null
          volume?: number
        }
        Update: {
          created_at?: string
          fallback_media_id?: string | null
          fit?: string
          id?: string
          kind?: Database["public"]["Enums"]["source_kind"]
          loop?: boolean
          media_id?: string | null
          muted?: boolean
          name?: string
          org_id?: string
          retry_s?: number
          url?: string | null
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "sources_fallback_media_id_fkey"
            columns: ["fallback_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sources_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sources_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _active_layout: { Args: { p_screen: string }; Returns: string }
      _screen_version: { Args: { p_screen: string }; Returns: string }
      admin_create_organization: {
        Args: { p_max_screens?: number; p_name: string; p_notes?: string }
        Returns: string
      }
      assert_same_org: {
        Args: { p_id: string; p_org: string; p_table: string }
        Returns: undefined
      }
      create_organization: { Args: { p_name: string }; Returns: string }
      get_player_config: { Args: { p_token: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_member: {
        Args: { p_org: string; p_roles?: string[] }
        Returns: boolean
      }
      is_superadmin: { Args: never; Returns: boolean }
      player_ping: { Args: { p_info?: Json; p_token: string }; Returns: Json }
    }
    Enums: {
      app_role: "superadmin"
      item_kind:
        | "product"
        | "image"
        | "video"
        | "stream"
        | "service"
        | "text"
        | "qr"
        | "webpage"
        | "catalog_feed"
      source_kind:
        | "hls"
        | "ts"
        | "mp4"
        | "youtube"
        | "webpage"
        | "image"
        | "none"
      zone_kind:
        | "main"
        | "playlist"
        | "ticker"
        | "clock"
        | "logo"
        | "text"
        | "qr"
        | "webpage"
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
    Enums: {
      app_role: ["superadmin"],
      item_kind: [
        "product",
        "image",
        "video",
        "stream",
        "service",
        "text",
        "qr",
        "webpage",
        "catalog_feed",
      ],
      source_kind: ["hls", "ts", "mp4", "youtube", "webpage", "image", "none"],
      zone_kind: [
        "main",
        "playlist",
        "ticker",
        "clock",
        "logo",
        "text",
        "qr",
        "webpage",
      ],
    },
  },
} as const
