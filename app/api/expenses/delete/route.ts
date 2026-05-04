import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { expenseId } = await request.json();
    console.log('[API/expenses/delete] Received expenseId:', expenseId, 'type:', typeof expenseId, 'length:', expenseId?.length);

    if (!expenseId) {
      console.log('[API/expenses/delete] No expenseId provided');
      return NextResponse.json({ error: 'Missing expenseId' }, { status: 400 });
    }

    // Delete expense_shares first (foreign key constraint)
    console.log('[API/expenses/delete] Deleting expense shares for expenseId:', expenseId);
    const { data: sharesData, error: sharesError } = await supabase
      .from('expense_shares')
      .delete()
      .eq('expense_id', expenseId);

    console.log('[API/expenses/delete] Shares delete response:', { sharesData, sharesError });

    if (sharesError) {
      console.error('[API/expenses/delete] Shares delete error:', sharesError);
      throw sharesError;
    }

    // Delete expense
    console.log('[API/expenses/delete] Deleting expense with id:', expenseId);
    const { data: expenseData, error: expenseError } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId);

    console.log('[API/expenses/delete] Expense delete response:', { expenseData, expenseError });

    if (expenseError) {
      console.error('[API/expenses/delete] Expense delete error:', expenseError);
      throw expenseError;
    }

    console.log('[API/expenses/delete] Expense deleted successfully, id:', expenseId);
    return NextResponse.json({ success: true, deletedId: expenseId });
  } catch (error) {
    console.error('[API/expenses/delete] Exception:', error);
    return NextResponse.json({ error: String(error), details: error }, { status: 500 });
  }
}

