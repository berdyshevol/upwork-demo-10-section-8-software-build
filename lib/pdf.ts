// Hand-crafted minimal PDF (no native deps). Single page Helvetica text.
// Good enough for a "printable Check Register" — opens in any PDF reader.

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function buildCheckRegisterPdf(title: string, lines: string[]): Buffer {
  const fontSize = 10;
  const lineHeight = 14;
  const top = 760;
  const left = 50;

  const safeLines = lines.map((l) => l.slice(0, 110));

  const stream: string[] = [];
  stream.push("BT");
  stream.push(`/F1 14 Tf`);
  stream.push(`${left} ${top} Td`);
  stream.push(`(${escapeText(title)}) Tj`);
  stream.push(`/F1 ${fontSize} Tf`);
  stream.push(`0 -${lineHeight + 6} Td`);
  for (const l of safeLines) {
    stream.push(`(${escapeText(l)}) Tj`);
    stream.push(`0 -${lineHeight} Td`);
  }
  stream.push("ET");
  const streamStr = stream.join("\n");

  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  objects.push("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>");
  objects.push(`<< /Length ${Buffer.byteLength(streamStr, "binary")} >>\nstream\n${streamStr}\nendstream`);
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  let out = "%PDF-1.4\n%âãÏÓ\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out, "binary"));
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(out, "binary");
  out += `xref\n0 ${objects.length + 1}\n`;
  out += `0000000000 65535 f \n`;
  for (const off of offsets) {
    out += `${off.toString().padStart(10, "0")} 00000 n \n`;
  }
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(out, "binary");
}
