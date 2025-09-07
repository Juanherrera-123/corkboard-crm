import { supabase } from './supabaseClient';
import type { User } from '@supabase/supabase-js';

type Profile = { user: User; org_id: string; role: string };

let cachedProfile: Profile | null = null;

export async function getMyProfile(): Promise<Profile> {
  if (cachedProfile) return cachedProfile;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No logueado');
  const { data, error } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('user_id', user.id)
    .single();
  if (error) throw error;
  cachedProfile = { user, org_id: data.org_id, role: data.role };
  return cachedProfile;
}

export function clearProfileCache() {
  cachedProfile = null;
}

export async function fetchTemplates() {
  const { org_id } = await getMyProfile();
  const { data, error } = await supabase
    .from('templates')
    .select('id,name,fields,created_at')
    .eq('org_id', org_id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createTemplate(name: string, fields: any[]) {
  const { org_id, user } = await getMyProfile();
  const { error } = await supabase
    .from('templates')
    .insert({ org_id, name, fields, created_by: user.id });
  if (error) throw error;
}

export async function createClient(name: string, tag: string) {
  // 1) usuario actual
  const { data: u, error: eu } = await supabase.auth.getUser();
  if (eu) throw eu;
  const userId = u.user?.id;
  if (!userId) throw new Error('No hay sesión');

  // 2) org_id desde profiles
  const { data: prof, error: ep } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('user_id', userId)
    .limit(1)
    .single();
  if (ep) throw ep;
  const org_id = prof.org_id;
  if (!org_id) throw new Error('No se encontró org_id para el usuario');

  // 3) insert
  const { data, error } = await supabase
    .from('clients')
    .insert([{ org_id, name, tag, created_by: userId }])
    .select('id')
    .limit(1)
    .single();

  if (error) throw error;
  return data!.id as string;
}

export async function saveClientRecord(clientId: string, templateId: string, answers: any, score: number, matches: any[]) {
  const { data, error } = await supabase.from('client_records')
    .insert({ client_id: clientId, template_id: templateId, answers, score, matches })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function fetchNotes(clientId: string) {
  const { data, error } = await supabase.from('notes')
    .select('id, field_id, text, created_at, created_by')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function addNote(clientId: string, fieldId: string, text: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }
  const { error } = await supabase
    .from('notes')
    .insert({ client_id: clientId, field_id: fieldId, text, created_by: user.id });
  if (error) throw error;
}

export async function logout() {
  await supabase.auth.signOut();
  document.cookie = 'sb-access-token=; path=/; max-age=0';
  document.cookie = 'sb-refresh-token=; path=/; max-age=0';
  clearProfileCache();
  window.location.href = '/login';
}
