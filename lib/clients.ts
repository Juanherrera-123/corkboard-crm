import { supabase } from './supabaseClient';

export type ClientRow = { id: string; name: string; tag: string; created_at: string };

export async function fetchClients({
  orgId,
  userId,
}: {
  orgId?: string;
  userId?: string;
} = {}): Promise<ClientRow[]> {
  let query = supabase
    .from('clients')
    .select('id,name,tag,created_at');

  if (orgId) query = query.eq('org_id', orgId);
  else if (userId) query = query.eq('created_by', userId);

  const { data, error } = await query
    .limit(50)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchClient(id: string): Promise<ClientRow | null> {
  const { data, error } = await supabase
    .from('clients')
    .select('id,name,tag,created_at')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data ?? null;
}
