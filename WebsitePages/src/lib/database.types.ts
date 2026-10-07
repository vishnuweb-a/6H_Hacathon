export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
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
      match_dismissals: {
        Row: {
          created_at: string;
          match_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          match_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          match_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "match_dismissals_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_dismissals_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_dismissals_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "public_profiles_view";
            referencedColumns: ["id"];
          },
        ];
      };
      matches: {
        Row: {
          category_score: number | null;
          created_at: string;
          description_score: number | null;
          found_item_id: string;
          id: string;
          location_score: number | null;
          lost_item_id: string;
          overall_score: number;
          status: Database["public"]["Enums"]["match_status"];
          time_score: number | null;
          updated_at: string;
        };
        Insert: {
          category_score?: number | null;
          created_at?: string;
          description_score?: number | null;
          found_item_id: string;
          id?: string;
          location_score?: number | null;
          lost_item_id: string;
          overall_score: number;
          status?: Database["public"]["Enums"]["match_status"];
          time_score?: number | null;
          updated_at?: string;
        };
        Update: {
          category_score?: number | null;
          created_at?: string;
          description_score?: number | null;
          found_item_id?: string;
          id?: string;
          location_score?: number | null;
          lost_item_id?: string;
          overall_score?: number;
          status?: Database["public"]["Enums"]["match_status"];
          time_score?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "matches_found_item_id_fkey";
            columns: ["found_item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_found_item_id_fkey";
            columns: ["found_item_id"];
            isOneToOne: false;
            referencedRelation: "public_items_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_lost_item_id_fkey";
            columns: ["lost_item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_lost_item_id_fkey";
            columns: ["lost_item_id"];
            isOneToOne: false;
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
      category_compatibility_map: { Args: never; Returns: Json };
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
      dismiss_match: { Args: { p_match_id: string }; Returns: Json };
      generate_matches: { Args: { p_item_id: string }; Returns: Json };
      get_matches_for_item: {
        Args: { p_item_id: string; p_limit?: number };
        Returns: {
          category_score: number;
          created_at: string;
          description_score: number;
          found_item_id: string;
          id: string;
          is_dismissed: boolean;
          location_score: number;
          lost_item_id: string;
          matched_signals: string[];
          my_item_id: string;
          my_item_title: string;
          other_brand: string;
          other_category: string;
          other_color: string;
          other_description: string;
          other_event_date: string;
          other_event_time: string;
          other_item_id: string;
          other_listing_type: Database["public"]["Enums"]["listing_type"];
          other_location_text: string;
          other_status: Database["public"]["Enums"]["listing_status"];
          other_title: string;
          other_user_id: string;
          overall_score: number;
          status: Database["public"]["Enums"]["match_status"];
          strength: string;
          time_score: number;
          updated_at: string;
        }[];
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
      get_my_matches: {
        Args: {
          p_include_dismissed?: boolean;
          p_item_id?: string;
          p_limit?: number;
          p_strength?: string;
        };
        Returns: {
          category_score: number;
          created_at: string;
          description_score: number;
          found_item_id: string;
          id: string;
          is_dismissed: boolean;
          location_score: number;
          lost_item_id: string;
          matched_signals: string[];
          my_item_id: string;
          my_item_title: string;
          other_brand: string;
          other_category: string;
          other_color: string;
          other_description: string;
          other_event_date: string;
          other_event_time: string;
          other_item_id: string;
          other_listing_type: Database["public"]["Enums"]["listing_type"];
          other_location_text: string;
          other_status: Database["public"]["Enums"]["listing_status"];
          other_title: string;
          other_user_id: string;
          overall_score: number;
          status: Database["public"]["Enums"]["match_status"];
          strength: string;
          time_score: number;
          updated_at: string;
        }[];
      };
      haversine_km: {
        Args: { p_lat1: number; p_lat2: number; p_lon1: number; p_lon2: number };
        Returns: number;
      };
      match_attribute_score: {
        Args: { p_left: string; p_right: string };
        Returns: number;
      };
      match_category_score: {
        Args: { p_found_category: string; p_lost_category: string };
        Returns: number;
      };
      match_date_score: {
        Args: { p_found_date: string; p_lost_date: string };
        Returns: number;
      };
      match_description_score: {
        Args: {
          p_found_brand: string;
          p_found_color: string;
          p_found_description: string;
          p_found_title: string;
          p_lost_brand: string;
          p_lost_color: string;
          p_lost_description: string;
          p_lost_title: string;
        };
        Returns: number;
      };
      match_location_score: {
        Args: {
          p_found_lat: number;
          p_found_location_text: string;
          p_found_lon: number;
          p_lost_lat: number;
          p_lost_location_text: string;
          p_lost_lon: number;
        };
        Returns: number;
      };
      match_location_score_from_km: { Args: { p_km: number }; Returns: number };
      match_overall_score: {
        Args: {
          p_category_score: number;
          p_description_score: number;
          p_location_score: number;
          p_time_score: number;
        };
        Returns: number;
      };
      match_signals: {
        Args: {
          p_category_score: number;
          p_description_score: number;
          p_location_score: number;
          p_time_score: number;
        };
        Returns: string[];
      };
      match_strength: { Args: { p_overall_score: number }; Returns: string };
      match_time_proximity_score: {
        Args: { p_found_time: string; p_lost_time: string };
        Returns: number;
      };
      match_time_score: {
        Args: {
          p_found_date: string;
          p_found_time: string;
          p_lost_date: string;
          p_lost_time: string;
        };
        Returns: number;
      };
      matching_config: { Args: never; Returns: Json };
      matching_stopwords: { Args: never; Returns: string[] };
      matching_synonyms: { Args: never; Returns: Json };
      matching_tokens: { Args: { p_text: string }; Returns: string[] };
      normalize_matching_text: { Args: { p_text: string }; Returns: string };
      restore_match: { Args: { p_match_id: string }; Returns: Json };
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
      token_overlap_score: {
        Args: { p_left: string; p_right: string };
        Returns: number;
      };
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
      user_participates_in_match: {
        Args: { p_match_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      listing_status: "ACTIVE" | "RECOVERY_IN_PROGRESS" | "RETURNED" | "CLOSED" | "CANCELLED";
      listing_type: "LOST" | "FOUND";
      match_status: "ACTIVE" | "DISMISSED" | "CLAIMED" | "EXPIRED";
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
  public: {
    Enums: {
      listing_status: ["ACTIVE", "RECOVERY_IN_PROGRESS", "RETURNED", "CLOSED", "CANCELLED"],
      listing_type: ["LOST", "FOUND"],
      match_status: ["ACTIVE", "DISMISSED", "CLAIMED", "EXPIRED"],
    },
  },
} as const;
