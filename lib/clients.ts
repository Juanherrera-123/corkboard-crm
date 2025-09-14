import { supabase } from './supabaseClient';
import { getMyProfile } from './db';

export type ClientRow = {
  id: string;
  name: string;
  tag: string;
  created_at: string;
  confidence_score: number | null;
  confidence_note: string | null;
};

export async function fetchClients({
  orgId,
  userId,
}: {
  orgId?: string;
  userId?: string;
} = {}): Promise<ClientRow[]> {
  let query = supabase
    .from('clients')
    .select('id,name,tag,created_at,confidence_score,confidence_note');

  if (orgId) query = query.eq('org_id', orgId);
  else if (userId) query = query.eq('created_by', userId);

  const { data, error } = await query
    .limit(50)
    .order('created_at', { ascending: false });
  if (error) {
    if (
      error.code === '401' ||
      error.code === '403' ||
      (error as any).status === 401 ||
      (error as any).status === 403
    ) {
      const { user, org_id } = await getMyProfile();
      console.error('RLS denegó lectura en clients', {
        user_id: user.id,
        org_id,
      });
      throw new Error('No autorizado para leer clients');
    }
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function fetchClient(id: string): Promise<ClientRow | null> {
  const { data, error } = await supabase
    .from('clients')
    .select('id,name,tag,created_at,confidence_score,confidence_note')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data ?? null;
}

export async function updateClientName(id: string, name: string): Promise<ClientRow> {
  const { data, error } = await supabase
    .from('clients')
    .update({ name })
    .eq('id', id)
    .select('id,name,tag,created_at,confidence_score,confidence_note')
    .single();
  if (error) throw new Error(error.message);
  return data as ClientRow;
}
