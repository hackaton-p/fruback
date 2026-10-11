import type { ProjectionType } from '../domain/enums';
export interface ProjectionRow {
  date?: string;
  customerName?: string;
  country?: string;
  quantity: number;
}
export abstract class SpreadsheetReader {
  abstract read(file: Buffer, type: ProjectionType): Promise<ProjectionRow[]>;
}
