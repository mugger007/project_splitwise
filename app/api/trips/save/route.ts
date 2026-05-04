import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { tripId, tripName, currency, travelers, expenses } = await request.json();
    console.log('[API/trips/save] Received:', { tripId, tripName, currency, travelerCount: travelers?.length, expenseCount: expenses?.length });

    if (!tripId) {
      console.log('[API/trips/save] No tripId provided');
      return NextResponse.json({ error: 'Missing tripId' }, { status: 400 });
    }

    // Publishable Key enforces RLS — only user's own trips can be updated
    console.log('[API/trips/save] Updating trip metadata...');
    if (tripId) {
      const { error: tripError } = await supabase
        .from('trips')
        .update({ trip_name: tripName, currency, updated_at: new Date().toISOString() })
        .eq('id', tripId);

      if (tripError) {
        console.error('[API/trips/save] Trip update error:', tripError);
        throw tripError;
      }
      console.log('[API/trips/save] Trip updated successfully');
    }

    // Sync travelers using Publishable Key (RLS enforced)
    console.log('[API/trips/save] Syncing travelers...');
    const { data: existingTravelers } = await supabase
      .from('travelers')
      .select('name')
      .eq('trip_id', tripId);

    const existingNames = new Set(existingTravelers?.map((t: any) => t.name) || []);
    const newNames = new Set(travelers);

    console.log('[API/trips/save] Existing travelers:', Array.from(existingNames), 'New travelers:', Array.from(newNames));

    // Delete removed travelers
    for (const name of existingNames) {
      if (!newNames.has(name)) {
        console.log('[API/trips/save] Deleting traveler:', name);
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
        console.log('[API/trips/save] Inserting traveler:', name);
        await supabase.from('travelers').insert({
          trip_id: tripId,
          name,
        });
      }
    }

    // Sync expenses using Publishable Key (RLS enforced)
    console.log('[API/trips/save] Syncing expenses...');
    const expenseIdMap: Record<string, string> = {}; // localId -> dbId mapping

    for (const expense of expenses) {
      if (expense.id.length < 20) {
        // New expense
        console.log('[API/trips/save] Creating new expense:', expense.description, 'localId:', expense.id);
        const { data: newExpense, error: expenseError } = await supabase
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

        if (expenseError) {
          console.error('[API/trips/save] Expense insert error:', expenseError);
          throw expenseError;
        }

        if (newExpense) {
          console.log('[API/trips/save] Expense created with localId:', expense.id, 'dbId:', newExpense.id);
          expenseIdMap[expense.id] = newExpense.id;

          // Insert shares
          const shares = Object.entries(expense.shares).map(([name, amount]: any) => ({
            expense_id: newExpense.id,
            traveler_name: name,
            share_amount: amount,
          }));

          console.log('[API/trips/save] Inserting shares:', shares);
          const { error: sharesError } = await supabase.from('expense_shares').insert(shares);
          if (sharesError) {
            console.error('[API/trips/save] Shares insert error:', sharesError);
            throw sharesError;
          }
        }
      } else {
        // Update existing expense
        console.log('[API/trips/save] Updating existing expense:', expense.id);
        const { error: updateError } = await supabase
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

        if (updateError) {
          console.error('[API/trips/save] Expense update error:', updateError);
          throw updateError;
        }

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

        const { error: sharesError } = await supabase.from('expense_shares').insert(shares);
        if (sharesError) {
          console.error('[API/trips/save] Shares update error:', sharesError);
          throw sharesError;
        }
      }
    }

    console.log('[API/trips/save] All data synced successfully, expenseIdMap:', expenseIdMap);
    return NextResponse.json({ success: true, tripId, expenseIdMap });
  } catch (error) {
    console.error('[API/trips/save] Exception:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
