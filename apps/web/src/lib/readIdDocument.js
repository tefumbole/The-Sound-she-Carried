function parseIdText(text) {
  const lines = String(text || '').split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const joined = lines.join(' ');
  const passport = joined.match(/\b([A-Z]{1,2}\d{6,9})\b/);
  const idNumber = joined.match(/\b(\d{6,12})\b/);
  const date = joined.match(/\b(\d{2}[./-]\d{2}[./-]\d{2,4})\b/);
  const nameLine = lines.find((l) => /[A-Za-z]{3,}\s+[A-Za-z]{3,}/.test(l) && !/republic|passport|national|cameroon|gender/i.test(l));
  return {
    full_name: nameLine || '',
    document_number: passport?.[1] || idNumber?.[1] || '',
    expiry_or_dob: date?.[1] || '',
    raw_text: text.slice(0, 1200),
  };
}

export async function readIdDocument(file) {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng');
  try {
    const { data } = await worker.recognize(file);
    return parseIdText(data.text || '');
  } finally {
    await worker.terminate();
  }
}
