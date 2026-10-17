// Justificante del envío en PDF. Se genera en el navegador (no sale ningún dato) y se carga solo al
// pedirlo. En Manrope, como el resto de PDF, con una versión ligera de la tipografía (receiptFonts.js:
// solo los caracteres del castellano, el catalán y el inglés, y dos grosores).
import { jsPDF } from 'jspdf';

const INK = [13, 21, 48];
const MUTED = [77, 86, 114];
const BLUE = [47, 84, 235];
const plain = (s) => String(s);

/**
 * rows: [[etiqueta, valor]] · next: [[título, detalle]] · notes: [texto] · color: el principal de la paleta de la
 * empresa ([r, g, b]; por defecto, el azul). Ni el nombre ni el logo de la empresa: el justificante sigue siendo neutro.
 * El archivo se llama como el código: un nombre neutro, sin palabras como «denuncia».
 */
export async function downloadReceipt({ code, title, rows, nextTitle, next, notes, color = BLUE }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const fonts = await import('./receiptFonts.js');
  doc.addFileToVFS('Manrope-Regular.ttf', fonts.RECEIPT_400);
  doc.addFont('Manrope-Regular.ttf', 'Manrope', 'normal');
  doc.addFileToVFS('Manrope-ExtraBold.ttf', fonts.RECEIPT_800);
  doc.addFont('Manrope-ExtraBold.ttf', 'Manrope', 'bold');
  const M = 22;
  const W = 210 - 2 * M;
  let y = 30;

  doc.setFillColor(...color);
  doc.roundedRect(M, y - 8, 10, 10, 2.5, 2.5, 'F');
  doc.setFont('Manrope', 'bold').setFontSize(20).setTextColor(...INK);
  doc.text(plain(title), M + 14, y);
  y += 16;

  // El código, grande
  doc.setFillColor(242, 244, 248);
  doc.roundedRect(M, y, W, 34, 5, 5, 'F');
  doc.setFont('Manrope', 'bold').setFontSize(9).setTextColor(...MUTED);
  doc.text(plain(rows[0][0]).toUpperCase(), M + 8, y + 10, { charSpace: 0.6 });
  doc.setFont('Manrope', 'bold').setFontSize(34).setTextColor(...INK);
  doc.text(code, M + 8, y + 26, { charSpace: 1.6 });
  y += 46;

  for (const [label, value] of rows.slice(1)) {
    doc.setFont('Manrope', 'normal').setFontSize(10).setTextColor(...MUTED);
    doc.text(plain(label), M, y);
    doc.setFont('Manrope', 'bold').setFontSize(11).setTextColor(...INK);
    const lines = doc.splitTextToSize(plain(value), W - 44);
    doc.text(lines, M + 44, y);
    y += 7 * lines.length + 1;
  }
  y += 8;

  doc.setFont('Manrope', 'bold').setFontSize(13).setTextColor(...INK);
  doc.text(plain(nextTitle), M, y);
  y += 9;
  next.forEach(([head, detail], i) => {
    doc.setFillColor(...color);
    doc.circle(M + 3, y - 1.4, 3, 'F');
    doc.setFont('Manrope', 'bold').setFontSize(9).setTextColor(255, 255, 255);
    doc.text(String(i + 1), M + 3, y - 0.3, { align: 'center' });
    doc.setFont('Manrope', 'bold').setFontSize(11).setTextColor(...INK);
    doc.text(plain(head), M + 10, y);
    doc.setFont('Manrope', 'normal').setFontSize(10).setTextColor(...MUTED);
    doc.text(plain(detail), M + 10, y + 5.5);
    y += 14;
  });
  y += 4;

  doc.setDrawColor(215, 222, 239);
  doc.line(M, y, M + W, y);
  y += 8;
  doc.setFont('Manrope', 'normal').setFontSize(10).setTextColor(...MUTED);
  for (const note of notes) {
    const lines = doc.splitTextToSize(plain(note), W);
    doc.text(lines, M, y);
    y += 5.2 * lines.length + 3;
  }

  doc.setProperties({ title: code, creator: '', author: '' });
  // La fecha interna del archivo, sin hora ni zona horaria: el día ya consta en el justificante
  const now = new Date();
  const two = (n) => String(n).padStart(2, '0');
  doc.setCreationDate(`D:${now.getUTCFullYear()}${two(now.getUTCMonth() + 1)}${two(now.getUTCDate())}000000+00'00'`);
  doc.save(`${code}.pdf`);
}
