import type { DomainRecord } from '../../../shared/domain/domain-record';
import type { AlertType } from './enums';
export interface Alert extends DomainRecord {
  planDayId: number;
  progressRecordId: number | null;
  type: AlertType;
  message: string;
  date: Date;
}
