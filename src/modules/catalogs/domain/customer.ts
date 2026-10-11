import type { DomainRecord } from '../../../shared/domain/domain-record';
export interface Customer extends DomainRecord {
  name: string;
  country: string;
}
