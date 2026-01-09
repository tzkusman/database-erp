
export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  category: string;
  image_url?: string;
  created_at?: string;
  user_id?: string;
}

export interface Profile {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  website?: string;
  updated_at?: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export type ViewType = 'dashboard' | 'inventory' | 'settings' | 'setup' | 'auth';
