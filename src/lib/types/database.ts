export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          is_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string | null;
          avatar_url?: string | null;
          is_admin?: boolean;
          updated_at?: string;
        };
      };
      tanks: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          volume_gallons: number | null;
          volume_liters: number | null;
          tank_type: string;
          notes: string | null;
          cover_image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          volume_gallons?: number | null;
          volume_liters?: number | null;
          tank_type?: string;
          notes?: string | null;
          cover_image_url?: string | null;
        };
        Update: {
          name?: string;
          volume_gallons?: number | null;
          volume_liters?: number | null;
          tank_type?: string;
          notes?: string | null;
          cover_image_url?: string | null;
          updated_at?: string;
        };
      };
      species: {
        Row: {
          id: string;
          spec_code: number | null;
          common_name: string;
          scientific_name: string | null;
          genus: string | null;
          species_epithet: string | null;
          category: string;
          max_size_cm: number | null;
          min_tank_gallons: number | null;
          temp_min_c: number | null;
          temp_max_c: number | null;
          ph_min: number | null;
          ph_max: number | null;
          aggression_level: string | null;
          care_difficulty: string | null;
          swim_zone: string | null;
          diet: string | null;
          notes: string | null;
          image_url: string | null;
          fishbase_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          spec_code?: number | null;
          common_name: string;
          scientific_name?: string | null;
          genus?: string | null;
          species_epithet?: string | null;
          category: string;
          max_size_cm?: number | null;
          min_tank_gallons?: number | null;
          temp_min_c?: number | null;
          temp_max_c?: number | null;
          ph_min?: number | null;
          ph_max?: number | null;
          aggression_level?: string | null;
          care_difficulty?: string | null;
          swim_zone?: string | null;
          diet?: string | null;
          notes?: string | null;
          image_url?: string | null;
          fishbase_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          spec_code?: number | null;
          common_name?: string;
          scientific_name?: string | null;
          genus?: string | null;
          species_epithet?: string | null;
          category?: string;
          max_size_cm?: number | null;
          min_tank_gallons?: number | null;
          temp_min_c?: number | null;
          temp_max_c?: number | null;
          ph_min?: number | null;
          ph_max?: number | null;
          aggression_level?: string | null;
          care_difficulty?: string | null;
          swim_zone?: string | null;
          diet?: string | null;
          notes?: string | null;
          image_url?: string | null;
          fishbase_url?: string | null;
          updated_at?: string;
        };
      };
      tank_livestock: {
        Row: {
          id: string;
          tank_id: string;
          species_id: string;
          user_id: string;
          nickname: string | null;
          quantity: number;
          purchase_date: string | null;
          purchase_price: number | null;
          current_size_cm: number | null;
          notes: string | null;
          status: string;
          origin: string | null;
          life_stage: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tank_id: string;
          species_id: string;
          user_id: string;
          nickname?: string | null;
          quantity?: number;
          purchase_date?: string | null;
          purchase_price?: number | null;
          current_size_cm?: number | null;
          notes?: string | null;
          status?: string;
          origin?: string | null;
          life_stage?: string | null;
        };
        Update: {
          nickname?: string | null;
          quantity?: number;
          purchase_date?: string | null;
          purchase_price?: number | null;
          current_size_cm?: number | null;
          notes?: string | null;
          status?: string;
          origin?: string | null;
          life_stage?: string | null;
          updated_at?: string;
        };
      };
      livestock_photos: {
        Row: {
          id: string;
          livestock_id: string;
          user_id: string;
          storage_path: string;
          url: string;
          caption: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          livestock_id: string;
          user_id: string;
          storage_path: string;
          url: string;
          caption?: string | null;
        };
        Update: { caption?: string | null };
      };
      water_parameters: {
        Row: {
          id: string;
          tank_id: string;
          user_id: string;
          logged_at: string;
          temperature_c: number | null;
          ph: number | null;
          ammonia_ppm: number | null;
          nitrite_ppm: number | null;
          nitrate_ppm: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tank_id: string;
          user_id: string;
          logged_at: string;
          temperature_c?: number | null;
          ph?: number | null;
          ammonia_ppm?: number | null;
          nitrite_ppm?: number | null;
          nitrate_ppm?: number | null;
          notes?: string | null;
        };
        Update: {
          logged_at?: string;
          temperature_c?: number | null;
          ph?: number | null;
          ammonia_ppm?: number | null;
          nitrite_ppm?: number | null;
          nitrate_ppm?: number | null;
          notes?: string | null;
        };
      },
      beta_feedback: {
        Row: {
          id: string;
          created_at: string;
          user_id: string | null;
          type: string;
          content: string;
          page_url: string;
          status: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id?: string | null;
          type: string;
          content: string;
          page_url: string;
          status?: string;
        };
        Update: {
          status?: string;
        };
      },
    };
  };
}

// Convenience types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Tank = Database["public"]["Tables"]["tanks"]["Row"];
export type Species = Database["public"]["Tables"]["species"]["Row"];
export type TankLivestock = Database["public"]["Tables"]["tank_livestock"]["Row"];
export type LivestockPhoto = Database["public"]["Tables"]["livestock_photos"]["Row"];
export type WaterParameter = Database["public"]["Tables"]["water_parameters"]["Row"];

export type TankLivestockWithSpecies = TankLivestock & {
  species: Species;
};
