import PDFDocument from 'pdfkit';
import { formatXaf } from '../utils/phone.js';

const NAVY = '#0b1220';
const GOLD = '#d4af37';
const CREAM = '#f6e7b2';
const WHITE = '#ffffff';
const MUTED = '#c8c2b4';

export function buildDonationConfirmationPdf(payload) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.rect(0, 0, doc.page.width, doc.page.height).fill(NAVY);

    doc.fillColor(GOLD).fontSize(11).text('THE SOUND SHE CARRIES', 48, 52, { align: 'center' });
    doc.moveDown(0.2);
    doc.fillColor(CREAM).fontSize(10).text('LIVE RECORDING', { align: 'center' });
    doc.moveDown(0.6);
    doc.fillColor(WHITE).fontSize(20).text('CONTRIBUTION CONFIRMATION', { align: 'center' });

    const yLine = doc.y + 10;
    doc.strokeColor(GOLD).lineWidth(1).moveTo(120, yLine).lineTo(doc.page.width - 120, yLine).stroke();
    doc.moveDown(1.4);

    const row = (label, value) => {
      doc.fillColor(GOLD).fontSize(9).text(label, { continued: false });
      doc.fillColor(WHITE).fontSize(12).text(String(value || '—'));
      doc.moveDown(0.45);
    };

    row('Contributor', payload.first_name);
    row('Amount', formatXaf(payload.amount));
    row('Date', payload.date);
    row('Reference', payload.reference);

    doc.moveDown(0.4);
    doc.fillColor(CREAM).fontSize(12).text('THANK YOU FOR PARTNERING WITH THIS VISION', { align: 'center' });
    doc.moveDown(0.3);
    doc.fillColor(MUTED).fontSize(10).text(payload.thank_you || '', { align: 'center' });

    doc.moveDown(1);
    doc.fillColor(GOLD).fontSize(11).text('YOUR PROPHETIC WORD', { align: 'left' });
    if (payload.title) {
      doc.moveDown(0.35);
      doc.fillColor(GOLD).fontSize(16).text(String(payload.title).toUpperCase(), { align: 'left' });
    }
    doc.moveDown(0.35);
    doc.fillColor(WHITE).fontSize(11).text(payload.message || '', { align: 'left', lineGap: 3 });

    doc.moveDown(0.8);
    doc.fillColor(GOLD).fontSize(11).text('SCRIPTURE');
    doc.moveDown(0.25);
    doc.fillColor(CREAM).fontSize(10).text(payload.scripture_reference || '');
    doc.moveDown(0.2);
    doc.fillColor(WHITE).fontSize(11).text(payload.scripture_text || '', { lineGap: 3 });

    doc.moveDown(0.8);
    doc.fillColor(GOLD).fontSize(11).text('I DECLARE');
    doc.moveDown(0.25);
    doc.fillColor(WHITE).fontSize(11).text(payload.declaration || '', { lineGap: 3 });

    doc.moveDown(1.4);
    doc.fillColor(GOLD).fontSize(10).text('The Sound She Carries', { align: 'center' });
    doc.fillColor(MUTED).fontSize(9).text('The Prophetic Minstrel', { align: 'center' });
    doc.moveDown(0.5);
    doc.fillColor(MUTED).fontSize(8).text(
      payload.disclaimer
        || "This scripture-based encouragement is shared as part of our ministry's appreciation to partners.",
      { align: 'center' }
    );

    doc.end();
  });
}
