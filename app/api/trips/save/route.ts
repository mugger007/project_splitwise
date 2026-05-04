import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { tripId, tripName, currency, travelers, expenses } = await request.json();

    // Publishable Key enforces RLS — only user's own trips can be updated
    if (tripId) {
      const { error: tripError } = await supabase
        .from('trips')
        .update({ trip_name: tripName, currency, updated_at: new Date().toISOString() })
        .eq('id', tripId);

      if (tripError) throw tripError;
    }

    // Sync travelers using Publishable Key (RLS enforced)
    const { data: existingTravelers } = await supabase
      .from('travelers')
      .select('name')
      .eq('trip_id', tripId);

    const existingNames = new Set(existingTravelers?.map((t: any) => t.name) || []);
    const newNames = new Set(travelers);

    // Delete removed travelers
    for (const name of existingNames) {
      if (!newNames.has(name)) {
        await supabase
          .from('travelers')
          .delete()
          .eq('trip_id', tripId)
          .eq('name', name);
      }
    }

    // Insert new travelers
    for (const name of newNames) {
      if (!existingNames.has(name)) {
        await supabase.from('travelers').insert({
          trip_id: tripId,
          name,
        });
      }
    }

    // Sync expenses using Publishable Key (RLS enforced)
    for (const expense of expenses) {
      if (expense.id.length < 20) {
        // New expense
        const { data: newExpense } = await supabase
          .from('expenses')
          .insert({
            trip_id: tripId,
            description: expense.description,
            amount: expense.amount,
            category: expense.category,
            paid_by: expense.paidBy,
            split_type: expense.splitType,
            date: expense.date,
          })
          .select()
          .single();

        if (newExpense) {
          // Insert shares
          const shares = Object.entries(expense.shares).map(([name, amount]: any) => ({
            expense_id: newExpense.id,
            traveler_name: name,
            share_amount: amount,
          }));

          await supabase.from('expense_shares').insert(shares);
        }
      } else {
        // Update existing expense
        await supabase
          .from('expenses')
          .update({
            description: expense.description,
            amount: expense.amount,
            category: expense.category,
            paid_by: expense.paidBy,
            split_type: expense.splitType,
            date: expense.date,
            updated_at: new Date().toISOString(),
          })
          .eq('id', expense.id);

        // Update shares
        await supabase
          .from('expense_shares')
          .delete()
          .eq('expense_id', expense.id);

        const shares = Object.entries(expense.shares).map(([name, amount]: any) => ({
          expense_id: expense.id,
          traveler_name: name,
          share_amount: amount,
        }));

        await supabase.from('expense_shares').insert(shares);
      }
    }

    return NextResponse.json({ success: true, tripId });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
