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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      industry_profiles: {
        Row: {
          address: string | null
          company_name: string
          created_at: string
          id: string
          industry_type: string | null
          lat: number | null
          lng: number | null
          monthly_requirement: number
          price_offered_per_ton: number
          user_id: string
        }
        Insert: {
          address?: string | null
          company_name: string
          created_at?: string
          id?: string
          industry_type?: string | null
          lat?: number | null
          lng?: number | null
          monthly_requirement?: number
          price_offered_per_ton?: number
          user_id: string
        }
        Update: {
          address?: string | null
          company_name?: string
          created_at?: string
          id?: string
          industry_type?: string | null
          lat?: number | null
          lng?: number | null
          monthly_requirement?: number
          price_offered_per_ton?: number
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          approved: boolean
          created_at: string
          email: string | null
          id: string
          land_size: number | null
          lat: number | null
          lng: number | null
          name: string
          phone: string | null
          updated_at: string
          user_id: string
          village: string | null
        }
        Insert: {
          address?: string | null
          approved?: boolean
          created_at?: string
          email?: string | null
          id?: string
          land_size?: number | null
          lat?: number | null
          lng?: number | null
          name?: string
          phone?: string | null
          updated_at?: string
          user_id: string
          village?: string | null
        }
        Update: {
          address?: string | null
          approved?: boolean
          created_at?: string
          email?: string | null
          id?: string
          land_size?: number | null
          lat?: number | null
          lng?: number | null
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
          village?: string | null
        }
        Relationships: []
      }
      residue_listings: {
        Row: {
          address: string | null
          adjusted_price_per_ton: number
          ai_confidence: number | null
          base_price_per_ton: number
          created_at: string
          crop_type: string
          farmer_id: string
          id: string
          image_url: string | null
          lat: number | null
          lng: number | null
          moisture_level: number | null
          quality_grade: string | null
          quantity: number
          status: string
          total_value: number
        }
        Insert: {
          address?: string | null
          adjusted_price_per_ton: number
          ai_confidence?: number | null
          base_price_per_ton: number
          created_at?: string
          crop_type: string
          farmer_id: string
          id?: string
          image_url?: string | null
          lat?: number | null
          lng?: number | null
          moisture_level?: number | null
          quality_grade?: string | null
          quantity: number
          status?: string
          total_value: number
        }
        Update: {
          address?: string | null
          adjusted_price_per_ton?: number
          ai_confidence?: number | null
          base_price_per_ton?: number
          created_at?: string
          crop_type?: string
          farmer_id?: string
          id?: string
          image_url?: string | null
          lat?: number | null
          lng?: number | null
          moisture_level?: number | null
          quality_grade?: string | null
          quantity?: number
          status?: string
          total_value?: number
        }
        Relationships: []
      }
      transactions: {
        Row: {
          carbon_saved: number | null
          cluster_eligible: boolean | null
          created_at: string
          credit_points: number | null
          crop_type: string
          farmer_id: string
          id: string
          industry_id: string
          listing_id: string | null
          net_profit: number | null
          pickup_date: string | null
          price_per_ton: number
          quantity: number
          status: string
          total_value: number
          transport_cost: number | null
          transport_distance: number | null
          transport_savings: number | null
        }
        Insert: {
          carbon_saved?: number | null
          cluster_eligible?: boolean | null
          created_at?: string
          credit_points?: number | null
          crop_type: string
          farmer_id: string
          id?: string
          industry_id: string
          listing_id?: string | null
          net_profit?: number | null
          pickup_date?: string | null
          price_per_ton: number
          quantity: number
          status?: string
          total_value: number
          transport_cost?: number | null
          transport_distance?: number | null
          transport_savings?: number | null
        }
        Update: {
          carbon_saved?: number | null
          cluster_eligible?: boolean | null
          created_at?: string
          credit_points?: number | null
          crop_type?: string
          farmer_id?: string
          id?: string
          industry_id?: string
          listing_id?: string | null
          net_profit?: number | null
          pickup_date?: string | null
          price_per_ton?: number
          quantity?: number
          status?: string
          total_value?: number
          transport_cost?: number | null
          transport_distance?: number | null
          transport_savings?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "residue_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "farmer" | "industry" | "admin"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["farmer", "industry", "admin"],
    },
  },
} as const
