// @ts-expect-error - Node types not available
import { randomUUID } from 'crypto';

export function uid(): string {
  return randomUUID();
}
