// Justificante del envío en PDF. Se genera en el navegador (no sale ningún dato) y se carga solo al
// pedirlo. Usa la tipografía que jsPDF trae de serie, que cubre castellano, catalán e inglés.
import { jsPDF } from 'jspdf';

const INK = [13, 21, 48];
const MUTED = [77, 86, 114];
const BLUE = [47, 84, 235];
// La tipografía de serie no tiene comillas tipográficas: se cambian por las rectas
const plain = (s) => String(s).replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/…/g, '...');

/**
 * rows: [[etiqueta, valor]] · next: [[título, detalle]] · notes: [texto]
 * El archivo se llama como el código: un nombre neutro, sin palabras como «denuncia».
 */
export function downloadReceipt({ code, title, rows, nextTitle, next, notes }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const M = 22;
  const W = 210 - 2 * M;
  let y = 30;

  doc.setFillColor(...BLUE);
  doc.roundedRect(M, y - 8, 10, 10, 2.5, 2.5, 'F');
  doc.setFont('helvetica', 'bold').setFontSize(20).setTextColor(...INK);
  doc.text(plain(title), M + 14, y);
  y += 16;

  // El código, grande
  doc.setFillColor(242, 244, 248);
  doc.roundedRect(M, y, W, 34, 5, 5, 'F');
  doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...MUTED);
  doc.text(plain(rows[0][0]).toUpperCase(), M + 8, y + 10, { charSpace: 0.6 });
  doc.setFont('courier', 'bold').setFontSize(34).setTextColor(...INK);
  doc.text(code, M + 8, y + 26, { charSpace: 1.6 });
  y += 46;

  for (const [label, value] of rows.slice(1)) {
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...MUTED);
    doc.text(plain(label), M, y);
    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...INK);
    const lines = doc.splitTextToSize(plain(value), W - 44);
    doc.text(lines, M + 44, y);
    y += 7 * lines.length + 1;
  }
  y += 8;

  doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(...INK);
  doc.text(plain(nextTitle), M, y);
  y += 9;
  next.forEach(([head, detail], i) => {
    doc.setFillColor(...BLUE);
    doc.circle(M + 3, y - 1.4, 3, 'F');
    doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(255, 255, 255);
    doc.text(String(i + 1), M + 3, y - 0.3, { align: 'center' });
    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...INK);
    doc.text(plain(head), M + 10, y);
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...MUTED);
    doc.text(plain(detail), M + 10, y + 5.5);
    y += 14;
  });
  y += 4;

  doc.setDrawColor(215, 222, 239);
  doc.line(M, y, M + W, y);
  y += 8;
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...MUTED);
  for (const note of notes) {
    const lines = doc.splitTextToSize(plain(note), W);
    doc.text(lines, M, y);
    y += 5.2 * lines.length + 3;
  }

  doc.setProperties({ title: code, creator: '', author: '' });
  doc.save(`${code}.pdf`);
}
