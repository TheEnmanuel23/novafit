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
      attendances: {
        Row: {
          created_at: string | null
          fecha_hora: string
          id: string
          member_plan_id: string | null
          memberId: string
        }
        Insert: {
          created_at?: string | null
          fecha_hora: string
          id?: string
          member_plan_id?: string | null
          memberId: string
        }
        Update: {
          created_at?: string | null
          fecha_hora?: string
          id?: string
          member_plan_id?: string | null
          memberId?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendances_member_plan_id_fkey"
            columns: ["member_plan_id"]
            isOneToOne: false
            referencedRelation: "member_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendances_memberId_fkey"
            columns: ["memberId"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["memberId"]
          },
        ]
      }
      member_plans: {
        Row: {
          costo: number
          created_at: string
          deleted: boolean | null
          fecha_inicio: string
          id: string
          is_promo: boolean | null
          memberId: string
          notes: string | null
          plan_days: number
          plan_id: string | null
          plan_tipo: string
          registered_by: string | null
          registered_by_name: string | null
          updated_at: string
        }
        Insert: {
          costo: number
          created_at?: string
          deleted?: boolean | null
          fecha_inicio: string
          id?: string
          is_promo?: boolean | null
          memberId: string
          notes?: string | null
          plan_days: number
          plan_id?: string | null
          plan_tipo: string
          registered_by?: string | null
          registered_by_name?: string | null
          updated_at?: string
        }
        Update: {
          costo?: number
          created_at?: string
          deleted?: boolean | null
          fecha_inicio?: string
          id?: string
          is_promo?: boolean | null
          memberId?: string
          notes?: string | null
          plan_days?: number
          plan_id?: string | null
          plan_tipo?: string
          registered_by?: string | null
          registered_by_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_plans_memberId_fkey"
            columns: ["memberId"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["memberId"]
          },
          {
            foreignKeyName: "member_plans_registered_by_fkey"
            columns: ["registered_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["staffId"]
          },
        ]
      }
      members: {
        Row: {
          costo: number
          created_at: string | null
          deleted: boolean | null
          fecha_inicio: string
          id: string
          is_promo: boolean | null
          memberId: string
          nombre: string
          notes: string | null
          plan_days: number | null
          plan_tipo: string
          registered_by: string | null
          registered_by_name: string | null
          telefono: string | null
          updated_at: string | null
        }
        Insert: {
          costo: number
          created_at?: string | null
          deleted?: boolean | null
          fecha_inicio: string
          id?: string
          is_promo?: boolean | null
          memberId: string
          nombre: string
          notes?: string | null
          plan_days?: number | null
          plan_tipo: string
          registered_by?: string | null
          registered_by_name?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Update: {
          costo?: number
          created_at?: string | null
          deleted?: boolean | null
          fecha_inicio?: string
          id?: string
          is_promo?: boolean | null
          memberId?: string
          nombre?: string
          notes?: string | null
          plan_days?: number | null
          plan_tipo?: string
          registered_by?: string | null
          registered_by_name?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_registered_by_fkey"
            columns: ["registered_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["staffId"]
          },
        ]
      }
      plans: {
        Row: {
          active: boolean
          created_at: string
          days_active: number
          description: string
          id: string
          price: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          days_active: number
          description: string
          id?: string
          price: number
        }
        Update: {
          active?: boolean
          created_at?: string
          days_active?: number
          description?: string
          id?: string
          price?: number
        }
        Relationships: []
      }
      staff: {
        Row: {
          created_at: string | null
          deleted: boolean | null
          id: string
          nombre: string
          password: string
          role: string
          staffId: string
          updated_at: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          deleted?: boolean | null
          id?: string
          nombre: string
          password: string
          role: string
          staffId: string
          updated_at?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          deleted?: boolean | null
          id?: string
          nombre?: string
          password?: string
          role?: string
          staffId?: string
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
