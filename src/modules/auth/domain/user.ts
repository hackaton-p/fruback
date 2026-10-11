import type { DomainRecord } from '../../../shared/domain/domain-record';
export interface User extends DomainRecord {
  roleId: number;
  plantId: number | null;
  name: string;
  email: string;
  passwordHash: string | null;
  authUserId: string | null;
}
