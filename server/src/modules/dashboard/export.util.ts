/**
 * 报表导出工具（零依赖，后端生成文件流）。
 * - Excel：UTF-8 BOM + CSV，可被 Excel 直接打开且中文不乱码。
 * - PDF：极简纯文本表格 PDF（Base14 Helvetica，仅支持 ASCII；中文会被 ? 替换，
 *   含中文的报表请走 Excel 导出）。
 */

export interface ExportColumn {
  key: string;
  label: string;
}

export interface ExportInput {
  title: string;
  columns: ExportColumn[];
  rows: any[];
}

export interface ExportFile {
  buffer: Buffer;
  mime: string;
  ext: string;
}

function csvEscape(v: any): string {
  let s = v === null || v === undefined ? '' : String(v);
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** 生成 Excel 兼容的 CSV（带 BOM） */
export function buildCsv(input: ExportInput): ExportFile {
  const head = input.columns.map((c) => csvEscape(c.label)).join(',');
  const body = input.rows
    .map((r) => input.columns.map((c) => csvEscape(r ? r[c.key] : '')).join(','))
    .join('\r\n');
  const csv = `﻿${head}\r\n${body}\r\n`; // BOM + CRLF，Excel 最稳
  return { buffer: Buffer.from(csv, 'utf8'), mime: 'text/csv; charset=utf-8', ext: 'csv' };
}

function sanitizeAscii(s: any): string {
  return String(s ?? '').replace(/[^\x20-\x7E]/g, '?');
}
function pdfEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/** 生成极简 PDF（文本表格，ASCII only） */
export function buildPdf(input: ExportInput): ExportFile {
  const pageW = 595;
  const pageH = 842;
  const margin = 40;
  const contentW = pageW - margin * 2;
  const cols = input.columns;
  const colW = Math.floor(contentW / Math.max(1, cols.length));
  const maxChars = Math.max(4, Math.floor(colW / 6));
  const trunc = (s: string) => {
    s = sanitizeAscii(s);
    return s.length > maxChars ? s.slice(0, maxChars - 1) + '…' : s;
  };

  const title = /[^\x20-\x7E]/.test(input.title) ? 'Report' : input.title;
  const headerCells = cols.map((c) => trunc(c.label));
  const dataLines = (input.rows || []).map((r) =>
    cols.map((c) => trunc(r ? r[c.key] : '')),
  );

  // 组装逻辑行（title / header / data），用于分页
  type Line = { size: number; cells: string[] };
  const lines: Line[] = [];
  lines.push({ size: 16, cells: [title] });
  lines.push({ size: 10, cells: headerCells });
  for (const row of dataLines) lines.push({ size: 10, cells: row });

  // 分页
  const pages: Line[][] = [];
  let cur: Line[] = [];
  let y = pageH - margin;
  for (const ln of lines) {
    const lh = ln.size === 16 ? 26 : 18;
    if (y - lh < margin) {
      pages.push(cur);
      cur = [];
      y = pageH - margin;
    }
    cur.push(ln);
    y -= lh;
  }
  if (cur.length) pages.push(cur);

  // 生成每个页面的内容流
  const pageContents: string[] = pages.map((page) => {
    let s = '';
    let yPos = pageH - margin;
    for (const ln of page) {
      const lh = ln.size === 16 ? 26 : 18;
      yPos -= lh;
      if (ln.size === 16) {
        s += `BT /F1 ${ln.size} Tf 1 0 0 1 ${margin} ${yPos} Tm (${pdfEscape(ln.cells[0])}) Tj ET\n`;
        continue;
      }
      let x = margin;
      s += `BT /F1 ${ln.size} Tf\n`;
      for (const cell of ln.cells) {
        s += `1 0 0 1 ${x} ${yPos} Tm (${pdfEscape(cell)}) Tj\n`;
        x += colW;
      }
      s += 'ET\n';
    }
    return s;
  });

  // 组装 PDF 对象
  const objects: Record<number, string> = {};
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = '<< /Type /Pages /Kids [__KIDS__] /Count __COUNT__ >>';
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  const kids: string[] = [];
  let num = 4;
  for (const content of pageContents) {
    const pageNum = num++;
    const contentNum = num++;
    kids.push(`${pageNum} 0 R`);
    objects[pageNum] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] ` +
      `/Resources << /Font << /F1 3 0 R >> >> /Contents ${contentNum} 0 R >>`;
    const len = Buffer.byteLength(content, 'latin1');
    objects[contentNum] = `<< /Length ${len} >>\nstream\n${content}\nendstream`;
  }
  objects[2] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${kids.length} >>`;

  // 序列化 + xref
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  const ids = Object.keys(objects)
    .map(Number)
    .sort((a, b) => a - b);
  for (const i of ids) {
    offsets[i] = Buffer.byteLength(pdf, 'latin1');
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefStart = Buffer.byteLength(pdf, 'latin1');
  const count = ids.length + 1;
  pdf += `xref\n0 ${count}\n0000000000 65535 f \n`;
  for (const i of ids) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return { buffer: Buffer.from(pdf, 'latin1'), mime: 'application/pdf', ext: 'pdf' };
}
