
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
  owner?: {
    full_name?: string;
    avatar_url?: string;
  };
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  sku_ref?: string;
  department: 'planning' | 'cutting' | 'stitching' | 'washing' | 'finishing';
  status: 'todo' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assigned_to?: string;
  due_date?: string;
  user_id: string;
  order_index: number;
  created_at: string;
  creator?: {
    full_name?: string;
    avatar_url?: string;
  };
  assignee?: {
    full_name?: string;
    avatar_url?: string;
  };
}

export interface Profile {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  website?: string;
  updated_at?: string;
  email?: string;
}

export interface EmailAttachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface Email {
  id: string;
  user_id: string;
  recipient_email: string;
  subject: string;
  body: string;
  attachments: EmailAttachment[];
  status: 'sent' | 'pending' | 'failed';
  created_at: string;
  sender?: {
    full_name: string;
    avatar_url: string;
  };
}

export type ViewType = 'dashboard' | 'inventory' | 'tasks' | 'emails' | 'settings' | 'setup' | 'auth';
