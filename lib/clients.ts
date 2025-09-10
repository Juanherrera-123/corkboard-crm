import { supabase } from './supabaseClient';
import { getMyProfile } from './db';

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
    .select('id,name,tag,created_at')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data ?? null;
}
