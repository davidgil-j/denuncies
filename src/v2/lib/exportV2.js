// Exportacions v2 (Excel i PDF) amb el sistema visual "Institucional rigurosa".
// Mateixes signatures i dades que src/lib/export.js, més un darrer paràmetre opcional `lang` ('ca' | 'es' | 'en', per defecte 'es').
// El panell v2 ha de passar sempre l'idioma actiu: exportSummaryToPDF(rows, filters, lang).
//
// Diferències respecte a l'original (compatibles cap enrere):
// · Les funcions PDF són async: carreguen la tipografia sota demanda i resolen quan el fitxer s'ha desat.
// · Dades opcionals que s'aprofiten si arriben: `filters.organization` (nom o { name }) a l'informe;
//   `complaint.organization` / `complaint.organizations` (nom de l'empresa), `complaint.attachments`
//   i `complaint.audit_logs` (registre d'activitat) a la fitxa.
// · En una denúncia anònima (is_anonymous !== false) mai s'imprimeixen nom, correu ni telèfon.
// · buildExcelWorkbook / buildSummaryPDF / buildComplaintPDF retornen el document sense descarregar-lo
//   (útil per a previsualitzacions i proves).

import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { translations } from '../../translations.js';
import { deadlineInfo } from '../../lib/deadlines.js';

const LANGS = ['ca', 'es', 'en'];
const LOCALE = { ca: 'ca-ES', es: 'es-ES', en: 'en-GB' };
const STATUS_ORDER = ['received', 'reviewing', 'investigating', 'waiting', 'resolved', 'closed', 'archived'];
const CLOSED = new Set(['resolved', 'closed', 'archived']);
const PRIORITY_ORDER = ['critical', 'high', 'normal', 'low'];

// Paleta (mateixos valors que els tokens de src/v2/v2.css)
// Los colores del sistema «B · Color» (src/v2/ds.css): tinta, azul del producto y sus neutros
const C = {
  navy:   [13, 21, 48],    // --ink: títulos, cabeceras de tabla y marca
  accent: [47, 84, 235],   // --report: el azul del producto
  ink:    [13, 21, 48],
  ink2:   [77, 86, 114],   // --muted
  ink3:   [98, 107, 133],
  line:   [215, 222, 239], // --line
  line2:  [238, 241, 247], // --soft
  bg:     [242, 244, 248], // --bg
  tint:   [232, 237, 255], // --report-soft
  danger: [156, 28, 18],   // --danger
  white:  [255, 255, 255],
  onAccent: [227, 233, 255], // --on-report-muted: texto secundario sobre el azul
};
const argb = rgb => 'FF' + rgb.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();

// ── Textos ──────────────────────────────────────────────────────────

function fmt(str, vars = {}) {
  return String(str).replace(/\{(\w+)\}(\.?)/g, (m, k, dot) => {
    if (!(k in vars)) return m;
    const v = String(vars[k]);
    return dot && v.endsWith('.') ? v : v + dot;
  });
}

function dict(lang) {
  const L = LANGS.includes(lang) ? lang : 'es';
  const tr = translations[L];
  const t = translations[L].v2export;
  const cats = Object.fromEntries((tr.categories ?? []).map(c => [c.value, c.label]));
  return {
    L,
    t,
    locale: LOCALE[L],
    channel: tr.v2?.channelName ?? '',
    status: s => tr.v2admin?.status?.[s] ?? tr.status?.[s] ?? s ?? '',
    category: c => cats[c] ?? c ?? '',
    priority: p => t.priorities[p] ?? p ?? '',
    mode: c => (isIdentified(c) ? t.identified : t.anonymous),
    langName: l => t.langNames[l] ?? (l ? String(l).toUpperCase() : ''),
    // Columnas del rediseño: vía de entrada, reunión presencial y resultado (arts. 7.2 y 26)
    x: tr.panel?.xl ?? {},
    via: c => (c?.channel && c.channel !== 'web' ? tr.panel?.chan?.[c.channel] ?? c.channel : tr.panel?.xl?.web ?? ''),
    outcome: o => (o ? tr.panel?.outcomes?.[o] ?? o : ''),
  };
}

// Només una denúncia marcada explícitament com a identificada pot mostrar dades personals.
const isIdentified = c => c?.is_anonymous === false;
// Un caso con los datos suprimidos (art. 32) cuenta como cerrado, igual que en el panel
const isOpen = c => !CLOSED.has(c?.status) && !c?.anonymized_at;

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? '').concat(parts[1]?.[0] ?? '').toUpperCase();
}

function pickName(src) {
  if (!src) return '';
  if (typeof src === 'string') return src.trim();
  if (Array.isArray(src)) return pickName(src[0]);
  return typeof src.name === 'string' ? src.name.trim() : '';
}

function orgOf(complaint) {
  return pickName(complaint?.organization) || pickName(complaint?.organizations) || pickName(complaint?.organization_name);
}

// ── Dates i terminis ────────────────────────────────────────────────

function toDate(v) {
  if (!v) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  const s = String(v);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s); // data sense hora: dia local, sense salt de zona horària
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const fDate = (v, locale) => {
  const d = toDate(v);
  return d ? d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
};
const fTime = (d, locale) => d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
const fDateTime = (v, locale) => {
  const d = toDate(v);
  return d ? `${fDate(d, locale)}  ${fTime(d, locale)}` : '';
};
const fLong = (d, locale) => d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
const isoDay = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Terminis de l'article 9 de la Llei 2/2023, amb el mateix compte que el panell (src/lib/deadlines.js):
 * acusament en 7 dies naturals i resposta en 3 mesos o fins a la data ampliada, en dies de Madrid.
 * Una denúncia ja resposta (encara que s'hagi reobert) o suprimida no surt mai com a vençuda.
 */
function legalDeadlines(complaint, now, messages = []) {
  const received = toDate(complaint?.created_at);
  if (!received) return null;
  const P = deadlineInfo(complaint, now);
  const open = isOpen(complaint) && !complaint.anonymized_at;
  const firstManagerMsg = (messages ?? [])
    .filter(m => m?.sender === 'manager')
    .map(m => toDate(m.created_at))
    .filter(Boolean)
    .sort((a, b) => a - b)[0] ?? null;
  return {
    received,
    ack: P.ackDue,
    reply: P.respDue,
    open,
    ackLeft: P.ack.days,   // sense valor si ja s'ha fet
    replyLeft: P.resp.days,
    // Vençuda: oberta, sense resposta i passat el termini (ampliat si escau)
    overdue: open && P.resp.state === 'overdue',
    ackOverdue: open && P.ack.state === 'overdue',
    firstManagerMsg,
  };
}

function countdown(t, left) {
  if (left > 1) return fmt(t.dLeft, { n: left });
  if (left === 1) return t.dLeftOne;
  if (left === 0) return t.dToday;
  if (left === -1) return t.dOverOne;
  return fmt(t.dOver, { n: -left });
}

function formatBytes(bytes, locale) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  const v = n / 1024 ** i;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: i === 0 ? 0 : 1 }).format(v)} ${units[i]}`;
}

function fileType(att) {
  const ext = /\.([a-z0-9]{1,5})$/i.exec(att?.filename ?? '')?.[1];
  if (ext) return ext.toUpperCase();
  const sub = (att?.mime_type ?? '').split('/')[1];
  return sub ? sub.toUpperCase() : '';
}

// ── Descàrrega ──────────────────────────────────────────────────────

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// ── Excel ───────────────────────────────────────────────────────────

const XL = {
  font: 'Calibri',
  dateFmt: 'dd/mm/yyyy',
  thin: { style: 'thin', color: { argb: argb(C.line2) } },
  navyRule: { style: 'medium', color: { argb: argb(C.navy) } },
};
// ExcelJS desa les dates en UTC: es passa el dia local com a migdia UTC perquè no canviï de dia.
const xlDate = d => (d ? new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12)) : null);
const xlEscape = s => String(s).replace(/&/g, '&&');
const sheetRef = name => `'${String(name).replace(/'/g, "''")}'`;
const colLetter = n => {
  let s = '';
  for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

/** Construeix el llibre Excel (full de dades + full "Resum") sense descarregar-lo. */
export async function buildExcelWorkbook(complaints = [], lang = 'es', { now = new Date() } = {}) {
  const D = dict(lang);
  const { t, locale } = D;
  const list = Array.isArray(complaints) ? complaints : [];
  const org = list.map(orgOf).find(Boolean) ?? '';

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Reportia';
  wb.lastModifiedBy = 'Reportia';
  wb.created = now;
  wb.modified = now;
  wb.title = t.summaryTitle;
  wb.subject = D.channel;
  if (org) wb.company = org;
  wb.calcProperties.fullCalcOnLoad = true;

  // Full 1 · dades
  const cols = [
    { key: 'code',     header: t.cCode },
    { key: 'category', header: t.cCategory },
    { key: 'status',   header: t.cStatus },
    { key: 'priority', header: t.cPriority },
    { key: 'mode',     header: t.cMode },
    { key: 'dept',     header: t.cDept },
    { key: 'incident', header: t.cIncident,      date: true },
    { key: 'received', header: t.cReceivedLong,  date: true },
    { key: 'acked',    header: t.cAcked,         date: true },
    { key: 'deadline', header: t.cDeadline,      date: true },
    { key: 'answered', header: t.cAnswered,      date: true },
    { key: 'lang',     header: t.cLang },
    { key: 'via',      header: D.x.channel ?? 'Vía de entrada' },
    { key: 'when',     header: D.x.when ?? 'Cuándo' },
    { key: 'meetReq',  header: D.x.meetingReq ?? 'Reunión pedida',     date: true },
    { key: 'meetHeld', header: D.x.meetingHeld ?? 'Reunión celebrada', date: true },
    { key: 'outcome',  header: D.x.outcome ?? 'Resultado' },
  ];
  const colIndex = Object.fromEntries(cols.map((c, i) => [c.key, i + 1]));

  const rows = list.map(c => {
    const dl = legalDeadlines(c, now);
    return {
      raw: c,
      overdue: !!dl && dl.overdue,
      values: {
        code:     c.tracking_code ?? '',
        category: D.category(c.category),
        status:   D.status(c.status),
        priority: D.priority(c.priority),
        mode:     D.mode(c),
        dept:     c.department ?? '',
        incident: xlDate(toDate(c.incident_date)),
        received: xlDate(toDate(c.created_at)),
        // Dates del llibre registre (art. 26): acusament, termini (ampliat si escau) i resposta
        acked:    xlDate(toDate(c.acknowledged_at)),
        deadline: dl ? xlDate(dl.reply) : null,   // ja inclou l'ampliació
        answered: xlDate(toDate(c.answered_at)),
        lang:     D.langName(c.language),
        via:      D.via(c),
        when:     c.incident_when ?? '',
        // La reunión cuenta desde que se pidió (antes de la migración 012, desde la recepción)
        meetReq:  c.meeting_requested ? xlDate(toDate(c.meeting_requested_at ?? c.created_at)) : null,
        meetHeld: xlDate(toDate(c.meeting_held_at)),
        outcome:  D.outcome(c.outcome),
      },
    };
  });

  const ws = wb.addWorksheet(t.xSheet, {
    properties: { tabColor: { argb: argb(C.navy) }, defaultRowHeight: 20 },
    views: [{ state: 'frozen', xSplit: 1, ySplit: 1, showGridLines: false, activeCell: 'A2' }],
  });

  ws.columns = cols.map(c => {
    const longest = rows.reduce((max, r) => {
      const v = r.values[c.key];
      const len = c.date ? 10 : String(v ?? '').length;
      return Math.max(max, len);
    }, 0);
    return { key: c.key, header: c.header, width: Math.min(48, Math.max(12, Math.ceil(Math.max(longest, c.header.length) * 1.12) + 4)) };
  });

  const head = ws.getRow(1);
  head.height = 30;
  head.eachCell(cell => {
    cell.font = { name: XL.font, size: 11, bold: true, color: { argb: argb(C.white) } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(C.navy) } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true };
  });

  rows.forEach(r => {
    const row = ws.addRow(r.values);
    row.height = 20;
    row.eachCell({ includeEmpty: true }, (cell, n) => {
      const key = cols[n - 1].key;
      cell.font = { name: XL.font, size: 11, color: { argb: argb(C.ink) } };
      cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      cell.border = { bottom: XL.thin };
      if (cols[n - 1].date) cell.numFmt = XL.dateFmt;
      if (key === 'code') cell.font = { ...cell.font, bold: true, color: { argb: argb(C.navy) } };
      if (key === 'priority' && r.raw.priority === 'critical') cell.font = { ...cell.font, bold: true, color: { argb: argb(C.danger) } };
      if (key === 'priority' && r.raw.priority === 'high') cell.font = { ...cell.font, bold: true };
      if (key === 'deadline' && r.overdue) cell.font = { ...cell.font, bold: true, color: { argb: argb(C.danger) } };
    });
  });

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, rows.length + 1), column: cols.length } };
  ws.pageSetup = {
    paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0,
    margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
    printTitlesRow: '1:1',
  };
  ws.headerFooter = {
    oddHeader: `&L&"${XL.font},Bold"${xlEscape(org || D.channel)}&R&"${XL.font},Bold"${xlEscape(t.confidential.toUpperCase())}`,
    oddFooter: `&L${xlEscape(t.docConfidential)}&R${fmt(xlEscape(t.page), { n: '&P', total: '&N' })}`,
  };

  // Full 2 · resum (fórmules COUNTIF sobre el full de dades, amb el resultat ja calculat)
  const ss = wb.addWorksheet(t.xSummarySheet, {
    properties: { tabColor: { argb: argb(C.accent) } },
    views: [{ showGridLines: false }],
  });
  ss.columns = [{ width: 40 }, { width: 14 }, { width: 14 }];
  const ref = sheetRef(t.xSheet);
  const total = list.length;

  const put = (r, text, font, height) => {
    const cell = ss.getCell(`A${r}`);
    cell.value = text;
    cell.font = { name: XL.font, ...font };
    cell.alignment = { vertical: 'middle' };
    if (height) ss.getRow(r).height = height;
  };
  put(1, t.xSummaryTitle, { size: 16, bold: true, color: { argb: argb(C.navy) } }, 28);
  put(2, org ? `${org} · ${D.channel}` : D.channel, { size: 11, color: { argb: argb(C.ink2) } }, 18);
  put(3, fmt(t.generated, { date: fLong(now, locale), time: fTime(now, locale) }), { size: 10, color: { argb: argb(C.ink3) } }, 16);
  put(4, t.docConfidential.toUpperCase(), { size: 9, bold: true, color: { argb: argb(C.accent) } }, 16);

  let r = 6;
  const block = (title, labelHeader, items, dataCol) => {
    put(r, title, { size: 12, bold: true, color: { argb: argb(C.navy) } }, 22);
    r += 1;
    const hr = ss.getRow(r);
    hr.values = [labelHeader, t.xCount, t.xShare];
    hr.height = 22;
    hr.eachCell((cell, n) => {
      cell.font = { name: XL.font, size: 10, bold: true, color: { argb: argb(C.white) } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(C.navy) } };
      cell.alignment = { vertical: 'middle', horizontal: n === 1 ? 'left' : 'right', indent: 1 };
    });
    r += 1;
    const first = r;
    const totalRow = first + items.length;
    const letter = colLetter(colIndex[dataCol]);
    items.forEach(it => {
      const row = ss.getRow(r);
      row.height = 19;
      row.getCell(1).value = it.label;
      row.getCell(2).value = { formula: `COUNTIF(${ref}!$${letter}:$${letter},A${r})`, result: it.n };
      row.getCell(3).value = { formula: `IF($B$${totalRow}=0,0,B${r}/$B$${totalRow})`, result: total ? it.n / total : 0 };
      row.eachCell({ includeEmpty: true }, (cell, n) => {
        cell.font = { name: XL.font, size: 11, color: { argb: argb(it.n ? C.ink : C.ink3) } };
        cell.alignment = { vertical: 'middle', horizontal: n === 1 ? 'left' : 'right', indent: 1 };
        cell.border = { bottom: XL.thin };
      });
      row.getCell(3).numFmt = '0.0%';
      r += 1;
    });
    const tr = ss.getRow(r);
    tr.height = 21;
    tr.getCell(1).value = t.xTotal;
    tr.getCell(2).value = { formula: `SUM(B${first}:B${totalRow - 1})`, result: items.reduce((s, it) => s + it.n, 0) };
    tr.getCell(3).value = { formula: `IF(B${totalRow}=0,0,1)`, result: total ? 1 : 0 };
    tr.eachCell({ includeEmpty: true }, (cell, n) => {
      cell.font = { name: XL.font, size: 11, bold: true, color: { argb: argb(C.navy) } };
      cell.alignment = { vertical: 'middle', horizontal: n === 1 ? 'left' : 'right', indent: 1 };
      cell.border = { top: XL.navyRule };
    });
    tr.getCell(3).numFmt = '0.0%';
    r += 2;
  };

  // Comptatges a partir dels valors visibles del full de dades (inclou valors fora de catàleg)
  const countBy = (keys, labelOf, valueKey) => {
    const counts = new Map();
    rows.forEach(row => counts.set(row.values[valueKey], (counts.get(row.values[valueKey]) ?? 0) + 1));
    const items = keys.map(k => ({ label: labelOf(k), n: counts.get(labelOf(k)) ?? 0 }));
    const known = new Set(items.map(i => i.label));
    counts.forEach((n, label) => { if (label && !known.has(label)) items.push({ label, n }); });
    return items;
  };
  const categoryKeys = (translations[D.L].categories ?? []).map(c => c.value);
  block(t.xByStatus,   t.cStatus,   countBy(STATUS_ORDER, D.status, 'status'), 'status');
  block(t.xByCategory, t.cCategory, countBy(categoryKeys, D.category, 'category'), 'category');
  block(t.xByPriority, t.cPriority, countBy(PRIORITY_ORDER, D.priority, 'priority'), 'priority');
  block(t.xByMode,     t.cMode,     countBy([false, true], v => (v ? t.anonymous : t.identified), 'mode'), 'mode');
  put(r, fmt(t.xNote, { sheet: t.xSheet }), { size: 9, italic: true, color: { argb: argb(C.ink3) } });

  ss.pageSetup = {
    paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0,
    margins: { left: 0.6, right: 0.6, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
  };
  ss.headerFooter = { ...ws.headerFooter };

  return wb;
}

export async function exportToExcel(complaints, filename, lang = 'es') {
  const { t } = dict(lang);
  const wb = await buildExcelWorkbook(complaints, lang);
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, `${filename || t.fileExcel}_${isoDay(new Date())}.xlsx`);
}

// ── PDF · base comuna ───────────────────────────────────────────────

let fontsPromise = null;
function loadFonts() {
  if (!fontsPromise) {
    fontsPromise = import('./pdfFonts.js').catch(() => {
      fontsPromise = null; // es tornarà a provar a la següent exportació
      return null;
    });
  }
  return fontsPromise;
}

async function createDoc(orientation, D) {
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4', compress: true });
  let F = { text: 'helvetica', display: 'helvetica', displayStyle: 'bold' };
  const fonts = await loadFonts();
  if (fonts) {
    try {
      // Manrope, la tipografia del producte (scripts/pdf-fonts.mjs): 400 per al text, 700 per a les negretes i 800 per als títols
      doc.addFileToVFS('Manrope-Regular.ttf', fonts.TEXT_400);
      doc.addFont('Manrope-Regular.ttf', 'Manrope', 'normal');
      doc.addFileToVFS('Manrope-Bold.ttf', fonts.TEXT_700);
      doc.addFont('Manrope-Bold.ttf', 'Manrope', 'bold');
      doc.addFileToVFS('Manrope-ExtraBold.ttf', fonts.DISPLAY_800);
      doc.addFont('Manrope-ExtraBold.ttf', 'ManropeDisplay', 'normal');
      doc.setFont('Manrope', 'normal');
      F = { text: 'Manrope', display: 'ManropeDisplay', displayStyle: 'normal' };
    } catch {
      doc.setFont('helvetica', 'normal'); // si la tipografia falla, Helvetica
    }
  }
  if (typeof doc.setLanguage === 'function') doc.setLanguage(D.locale);
  doc.setLineHeightFactor(1.35);
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = orientation === 'landscape' ? 16 : 18;
  return { doc, F, D, W, H, M, CW: W - M * 2, TOP: 30, BOTTOM: H - 21, y: 0 };
}

function font(ctx, { kind = 'text', bold = false, size = 9, color = C.ink } = {}) {
  const { doc, F } = ctx;
  if (kind === 'display') doc.setFont(F.display, F.displayStyle);
  else doc.setFont(F.text, bold ? 'bold' : 'normal');
  doc.setFontSize(size);
  doc.setTextColor(...color);
}

function fit(doc, text, maxW) {
  const s = String(text ?? '');
  if (doc.getTextWidth(s) <= maxW) return s;
  let out = s;
  while (out.length > 1 && doc.getTextWidth(out + '…') > maxW) out = out.slice(0, -1);
  return out.trimEnd() + '…';
}

function newPage(ctx) {
  ctx.doc.addPage();
  ctx.y = ctx.TOP;
}

function ensureSpace(ctx, needed) {
  if (ctx.y + needed > ctx.BOTTOM) newPage(ctx);
}

// Capçalera de cada pàgina: banda, organització, canal i marca de confidencialitat
function drawRunningHeader(ctx) {
  const { doc, W, M, D, org } = ctx;
  doc.setFillColor(...C.accent);
  doc.rect(0, 0, W, 2.2, 'F');

  const mid = 12.6;
  const label = D.t.confidential.toUpperCase();
  font(ctx, { bold: true, size: 6.6, color: C.accent });
  const spacing = 0.32;
  const labelW = doc.getTextWidth(label) + spacing * (label.length - 1);
  const bw = labelW + 5.2;
  const bh = 5.4;
  const bx = W - M - bw;
  doc.setDrawColor(...C.accent);
  doc.setLineWidth(0.25);
  doc.roundedRect(bx, mid - bh / 2, bw, bh, 1, 1, 'S');
  doc.setCharSpace(spacing);
  doc.text(label, bx + 2.6, mid + 0.05, { baseline: 'middle' });
  doc.setCharSpace(0);

  const maxW = bx - M - 16;
  if (org) {
    const s = 7.6;
    doc.setFillColor(...C.navy);
    doc.roundedRect(M, mid - s / 2, s, s, 2, 2, 'F');
    font(ctx, { kind: 'display', size: 8, color: C.white });
    doc.text(initials(org) || '·', M + s / 2, mid + 0.15, { align: 'center', baseline: 'middle' });
    font(ctx, { bold: true, size: 8.6, color: C.ink });
    doc.text(fit(doc, org, maxW), M + s + 3, mid - 0.9);
    font(ctx, { size: 7.2, color: C.ink3 });
    doc.text(fit(doc, D.channel, maxW), M + s + 3, mid + 3);
  } else {
    font(ctx, { bold: true, size: 8.6, color: C.ink });
    doc.text(fit(doc, D.channel, maxW), M, mid + 1);
  }

  doc.setDrawColor(...C.line);
  doc.setLineWidth(0.2);
  doc.line(M, 20.5, W - M, 20.5);
}

function drawFooter(ctx, n, total) {
  const { doc, W, H, M, D } = ctx;
  doc.setDrawColor(...C.line2);
  doc.setLineWidth(0.2);
  doc.line(M, H - 13.5, W - M, H - 13.5);
  font(ctx, { size: 6.8, color: C.ink3 });
  doc.text(fit(doc, ctx.footerLeft, ctx.CW - 40), M, H - 9);
  font(ctx, { bold: true, size: 6.8, color: C.ink2 });
  doc.text(fmt(D.t.page, { n, total }), W - M, H - 9, { align: 'right' });
}

function finalize(ctx) {
  const total = ctx.doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    ctx.doc.setPage(i);
    drawRunningHeader(ctx);
    drawFooter(ctx, i, total);
  }
}

function drawTitle(ctx, title, now) {
  const { doc, M, D } = ctx;
  font(ctx, { kind: 'display', size: 20, color: C.navy });
  doc.text(title, M, 34.5);
  font(ctx, { size: 8.2, color: C.ink2 });
  doc.text(fmt(D.t.generated, { date: fLong(now, D.locale), time: fTime(now, D.locale) }), M, 40.6);
  ctx.y = 44;
}

// Taula base: filets fins, capçalera en tinta blava sobre gris clar, sense quadrícula
function table(ctx, { styles, headStyles, ...opts }) {
  const { F } = ctx;
  autoTable(ctx.doc, {
    theme: 'plain',
    startY: ctx.y,
    margin: { top: 27, bottom: ctx.H - ctx.BOTTOM + 1, left: ctx.M, right: ctx.M },
    rowPageBreak: 'auto',
    styles: {
      font: F.text, fontStyle: 'normal', fontSize: 8.4, textColor: C.ink,
      cellPadding: { top: 2.3, bottom: 2.3, left: 2.2, right: 2.2 },
      lineColor: C.line2, lineWidth: { bottom: 0.2 }, valign: 'top', overflow: 'linebreak',
      ...styles,
    },
    headStyles: {
      font: F.text, fontStyle: 'bold', fontSize: 7.2, textColor: C.navy, fillColor: C.bg,
      lineColor: C.navy, lineWidth: { bottom: 0.35 }, valign: 'middle',
      cellPadding: { top: 2.4, bottom: 2.4, left: 2.2, right: 2.2 },
      ...headStyles,
    },
    ...opts,
  });
  ctx.y = ctx.doc.lastAutoTable.finalY;
}

function sectionTitle(ctx, n, title) {
  const { doc, M, W } = ctx;
  ensureSpace(ctx, 36);
  ctx.y += ctx.y <= ctx.TOP ? 2 : 9;
  font(ctx, { kind: 'display', size: 10.5, color: C.accent });
  doc.text(String(n), M, ctx.y + 3.7);
  font(ctx, { kind: 'display', size: 10.5, color: C.navy });
  doc.text(title, M + 6, ctx.y + 3.7);
  doc.setDrawColor(...C.line);
  doc.setLineWidth(0.2);
  doc.line(M, ctx.y + 6.6, W - M, ctx.y + 6.6);
  ctx.y += 9.6;
}

// Text corregut amb salts de pàgina línia a línia (respecta els salts de paràgraf de l'original)
function flowText(ctx, text, { size = 9.2, lead = 4.6, color = C.ink, bold = false, x = ctx.M, width = ctx.CW } = {}) {
  const { doc } = ctx;
  font(ctx, { size, color, bold });
  const ascent = size * 0.3528 * 0.78;
  const lines = String(text ?? '').replace(/\r\n?/g, '\n').split('\n');
  let pendingGap = 0;
  lines.forEach(src => {
    if (!src.trim()) { pendingGap = 2.2; return; }
    const wrapped = doc.splitTextToSize(src, width);
    ctx.y += pendingGap;
    pendingGap = 0;
    wrapped.forEach(line => {
      if (ctx.y + lead > ctx.BOTTOM) { newPage(ctx); font(ctx, { size, color, bold }); }
      doc.text(line, x, ctx.y + ascent);
      ctx.y += lead;
    });
  });
}

function smallNote(ctx, text, { color = C.ink3 } = {}) {
  ensureSpace(ctx, 10);
  flowText(ctx, text, { size: 7.2, lead: 3.5, color });
}

// ── PDF · informe (llistat) ─────────────────────────────────────────

function filterParts(filters, D) {
  const f = filters ?? {};
  const { t } = D;
  const parts = [];
  if (f.view)     parts.push(`${t.fView}: ${f.view}`);
  if (f.status)   parts.push(`${t.fStatus}: ${D.status(f.status)}`);
  if (f.category) parts.push(`${t.fCategory}: ${D.category(f.category)}`);
  if (f.priority) parts.push(`${t.fPriority}: ${D.priority(f.priority)}`);
  if (f.dateFrom) parts.push(`${t.fFrom}: ${fDate(f.dateFrom, D.locale)}`);
  if (f.dateTo)   parts.push(`${t.fTo}: ${fDate(f.dateTo, D.locale)}`);
  const q = f.search ?? f.q;
  if (q && String(q).trim()) parts.push(`${t.fSearch}: ${fmt(t.quoted, { q: String(q).trim() })}`);
  return parts;
}

/** Construeix l'informe PDF (A4 apaïsat) sense descarregar-lo. */
export async function buildSummaryPDF(complaints = [], filters = {}, lang = 'es', { now = new Date() } = {}) {
  const D = dict(lang);
  const { t, locale } = D;
  const list = Array.isArray(complaints) ? complaints : [];
  const ctx = await createDoc('landscape', D);
  const { doc, M, CW } = ctx;
  ctx.org = pickName(filters?.organization) || pickName(filters?.organizationName) || list.map(orgOf).find(Boolean) || '';
  ctx.footerLeft = [t.docConfidential, t.summaryTitle, fDate(now, locale)].join(' · ');

  doc.setProperties({ title: `${t.summaryTitle} · ${fDate(now, locale)}`, subject: D.channel, creator: 'Reportia', author: ctx.org || 'Reportia' });
  drawTitle(ctx, t.summaryTitle, now);

  // Filtres aplicats
  const parts = filterParts(filters, D);
  const label = `${t.filters}:`;
  font(ctx, { bold: true, size: 8.2, color: C.ink });
  const lw = doc.getTextWidth(label) + 1.6;
  doc.text(label, M, ctx.y + 2.6);
  font(ctx, { size: 8.2, color: C.ink2 });
  const fl = doc.splitTextToSize(parts.length ? parts.join('   ·   ') : t.noFilters, CW - lw);
  fl.forEach((line, i) => doc.text(line, M + lw, ctx.y + 2.6 + i * 3.8));
  ctx.y += 2.6 + (fl.length - 1) * 3.8 + 6;

  // Xifres clau
  const rows = list.map(c => ({ c, dl: legalDeadlines(c, now) }));
  const overdue = rows.filter(r => r.dl?.overdue).length;
  const kpis = [
    { label: t.kTotal,   n: list.length },
    { label: t.kOpen,    n: list.filter(isOpen).length },
    { label: t.kClosed,  n: list.filter(c => !isOpen(c)).length },
    { label: t.kAnon,    n: list.filter(c => !isIdentified(c)).length },
    { label: t.kOverdue, n: overdue, alert: overdue > 0 },
  ];
  const y0 = ctx.y;
  const cw = CW / kpis.length;
  doc.setDrawColor(...C.navy);
  doc.setLineWidth(0.5);
  doc.line(M, y0, M + CW, y0);
  kpis.forEach((k, i) => {
    const x = M + i * cw + (i ? 5 : 0);
    if (i) {
      doc.setDrawColor(...C.line);
      doc.setLineWidth(0.2);
      doc.line(M + i * cw, y0 + 3.4, M + i * cw, y0 + 15);
    }
    font(ctx, { kind: 'display', size: 17, color: k.alert ? C.danger : C.navy });
    doc.text(String(k.n), x, y0 + 9.6);
    font(ctx, { size: 7.4, color: k.alert ? C.danger : C.ink3 });
    doc.text(k.label, x, y0 + 14.2);
  });
  doc.setDrawColor(...C.line);
  doc.setLineWidth(0.2);
  doc.line(M, y0 + 18.4, M + CW, y0 + 18.4);
  ctx.y = y0 + 25;

  if (!list.length) {
    const h = 24;
    doc.setDrawColor(...C.line);
    doc.setLineWidth(0.25);
    doc.roundedRect(M, ctx.y, CW, h, 2, 2, 'S');
    font(ctx, { size: 9.4, color: C.ink2 });
    doc.text(parts.length ? t.empty : t.emptyAll, M + CW / 2, ctx.y + h / 2, { align: 'center', baseline: 'middle' });
    ctx.y += h + 6;
  } else {
    table(ctx, {
      head: [[t.cCode, t.cCategory, t.cStatus, t.cPriority, t.cMode, t.cDept, t.cReceived, t.cDeadline]],
      body: rows.map(({ c, dl }) => [
        c.tracking_code ?? '',
        D.category(c.category),
        D.status(c.status),
        D.priority(c.priority),
        D.mode(c),
        c.department || t.notStated,
        fDate(c.created_at, locale),
        dl ? fDate(dl.reply, locale) : '',
      ]),
      styles: { cellPadding: { top: 2, bottom: 2, left: 2.2, right: 2.2 } },
      columnStyles: {
        0: { cellWidth: 25, fontStyle: 'bold', textColor: C.navy },
        1: { cellWidth: 53 },
        2: { cellWidth: 34 },
        3: { cellWidth: 20 },
        4: { cellWidth: 23 },
        6: { cellWidth: 22 },
        7: { cellWidth: 31 },
      },
      didParseCell: data => {
        if (data.section !== 'body') return;
        const { c, dl } = rows[data.row.index];
        if (data.column.index === 3 && c.priority === 'critical') Object.assign(data.cell.styles, { fontStyle: 'bold', textColor: C.danger });
        if (data.column.index === 3 && c.priority === 'high') data.cell.styles.fontStyle = 'bold';
        if (data.column.index === 5 && !c.department) data.cell.styles.textColor = C.ink3;
        if (data.column.index === 7 && dl?.overdue) Object.assign(data.cell.styles, { fontStyle: 'bold', textColor: C.danger });
      },
    });
    ctx.y += 5;
    if (overdue) smallNote(ctx, t.legendOverdue, { color: C.danger });
    smallNote(ctx, t.legendDeadline);
  }

  finalize(ctx);
  return doc;
}

export async function exportSummaryToPDF(complaints, filters = {}, lang = 'es') {
  const { t } = dict(lang);
  const doc = await buildSummaryPDF(complaints, filters, lang);
  doc.save(`${t.fileSummary}_${isoDay(new Date())}.pdf`);
}

// ── PDF · fitxa individual ──────────────────────────────────────────

function auditLabel(entry, D) {
  const a = String(entry?.action ?? '');
  if (a === 'created') return D.t.actCreated;
  const m = /^status_changed_to_(\w+)$/.exec(a);
  if (m) return fmt(D.t.actStatus, { status: D.status(m[1]) });
  const plain = a.replace(/_/g, ' ').trim();
  return plain ? plain[0].toUpperCase() + plain.slice(1) : '';
}

function auditDetail(entry) {
  const d = entry?.details;
  if (!d) return '';
  if (typeof d === 'string') return d.trim();
  return typeof d.note === 'string' ? d.note.trim() : ''; // mai s'imprimeix el JSON sencer
}

/** Construeix la fitxa PDF (A4 vertical) d'una denúncia sense descarregar-la. */
export async function buildComplaintPDF(complaint, messages = [], lang = 'es', { now = new Date() } = {}) {
  const D = dict(lang);
  const { t, locale } = D;
  const c = complaint ?? {};
  const msgs = Array.isArray(messages) ? messages : [];
  const ctx = await createDoc('portrait', D);
  const { doc, M, W, CW } = ctx;
  const code = c.tracking_code ?? '';
  ctx.org = orgOf(c);
  ctx.footerLeft = [t.docConfidential, `${t.code} ${code}`].join(' · ');
  doc.setProperties({ title: `${t.detailTitle} ${code}`, subject: D.channel, creator: 'Reportia', author: ctx.org || 'Reportia' });

  drawTitle(ctx, t.detailTitle, now);
  font(ctx, { size: 7.2, color: C.ink3 });
  doc.text(t.code, W - M, 28.4, { align: 'right' });
  font(ctx, { kind: 'display', size: 15, color: C.navy });
  doc.text(code, W - M, 34.5, { align: 'right' });

  // Franja d'estat
  const y0 = ctx.y + 2;
  const cells = [
    { label: t.cStatus,   value: D.status(c.status),     w: 0.22 },
    { label: t.cPriority, value: D.priority(c.priority), w: 0.18, alert: c.priority === 'critical' },
    { label: t.cCategory, value: D.category(c.category), w: 0.38 },
    { label: t.cMode,     value: D.mode(c),              w: 0.22 },
  ];
  doc.setDrawColor(...C.navy);
  doc.setLineWidth(0.5);
  doc.line(M, y0, M + CW, y0);
  let x = M;
  cells.forEach((cell, i) => {
    const w = CW * cell.w;
    const tx = x + (i ? 4 : 0);
    if (i) {
      doc.setDrawColor(...C.line);
      doc.setLineWidth(0.2);
      doc.line(x, y0 + 3, x, y0 + 13.4);
    }
    font(ctx, { size: 7, color: C.ink3 });
    doc.text(cell.label, tx, y0 + 5.4);
    font(ctx, { bold: true, size: 9.4, color: cell.alert ? C.danger : C.ink });
    doc.text(fit(doc, cell.value, w - (i ? 6 : 2)), tx, y0 + 11);
    x += w;
  });
  doc.setDrawColor(...C.line);
  doc.setLineWidth(0.2);
  doc.line(M, y0 + 16.2, M + CW, y0 + 16.2);
  ctx.y = y0 + 18;

  let n = 0;

  // 1 · Dades
  sectionTitle(ctx, ++n, t.sData);
  const data = [];
  if (isIdentified(c)) {
    if (c.reporter_name)  data.push([t.name, c.reporter_name]);
    if (c.reporter_email) data.push([t.email, c.reporter_email]);
    if (c.reporter_phone) data.push([t.phone, c.reporter_phone]);
    if (!data.length) data.push([t.identity, c.identityWithheld ? t.identityWithheld : t.notStated]);
  } else {
    data.push([t.identity, t.identityNone]); // anònima: mai es llegeixen els camps reporter_*
  }
  data.push([t.cDept, c.department || t.notStated]);
  data.push([t.cIncident, fDate(c.incident_date, locale) || t.notStated]);
  data.push([t.cReceivedLong, fDateTime(c.created_at, locale) || t.notStated]);
  if (c.updated_at) data.push([t.updated, fDateTime(c.updated_at, locale)]);
  if (c.language) data.push([t.language, D.langName(c.language)]);
  table(ctx, {
    body: data,
    columnStyles: {
      0: { cellWidth: 46, fontSize: 7.8, textColor: C.ink3, cellPadding: { top: 2.5, bottom: 2.3, left: 0, right: 2.2 } },
      1: { fontSize: 9 },
    },
    didParseCell: d => {
      if (d.column.index !== 1) return;
      const [label, value] = data[d.row.index];
      if (label === t.identity && value === t.identityNone) d.cell.styles.fontStyle = 'bold';
      if (value === t.notStated) d.cell.styles.textColor = C.ink3;
    },
  });

  // 2 · Terminis
  const dl = legalDeadlines(c, now, msgs);
  if (dl) {
    sectionTitle(ctx, ++n, t.sDeadlines);
    const closedText = fmt(t.dClosed, { status: D.status(c.status) });
    let ackLate = dl.firstManagerMsg ? startOfDay(dl.firstManagerMsg) > dl.ack : dl.ackOverdue;
    let ackState = dl.firstManagerMsg
      ? fmt(t.dFirstMsg, { date: fDate(dl.firstManagerMsg, locale) })
      : dl.open && dl.ackLeft !== undefined ? countdown(t, dl.ackLeft) : closedText;
    let replyLate = dl.overdue;
    let replyState = dl.open && dl.replyLeft !== undefined ? countdown(t, dl.replyLeft) : closedText;
    // El panell passa els terminis ja calculats (mateix criteri que la pantalla): s'usen tal qual
    const P = c.deadline;
    if (P) {
      dl.ack = P.ackDue;
      dl.reply = P.respDue;
      ackLate = P.ack.state === 'done' ? !!P.ack.late : P.ack.state === 'overdue';
      ackState = P.ack.state === 'done' ? (P.ack.at ? fmt(t.dFirstMsg, { date: fDate(P.ack.at, locale) }) : closedText) : countdown(t, P.ack.days);
      const answered = ['met', 'late'].includes(P.resp.state);
      replyLate = answered ? P.resp.state === 'late' : P.resp.state === 'overdue';
      replyState = answered ? fmt(t.dReplied, { date: fDate(P.resp.at, locale) }) : countdown(t, P.resp.days);
    }
    const late = [ackLate, replyLate];
    table(ctx, {
      head: [[t.dStep, t.dTerm, t.dDate, t.dState]],
      body: [
        [t.dAck, t.dAckRule, fDate(dl.ack, locale), ackState],
        [t.dReply, t.dReplyRule, fDate(dl.reply, locale), replyState],
      ],
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold' },
        1: { cellWidth: 34, textColor: C.ink2 },
        2: { cellWidth: 30 },
      },
      didParseCell: d => {
        if (d.section === 'body' && d.column.index === 3 && late[d.row.index]) {
          Object.assign(d.cell.styles, { fontStyle: 'bold', textColor: C.danger });
        }
      },
    });
    ctx.y += 3;
    smallNote(ctx, fmt(t.dNote, { date: fDate(dl.received, locale) }));
  }

  // 3 · Fets
  sectionTitle(ctx, ++n, t.sFacts);
  const desc = String(c.description ?? '').trim();
  flowText(ctx, desc || t.noDescription, { color: desc ? C.ink : C.ink3 });
  if (c.involved_people && String(c.involved_people).trim()) {
    ctx.y += 3;
    ensureSpace(ctx, 12);
    font(ctx, { bold: true, size: 7.8, color: C.ink2 });
    doc.text(t.involved, M, ctx.y + 2.6);
    ctx.y += 4.4;
    flowText(ctx, String(c.involved_people).trim());
  }

  // 4 · Adjunts
  const atts = Array.isArray(c.attachments) ? c.attachments : [];
  if (atts.length) {
    sectionTitle(ctx, ++n, t.sAttachments);
    table(ctx, {
      head: [[t.aName, t.aType, t.aSize]],
      body: atts.map(a => [String(a.filename ?? '').trim(), fileType(a), formatBytes(a.file_size, locale)]),
      columnStyles: { 1: { cellWidth: 22 }, 2: { cellWidth: 24, halign: 'right' } },
      didParseCell: d => { if (d.column.index === 2 && d.section === 'head') d.cell.styles.halign = 'right'; },
    });
  }

  // 5 · Missatges
  sectionTitle(ctx, ++n, t.sMessages);
  if (msgs.length) {
    const sorted = [...msgs].sort((a, b) => (toDate(a.created_at) ?? 0) - (toDate(b.created_at) ?? 0));
    table(ctx, {
      head: [[t.mDate, t.mFrom, t.mText]],
      body: sorted.map(m => [fDateTime(m.created_at, locale), m.sender === 'manager' ? t.manager : t.reporter, String(m.content ?? '').trim()]),
      columnStyles: {
        0: { cellWidth: 30, textColor: C.ink2, fontSize: 7.8 },
        1: { cellWidth: 25 },
      },
      didParseCell: d => {
        if (d.section === 'body' && d.column.index === 1 && sorted[d.row.index].sender === 'manager') {
          Object.assign(d.cell.styles, { fontStyle: 'bold', textColor: C.navy });
        }
      },
    });
  } else {
    flowText(ctx, t.noMessages, { color: C.ink3 });
  }

  // 6 · Registre d'activitat (si arriba)
  const audit = Array.isArray(c.audit_logs) ? c.audit_logs : Array.isArray(c.auditLogs) ? c.auditLogs : [];
  if (audit.length) {
    sectionTitle(ctx, ++n, t.sAudit);
    const sorted = [...audit].sort((a, b) => (toDate(a.created_at) ?? 0) - (toDate(b.created_at) ?? 0));
    table(ctx, {
      head: [[t.logDate, t.logAction, t.logDetail]],
      body: sorted.map(e => [fDateTime(e.created_at, locale), auditLabel(e, D), auditDetail(e)]),
      columnStyles: {
        0: { cellWidth: 30, textColor: C.ink2, fontSize: 7.8 },
        1: { cellWidth: 62 },
      },
    });
  }

  finalize(ctx);
  return doc;
}

export async function exportComplaintToPDF(complaint, messages = [], lang = 'es') {
  const { t } = dict(lang);
  const doc = await buildComplaintPDF(complaint, messages, lang);
  doc.save(`${t.fileDetail}_${complaint?.tracking_code ?? ''}_${isoDay(new Date())}.pdf`);
}

// ── Cartell del canal (A4 vertical, per a taulers d'anuncis) ─────────

/** Parteix una adreça llarga per les barres perquè no surti del marc */
function breakUrl(doc, url, maxW) {
  if (doc.getTextWidth(url) <= maxW) return [url];
  const lines = [];
  let line = '';
  for (const part of url.split(/(?<=\/)/)) {
    if (line && doc.getTextWidth(line + part) > maxW) { lines.push(line); line = part; }
    else line += part;
  }
  if (line) lines.push(line);
  return lines;
}

export async function buildChannelPoster({ orgName = '', url, lang = 'es' }) {
  const D = dict(lang);
  const t = D.t;
  const ctx = await createDoc('portrait', D);
  const { doc, W, H } = ctx;
  const M = 20;
  const CW = W - M * 2;
  const { default: QRCode } = await import('qrcode');
  const qr = await QRCode.toDataURL(url, { errorCorrectionLevel: 'M', margin: 0, width: 960, color: { dark: '#0D1530', light: '#ffffff' } });
  const shown = url.replace(/^https?:\/\//, '');

  // Banda superior: organització (fins a dues línies) i marc legal
  font(ctx, { bold: true, size: 14, color: C.white });
  const nameLines = doc.splitTextToSize(orgName, CW).slice(0, 2);
  if (doc.splitTextToSize(orgName, CW).length > 2) nameLines[1] = fit(doc, `${nameLines[1]} …`, CW);
  const bandH = 36 + (nameLines.length - 1) * 6.5;
  doc.setFillColor(...C.accent);
  doc.rect(0, 0, W, bandH, 'F');
  font(ctx, { bold: true, size: 14, color: C.white });
  doc.text(nameLines, M, 17, { lineHeightFactor: 1.3 });
  font(ctx, { size: 9.5, color: C.onAccent });
  doc.text(t.posterBand, M, 25 + (nameLines.length - 1) * 6.5);

  // Títol, promesa i explicació
  let y = 66 + (nameLines.length - 1) * 6.5;
  font(ctx, { kind: 'display', size: 36, color: C.navy });
  const title = doc.splitTextToSize(t.posterTitle, CW);
  doc.text(title, M, y, { lineHeightFactor: 1.12 });
  y += title.length * 14.2 + 2;
  font(ctx, { kind: 'display', size: 19, color: C.accent });
  const promise = doc.splitTextToSize(t.posterPromise, CW);
  doc.text(promise, M, y, { lineHeightFactor: 1.2 });
  y += promise.length * 8 + 5;
  font(ctx, { size: 12.5, color: C.ink2 });
  const lead = doc.splitTextToSize(fmt(t.posterLead, { org: orgName }), CW - 24);
  doc.text(lead, M, y, { lineHeightFactor: 1.45 });
  y += lead.length * 6.4 + 10;

  // Marc amb el codi QR, l'adreça i el que cal saber. L'alçada surt del text (un nom d'empresa
  // llarg allarga les frases): primer es mesura, després es dibuixa
  const QS = 70;
  const PAD = 12;
  const xText = M + PAD + QS + 14;
  const colWidth = W - M - PAD - xText;
  font(ctx, { size: 10.5 });
  const scanLines = doc.splitTextToSize(t.posterScan, colWidth);
  font(ctx, { bold: true, size: 13 });
  const urlLinesPre = breakUrl(doc, shown, colWidth);
  font(ctx, { size: 10.5 });
  const pointLines = t.posterPoints.map(pt => doc.splitTextToSize(fmt(pt, { org: orgName }), colWidth - 8));
  const textH = 4 + scanLines.length * 5.2 + 3 + urlLinesPre.length * 6 + 5 + 4 + pointLines.reduce((h, l) => h + l.length * 5.2 + 3.2, 0);
  const panelH = Math.max(QS + PAD * 2, textH + PAD * 2);
  doc.setFillColor(...C.bg);
  doc.setDrawColor(...C.line);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, y, CW, panelH, 6, 6, 'FD');
  doc.setFillColor(...C.white);
  doc.roundedRect(M + PAD - 4, y + PAD - 4, QS + 8, QS + 8, 4, 4, 'FD');
  doc.addImage(qr, 'PNG', M + PAD, y + PAD, QS, QS);

  const x = M + PAD + QS + 14;
  const colW = W - M - PAD - x;
  let ty = y + PAD + 4;
  font(ctx, { size: 10.5, color: C.ink2 });
  const scan = doc.splitTextToSize(t.posterScan, colW);
  doc.text(scan, x, ty, { lineHeightFactor: 1.4 });
  ty += scan.length * 5.2 + 3;
  font(ctx, { bold: true, size: 13, color: C.navy });
  const urlLines = breakUrl(doc, shown, colW);
  doc.text(urlLines, x, ty, { lineHeightFactor: 1.3 });
  ty += urlLines.length * 6 + 5;
  doc.setDrawColor(...C.line);
  doc.line(x, ty - 3, x + colW, ty - 3);
  ty += 4;
  for (const point of t.posterPoints) {
    // marca de verificació dibuixada (la tipografia incrustada no porta el glif)
    doc.setDrawColor(...C.accent);
    doc.setLineWidth(0.55);
    doc.setLineCap('round');
    doc.setLineJoin('round');
    doc.lines([[1.3, 1.3], [2.6, -3]], x + 0.4, ty - 1.2, [1, 1], 'S', false);
    font(ctx, { size: 10.5, color: C.ink });
    const lines = doc.splitTextToSize(fmt(point, { org: orgName }), colW - 8);
    doc.text(lines, x + 8, ty, { lineHeightFactor: 1.4 });
    ty += lines.length * 5.2 + 3.2;
  }
  doc.setLineWidth(0.3);
  y += panelH + 12;

  // Consell de privacitat i protecció legal
  font(ctx, { size: 11, color: C.ink2 });
  const tip = doc.splitTextToSize(t.posterTip, CW - 24);
  doc.text(tip, M, y, { lineHeightFactor: 1.45 });
  y += tip.length * 5.8 + 4;
  font(ctx, { bold: true, size: 11, color: C.navy });
  doc.text(doc.splitTextToSize(t.posterLaw, CW - 24), M, y, { lineHeightFactor: 1.45 });

  // Peu
  doc.setDrawColor(...C.line);
  doc.line(M, H - 20, W - M, H - 20);
  font(ctx, { size: 8.5, color: C.ink3 });
  doc.text(fit(doc, `${orgName} · ${t.posterTitle}`, CW * 0.6), M, H - 13.5);
  doc.text(t.posterBand, W - M, H - 13.5, { align: 'right' });

  doc.setProperties({ title: `${t.posterTitle} · ${orgName}`, author: orgName });
  return doc;
}

export async function exportChannelPoster({ orgName, url, lang = 'es', slug = '' }) {
  const doc = await buildChannelPoster({ orgName, url, lang });
  const D = dict(lang);
  downloadBlob(doc.output('blob'), `${D.t.posterFile}${slug ? `-${slug}` : ''}.pdf`);
}
