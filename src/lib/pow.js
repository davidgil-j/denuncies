// Prueba de trabajo del portal de seguimiento (hallazgo A2). Busca un «nonce» tal que
// sha-256("token:nonce") empiece por «bits» ceros. Es el mismo cálculo que verify_pow() en la base de
// datos (migración 021). No usa terceros ni guarda ninguna IP: solo cuesta tiempo de CPU, y la dificultad
// la decide el servidor (sube con los intentos fallidos, nunca bloquea).

const enc = new TextEncoder();

/** ¿Los primeros «bits» bits del hash son cero? (igual que la comprobación de la base de datos) */
function hasLeadingZeroBits(bytes, bits) {
  const full = bits >> 3;
  const rem = bits & 7;
  for (let i = 0; i < full; i++) if (bytes[i] !== 0) return false;
  if (rem !== 0 && (bytes[full] >> (8 - rem)) !== 0) return false;
  return true;
}

/**
 * Resuelve el reto. Devuelve el nonce (texto) o lanza si no hay sha-256 en el navegador.
 * signal: un AbortSignal opcional para poder cancelar.
 */
export async function solveProofOfWork(token, bits, { signal } = {}) {
  const subtle = globalThis.crypto && globalThis.crypto.subtle;
  if (!subtle) throw new Error('no-subtle');
  const target = Math.max(0, Math.min(Number(bits) || 0, 32));
  for (let n = 0; ; n++) {
    if (signal?.aborted) throw new Error('aborted');
    const digest = new Uint8Array(await subtle.digest('SHA-256', enc.encode(`${token}:${n}`)));
    if (hasLeadingZeroBits(digest, target)) return String(n);
  }
}
