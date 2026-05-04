import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { tripId, expense } = await request.json();
    console.log('[API/expenses/add] Received:', { tripId, expenseId: expense.id });

    if (!tripId || !expense) {
      return NextResponse.json({ error: 'Missing tripId or expense' }, { status: 400 });
    }

    let savedExpense = expense;

    // Check if expense exists (ID length > 20 = DB UUID)
    if (expense.id.length > 20) {
      console.log('[API/expenses/add] Updating existing expense:', expense.id);
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
        console.error('[API/expenses/add] Update error:', updateError);
        throw updateError;
      }

      // Update shares
      await supabase.from('expense_shares').delete().eq('expense_id', expense.id);
      const shares = Object.entries(expense.shares).map(([name, amount]: any) => ({
        expense_id: expense.id,
        traveler_name: name,
        share_amount: amount,
      }));
      const { error: sharesError } = await supabase.from('expense_shares').insert(shares);
      if (sharesError) throw sharesError;

      console.log('[API/expenses/add] Expense updated');
    } else {
      // New expense
      console.log('[API/expenses/add] Creating new expense');
      const { data: newExpense, error: insertError } = await supabase
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

      if (insertError) {
        console.error('[API/expenses/add] Insert error:', insertError);
        throw insertError;
      }

      savedExpense = { ...expense, id: newExpense.id };
      console.log('[API/expenses/add] Expense created with id:', newExpense.id);

      // Insert shares
      const shares = Object.entries(expense.shares).map(([name, amount]: any) => ({
        expense_id: newExpense.id,
        traveler_name: name,
        share_amount: amount,
      }));
      const { error: sharesError } = await supabase.from('expense_shares').insert(shares);
      if (sharesError) throw sharesError;
    }

    return NextResponse.json({ success: true, expense: savedExpense });
  } catch (error) {
    console.error('[API/expenses/add] Exception:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
