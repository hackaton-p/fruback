import type { DomainRecord } from '../../../shared/domain/domain-record';

export interface PlantFruit extends DomainRecord {
  plantId: number;
  fruitId: number;
}
