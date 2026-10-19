// Decisiones de negocio del producto, en un solo sitio. Cada una lleva su número del plan (docs/PLAN_FASES.md); en
// docs/DECISIONES_TOMADAS.md está por qué se eligió, cuál era la alternativa y quién la tiene que revisar.
// Cambiar una decisión es cambiar su línea aquí: el resto del código lee estos valores y no los repite. (Las dos decisiones
// que no caben en una línea, n.º 68 y n.º 84, dicen en DECISIONES_TOMADAS.md dónde se cambian.)
// (Este archivo lo leen la aplicación y el generador de la web comercial: solo datos, sin importar nada.)

/** n.º 77 · Nombre del producto (el primero de los tres propuestos) y la empresa que lo firma */
export const NOMBRE_PRODUCTO = 'Reportia Canal';
export const EMPRESA = 'Reportia';

/** n.º 78 · Dirección pública de la web comercial y de los canales */
export const DOMINIO = 'canal.reportia.es';

/** n.º 80 · Precios, en euros y sin IVA. Los planes, al año; el pack, una sola vez; la gestión externa, desde, al año */
export const PLANES = [
  { id: 'essential', precio: 390 },  // hasta 249 trabajadores
  { id: 'business', precio: 790 },   // de 250 a 999 trabajadores
  { id: 'corporate', precio: null }, // 1.000 o más, y grupos de empresas: a medida
];
export const PACK_PUESTA_EN_MARCHA = 290;
export const GESTION_EXTERNA_DESDE = 990;
/** Días de prueba de una cuenta nueva. Tiene que coincidir con la migración 009 (trial_ends_at) */
export const DIAS_PRUEBA = 30;
export const CORREO_CONTACTO = 'info@reportia.es';

/** n.º 79 · El pie «Con Reportia» de los canales: visible. Reportia lo quita por empresa (migración 018) */
export const PIE_CON_REPORTIA = true;

/** n.º 85 · La multa, como dice el BOE (Ley 2/2023), sin redondear: se cita como un artículo más, no como gancho */
export const MULTA = {
  infraccion: '63.1 g)',  // no disponer de un sistema interno de información: infracción muy grave
  articulo: '65.1 b)',    // personas jurídicas, infracciones muy graves
  minimo: 600001,
  maximo: 1000000,
};

/** n.º 69 · Que los buscadores indexen la web comercial. No, hasta que canal.reportia.es apunte a la web */
export const INDEXAR_WEB = false;

/** n.º 83 · Reportia sobre blanco: su icono oficial y el nombre en tinta ('icono'); 'logotipo' usaría el logotipo verde */
export const LOGO_SOBRE_BLANCO = 'icono';
