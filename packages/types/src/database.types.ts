
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
                },"cash_register_sessions": {
                  Row: {
                    "cash_sales_total": number,"closed_at": string | null,"closed_by": string | null,"counted_cash_amount": number | null,"created_at": string,"created_by": string | null,"difference_amount": number | null,"expected_cash_amount": number,"id": string,"notes": string | null,"opened_at": string,"opened_by": string | null,"opening_amount": number,"other_sales_total": number,"status": string,"total_sales": number,"updated_at": string,"updated_by": string | null
                  }
                  Insert: {
                    "cash_sales_total"?: number,"closed_at"?: string | null,"closed_by"?: string | null,"counted_cash_amount"?: number | null,"created_at"?: string,"created_by"?: string | null,"difference_amount"?: number | null,"expected_cash_amount"?: number,"id"?: string,"notes"?: string | null,"opened_at"?: string,"opened_by"?: string | null,"opening_amount"?: number,"other_sales_total"?: number,"status"?: string,"total_sales"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "cash_sales_total"?: number,"closed_at"?: string | null,"closed_by"?: string | null,"counted_cash_amount"?: number | null,"created_at"?: string,"created_by"?: string | null,"difference_amount"?: number | null,"expected_cash_amount"?: number,"id"?: string,"notes"?: string | null,"opened_at"?: string,"opened_by"?: string | null,"opening_amount"?: number,"other_sales_total"?: number,"status"?: string,"total_sales"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "cash_register_sessions_closed_by_fkey"
      columns: ["closed_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cash_register_sessions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cash_register_sessions_opened_by_fkey"
      columns: ["opened_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cash_register_sessions_updated_by_fkey"
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
                    "address": string | null,"created_at": string,"created_by": string | null,"date_of_birth": string | null,"deleted": boolean,"email": string | null,"id": string,"member_id": string,"name": string,"password_reset_allowed": boolean,"phone": string | null,"qr_code": string | null,"updated_at": string,"updated_by": string | null,"username": string
                  }
                  Insert: {
                    "address"?: string | null,"created_at"?: string,"created_by"?: string | null,"date_of_birth"?: string | null,"deleted"?: boolean,"email"?: string | null,"id"?: string,"member_id"?: string,"name": string,"password_reset_allowed"?: boolean,"phone"?: string | null,"qr_code"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"username": string
                  }
                  Update: {
                    "address"?: string | null,"created_at"?: string,"created_by"?: string | null,"date_of_birth"?: string | null,"deleted"?: boolean,"email"?: string | null,"id"?: string,"member_id"?: string,"name"?: string,"password_reset_allowed"?: boolean,"phone"?: string | null,"qr_code"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"username"?: string
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
                },"payment_methods": {
                  Row: {
                    "active": boolean,"created_at": string,"created_by": string | null,"id": string,"key": string,"name": string,"sort_order": number,"updated_at": string,"updated_by": string | null
                  }
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"created_by"?: string | null,"id"?: string,"key": string,"name": string,"sort_order"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"created_by"?: string | null,"id"?: string,"key"?: string,"name"?: string,"sort_order"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "payment_methods_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payment_methods_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                },"plans": {
                  Row: {
                    "active": boolean,"created_at": string,"created_by": string | null,"description": string,"expiration_days": number,"id": string,"key": string,"max_balance": number,"price": number,"updated_by": string | null,"visits_included": number
                  }
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"created_by"?: string | null,"description": string,"expiration_days": number,"id"?: string,"key"?: string,"max_balance": number,"price": number,"updated_by"?: string | null,"visits_included": number
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"created_by"?: string | null,"description"?: string,"expiration_days"?: number,"id"?: string,"key"?: string,"max_balance"?: number,"price"?: number,"updated_by"?: string | null,"visits_included"?: number
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
                },"product_categories": {
                  Row: {
                    "created_at": string,"created_by": string | null,"description": string | null,"id": string,"name": string,"updated_at": string,"updated_by": string | null
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"name": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"name"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_categories_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "product_categories_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                },"product_history": {
                  Row: {
                    "action": string,"changed_by": string | null,"created_at": string,"field_name": string | null,"id": string,"new_value": string | null,"old_value": string | null,"product_id": string
                  }
                  Insert: {
                    "action": string,"changed_by"?: string | null,"created_at"?: string,"field_name"?: string | null,"id"?: string,"new_value"?: string | null,"old_value"?: string | null,"product_id": string
                  }
                  Update: {
                    "action"?: string,"changed_by"?: string | null,"created_at"?: string,"field_name"?: string | null,"id"?: string,"new_value"?: string | null,"old_value"?: string | null,"product_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_history_changed_by_fkey"
      columns: ["changed_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "product_history_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"product_images": {
                  Row: {
                    "created_at": string,"created_by": string | null,"display_order": number,"id": string,"image_url": string,"product_id": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"display_order"?: number,"id"?: string,"image_url": string,"product_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"display_order"?: number,"id"?: string,"image_url"?: string,"product_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_images_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "product_images_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"products": {
                  Row: {
                    "barcode": string | null,"category_id": string | null,"cost": number,"created_at": string,"created_by": string | null,"deleted": boolean,"description": string | null,"id": string,"low_stock_threshold": number,"name": string,"price": number,"quantity_available": number,"show_in_catalog": boolean,"sku": string | null,"unit": string,"unit_category": string,"updated_at": string,"updated_by": string | null
                  }
                  Insert: {
                    "barcode"?: string | null,"category_id"?: string | null,"cost"?: number,"created_at"?: string,"created_by"?: string | null,"deleted"?: boolean,"description"?: string | null,"id"?: string,"low_stock_threshold"?: number,"name": string,"price"?: number,"quantity_available"?: number,"show_in_catalog"?: boolean,"sku"?: string | null,"unit"?: string,"unit_category"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "barcode"?: string | null,"category_id"?: string | null,"cost"?: number,"created_at"?: string,"created_by"?: string | null,"deleted"?: boolean,"description"?: string | null,"id"?: string,"low_stock_threshold"?: number,"name"?: string,"price"?: number,"quantity_available"?: number,"show_in_catalog"?: boolean,"sku"?: string | null,"unit"?: string,"unit_category"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "products_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "product_categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "products_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "products_updated_by_fkey"
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
                },"sale_items": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"product_id": string | null,"product_name": string,"quantity": number,"sale_id": string,"subtotal": number,"unit_cost": number,"unit_price": number
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"product_id"?: string | null,"product_name": string,"quantity"?: number,"sale_id": string,"subtotal"?: number,"unit_cost"?: number,"unit_price"?: number
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"product_id"?: string | null,"product_name"?: string,"quantity"?: number,"sale_id"?: string,"subtotal"?: number,"unit_cost"?: number,"unit_price"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "sale_items_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sale_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sale_items_sale_id_fkey"
      columns: ["sale_id"]
isOneToOne: false
      referencedRelation: "sales"
      referencedColumns: ["id"]
    }
                  ]
                },"sales": {
                  Row: {
                    "assigned_staff_id": string | null,"created_at": string,"created_by": string | null,"custom_payment_method": string | null,"deleted": boolean,"discount": number,"id": string,"installments_count": number,"member_id": string | null,"payment_method_id": string | null,"payment_status": string,"receipt_details": string | null,"receipt_name": string | null,"sale_date": string,"sale_type": string,"subtotal": number,"total": number,"updated_at": string,"updated_by": string | null
                  }
                  Insert: {
                    "assigned_staff_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"custom_payment_method"?: string | null,"deleted"?: boolean,"discount"?: number,"id"?: string,"installments_count"?: number,"member_id"?: string | null,"payment_method_id"?: string | null,"payment_status"?: string,"receipt_details"?: string | null,"receipt_name"?: string | null,"sale_date"?: string,"sale_type"?: string,"subtotal"?: number,"total"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "assigned_staff_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"custom_payment_method"?: string | null,"deleted"?: boolean,"discount"?: number,"id"?: string,"installments_count"?: number,"member_id"?: string | null,"payment_method_id"?: string | null,"payment_status"?: string,"receipt_details"?: string | null,"receipt_name"?: string | null,"sale_date"?: string,"sale_type"?: string,"subtotal"?: number,"total"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "sales_assigned_staff_id_fkey"
      columns: ["assigned_staff_id"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sales_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sales_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["member_id"]
    },{
      foreignKeyName: "sales_payment_method_id_fkey"
      columns: ["payment_method_id"]
isOneToOne: false
      referencedRelation: "payment_methods"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sales_updated_by_fkey"
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

