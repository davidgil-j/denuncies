#!/usr/bin/env node
// Pruebas de la lógica que no necesita navegador ni base de datos. Uso: npm run test:logic
//
//  · Plazos de la Ley 2/2023 (src/lib/deadlines.js): la misma fecha en Madrid, Canarias, Londres,
//    Nueva York o Tokio, y la misma que guarda la base de datos al ampliar (Europe/Madrid).
//  · Limpieza de fotos de las denuncias anónimas (src/lib/cleanImage.js): sin EXIF, XMP ni texto.
// Para lo de las zonas horarias se vuelve a lanzar a sí mismo con TZ distintas.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const ZONES = ['Europe/Madrid', 'Atlantic/Canary', 'Europe/London', 'America/New_York', 'Asia/Tokyo', 'Pacific/Kiritimati'];

if (!process.env.LOGIC_CHILD) {
  let fail = 0;
  for (const tz of ZONES) {
    const r = spawnSync(process.execPath, [SELF], { env: { ...process.env, TZ: tz, LOGIC_CHILD: '1' }, encoding: 'utf8' });
    process.stdout.write(`\nZona ${tz}\n${r.stdout}`);
    if (r.status !== 0) { fail++; process.stdout.write(r.stderr); }
  }
  console.log(fail ? `\n✗ fallos en ${fail} zonas` : `\n✓ todo correcto en las ${ZONES.length} zonas`);
  process.exit(fail ? 1 : 0);
}

const { deadlineInfo, extensionUntil, madridDay, addMonthsDay, dayToIso, daysBetween } = await import('../src/lib/deadlines.js');
const { cleanForAnonymous, stripJpeg, stripPng, stripWebp } = await import('../src/lib/cleanImage.js');
const { isMissingSchema } = await import('../src/lib/whenFallback.js');

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, extra); } };
// Fecha de calendario tal como la verá quien mira la pantalla (en su zona)
const local = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// ── Plazos ────────────────────────────────────────────────────────────
// 31 de agosto a las 23:30 en Canarias = 1 de septiembre a las 00:30 en Madrid (hallazgo B-1)
const late = { created_at: '2026-08-31T22:30:00Z', status: 'received' };
const i1 = deadlineInfo(late, new Date('2026-09-05T10:00:00Z'));
ok('recibida a las 00:30 de Madrid cuenta como 1 de septiembre', dayToIso(madridDay(late.created_at)) === '2026-09-01');
ok('acuse hasta el 8 de septiembre, en cualquier zona', local(i1.ackDue) === '2026-09-08', local(i1.ackDue));
ok('respuesta hasta el 1 de diciembre, en cualquier zona', local(i1.respDue) === '2026-12-01', local(i1.respDue));
ok('la ampliación promete el 1 de marzo de 2027, lo mismo que guarda la base de datos', local(extensionUntil(late.created_at)) === '2027-03-01', local(extensionUntil(late.created_at)));
ok('el 5 de septiembre quedan 3 días para el acuse', i1.ack.days === 3, String(i1.ack.days));

ok('31 de mayo + 3 meses = 31 de agosto', dayToIso(addMonthsDay(madridDay('2026-05-31'), 3)) === '2026-08-31');
ok('30 de noviembre + 3 meses = 28 de febrero', dayToIso(addMonthsDay(madridDay('2026-11-30'), 3)) === '2027-02-28');
ok('30 de noviembre de 2027 + 3 meses = 29 de febrero (bisiesto)', dayToIso(addMonthsDay(madridDay('2027-11-30'), 3)) === '2028-02-29');
ok('una fecha ampliada (AAAA-MM-DD) se respeta tal cual', local(deadlineInfo({ ...late, status: 'investigating', extended_until: '2027-03-01' }).respDue) === '2027-03-01');
ok('del 28 de marzo al 29 (cambio de hora) es 1 día', daysBetween('2026-03-28T12:00:00Z', '2026-03-29T12:00:00Z') === 1);

// Vence el último día a las 23:59 de Madrid, no antes
const r = { created_at: '2026-06-01T08:00:00Z', status: 'investigating', acknowledged_at: '2026-06-02T08:00:00Z' };
ok('el último día (1 de septiembre, 23:30 en Madrid) aún está en plazo', deadlineInfo(r, new Date('2026-09-01T21:30:00Z')).resp.state !== 'overdue');
ok('a las 00:10 del día siguiente en Madrid, vencida', deadlineInfo(r, new Date('2026-09-01T22:10:00Z')).resp.state === 'overdue');
ok('con el plazo vencido no se ofrece ampliar', deadlineInfo(r, new Date('2026-09-02T10:00:00Z')).canExtend === false);
ok('dentro de plazo sí', deadlineInfo(r, new Date('2026-08-20T10:00:00Z')).canExtend === true);

// Caso reabierto (B-2): conserva su primera respuesta, sin cuenta atrás
const reo = deadlineInfo({ ...r, status: 'investigating', answered_at: '2026-07-01T10:00:00Z' }, new Date('2026-07-10T10:00:00Z'));
ok('un caso reabierto no tiene «días para responder» (antes: undefined)', reo.resp.days === undefined && reo.resp.state === 'met' && reo.canExtend === false);
// Acuse tardío (B-13)
const lateAck = deadlineInfo({ created_at: '2026-06-01T08:00:00Z', status: 'reviewing', acknowledged_at: '2026-06-09T08:00:00Z' });
ok('un acuse enviado el día 8 está fuera de plazo', lateAck.ack.late === true);
ok('un acuse enviado el día 7 está en plazo', deadlineInfo({ created_at: '2026-06-01T08:00:00Z', status: 'reviewing', acknowledged_at: '2026-06-08T21:00:00Z' }).ack.late === false);

// ── Cuándo se prueba «la versión de antes» (B-12) ───────────────────────
ok('una columna que no existe sí indica una migración pendiente', isMissingSchema({ code: '42703', message: 'column complaints.title does not exist' }));
ok('una función que no existe, también', isMissingSchema({ code: 'PGRST202', message: 'Could not find the function public.submit_complaint' }));
ok('un error 500 o un corte de red, no', !isMissingSchema({ code: '', message: 'Failed to fetch' }) && !isMissingSchema({ code: '57014', message: 'canceling statement due to statement timeout' }));

// ── Fotos de denuncias anónimas (A2-1) ─────────────────────────────────
const has = (bytes, text) => Buffer.from(bytes).includes(Buffer.from(text, 'latin1'));
const seg = (marker, payload) => { const p = Buffer.from(payload, 'latin1'); return Buffer.concat([Buffer.from([0xff, marker, (p.length + 2) >> 8, (p.length + 2) & 0xff]), p]); };
const jpeg = Buffer.concat([
  Buffer.from([0xff, 0xd8]), seg(0xe0, 'JFIF\0\x01\x01\0\0\x01\0\x01\0\0'), seg(0xe1, 'Exif\0\0GPSLatitude 41.38 Maria'), seg(0xe1, 'http://ns.adobe.com/xap/1.0/\0<x:xmpmeta>iPhone</x:xmpmeta>'),
  seg(0xfe, 'comentario de Maria'), seg(0xdb, 'tabla-de-cuantizacion'), Buffer.from([0xff, 0xda, 0x00, 0x04, 0x01, 0x00]), Buffer.from('datos-de-la-imagen'), Buffer.from([0xff, 0xd9]),
]);
const cj = stripJpeg(new Uint8Array(jpeg));
ok('JPEG: fuera EXIF (GPS), XMP y comentarios', cj && !has(cj, 'Exif') && !has(cj, 'GPS') && !has(cj, 'xmpmeta') && !has(cj, 'Maria'));
ok('JPEG: se conserva la imagen (JFIF, tablas y datos)', cj && cj[0] === 0xff && cj[1] === 0xd8 && has(cj, 'JFIF') && has(cj, 'tabla-de-cuantizacion') && has(cj, 'datos-de-la-imagen'));
ok('JPEG roto: no se da por limpio', stripJpeg(new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff, 1, 2])) === null);

const crc = () => Buffer.alloc(4);
const chunk = (type, data) => { const d = Buffer.from(data, 'latin1'); const len = Buffer.alloc(4); len.writeUInt32BE(d.length); return Buffer.concat([len, Buffer.from(type, 'latin1'), d, crc()]); };
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', 'cabecera13...'), chunk('tEXt', 'Author\0Maria'), chunk('eXIf', 'GPS 41.38'), chunk('IDAT', 'pixeles'), chunk('IEND', '')]);
const cp = stripPng(new Uint8Array(png));
ok('PNG: fuera texto y EXIF, se conservan cabecera e imagen', cp && !has(cp, 'Maria') && !has(cp, 'GPS') && has(cp, 'IHDR') && has(cp, 'pixeles') && has(cp, 'IEND'));

const wchunk = (type, data) => { const d = Buffer.from(data, 'latin1'); const len = Buffer.alloc(4); len.writeUInt32LE(d.length); return Buffer.concat([Buffer.from(type, 'latin1'), len, d, d.length & 1 ? Buffer.alloc(1) : Buffer.alloc(0)]); };
const wbody = Buffer.concat([wchunk('VP8X', Buffer.from([0x0c, 0, 0, 0, 0, 0, 0, 0, 0, 0]).toString('latin1')), wchunk('VP8 ', 'imagen-webp'), wchunk('EXIF', 'GPS Maria'), wchunk('XMP ', '<x>iPhone</x>')]);
const wsize = Buffer.alloc(4); wsize.writeUInt32LE(wbody.length + 4);
const webp = Buffer.concat([Buffer.from('RIFF'), wsize, Buffer.from('WEBP'), wbody]);
const cw = stripWebp(new Uint8Array(webp));
ok('WebP: fuera EXIF y XMP, con la cabecera y el tamaño corregidos', cw && !has(cw, 'Maria') && !has(cw, 'iPhone') && has(cw, 'imagen-webp') && (cw[20] & 0x0c) === 0 && Buffer.from(cw).readUInt32LE(4) === cw.length - 8);

const f = (bytes, name, type) => new File([bytes], name, { type });
const outJ = await cleanForAnonymous(f(jpeg, 'IMG_0042_Maria.jpg', 'image/jpeg'));
ok('una JPEG que no se puede redibujar sale limpia igualmente (antes: tal cual)', !!outJ && !has(new Uint8Array(await outJ.arrayBuffer()), 'GPS'));
ok('una foto HEIC que no se puede convertir no se envía (antes: con su GPS)', (await cleanForAnonymous(f(Buffer.from('ftypheic GPS Maria'), 'IMG_0042.heic', 'image/heic'))) === null);
ok('una JPEG rota tampoco', (await cleanForAnonymous(f(Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff, 1, 2]), 'roto.jpg', 'image/jpeg'))) === null);
const pdf = f(Buffer.from('%PDF-1.4 prueba'), 'informe.pdf', 'application/pdf');
ok('un PDF no se toca (el formulario avisa de sus datos ocultos)', (await cleanForAnonymous(pdf)) === pdf);

console.log(`  ${pass} correctas, ${fail} fallidas`);
process.exit(fail ? 1 : 0);
