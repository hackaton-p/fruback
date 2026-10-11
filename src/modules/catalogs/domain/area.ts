import type { DomainRecord } from '../../../shared/domain/domain-record';
export interface Area extends DomainRecord {
  name: string;
  proportion: string;
}
