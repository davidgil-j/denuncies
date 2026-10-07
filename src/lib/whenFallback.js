// El «cuándo» en texto libre («desde septiembre») tiene columna propia desde la migración 012.
// Mientras una base de datos no la tenga, se guarda al final de la descripción para que quien
// gestiona lo lea igualmente. Se añade UNA sola vez y solo en ese caso.

/** Descripción con el «cuándo» al final: «…texto\n\nCuándo: desde septiembre» */
export function withWhen(description, when, label) {
  const text = (description ?? '').trim();
  const w = (when ?? '').trim();
  return w ? `${text}\n\n${label}: ${w}` : text;
}

/**
 * Inserta una fila con el «cuándo» en su columna y, si la base de datos la rechaza (columna que
 * aún no existe), lo intenta una vez más con el «cuándo» dentro de la descripción.
 * insert(row) → { error }. Devuelve { error, usedColumn }.
 */
export async function insertWithWhen(insert, row, when, label) {
  const w = (when ?? '').trim();
  if (!w) return { ...(await insert(row)), usedColumn: false };
  const first = await insert({ ...row, incident_when: w });
  if (!first.error) return { error: null, usedColumn: true };
  const second = await insert({ ...row, description: withWhen(row.description, w, label) });
  return { error: second.error ?? null, usedColumn: false };
}
