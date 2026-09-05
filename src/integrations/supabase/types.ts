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
      document_chunks: {
        Row: {
          content: string
          created_at: string
          document_path: string
          embedding: string
          id: string
          metadata: Json
          patient_id: string
        }
        Insert: {
          content: string
          created_at?: string
          document_path: string
          embedding: string
          id?: string
          metadata?: Json
          patient_id: string
        }
        Update: {
          content?: string
          created_at?: string
          document_path?: string
          embedding?: string
          id?: string
          metadata?: Json
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_access_logs: {
        Row: {
          accessed_at: string
          id: string
          ip_hash: string | null
          patient_id: string
          user_agent: string | null
        }
        Insert: {
          accessed_at?: string
          id?: string
          ip_hash?: string | null
          patient_id: string
          user_agent?: string | null
        }
        Update: {
          accessed_at?: string
          id?: string
          ip_hash?: string | null
          patient_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_access_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_rate_limits: {
        Row: {
          bucket_key: string
          bucket_kind: string
          id: number
          occurred_at: string
        }
        Insert: {
          bucket_key: string
          bucket_kind: string
          id?: number
          occurred_at?: string
        }
        Update: {
          bucket_key?: string
          bucket_kind?: string
          id?: number
          occurred_at?: string
        }
        Relationships: []
      }
      family_groups: {
        Row: {
          created_at: string
          id: string
          max_members: number
          owner_id: string
          plan_slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_members?: number
          owner_id: string
          plan_slug?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          max_members?: number
          owner_id?: string
          plan_slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_groups_plan_slug_fkey"
            columns: ["plan_slug"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["slug"]
          },
        ]
      }
      family_members: {
        Row: {
          created_at: string
          group_id: string
          id: string
          invited_email: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          invited_email?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          invited_email?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "family_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          allergies: string[] | null
          blood_group: string | null
          chronic_conditions: string[] | null
          created_at: string
          date_of_birth: string
          documents: Json
          emergency_contact: string
          full_name: string
          gender: string
          height: string | null
          id: string
          insurance_provider: string | null
          owner_id: string
          phone_number: string
          policy_number: string | null
          share_revoked: boolean
          share_token: string
          tpa_contact: string | null
          updated_at: string
          weight: string | null
        }
        Insert: {
          allergies?: string[] | null
          blood_group?: string | null
          chronic_conditions?: string[] | null
          created_at?: string
          date_of_birth: string
          documents?: Json
          emergency_contact: string
          full_name: string
          gender: string
          height?: string | null
          id?: string
          insurance_provider?: string | null
          owner_id: string
          phone_number: string
          policy_number?: string | null
          share_revoked?: boolean
          share_token?: string
          tpa_contact?: string | null
          updated_at?: string
          weight?: string | null
        }
        Update: {
          allergies?: string[] | null
          blood_group?: string | null
          chronic_conditions?: string[] | null
          created_at?: string
          date_of_birth?: string
          documents?: Json
          emergency_contact?: string
          full_name?: string
          gender?: string
          height?: string | null
          id?: string
          insurance_provider?: string | null
          owner_id?: string
          phone_number?: string
          policy_number?: string | null
          share_revoked?: boolean
          share_token?: string
          tpa_contact?: string | null
          updated_at?: string
          weight?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          family_group_id: string | null
          id: string
          patient_id: string | null
          plan_slug: string
          subscription_expires_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          family_group_id?: string | null
          id: string
          patient_id?: string | null
          plan_slug?: string
          subscription_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          family_group_id?: string | null
          id?: string
          patient_id?: string | null
          plan_slug?: string
          subscription_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_family_group_id_fkey"
            columns: ["family_group_id"]
            isOneToOne: false
            referencedRelation: "family_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_plan_slug_fkey"
            columns: ["plan_slug"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["slug"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          description: string | null
          id: string
          max_documents: number | null
          max_profiles: number
          name: string
          price_inr: number
          razorpay_plan_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          max_documents?: number | null
          max_profiles?: number
          name: string
          price_inr: number
          razorpay_plan_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          max_documents?: number | null
          max_profiles?: number
          name?: string
          price_inr?: number
          razorpay_plan_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          owner_id: string
          plan_slug: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          owner_id: string
          plan_slug: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          owner_id?: string
          plan_slug?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_slug_fkey"
            columns: ["plan_slug"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["slug"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_add_document: { Args: { _patient_id: string }; Returns: boolean }
      can_add_family_member: { Args: { _group_id: string }; Returns: boolean }
      check_emergency_rate_limit: {
        Args: { _ip_hash: string; _token: string }
        Returns: Json
      }
      effective_plan: { Args: { _user_id: string }; Returns: string }
      match_documents: {
        Args: {
          _patient_id: string
          match_count?: number
          query_embedding: string
        }
        Returns: {
          content: string
          document_path: string
          id: string
          metadata: Json
          similarity: number
        }[]
      }
      remaining_document_slots: {
        Args: { _patient_id: string }
        Returns: number
      }
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
