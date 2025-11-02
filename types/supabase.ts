export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string
          country: string | null
          language: string | null
          living_situation: string | null
          current_situation: string | null
          address_street: string | null
          address_number: string | null
          plz: string | null
          city: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          country?: string | null
          language?: string | null
          living_situation?: string | null
          current_situation?: string | null
          address_street?: string | null
          address_number?: string | null
          plz?: string | null
          city?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          country?: string | null
          language?: string | null
          living_situation?: string | null
          current_situation?: string | null
          address_street?: string | null
          address_number?: string | null
          plz?: string | null
          city?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      password_resets: {
        Row: {
          id: string
          user_id: string
          token_hash: string
          created_at: string
          expires_at: string
          used_at: string | null
          request_ip: string | null
        }
        Insert: {
          id?: string
          user_id: string
          token_hash: string
          created_at?: string
          expires_at: string
          used_at?: string | null
          request_ip?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          token_hash?: string
          created_at?: string
          expires_at?: string
          used_at?: string | null
          request_ip?: string | null
        }
      }
      form_schemas: {
        Row: {
          id: string
          version: number
          json: Json
          created_at: string
        }
        Insert: {
          id: string
          version?: number
          json: Json
          created_at?: string
        }
        Update: {
          id?: string
          version?: number
          json?: Json
          created_at?: string
        }
      }
      dictionaries: {
        Row: {
          key: string
          locale: string
          version: number
          items: Json
        }
        Insert: {
          key: string
          locale: string
          version?: number
          items: Json
        }
        Update: {
          key?: string
          locale?: string
          version?: number
          items?: Json
        }
      }
      email_templates: {
        Row: {
          key: string
          locale: string
          version: number
          mjml: string | null
          html: string | null
        }
        Insert: {
          key: string
          locale: string
          version?: number
          mjml?: string | null
          html?: string | null
        }
        Update: {
          key?: string
          locale?: string
          version?: number
          mjml?: string | null
          html?: string | null
        }
      }
      feature_flags: {
        Row: {
          key: string
          value: Json | null
          enabled: boolean
          updated_at: string
        }
        Insert: {
          key: string
          value?: Json | null
          enabled?: boolean
          updated_at?: string
        }
        Update: {
          key?: string
          value?: Json | null
          enabled?: boolean
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          name: string
          payload: Json | null
          created_at: string
          processed_at: string | null
          retries: number
        }
        Insert: {
          id?: string
          name: string
          payload?: Json | null
          created_at?: string
          processed_at?: string | null
          retries?: number
        }
        Update: {
          id?: string
          name?: string
          payload?: Json | null
          created_at?: string
          processed_at?: string | null
          retries?: number
        }
      }
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          priority: number
          module_id: string
          visibility: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          priority?: number
          module_id: string
          visibility?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          priority?: number
          module_id?: string
          visibility?: Json | null
          created_at?: string
        }
      }
      user_tasks: {
        Row: {
          user_id: string
          task_id: string
          status: 'todo' | 'in_progress' | 'blocked' | 'done'
          due_date: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          task_id: string
          status?: 'todo' | 'in_progress' | 'blocked' | 'done'
          due_date?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          task_id?: string
          status?: 'todo' | 'in_progress' | 'blocked' | 'done'
          due_date?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      municipalities: {
        Row: {
          id: string
          name: string
          canton: string | null
          postal_codes: string[] | null
          contact_info: Json | null
          office_hours: Json | null
          website: string | null
        }
        Insert: {
          id?: string
          name: string
          canton?: string | null
          postal_codes?: string[] | null
          contact_info?: Json | null
          office_hours?: Json | null
          website?: string | null
        }
        Update: {
          id?: string
          name?: string
          canton?: string | null
          postal_codes?: string[] | null
          contact_info?: Json | null
          office_hours?: Json | null
          website?: string | null
        }
      }
      user_interests: {
        Row: {
          user_id: string
          interest_key: string
        }
        Insert: {
          user_id: string
          interest_key: string
        }
        Update: {
          user_id?: string
          interest_key?: string
        }
      }
    }
  }
}






