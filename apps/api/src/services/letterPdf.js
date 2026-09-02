import PDFDocument from 'pdfkit';

export function buildLetterPdfBuffer({ reference, subject, header, body, footer, recipientName }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 56 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fillColor('#111').fontSize(11).text('TSSC PRESENTS', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(18).fillColor('#8B1538').text('The Sound She Carries', { align: 'center' });
    doc.moveDown(0.2);
    doc.fontSize(10).fillColor('#444').text('The Prophetic Minstrel · Lian Ministrel', { align: 'center' });
    doc.moveDown(1);
    doc.strokeColor('#c0c0c0').moveTo(56, doc.y).lineTo(539, doc.y).stroke();
    doc.moveDown(1);
    if (reference) doc.fontSize(10).fillColor('#666').text(`Ref: ${reference}`);
    if (subject) {
      doc.moveDown(0.4);
      doc.fontSize(14).fillColor('#111').text(subject);
    }
    if (recipientName) {
      doc.moveDown(0.6);
      doc.fontSize(11).text(`Dear ${recipientName},`);
    }
    const strip = (html) => String(html || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
    doc.moveDown(0.6);
    doc.fontSize(11).fillColor('#222').text(strip(header), { align: 'left' });
    doc.moveDown(0.5);
    doc.text(strip(body), { align: 'left' });
    doc.moveDown(1);
    doc.text(strip(footer), { align: 'left' });
    doc.moveDown(2);
    doc.fontSize(9).fillColor('#888').text('The Sound She Carries · Live Recording · Buea', { align: 'center' });
    doc.end();
  });
}
