import { supabase } from './supabaseClient';

export function subscribeClientLive(
  clientId: string,
  onRecord: (payload:any)=>void,
  onNote: (payload:any)=>void
) {
  const ch = supabase.channel(`client-${clientId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'client_records', filter: `client_id=eq.${clientId}` },
      onRecord
    )
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'notes', filter: `client_id=eq.${clientId}` },
      onNote
    )
    .subscribe();
  return () => supabase.removeChannel(ch);
}
