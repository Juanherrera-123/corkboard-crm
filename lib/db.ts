import { supabase } from './supabaseClient';
import type { User } from '@supabase/supabase-js';
import { uid } from './uid';
import { normalizeTemplate } from './types';
import type { Template } from './types';

/**
 * Normalizes and validates a template before persisting it.
 * Unknown field types or invalid coordinates are stripped or
 * coerced to safe defaults via {@link normalizeTemplate}.
 */
export function validateTemplateForSave(t: Template): Template {
  const normalized = normalizeTemplate(t);
  // Return a plain (unfrozen) object so it can be sent to Supabase
  return {
    ...normalized,
    fields: normalized.fields.map((f) => ({ ...f })),
  } as Template;
}

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
  if (error) throw new Error(error.message);
  cachedProfile = { user, org_id: data.org_id, role: data.role };
  return cachedProfile;
}

export function clearProfileCache() {
  cachedProfile = null;
}

export async function fetchTemplates() {
  console.debug('fetchTemplates start');
  const { user, org_id } = await getMyProfile();
  const { data, error } = await supabase
    .from('templates')
    .select('id,name,fields,created_at')
    .eq('org_id', org_id)
    .order('created_at', { ascending: false });
  if (error) {
    if (
      error.code === '401' ||
      error.code === '403' ||
      (error as any).status === 401 ||
      (error as any).status === 403
    ) {
      console.error('RLS denegó lectura en templates', {
        user_id: user.id,
        org_id,
      });
      throw new Error('No autorizado para leer templates');
    }
    throw new Error(error.message);
  }
  const templates = (data || []).map((tpl: any) =>
    normalizeTemplate({
      ...tpl,
      fields: (tpl.fields || [])
        .slice()
        .sort((a: any, b: any) =>
          typeof a.order === 'number' && typeof b.order === 'number'
            ? a.order - b.order
            : (a.y - b.y),
        ),
    }),
  );
  console.debug('fetchTemplates end', {
    org_id,
    templatesCount: templates.length,
    fieldsTotal: templates.reduce((sum, t) => sum + t.fields.length, 0),
  });
  return templates;
}

export async function fetchTemplate(tplId: string) {
  console.debug('fetchTemplate start', { tplId });
  const { data, error } = await supabase
    .from('templates')
    .select('id,name,fields,created_at')
    .eq('id', tplId)
    .single();
  if (error) throw new Error(error.message);
  const tpl = normalizeTemplate({
    ...data,
    fields: (data?.fields || [])
      .slice()
      .sort((a: any, b: any) =>
        typeof a.order === 'number' && typeof b.order === 'number'
          ? a.order - b.order
          : (a.y - b.y),
      ),
  } as any);
  console.debug('fetchTemplate end', { tplId, fieldsCount: tpl.fields.length });
  return tpl;
}

export async function createTemplate(name: string, fields: any[]) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No hay sesión');

  const { data: prof, error: pErr } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('user_id', user.id)
    .single();
  if (pErr) throw pErr;

  const validated = validateTemplateForSave({
    org_id: prof.org_id,
    name,
    fields,
  } as any);

  const payload = { org_id: prof.org_id, name: validated.name, fields: validated.fields };
  console.debug('createTemplate payload', payload);

  const { data, error } = await supabase
    .from('templates')
    .insert(payload)
    .select('id, name, fields, created_at')
    .single();

  if (error) throw error;
  return data;
}

export async function ensureDefaultTemplates(orgId: string) {
  const { count, error: countErr } = await supabase
    .from('templates')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId);
  if (countErr) throw new Error(countErr.message);
  if ((count ?? 0) > 0) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No logueado');
  const ibFields = [
    { id: uid(), label: '¿Qué tan grande es su Comunidad?', type: 'text', x: 1, y: 1, w: 5, h: 2 },
    { id: uid(), label: '¿Tiene un equipo de trabajo? ¿Cuántas personas?', type: 'text', x: 6, y: 1, w: 5, h: 2 },
    { id: uid(), label: '¿Cómo funciona su Comunidad? (Nuevos clientes)', type: 'text', x: 1, y: 3, w: 10, h: 2 },
    { id: uid(), label: '¿Qué broker utiliza actualmente?', type: 'text', x: 1, y: 5, w: 5, h: 2 },
    { id: uid(), label: '¿Qué plataforma utiliza para tradear?', type: 'text', x: 6, y: 5, w: 5, h: 2 },
    { id: uid(), label: '¿Qué tipo de instrumentos tradea?', type: 'text', x: 1, y: 7, w: 5, h: 2 },
    { id: uid(), label: 'Datos de contacto (celular y correo)', type: 'text', x: 6, y: 7, w: 5, h: 2 },
    { id: uid(), label: 'Estimación/plan de crecimiento', type: 'text', x: 1, y: 9, w: 5, h: 2 },
    { id: uid(), label: '¿Qué le interesa o está buscando?', type: 'text', x: 6, y: 9, w: 5, h: 2 },
    { id: uid(), label: 'Siguiente fecha de follow up', type: 'date', x: 1, y: 11, w: 5, h: 2 },
    { id: uid(), label: 'Notas de la conversación', type: 'note', x: 1, y: 13, w: 10, h: 3 },
  ];

  const traderFields = [
    {
      id: uid(),
      label: 'Red social de contacto inicial',
      type: 'multiselect',
      options: ['Instagram', 'Facebook', 'Telegram', 'LinkedIn', 'Kick', 'TikTok', 'Página oficial', 'Pipeline', 'Referido'],
      x: 1,
      y: 1,
      w: 10,
      h: 2,
    },
    { id: uid(), label: 'Datos de contacto (celular y correo)', type: 'text', x: 1, y: 3, w: 5, h: 2 },
    { id: uid(), label: '¿Qué instrumentos maneja?', type: 'text', x: 6, y: 3, w: 5, h: 2 },
    { id: uid(), label: '¿Cuánto tiempo lleva operando?', type: 'text', x: 1, y: 5, w: 5, h: 2 },
    { id: uid(), label: '¿Qué broker utiliza?', type: 'text', x: 6, y: 5, w: 5, h: 2 },
    { id: uid(), label: '¿Cuánto invierte regularmente?', type: 'text', x: 1, y: 7, w: 5, h: 2 },
    { id: uid(), label: '¿Cuántos lotes mueve al mes?', type: 'text', x: 6, y: 7, w: 5, h: 2 },
    { id: uid(), label: '¿Cuál es tu estrategia de trading?', type: 'text', x: 1, y: 9, w: 10, h: 2 },
    { id: uid(), label: '¿Qué indicadores o alertas utiliza?', type: 'text', x: 1, y: 11, w: 5, h: 2 },
    { id: uid(), label: '¿Qué plataforma utiliza para tradear?', type: 'text', x: 6, y: 11, w: 5, h: 2 },
    { id: uid(), label: '¿Hace copytrading?', type: 'text', x: 1, y: 13, w: 5, h: 2 },
    { id: uid(), label: '¿Qué otras herramientas usa? (bots / IA)', type: 'text', x: 6, y: 13, w: 5, h: 2 },
    {
      id: uid(),
      label: 'Intereses',
      type: 'multiselect',
      options: ['Educación en trading', 'Mejores herramientas', 'Facilidad para operar', 'Velocidad de respuesta', 'Nuevas estrategias', 'Copytrading'],
      x: 1,
      y: 15,
      w: 10,
      h: 2,
    },
    { id: uid(), label: 'Siguiente fecha de follow up', type: 'date', x: 1, y: 17, w: 5, h: 2 },
  ];

  const rows = [
    { org_id: orgId, name: 'IB', fields: ibFields, created_by: user.id },
    { org_id: orgId, name: 'Trader', fields: traderFields, created_by: user.id },
  ];

  const sanitizedRows = rows.map((r) => {
    const v = validateTemplateForSave(r as any);
    return { ...r, fields: v.fields };
  });

  const { error: insertErr } = await supabase
    .from('templates')
    .upsert(sanitizedRows, { onConflict: 'org_id,name', ignoreDuplicates: true });
  if (insertErr) throw new Error(insertErr.message);
}

export async function createClient(name: string, tag: string) {
  console.debug('createClient start', { nameLength: name.length, tagLength: tag.length });
  // 1) usuario actual
  const { data: u, error: eu } = await supabase.auth.getUser();
  if (eu) throw new Error(eu.message);
  const userId = u.user?.id;
  if (!userId) throw new Error('No hay sesión');

  // 2) org_id desde profiles
  const { data: prof, error: ep } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('user_id', userId)
    .limit(1)
    .single();
  if (ep) throw new Error(ep.message);
  const org_id = prof.org_id;
  if (!org_id) throw new Error('No se encontró org_id para el usuario');

  // 3) insert
  const { data, error } = await supabase
    .from('clients')
    .insert({ org_id, name, tag, created_by: userId })
    .select('id, name, tag, org_id, created_by')
    .single();

  if (error) throw new Error(error.message);
  console.debug('createClient end', {
    id: data.id,
    nameLength: name.length,
    tagLength: tag.length,
  });
  return data.id as string;
}

function normalizeAnswersBeforeSave(
  answers: Record<string, any>,
  fields: { id: string; type: string }[]
) {
  const byId = new Map(fields.map((f) => [f.id, f.type]));
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(answers)) {
    const t = byId.get(k);
    if (t === 'number' || t === 'currency') {
      const str = typeof v === 'string' ? v : String(v ?? '');
      const cleaned = str.replace(',', '.').trim();
      const num = Number(cleaned);
      out[k] = Number.isFinite(num) ? num : null;
    } else {
      // si no hay tipo (campo nuevo no persistido aún), conservar el valor
      out[k] = v;
    }
  }
  return out;
}

export async function upsertTemplateFields(templateId: string, fields: any[]) {
  const validated = validateTemplateForSave({ id: templateId, fields } as any);

  const { data, error } = await supabase
    .from('templates')
    .update({ fields: validated.fields })
    .eq('id', templateId)
    .select('id, fields')
    .single();
  if (error) throw error;
  return data;
}

export async function updateTemplateFields(templateId: string, fields: any[]) {
  return upsertTemplateFields(templateId, fields);
}


export async function saveClientRecord(
  clientId: string,
  templateId: string,
  answers: Record<string, any>,
  score: number,
  matches: any[],
  fields: { id: string; type: string }[]
) {
  if (!clientId || !templateId) throw new Error('Faltan ids');

  const normalized = normalizeAnswersBeforeSave(answers, fields);
  console.debug('saveClientRecord payload:', {
    clientId,
    templateId,
    score,
    matchesLen: matches?.length,
    answersKeys: Object.keys(normalized).length,
  });

  const payload = {
    client_id: clientId,
    template_id: templateId,
    answers: normalized,
    score,
    matches: matches ?? [],
  };

  const { data, error } = await supabase
    .from('client_records')
    .insert(payload)
    .select('id, client_id, created_at');

  if (error) throw error;
  return data;
}

export async function fetchLatestRecord(clientId: string) {
  const { data, error } = await supabase
    .from('client_records')
    .select('answers, template_id, score, matches, created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  return data && data[0] ? data[0] : null;
}

export async function fetchLastClientRecord(clientId: string, tplId: string) {
  const { data, error } = await supabase
    .from('client_records')
    .select('answers, template_id, score, matches, created_at')
    .eq('client_id', clientId)
    .eq('template_id', tplId)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  return data && data[0] ? data[0] : null;
}

export async function fetchNotes(clientId: string) {
  const { data, error } = await supabase
    .from('notes')
    .select('id, field_id, text, created_at, created_by')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) {
    if (
      error.code === '401' ||
      error.code === '403' ||
      (error as any).status === 401 ||
      (error as any).status === 403
    ) {
      const { user, org_id } = await getMyProfile();
      console.error('RLS denegó lectura en notes', {
        user_id: user.id,
        org_id,
      });
      throw new Error('No autorizado para leer notes');
    }
    throw new Error(error.message);
  }
  return data;
}

export async function addNote(clientId: string, fieldId: string, text: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }
  const { data, error } = await supabase
    .from('notes')
    .insert({ client_id: clientId, field_id: fieldId, text, created_by: user.id })
    .select('id, client_id, field_id, text, created_by')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchClientFieldOverrides(clientId: string) {
  const { data, error } = await supabase
    .from('client_field_overrides')
    .select('field_id, hidden, x, y, w, h, order')
    .eq('client_id', clientId);
  if (error) throw new Error(error.message);
  return (data as any[]) || [];
}

export async function hideFieldForClient(clientId: string, fieldId: string) {
  const { error } = await supabase
    .from('client_field_overrides')
    .upsert(
      {
        client_id: clientId,
        field_id: fieldId,
        hidden: true,
        x: null,
        y: null,
        w: null,
        h: null,
        order: null,
      },
      { onConflict: 'client_id,field_id' }
    );
  if (error) throw new Error(error.message);
}

export async function upsertClientFieldLayout(
  clientId: string,
  fieldId: string,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const { error } = await supabase
    .from('client_field_overrides')
    .upsert(
      { client_id: clientId, field_id: fieldId, x, y, w, h },
      { onConflict: 'client_id,field_id' },
    );
  if (error) throw new Error(error.message);
}

export async function deleteClient(clientId: string) {
  const { error: notesError } = await supabase.from('notes').delete().eq('client_id', clientId);
  if (notesError) throw new Error(notesError.message);
  const { error: recordsError } = await supabase
    .from('client_records')
    .delete()
    .eq('client_id', clientId);
  if (recordsError) throw new Error(recordsError.message);
  const { error } = await supabase.from('clients').delete().eq('id', clientId).single();
  if (error) throw new Error(error.message);
}

export async function logout() {
  await supabase.auth.signOut();
  document.cookie = 'sb-access-token=; path=/; max-age=0';
  document.cookie = 'sb-refresh-token=; path=/; max-age=0';
  clearProfileCache();
  window.location.href = '/login';
}
