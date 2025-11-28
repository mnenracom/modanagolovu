import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials are missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Включаем сохранение сессии для Supabase Auth
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce', // Используем PKCE flow для лучшей безопасности
  },
});

// Типы для таблиц Supabase
export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: number;
          name: string;
          description: string | null;
          price: number;
          wholesale_price: number;
          category: string;
          images: string[] | null;
          in_stock: boolean;
          stock_quantity: number;
          min_order_quantity: number;
          created_at: string;
          updated_at?: string;
        };
        Insert: {
          id?: number;
          name: string;
          description?: string | null;
          price: number;
          wholesale_price: number;
          category: string;
          images?: string[] | null;
          in_stock?: boolean;
          stock_quantity?: number;
          min_order_quantity?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          description?: string | null;
          price?: number;
          wholesale_price?: number;
          category?: string;
          images?: string[] | null;
          in_stock?: boolean;
          stock_quantity?: number;
          min_order_quantity?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: number;
          customer_name: string;
          customer_email: string | null;
          customer_phone: string | null;
          customer_address: string | null;
          total_amount: number;
          status: string;
          payment_method: string | null;
          payment_status: string | null;
          shipping_method: string | null;
          created_at: string;
          updated_at?: string;
        };
        Insert: {
          id?: number;
          customer_name: string;
          customer_email?: string | null;
          customer_phone?: string | null;
          customer_address?: string | null;
          total_amount: number;
          status?: string;
          payment_method?: string | null;
          payment_status?: string | null;
          shipping_method?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          customer_name?: string;
          customer_email?: string | null;
          customer_phone?: string | null;
          customer_address?: string | null;
          total_amount?: number;
          status?: string;
          payment_method?: string | null;
          payment_status?: string | null;
          shipping_method?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}






