import { supabase } from './supabaseClient'; // adjust path if different

// Replace with YOUR downpayment rule.
// Your dashboard examples: ₱2,000 → ₱500, ₱1,000 → ₱300, ₱1,500 → ₱500
export function computeDownpaymentDue(fee) {
  const f = Number(fee) || 0;
  if (f >= 1500) return 500;
  if (f >= 1000) return 300;
  return Math.round(f * 0.3);
}

// Manual event: goes to booking_requests as "awaiting_dp".
// NO schedule_events insert and NO event_payments insert here.
export async function createManualBooking(form) {
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) throw userErr || new Error('Not signed in');

  const fee = Number(form.fee) || 0;

  const { data, error } = await supabase
    .from('booking_requests')
    .insert({
      photographer_id: user.id,
      client_name: form.client_name,
      title: form.title,
      category: form.category || null,
      event_date: form.event_date,   // 'YYYY-MM-DD'
      start_time: form.start_time,   // 'HH:MM'
      end_time: form.end_time,       // 'HH:MM'
      location: form.location || null,
      notes: form.notes || null,
      status: 'awaiting_dp',
      offered_fee: fee,
      downpayment_amount: computeDownpaymentDue(fee),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Photographer confirms the downpayment was received.
// amount: number, paidAt: ISO string (optional, defaults to now)
export async function confirmBookingDownpayment(requestId, amount, paidAt) {
  const { data, error } = await supabase.rpc('confirm_booking_downpayment', {
    p_request_id: requestId,
    p_amount: Number(amount),
    p_paid_at: paidAt || new Date().toISOString(),
  });
  if (error) throw error;
  return data; // new schedule_events id
}