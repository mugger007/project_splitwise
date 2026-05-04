import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { tripId } = await request.json();

    // Publishable Key enforces RLS — query respects user permissions
    const { data, error } = await supabase
      .from('trips')
      .select('*, travelers(*), expenses(*, expense_shares(*))')
      .eq('id', tripId)
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

    // Transform data to match app state
    const travelers = data.travelers.map((t: any) => t.name);
    const expenses = data.expenses.map((ex: any) => ({
      id: ex.id,
      description: ex.description,
      amount: ex.amount,
      category: ex.category,
      paidBy: ex.paid_by,
      splitType: ex.split_type,
      date: ex.date,
      shares: Object.fromEntries(
        ex.expense_shares.map((s: any) => [s.traveler_name, s.share_amount])
      ),
    }));

    return NextResponse.json({
      tripName: data.trip_name,
      currency: data.currency,
      travelers,
      expenses,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
