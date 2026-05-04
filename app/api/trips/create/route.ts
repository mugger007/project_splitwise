import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    console.log('[API/trips/create] Creating new trip');

    // Create trip with default user_id (since no auth yet)
    const tripData = {
      user_id: '00000000-0000-0000-0000-000000000000', // Default user UUID
      trip_name: 'My Trip',
      currency: 'MYR',
    };

    console.log('[API/trips/create] Inserting trip data:', tripData);

    const { data: newTrip, error: tripError } = await supabase
      .from('trips')
      .insert(tripData)
      .select()
      .single();

    console.log('[API/trips/create] Insert response - error:', tripError, 'data:', newTrip);

    if (tripError) {
      console.error('[API/trips/create] Trip creation error:', JSON.stringify(tripError));
      return NextResponse.json({ error: String(tripError), details: tripError }, { status: 500 });
    }

    if (!newTrip) {
      console.error('[API/trips/create] No trip returned from insert');
      return NextResponse.json({ error: 'No trip data returned' }, { status: 500 });
    }

    console.log('[API/trips/create] Trip created successfully with id:', newTrip.id);
    return NextResponse.json({ tripId: newTrip.id, success: true });
  } catch (error) {
    console.error('[API/trips/create] Exception:', error);
    return NextResponse.json({ error: String(error), exception: error }, { status: 500 });
  }
}

