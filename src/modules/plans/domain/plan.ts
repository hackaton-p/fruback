import type { DomainRecord } from '../../../shared/domain/domain-record';
import type { PlanStatus } from './enums';
import type { HarvestScenario } from './enums';
import type { PlantParameters } from '../../plants/domain/plant-parameters';
export interface Plan extends DomainRecord {
  plantId: number;
  /** Null for consolidated plant-week plans; retained for legacy plans. */
  fruitId: number | null;
  year: number;
  week: number;
  harvestScenario: HarvestScenario;
  parametersSnapshot: PlantParameters;
  commercialCratesSnapshot: string | null;
  hasModifiedParameters: boolean;
  status: PlanStatus;
  createdById: number;
  submittedAt: Date | null;
  approvedById: number | null;
  approvedAt: Date | null;
  approvalComment: string | null;
}
