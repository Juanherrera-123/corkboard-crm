import { supabase } from '@/lib/supabaseClient';
import { ensureDefaultTemplates } from '@/lib/db';

export async function ensureProfileAndOrg() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No session');

  // ¿Ya hay profile?
  const { data: prof, error: pErr } = await supabase
    .from('profiles')
    .select('user_id, org_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (pErr) throw pErr;
  if (prof?.org_id) {
    await ensureDefaultTemplates(prof.org_id);
    return prof.org_id;
  }

  // Crear org propia para este usuario (o unir a una existente si tienes invitaciones)
  const { data: orgRow, error: oErr } = await supabase
    .from('orgs')
    .insert({ name: user.email || 'Mi organización' })
    .select('id')
    .single();
  if (oErr) throw oErr;

  const orgId = orgRow.id as string;

  // Crear profile
  const { error: iErr } = await supabase
    .from('profiles')
    .insert({ user_id: user.id, org_id: orgId, role: 'member' });
  if (iErr) throw iErr;

  // Sembrar plantillas base si no hay
  await ensureDefaultTemplates(orgId);
  return orgId;
}
