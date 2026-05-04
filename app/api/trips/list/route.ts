import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('trips')
      .select('id, trip_name, currency, travelers(name)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const trips = (data || []).map((t: any) => ({
      id: t.id,
      tripName: t.trip_name,
      currency: t.currency,
      travelers: t.travelers.map((tv: any) => tv.name),
    }));

    return NextResponse.json(trips);
  } catch (error) {
    console.error('[API/trips/list] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
