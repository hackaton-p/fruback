import type { DomainRecord } from '../../../shared/domain/domain-record';
import type { RoleName } from './enums';
export interface Role extends DomainRecord {
  name: RoleName;
}
