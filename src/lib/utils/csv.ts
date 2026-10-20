/**
 * CSV Utility with Formula Injection Protection (CSV / Excel Injection Mitigation)
 * OWASP recommendation: If any cell begins with '=', '+', '-', '@', '\t', '\r', prefix with single quote `'`
 */

export function sanitizeCsvValue(val: any): string {
  if (val === null || val === undefined) {
    return '';
  }
  let str = String(val).trim();

  // Neutralize formula injection triggers
  const formulaTriggers = ['=', '+', '-', '@', '\t', '\r'];
  if (formulaTriggers.some((prefix) => str.startsWith(prefix))) {
    str = `'${str}`;
  }

  // Escape quotes according to RFC 4180
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    str = `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

export function generateCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const headerLine = headers.map(sanitizeCsvValue).join(',');
  const rowLines = rows.map((row) => row.map(sanitizeCsvValue).join(','));
  return [headerLine, ...rowLines].join('\r\n');
}

export function parseCsv(csvText: string): string[][] {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  return lines.map((line) => {
    const entries: string[] = [];
    let insideQuotes = false;
    let currentEntry = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          currentEntry += '"';
          i++; // skip escaped quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        entries.push(currentEntry.trim());
        currentEntry = '';
      } else {
        currentEntry += char;
      }
    }
    entries.push(currentEntry.trim());
    return entries;
  });
}
