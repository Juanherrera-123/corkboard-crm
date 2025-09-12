import { uid } from './uid';

export { gridCols, DEFAULT_W, DEFAULT_H, minW, maxW, minH, maxH } from './layout';
export type FieldType =
  | 'text'
  | 'number'
  | 'currency'
  | 'select'
  | 'multiselect'
  | 'note'
  | 'date';

export type Field = {
  id: string;
  label: string;
  type: FieldType;
  options?: string[];
  x: number;
  y: number;
  /** Display order starting at 0. */
  order: number;
  /** Width in grid columns. Defaults to DEFAULT_W. */
  w?: number;
  /** Height in grid rows. Defaults to DEFAULT_H. */
  h?: number;
};

export type Template = {
  id: string;
  org_id: string;
  name: string;
  fields: Field[];
  created_at?: string;
  updated_at?: string | null;
};

export type Script = {
  id: string;
  org_id: string;
  name: string;
  content: string;
  created_at?: string;
  updated_at?: string | null;
};

export type ClientFieldOverride = {
  id: string;
  client_id: string;
  field_id: string;
  x?: number | null;
  y?: number | null;
  w?: number | null;
  h?: number | null;
  order?: number | null;
  hidden?: boolean | null;
  label_override?: string | null;
  type_override?: FieldType | null;
  options_override?: string[] | null;
  updated_at?: string | null;
};

export class TemplateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TemplateError';
  }
}

const ALLOWED_TYPES: FieldType[] = [
  'text',
  'number',
  'currency',
  'select',
  'multiselect',
  'note',
  'date',
];

const DEFAULT_FIELD_POS = { x: 1, y: 1, w: 3, h: 2 } as const;

export function normalizeTemplate(t: unknown): Template {
  if (!t || typeof t !== 'object' || !('fields' in t) || !Array.isArray((t as any).fields)) {
    throw new TemplateError('Invalid template data');
  }

  const tpl: any = t;
  const dedup = new Set<string>();
  const fields: Field[] = [];

  for (const raw of tpl.fields as any[]) {
    if (!raw || typeof raw !== 'object') continue;

    const id: string =
      typeof raw.id === 'string'
        ? raw.id
        : typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function'
          ? (crypto as any).randomUUID()
          : uid();
    if (dedup.has(id)) continue;
    dedup.add(id);

    if (typeof raw.label !== 'string') continue;
    if (!ALLOWED_TYPES.includes(raw.type)) continue;

    const x = typeof raw.x === 'number' && raw.x >= 1 ? raw.x : DEFAULT_FIELD_POS.x;
    const y = typeof raw.y === 'number' && raw.y >= 1 ? raw.y : DEFAULT_FIELD_POS.y;
    const w = typeof raw.w === 'number' && raw.w >= 1 ? raw.w : DEFAULT_FIELD_POS.w;
    const h = typeof raw.h === 'number' && raw.h >= 1 ? raw.h : DEFAULT_FIELD_POS.h;
    const order = typeof raw.order === 'number' && raw.order >= 0 ? raw.order : fields.length;

    const field: Field = {
      id,
      label: raw.label,
      type: raw.type,
      x,
      y,
      order,
      w,
      h,
    };

    if (raw.type === 'select' || raw.type === 'multiselect') {
      if (Array.isArray(raw.options)) field.options = raw.options.slice();
    }

    fields.push(field);
  }

  fields.sort((a, b) => a.order - b.order);
  fields.forEach((f, idx) => {
    f.order = idx;
    Object.freeze(f);
  });

  Object.freeze(fields);

  const normalized: Template = {
    ...tpl,
    fields,
  };

  return Object.freeze(normalized);
}
