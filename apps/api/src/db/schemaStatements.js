export function getCreateStatements(sql) {
  return String(sql || '')
    .replace(/^--.*$/gm, '')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => /CREATE TABLE/i.test(s));
}
