export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      found_item_private_details: {
        Row: {
          created_at: string;
          item_id: string;
          private_contents: string | null;
          private_notes: string | null;
          serial_fragment: string | null;
          unique_markings: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          item_id: string;
          private_contents?: string | null;
          private_notes?: string | null;
          serial_fragment?: string | null;
          unique_markings?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          item_id?: string;
          private_contents?: string | null;
          private_notes?: string | null;
          serial_fragment?: string | null;
          unique_markings?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "found_item_private_details_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: true;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "found_item_private_details_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: true;
            referencedRelation: "public_items_view";
            referencedColumns: ["id"];
          },
        ];
      };
      item_images: {
        Row: {
          created_at: string;
          id: string;
          item_id: string;
          position: number;
          storage_path: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          item_id: string;
          position?: number;
          storage_path: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          item_id?: string;
          position?: number;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: "item_images_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "item_images_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "public_items_view";
            referencedColumns: ["id"];
          },
        ];
      };
      items: {
        Row: {
          brand: string | null;
          category: string;
          closed_at: string | null;
          closed_reason: string | null;
          color: string | null;
          created_at: string;
          description: string;
          event_date: string;
          event_time: string | null;
          id: string;
          latitude: number | null;
          listing_type: Database["public"]["Enums"]["listing_type"];
          location_text: string;
          longitude: number | null;
          status: Database["public"]["Enums"]["listing_status"];
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          brand?: string | null;
          category: string;
          closed_at?: string | null;
          closed_reason?: string | null;
          color?: string | null;
          created_at?: string;
          description: string;
          event_date: string;
          event_time?: string | null;
          id?: string;
          latitude?: number | null;
          listing_type: Database["public"]["Enums"]["listing_type"];
          location_text: string;
          longitude?: number | null;
          status?: Database["public"]["Enums"]["listing_status"];
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          brand?: string | null;
          category?: string;
          closed_at?: string | null;
          closed_reason?: string | null;
          color?: string | null;
          created_at?: string;
          description?: string;
          event_date?: string;
          event_time?: string | null;
          id?: string;
          latitude?: number | null;
          listing_type?: Database["public"]["Enums"]["listing_type"];
          location_text?: string;
          longitude?: number | null;
          status?: Database["public"]["Enums"]["listing_status"];
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "items_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "items_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles_view";
            referencedColumns: ["id"];
          },
        ];
      };
      lost_item_private_details: {
        Row: {
          created_at: string;
          item_id: string;
          private_contents: string | null;
          private_notes: string | null;
          serial_fragment: string | null;
          unique_markings: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          item_id: string;
          private_contents?: string | null;
          private_notes?: string | null;
          serial_fragment?: string | null;
          unique_markings?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          item_id?: string;
          private_contents?: string | null;
          private_notes?: string | null;
          serial_fragment?: string | null;
          unique_markings?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lost_item_private_details_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: true;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lost_item_private_details_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: true;
            referencedRelation: "public_items_view";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          average_rating: number;
          created_at: string;
          display_name: string;
          id: string;
          rating_count: number;
          successful_returns: number;
          trust_score: number;
          updated_at: string;
          username: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          average_rating?: number;
          created_at?: string;
          display_name: string;
          id: string;
          rating_count?: number;
          successful_returns?: number;
          trust_score?: number;
          updated_at?: string;
          username?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          average_rating?: number;
          created_at?: string;
          display_name?: string;
          id?: string;
          rating_count?: number;
          successful_returns?: number;
          trust_score?: number;
          updated_at?: string;
          username?: string | null;
        };
        Relationships: [];
      };
      verification_questions: {
        Row: {
          created_at: string;
          id: string;
          item_id: string;
          position: number;
          question: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          item_id: string;
          position?: number;
          question: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          item_id?: string;
          position?: number;
          question?: string;
        };
        Relationships: [
          {
            foreignKeyName: "verification_questions_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "verification_questions_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "public_items_view";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      public_items_view: {
        Row: {
          brand: string | null;
          category: string | null;
          color: string | null;
          created_at: string | null;
          description: string | null;
          event_date: string | null;
          event_time: string | null;
          id: string | null;
          listing_type: Database["public"]["Enums"]["listing_type"] | null;
          location_text: string | null;
          status: Database["public"]["Enums"]["listing_status"] | null;
          title: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          brand?: string | null;
          category?: string | null;
          color?: string | null;
          created_at?: string | null;
          description?: string | null;
          event_date?: string | null;
          event_time?: string | null;
          id?: string | null;
          listing_type?: Database["public"]["Enums"]["listing_type"] | null;
          location_text?: string | null;
          status?: Database["public"]["Enums"]["listing_status"] | null;
          title?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          brand?: string | null;
          category?: string | null;
          color?: string | null;
          created_at?: string | null;
          description?: string | null;
          event_date?: string | null;
          event_time?: string | null;
          id?: string | null;
          listing_type?: Database["public"]["Enums"]["listing_type"] | null;
          location_text?: string | null;
          status?: Database["public"]["Enums"]["listing_status"] | null;
          title?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "items_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "items_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles_view";
            referencedColumns: ["id"];
          },
        ];
      };
      public_profiles_view: {
        Row: {
          avatar_url: string | null;
          average_rating: number | null;
          created_at: string | null;
          display_name: string | null;
          id: string | null;
          rating_count: number | null;
          successful_returns: number | null;
          trust_score: number | null;
          username: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          average_rating?: number | null;
          created_at?: string | null;
          display_name?: string | null;
          id?: string | null;
          rating_count?: number | null;
          successful_returns?: number | null;
          trust_score?: number | null;
          username?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          average_rating?: number | null;
          created_at?: string | null;
          display_name?: string | null;
          id?: string | null;
          rating_count?: number | null;
          successful_returns?: number | null;
          trust_score?: number | null;
          username?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      cancel_my_item: {
        Args: { p_item_id: string; p_reason?: string };
        Returns: {
          brand: string | null;
          category: string;
          closed_at: string | null;
          closed_reason: string | null;
          color: string | null;
          created_at: string;
          description: string;
          event_date: string;
          event_time: string | null;
          id: string;
          latitude: number | null;
          listing_type: Database["public"]["Enums"]["listing_type"];
          location_text: string;
          longitude: number | null;
          status: Database["public"]["Enums"]["listing_status"];
          title: string;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "items";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      close_my_item: {
        Args: { p_item_id: string; p_reason?: string };
        Returns: {
          brand: string | null;
          category: string;
          closed_at: string | null;
          closed_reason: string | null;
          color: string | null;
          created_at: string;
          description: string;
          event_date: string;
          event_time: string | null;
          id: string;
          latitude: number | null;
          listing_type: Database["public"]["Enums"]["listing_type"];
          location_text: string;
          longitude: number | null;
          status: Database["public"]["Enums"]["listing_status"];
          title: string;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "items";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      get_my_item_detail: {
        Args: { p_item_id: string };
        Returns: {
          brand: string | null;
          category: string;
          closed_at: string | null;
          closed_reason: string | null;
          color: string | null;
          created_at: string;
          description: string;
          event_date: string;
          event_time: string | null;
          id: string;
          latitude: number | null;
          listing_type: Database["public"]["Enums"]["listing_type"];
          location_text: string;
          longitude: number | null;
          status: Database["public"]["Enums"]["listing_status"];
          title: string;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "items";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      search_public_items: {
        Args: {
          p_category?: string;
          p_cursor_created_at?: string;
          p_cursor_id?: string;
          p_date_from?: string;
          p_date_to?: string;
          p_limit?: number;
          p_listing_type?: Database["public"]["Enums"]["listing_type"];
          p_location_query?: string;
          p_query?: string;
          p_sort?: string;
        };
        Returns: {
          brand: string;
          category: string;
          color: string;
          created_at: string;
          description: string;
          event_date: string;
          event_time: string;
          id: string;
          listing_type: Database["public"]["Enums"]["listing_type"];
          location_text: string;
          status: Database["public"]["Enums"]["listing_status"];
          title: string;
          updated_at: string;
          user_id: string;
        }[];
      };
      searchable_item_text: {
        Args: {
          p_brand: string;
          p_category: string;
          p_color: string;
          p_description: string;
          p_location_text: string;
          p_title: string;
        };
        Returns: string;
      };
      storage_path_item_id: { Args: { p_name: string }; Returns: string };
      update_my_profile: {
        Args: {
          p_avatar_url?: string;
          p_clear_avatar_url?: boolean;
          p_clear_username?: boolean;
          p_display_name?: string;
          p_username?: string;
        };
        Returns: {
          avatar_url: string | null;
          average_rating: number;
          created_at: string;
          display_name: string;
          id: string;
          rating_count: number;
          successful_returns: number;
          trust_score: number;
          updated_at: string;
          username: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "profiles";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      user_owns_item: { Args: { p_item_id: string }; Returns: boolean };
    };
    Enums: {
      listing_status: "ACTIVE" | "RECOVERY_IN_PROGRESS" | "RETURNED" | "CLOSED" | "CANCELLED";
      listing_type: "LOST" | "FOUND";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      listing_status: ["ACTIVE", "RECOVERY_IN_PROGRESS", "RETURNED", "CLOSED", "CANCELLED"],
      listing_type: ["LOST", "FOUND"],
    },
  },
} as const;
