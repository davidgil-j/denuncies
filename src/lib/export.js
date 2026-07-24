import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const STATUS_LABELS = {
  received: 'Rebut', reviewing: 'En revisió', investigating: 'Investigant',
  waiting: 'Esperant', resolved: 'Resolt', closed: 'Tancat', archived: 'Arxivat',
};
const CATEGORY_LABELS = {
  fraud: 'Frau o corrupció', harassment: 'Assetjament', discrimination: 'Discriminació',
  safety: 'Seguretat laboral', data: 'Dades / RGPD', conflict: 'Conflicte interessos',
  accounting: 'Irregularitats comptables', environmental: 'Medi ambient', other: 'Altres',
};
const PRIORITY_LABELS = { low: 'Baixa', normal: 'Normal', high: 'Alta', critical: 'Crítica' };

function formatDate(iso) {
  return iso ? new Date(iso).toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
}

// ── Excel export ──────────────────────────────────────────────────
export async function exportToExcel(complaints, filename = 'denuncies') {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Reportia Canal Ètic';
  const ws = wb.addWorksheet('Denúncies');

  ws.columns = [
    { header: 'Codi',          key: 'codi',       width: 14 },
    { header: 'Categoria',     key: 'categoria',  width: 24 },
    { header: 'Estat',         key: 'estat',      width: 18 },
    { header: 'Prioritat',     key: 'prioritat',  width: 12 },
    { header: 'Modalitat',     key: 'modalitat',  width: 20 },
    { header: 'Departament',   key: 'dept',       width: 22 },
    { header: 'Data incident', key: 'data_inc',   width: 16 },
    { header: 'Data recepció', key: 'data_rec',   width: 16 },
    { header: 'Idioma',        key: 'idioma',     width: 10 },
  ];

  // Header styling
  ws.getRow(1).eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF294E59' } };
  });

  complaints.forEach(c => ws.addRow({
    codi:      c.tracking_code,
    categoria: CATEGORY_LABELS[c.category] ?? c.category,
    estat:     STATUS_LABELS[c.status] ?? c.status,
    prioritat: PRIORITY_LABELS[c.priority] ?? c.priority,
    modalitat: c.is_anonymous ? 'Anònim' : 'Identificat',
    dept:      c.department ?? '—',
    data_inc:  formatDate(c.incident_date),
    data_rec:  formatDate(c.created_at),
    idioma:    c.language?.toUpperCase() ?? '—',
  }));

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0,10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── PDF summary (list) ────────────────────────────────────────────
export function exportSummaryToPDF(complaints, filters = {}) {
  const doc = new jsPDF({ orientation: 'landscape' });

  // Header
  doc.setFontSize(16);
  doc.setTextColor(41, 78, 89);
  doc.text('Reportia · Canal Ètic', 14, 16);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Resum de denúncies — ${new Date().toLocaleDateString('ca-ES')}`, 14, 23);

  // Active filters
  const filterTexts = [];
  if (filters.status)   filterTexts.push(`Estat: ${STATUS_LABELS[filters.status]}`);
  if (filters.category) filterTexts.push(`Categoria: ${CATEGORY_LABELS[filters.category]}`);
  if (filters.priority) filterTexts.push(`Prioritat: ${PRIORITY_LABELS[filters.priority]}`);
  if (filters.dateFrom) filterTexts.push(`Des de: ${filters.dateFrom}`);
  if (filters.dateTo)   filterTexts.push(`Fins a: ${filters.dateTo}`);
  if (filterTexts.length) {
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Filtres aplicats: ${filterTexts.join(' · ')}`, 14, 29);
  }

  const rows = complaints.map(c => [
    c.tracking_code,
    CATEGORY_LABELS[c.category] ?? c.category,
    STATUS_LABELS[c.status] ?? c.status,
    PRIORITY_LABELS[c.priority] ?? c.priority,
    c.is_anonymous ? 'Anònim' : 'Identificat',
    c.department ?? '—',
    formatDate(c.created_at),
  ]);

  autoTable(doc, {
    startY: filterTexts.length ? 34 : 28,
    head: [['Codi', 'Categoria', 'Estat', 'Prioritat', 'Modalitat', 'Departament', 'Data recepció']],
    body: rows,
    headStyles: { fillColor: [41, 78, 89], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [240, 250, 246] },
    styles: { fontSize: 9, cellPadding: 3 },
  });

  doc.save(`denuncies_resum_${new Date().toISOString().slice(0,10)}.pdf`);
}

// ── PDF individual complaint ──────────────────────────────────────
export function exportComplaintToPDF(complaint, messages = []) {
  const doc = new jsPDF();

  // Header
  doc.setFillColor(41, 78, 89);
  doc.rect(0, 0, 210, 36, 'F');
  doc.setTextColor(39, 209, 141);
  doc.setFontSize(18);
  doc.text('Reportia · Canal Ètic', 14, 14);
  doc.setTextColor(255);
  doc.setFontSize(11);
  doc.text(`Denúncia #${complaint.tracking_code}`, 14, 22);
  doc.setFontSize(9);
  doc.text(`Generat el ${new Date().toLocaleDateString('ca-ES')} · CONFIDENCIAL`, 14, 29);

  let y = 46;

  // Status badge area
  doc.setFontSize(10);
  doc.setTextColor(41, 78, 89);
  doc.setFont('helvetica', 'bold');
  doc.text('ESTAT:', 14, y);
  doc.setFont('helvetica', 'normal');
  doc.text(STATUS_LABELS[complaint.status] ?? complaint.status, 40, y);
  doc.text('PRIORITAT:', 100, y);
  doc.text(PRIORITY_LABELS[complaint.priority] ?? complaint.priority, 130, y);

  y += 10;
  doc.setDrawColor(200);
  doc.line(14, y, 196, y);
  y += 8;

  // Info table
  autoTable(doc, {
    startY: y,
    body: [
      ['Categoria',   CATEGORY_LABELS[complaint.category] ?? complaint.category],
      ['Modalitat',   complaint.is_anonymous ? 'Anònim' : 'Identificat'],
      ...(!complaint.is_anonymous && complaint.reporter_name ? [['Denunciant', complaint.reporter_name]] : []),
      ...(!complaint.is_anonymous && complaint.reporter_email ? [['Correu', complaint.reporter_email]] : []),
      ...(complaint.department ? [['Departament', complaint.department]] : []),
      ...(complaint.incident_date ? [['Data incident', formatDate(complaint.incident_date)]] : []),
      ...(complaint.involved_people ? [['Persones implicades', complaint.involved_people]] : []),
      ['Data recepció', formatDate(complaint.created_at)],
      ['Idioma', complaint.language?.toUpperCase() ?? '—'],
    ],
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50, fillColor: [240, 250, 246] } },
    styles: { fontSize: 9, cellPadding: 3 },
    theme: 'grid',
  });

  y = doc.lastAutoTable.finalY + 10;

  // Description
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(41, 78, 89);
  doc.text('Descripció dels fets', 14, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50);
  doc.setFontSize(9);
  const descLines = doc.splitTextToSize(complaint.description ?? '', 180);
  doc.text(descLines, 14, y);
  y += descLines.length * 5 + 8;

  // Messages
  if (messages.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(41, 78, 89);
    doc.text('Missatges', 14, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [['Remitent', 'Missatge', 'Data']],
      body: messages.map(m => [
        m.sender === 'reporter' ? 'Denunciant' : 'Gestor',
        m.content,
        formatDate(m.created_at),
      ]),
      headStyles: { fillColor: [41, 78, 89] },
      styles: { fontSize: 8, cellPadding: 3 },
    });
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Document confidencial · Reportia Canal Ètic · Pàgina ${i}/${pageCount}`, 14, 290);
  }

  doc.save(`denuncia_${complaint.tracking_code}_${new Date().toISOString().slice(0,10)}.pdf`);
}
