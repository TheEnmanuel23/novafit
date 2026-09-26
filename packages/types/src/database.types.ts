
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "attendances": {
                  Row: {
                    "balance_after": number,"balance_before": number,"checkin_type": string,"created_by": string | null,"id": string,"member_id": string,"member_plan_id": string,"registered_by": string | null,"scanned_at": string,"updated_by": string | null
                  }
                  Insert: {
                    "balance_after": number,"balance_before": number,"checkin_type"?: string,"created_by"?: string | null,"id"?: string,"member_id": string,"member_plan_id": string,"registered_by"?: string | null,"scanned_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "balance_after"?: number,"balance_before"?: number,"checkin_type"?: string,"created_by"?: string | null,"id"?: string,"member_id"?: string,"member_plan_id"?: string,"registered_by"?: string | null,"scanned_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "attendances_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attendances_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["member_id"]
    },{
      foreignKeyName: "attendances_member_plan_id_fkey"
      columns: ["member_plan_id"]
isOneToOne: false
      referencedRelation: "member_plans"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attendances_registered_by_fkey"
      columns: ["registered_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attendances_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                },"business_settings": {
                  Row: {
                    "address": string | null,"created_by": string | null,"id": number,"logo_url": string | null,"name": string,"phone": string | null,"updated_at": string | null,"updated_by": string | null
                  }
                  Insert: {
                    "address"?: string | null,"created_by"?: string | null,"id"?: number,"logo_url"?: string | null,"name"?: string,"phone"?: string | null,"updated_at"?: string | null,"updated_by"?: string | null
                  }
                  Update: {
                    "address"?: string | null,"created_by"?: string | null,"id"?: number,"logo_url"?: string | null,"name"?: string,"phone"?: string | null,"updated_at"?: string | null,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_settings_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "business_settings_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                },"member_plans": {
                  Row: {
                    "created_at": string,"created_by": string | null,"expiration_date": string,"id": string,"member_id": string,"plan_id": string,"starts_at": string,"status": string,"updated_at": string,"updated_by": string | null,"visits_purchased": number,"visits_used": number
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"expiration_date": string,"id"?: string,"member_id": string,"plan_id": string,"starts_at"?: string,"status"?: string,"updated_at"?: string,"updated_by"?: string | null,"visits_purchased": number,"visits_used"?: number
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"expiration_date"?: string,"id"?: string,"member_id"?: string,"plan_id"?: string,"starts_at"?: string,"status"?: string,"updated_at"?: string,"updated_by"?: string | null,"visits_purchased"?: number,"visits_used"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "member_plans_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "member_plans_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["member_id"]
    },{
      foreignKeyName: "member_plans_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "member_plans_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                },"members": {
                  Row: {
                    "created_at": string,"created_by": string | null,"deleted": boolean,"id": string,"member_id": string,"name": string,"phone": string | null,"qr_code": string | null,"updated_at": string,"updated_by": string | null,"username": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"deleted"?: boolean,"id"?: string,"member_id"?: string,"name": string,"phone"?: string | null,"qr_code"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"username": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"deleted"?: boolean,"id"?: string,"member_id"?: string,"name"?: string,"phone"?: string | null,"qr_code"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"username"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "members_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "members_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                },"plans": {
                  Row: {
                    "active": boolean,"created_at": string,"created_by": string | null,"description": string,"expiration_days": number,"id": string,"max_balance": number,"price": number,"updated_by": string | null,"visits_included": number
                  }
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"created_by"?: string | null,"description": string,"expiration_days": number,"id"?: string,"max_balance": number,"price": number,"updated_by"?: string | null,"visits_included": number
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"created_by"?: string | null,"description"?: string,"expiration_days"?: number,"id"?: string,"max_balance"?: number,"price"?: number,"updated_by"?: string | null,"visits_included"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "plans_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "plans_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_roles": {
                  Row: {
                    "created_by": string | null,"id": string,"profile_id": string,"role_id": string,"updated_by": string | null
                  }
                  Insert: {
                    "created_by"?: string | null,"id"?: string,"profile_id": string,"role_id": string,"updated_by"?: string | null
                  }
                  Update: {
                    "created_by"?: string | null,"id"?: string,"profile_id"?: string,"role_id"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_roles_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profile_roles_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profile_roles_role_id_fkey"
      columns: ["role_id"]
isOneToOne: false
      referencedRelation: "roles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profile_roles_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"created_by": string | null,"description": string | null,"id": string,"is_system": boolean,"name": string,"updated_by": string | null
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"is_system"?: boolean,"name": string,"updated_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"is_system"?: boolean,"name"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profiles_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                },"roles": {
                  Row: {
                    "created_at": string,"created_by": string | null,"description": string | null,"id": string,"name": string,"updated_by": string | null
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"name": string,"updated_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"name"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "roles_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "roles_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                },"staff": {
                  Row: {
                    "auth_user_id": string,"created_at": string,"created_by": string | null,"deleted": boolean,"email": string | null,"id": string,"name": string,"profile_id": string,"updated_at": string,"updated_by": string | null,"username": string
                  }
                  Insert: {
                    "auth_user_id": string,"created_at"?: string,"created_by"?: string | null,"deleted"?: boolean,"email"?: string | null,"id"?: string,"name": string,"profile_id": string,"updated_at"?: string,"updated_by"?: string | null,"username": string
                  }
                  Update: {
                    "auth_user_id"?: string,"created_at"?: string,"created_by"?: string | null,"deleted"?: boolean,"email"?: string | null,"id"?: string,"name"?: string,"profile_id"?: string,"updated_at"?: string,"updated_by"?: string | null,"username"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "staff_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "staff_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "staff_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                },"transactions": {
                  Row: {
                    "amount_paid": number,"balance_after": number,"balance_before": number,"created_at": string,"created_by": string | null,"id": string,"member_id": string,"member_plan_id": string,"plan_id": string,"registered_by": string | null,"updated_by": string | null,"visits_added": number
                  }
                  Insert: {
                    "amount_paid": number,"balance_after": number,"balance_before": number,"created_at"?: string,"created_by"?: string | null,"id"?: string,"member_id": string,"member_plan_id": string,"plan_id": string,"registered_by"?: string | null,"updated_by"?: string | null,"visits_added": number
                  }
                  Update: {
                    "amount_paid"?: number,"balance_after"?: number,"balance_before"?: number,"created_at"?: string,"created_by"?: string | null,"id"?: string,"member_id"?: string,"member_plan_id"?: string,"plan_id"?: string,"registered_by"?: string | null,"updated_by"?: string | null,"visits_added"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "transactions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "transactions_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["member_id"]
    },{
      foreignKeyName: "transactions_member_plan_id_fkey"
      columns: ["member_plan_id"]
isOneToOne: false
      referencedRelation: "member_plans"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "transactions_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "transactions_registered_by_fkey"
      columns: ["registered_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "transactions_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "has_role":
{ Args: { "role_name": string }; Returns: boolean
                           },
"is_global_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const

