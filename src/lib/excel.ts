import ExcelJS from 'exceljs';
import { NextResponse } from 'next/server';

export function createWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Attendance App';
  workbook.created = new Date();
  return workbook;
}

export function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF7C3AED' },
  };
  row.alignment = { vertical: 'middle', horizontal: 'center' };
}

export function autosizeColumns(worksheet: ExcelJS.Worksheet, minWidth = 12, maxWidth = 36) {
  worksheet.columns.forEach((column) => {
    let width = minWidth;
    if (!column.eachCell) return;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const text = cell.value == null ? '' : String(cell.value);
      width = Math.max(width, Math.min(maxWidth, text.length + 2));
    });
    column.width = width;
  });
}

export async function workbookResponse(workbook: ExcelJS.Workbook, filename: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const encoded = encodeURIComponent(filename);

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`,
    },
  });
}

export function todayStamp() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
