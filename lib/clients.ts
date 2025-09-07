import { supabase } from './supabaseClient';

export type ClientRow = { id: string; name: string; tag: string; created_at: string };

export async function fetchClients(): Promise<ClientRow[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('id,name,tag,created_at')
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
