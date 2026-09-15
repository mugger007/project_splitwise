import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('trips')
      .select('id, trip_name, currency')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const tripIds = (data || []).map((trip: any) => trip.id);
    const { data: travelerData, error: travelerError } = tripIds.length
      ? await supabase
          .from('travelers')
          .select('trip_id, name')
          .in('trip_id', tripIds)
      : { data: [], error: null };

    if (travelerError) throw travelerError;

    const travelersByTrip = new Map<string, string[]>();
    for (const traveler of travelerData || []) {
      const travelers = travelersByTrip.get(traveler.trip_id) || [];
      travelers.push(traveler.name);
      travelersByTrip.set(traveler.trip_id, travelers);
    }

    const trips = (data || []).map((t: any) => ({
      id: t.id,
      tripName: t.trip_name,
      currency: t.currency,
      travelers: travelersByTrip.get(t.id) || [],
    }));

    return NextResponse.json(trips);
  } catch (error) {
    console.error('[API/trips/list] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
