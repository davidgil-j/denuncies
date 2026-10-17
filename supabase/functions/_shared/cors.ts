// Desde qué webs se puede llamar a una función del servidor con el navegador (CORS). Secreto ALLOWED_ORIGINS: las
// direcciones separadas por comas (por ejemplo «https://canal.reportia.es,https://reportia-canal.vercel.app»). Sin él,
// desde cualquiera, como hasta ahora: la sesión y la verificación en dos pasos siguen siendo la barrera de verdad.
// Las carpetas que empiezan por «_» no son funciones: Supabase no las despliega solas, las incluye quien las importa.

const ALLOWED = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean);

/** El origen que se devuelve en Access-Control-Allow-Origin para esta petición */
export function allowOrigin(req: Request): string {
  if (!ALLOWED.length) return '*';
  const origin = req.headers.get('Origin') ?? '';
  // Si no está en la lista, se responde con la primera: el navegador no deja leer la respuesta a otra web
  return ALLOWED.includes(origin) ? origin : ALLOWED[0];
}

/**
 * Envuelve la función: pone las cabeceras de CORS de cada petición en su respuesta (también en la del OPTIONS previo)
 * y avisa a las cachés de que la respuesta cambia según el origen.
 */
export function withCors(handler: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    const res = await handler(req);
    res.headers.set('Access-Control-Allow-Origin', allowOrigin(req));
    if (ALLOWED.length) res.headers.append('Vary', 'Origin');
    return res;
  };
}
