export type FieldType = 'text' | 'number' | 'currency' | 'select' | 'multiselect' | 'note' | 'date';

export type Field = {
  id: string;
  label: string;
  type: FieldType;
  options?: string[];
  x: number;
  y: number;
  /** Width in grid columns. Defaults to 4. */
  w?: number;
  /** Height in grid rows. Defaults to 3. */
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

export type ClientFieldOverride = {
  id: string;
  client_id: string;
  field_id: string;
  x?: number | null;
  y?: number | null;
  w?: number | null;
  h?: number | null;
  hidden?: boolean | null;
  label_override?: string | null;
  type_override?: FieldType | null;
  options_override?: string[] | null;
  updated_at?: string | null;
};
