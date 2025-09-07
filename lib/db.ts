import { supabase } from './supabaseClient';

export async function getMyProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No logueado');
  const { data, error } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('user_id', user.id)
    .single();
  if (error) throw error;
  return { user, org_id: data.org_id, role: data.role };
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
  const { error } = await supabase.from('templates')
    .insert({ org_id, name, fields, created_by: user.id });
  if (error) throw error;
}

export async function createClient(name: string, tag='Lead') {
  const { org_id, user } = await getMyProfile();
  const { data, error } = await supabase.from('clients')
    .insert({ org_id, name, tag, created_by: user.id })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
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
