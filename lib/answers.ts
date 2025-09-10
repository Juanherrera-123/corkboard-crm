export function mergeAnswers(
  prevAnswers: Record<string, any>,
  currentAnswers: Record<string, any>,
  fields: { id: string }[],
): Record<string, any> {
  const ids = new Set(fields.map((f) => f.id));
  const out: Record<string, any> = {};
  ids.forEach((id) => {
    if (Object.prototype.hasOwnProperty.call(currentAnswers, id)) {
      out[id] = currentAnswers[id];
    } else if (Object.prototype.hasOwnProperty.call(prevAnswers, id)) {
      out[id] = prevAnswers[id];
    }
  });
  return out;
}
