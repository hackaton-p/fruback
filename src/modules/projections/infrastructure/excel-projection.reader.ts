import { Workbook } from 'exceljs';
import { SpreadsheetReader } from '../application/spreadsheet-reader';
import type { ProjectionRow } from '../application/spreadsheet-reader';
import { ProjectionType } from '../domain/enums';
import { ensure } from '../../../shared/domain/domain-error';
export class ExcelProjectionReader extends SpreadsheetReader {
  async read(file: Buffer, type: ProjectionType): Promise<ProjectionRow[]> {
    ensure(
      file.length > 0 && file.length <= 2 * 1024 * 1024,
      'Expected an XLSX file up to 2 MB',
    );
    const workbook = new Workbook();
    try {
      await workbook.xlsx.load(file as never);
    } catch {
      ensure(false, 'Invalid XLSX file');
    }
    ensure(
      workbook.worksheets.length === 1,
      'The workbook must contain exactly one sheet',
    );
    const sheet = workbook.worksheets[0];
    ensure(
      sheet.rowCount > 1 && sheet.rowCount <= 501,
      'Expected between 1 and 500 rows',
    );
    const headers =
      type === ProjectionType.HARVEST
        ? ['date', 'quantity']
        : ['customerName', 'country', 'quantity'];
    ensure(
      sheet.columnCount === headers.length &&
        headers.every(
          (header, i) => sheet.getRow(1).getCell(i + 1).value === header,
        ),
      'Invalid columns: expected ' + headers.join(', '),
    );
    const result: ProjectionRow[] = [];
    for (let index = 2; index <= sheet.rowCount; index++) {
      const row = sheet.getRow(index);
      if (!row.hasValues) continue;
      const values = row.values as unknown[];
      const quantity = values[headers.length];
      ensure(
        typeof quantity === 'number' &&
          Number.isFinite(quantity) &&
          quantity >= 0 &&
          quantity <= 1e9,
        `Invalid quantity at row ${index}`,
      );
      if (type === ProjectionType.HARVEST) {
        const value = values[1];
        const date =
          value instanceof Date ? value.toISOString().slice(0, 10) : value;
        ensure(
          typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date),
          `Invalid date at row ${index}`,
        );
        result.push({ date, quantity });
      } else {
        ensure(
          typeof values[1] === 'string' &&
            values[1].trim().length > 0 &&
            values[1].length <= 255 &&
            typeof values[2] === 'string' &&
            values[2].trim().length >= 2 &&
            values[2].length <= 100,
          `Invalid customer at row ${index}`,
        );
        result.push({
          customerName: values[1].trim(),
          country: values[2].trim(),
          quantity,
        });
      }
    }
    ensure(result.length > 0, 'The workbook is empty');
    return result;
  }
}
