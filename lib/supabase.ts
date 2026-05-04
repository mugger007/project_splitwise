import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !publishableKey) {
  throw new Error('Missing Supabase environment variables');
}

// Client with Publishable Key (enforces RLS policies)
// Safe to use client-side and in API routes
export const supabase = createClient(supabaseUrl, publishableKey);

// Type definitions
export interface Trip {
  id: string;
  user_id: string;
  trip_name: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Traveler {
  id: string;
  trip_id: string;
  name: string;
  created_at: string;
}

export interface Expense {
  id: string;
  trip_id: string;
  description: string;
  amount: number;
  category: string;
  paid_by: string;
  split_type: 'equal' | 'custom';
  date: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseShare {
  id: string;
  expense_id: string;
  traveler_name: string;
  share_amount: number;
  created_at: string;
}

