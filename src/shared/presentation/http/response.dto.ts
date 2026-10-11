import { ProgressType } from '../../../modules/workdays/domain/enums';
import { ApiProperty } from '@nestjs/swagger';
import { RoleName } from '../../../modules/auth/domain/enums';
import {
  PlanStatus,
  HarvestScenario,
  HourAdjustmentReason,
} from '../../../modules/plans/domain/enums';
import { ProjectionType } from '../../../modules/projections/domain/enums';
import { AlertType } from '../../../modules/alerts/domain/enums';
export class ParametersResponse {
  @ApiProperty() cratesPerWorkerHour!: string;
  @ApiProperty() maxWorkers!: number;
  @ApiProperty() shiftHours!: string;
  @ApiProperty() maxOvertimeHours!: string;
  @ApiProperty() startTime!: string;
  @ApiProperty() efficiencyFactor!: string;
  @ApiProperty() volumeTolerancePercent!: string;
}
export class PlantResponse {
  @ApiProperty({}) id!: number;
  @ApiProperty({}) createdAt!: Date;
  @ApiProperty({}) updatedAt!: Date;
  @ApiProperty({ nullable: true }) configurationCompletedAt!: Date | null;
  @ApiProperty({}) name!: string;
  @ApiProperty({}) cratesPerWorkerHour!: string;
  @ApiProperty({}) maxWorkers!: number;
  @ApiProperty({}) shiftHours!: string;
  @ApiProperty({}) maxOvertimeHours!: string;
  @ApiProperty({}) startTime!: string;
  @ApiProperty({}) efficiencyFactor!: string;
  @ApiProperty({}) volumeTolerancePercent!: string;
}
export class PlanDayResponse {
  @ApiProperty({}) id!: number;
  @ApiProperty({}) createdAt!: Date;
  @ApiProperty({}) updatedAt!: Date;
  @ApiProperty({}) planId!: number;
  @ApiProperty({}) date!: string;
  @ApiProperty({}) targetCrates!: string;
  @ApiProperty({}) workers!: number;
  @ApiProperty({}) hours!: string;
  @ApiProperty({ nullable: true }) adjustedHours!: string | null;
  @ApiProperty({ nullable: true, enum: HourAdjustmentReason })
  adjustmentReason!: HourAdjustmentReason | null;
}
export class PlanDayAreaResponse {
  @ApiProperty({ nullable: true }) arrivedWorkers!: number | null;
  @ApiProperty({ nullable: true }) startingWorkers!: number | null;
  @ApiProperty({}) id!: number;
  @ApiProperty({}) createdAt!: Date;
  @ApiProperty({}) updatedAt!: Date;
  @ApiProperty({}) planDayId!: number;
  @ApiProperty({}) areaId!: number;
  @ApiProperty({}) plannedWorkers!: number;
  @ApiProperty({ nullable: true }) presentWorkers!: number | null;
}
export class PlanResponse {
  @ApiProperty({}) id!: number;
  @ApiProperty({}) createdAt!: Date;
  @ApiProperty({}) updatedAt!: Date;
  @ApiProperty({}) plantId!: number;
  @ApiProperty({}) fruitId!: number;
  @ApiProperty({}) year!: number;
  @ApiProperty({}) week!: number;
  @ApiProperty({ enum: HarvestScenario }) harvestScenario!: HarvestScenario;
  @ApiProperty({ type: () => ParametersResponse })
  parametersSnapshot!: ParametersResponse;
  @ApiProperty({}) hasModifiedParameters!: boolean;
  @ApiProperty({ enum: PlanStatus }) status!: PlanStatus;
  @ApiProperty({}) createdById!: number;
  @ApiProperty({ nullable: true }) submittedAt!: Date | null;
  @ApiProperty({ nullable: true }) approvedById!: number | null;
  @ApiProperty({ nullable: true }) approvedAt!: Date | null;
  @ApiProperty({ nullable: true }) approvalComment!: string | null;
}
export class RoleResponse {
  @ApiProperty({}) id!: number;
  @ApiProperty({}) createdAt!: Date;
  @ApiProperty({}) updatedAt!: Date;
  @ApiProperty({ enum: RoleName }) name!: RoleName;
}
export class ProjectionResponse {
  @ApiProperty({}) id!: number;
  @ApiProperty({}) createdAt!: Date;
  @ApiProperty({}) updatedAt!: Date;
  @ApiProperty({}) plantId!: number;
  @ApiProperty({}) fruitId!: number;
  @ApiProperty({ nullable: true }) customerId!: number | null;
  @ApiProperty({ enum: ProjectionType }) type!: ProjectionType;
  @ApiProperty({}) year!: number;
  @ApiProperty({}) week!: number;
  @ApiProperty({ nullable: true }) date!: string | null;
  @ApiProperty({}) crates!: string;
}
export class AlertResponse {
  @ApiProperty({}) id!: number;
  @ApiProperty({}) createdAt!: Date;
  @ApiProperty({}) updatedAt!: Date;
  @ApiProperty({}) planDayId!: number;
  @ApiProperty({ nullable: true }) progressRecordId!: number | null;
  @ApiProperty({ enum: AlertType }) type!: AlertType;
  @ApiProperty({}) message!: string;
  @ApiProperty({}) date!: Date;
}
export class AreaResponse {
  @ApiProperty({}) id!: number;
  @ApiProperty({}) createdAt!: Date;
  @ApiProperty({}) updatedAt!: Date;
  @ApiProperty({}) name!: string;
  @ApiProperty({}) proportion!: string;
}
export class CustomerResponse {
  @ApiProperty({}) id!: number;
  @ApiProperty({}) createdAt!: Date;
  @ApiProperty({}) updatedAt!: Date;
  @ApiProperty({}) name!: string;
  @ApiProperty({}) country!: string;
}
export class FruitResponse {
  @ApiProperty({}) id!: number;
  @ApiProperty({}) createdAt!: Date;
  @ApiProperty({}) updatedAt!: Date;
  @ApiProperty({}) name!: string;
}
export class WorkdayResponse {
  @ApiProperty({ nullable: true }) initialEstimatedHours!: string | null;
  @ApiProperty() expectedDailyCrates!: string;
  @ApiProperty({}) id!: number;
  @ApiProperty({}) createdAt!: Date;
  @ApiProperty({}) updatedAt!: Date;
  @ApiProperty({}) planDayId!: number;
  @ApiProperty({}) startedAt!: Date;
  @ApiProperty({ nullable: true }) closedAt!: Date | null;
  @ApiProperty({}) presentWorkers!: number;
  @ApiProperty({}) receivedCrates!: string;
  @ApiProperty({ nullable: true }) workedHours!: string | null;
  @ApiProperty({}) processedCrates!: string;
  @ApiProperty({ nullable: true }) discardedCrates!: string | null;
  @ApiProperty({ nullable: true }) looseKg!: string | null;
  @ApiProperty({ nullable: true }) fixedKg!: string | null;
  @ApiProperty({ nullable: true }) targetMet!: boolean | null;
  @ApiProperty({ nullable: true }) difference!: string | null;
}
export class ProgressRecordResponse {
  @ApiProperty({ enum: ProgressType }) type!: ProgressType;
  @ApiProperty({ nullable: true }) areaId!: number | null;
  @ApiProperty({ nullable: true }) staffChange!: number | null;
  @ApiProperty({ nullable: true }) expectedDailyCrates!: string | null;
  @ApiProperty({ nullable: true }) estimatedHours!: string | null;
  @ApiProperty({}) id!: number;
  @ApiProperty({}) createdAt!: Date;
  @ApiProperty({}) updatedAt!: Date;
  @ApiProperty({}) workdayId!: number;
  @ApiProperty({}) recordedAt!: Date;
  @ApiProperty({ nullable: true }) cumulativeReceivedCrates!: string | null;
  @ApiProperty({ nullable: true }) cumulativeProcessedCrates!: string | null;
  @ApiProperty({}) presentWorkers!: number;
  @ApiProperty({}) recordedById!: number;
}
export class ActorResponse {
  @ApiProperty({}) id!: number;
  @ApiProperty({}) authUserId!: string;
  @ApiProperty({}) name!: string;
  @ApiProperty({}) email!: string;
  @ApiProperty({ enum: RoleName }) role!: RoleName;
  @ApiProperty({ nullable: true }) plantId!: number | null;
  @ApiProperty({ type: [Number] }) plantIds!: number[];
}
export class PlanTotalsResponse {
  @ApiProperty({}) targetCrates!: string;
  @ApiProperty({}) commercialCrates!: string;
  @ApiProperty({}) commercialGapCrates!: string;
  @ApiProperty({}) commercialGapPercent!: number;
  @ApiProperty({ nullable: true }) commercialCoverage!: number | null;
  @ApiProperty({}) peakWorkers!: number;
  @ApiProperty({}) averageWorkers!: number;
  @ApiProperty({}) operatingHours!: string;
}
export class PlanDayDetailsResponse extends PlanDayResponse {
  @ApiProperty({ type: () => [PlanDayAreaResponse] })
  areas!: PlanDayAreaResponse[];
  @ApiProperty({ nullable: true, type: () => WorkdayResponse })
  workday!: WorkdayResponse | null;
  @ApiProperty({ type: () => [AlertResponse] }) alerts!: AlertResponse[];
  @ApiProperty({ nullable: true }) margin!: number | null;
  @ApiProperty({}) hasLowMargin!: boolean;
  @ApiProperty({}) dayStatus!: string;
}
export class ParameterChangeResponse {
  @ApiProperty() key!: string;
  @ApiProperty() value!: string;
  @ApiProperty() defaultValue!: string;
}
export class PlanDetailsResponse extends PlanResponse {
  @ApiProperty() plantName!: string;
  @ApiProperty({ nullable: true }) startDate!: string | null;
  @ApiProperty({ nullable: true }) endDate!: string | null;
  @ApiProperty({ type: () => ParametersResponse })
  plantDefaults!: ParametersResponse;
  @ApiProperty({ type: () => [ParameterChangeResponse] })
  parameterChanges!: ParameterChangeResponse[];
  @ApiProperty({ type: () => [PlanDayDetailsResponse] })
  days!: PlanDayDetailsResponse[];
  @ApiProperty({ type: () => PlanTotalsResponse }) totals!: PlanTotalsResponse;
}
export class SimulatedAreaResponse {
  @ApiProperty({ nullable: true }) arrivedWorkers!: number | null;
  @ApiProperty({ nullable: true }) startingWorkers!: number | null;
  @ApiProperty({}) areaId!: number;
  @ApiProperty({}) plannedWorkers!: number;
  @ApiProperty({ nullable: true }) presentWorkers!: number | null;
}
export class SimulatedDayResponse {
  @ApiProperty({}) date!: string;
  @ApiProperty({}) targetCrates!: string;
  @ApiProperty({}) workers!: number;
  @ApiProperty({}) hours!: string;
  @ApiProperty({ nullable: true }) margin!: number | null;
  @ApiProperty({}) hasLowMargin!: boolean;
  @ApiProperty({}) dayStatus!: string;
  @ApiProperty({ type: () => [SimulatedAreaResponse] })
  areas!: SimulatedAreaResponse[];
}
export class SimulationResponse {
  @ApiProperty({ type: () => ParametersResponse })
  plantDefaults!: ParametersResponse;
  @ApiProperty({ type: () => [ParameterChangeResponse] })
  parameterChanges!: ParameterChangeResponse[];
  @ApiProperty({ type: () => ParametersResponse })
  parametersSnapshot!: ParametersResponse;
  @ApiProperty({}) hasModifiedParameters!: boolean;
  @ApiProperty({ type: () => [SimulatedDayResponse] })
  days!: SimulatedDayResponse[];
  @ApiProperty({ type: () => PlanTotalsResponse }) totals!: PlanTotalsResponse;
}
export class ImportResponse {
  @ApiProperty({}) imported!: number;
  @ApiProperty({ type: () => [ProjectionResponse] })
  items!: ProjectionResponse[];
}
export class ExecutionMetricsResponse {
  @ApiProperty() productivity!: number;
  @ApiProperty() remainingCrates!: number;
  @ApiProperty({ nullable: true }) additionalWorkers!: number | null;
  @ApiProperty({}) expectedReceived!: number;
  @ApiProperty({ nullable: true }) deviationPercent!: number | null;
  @ApiProperty({}) volumeAlert!: boolean;
  @ApiProperty({ nullable: true }) estimatedHours!: number | null;
  @ApiProperty({}) requiresAdjustment!: boolean;
  @ApiProperty({}) riskOfExtraShift!: boolean;
}
export class ProgressResultResponse extends ProgressRecordResponse {
  @ApiProperty({ type: () => ExecutionMetricsResponse })
  metrics!: ExecutionMetricsResponse;
  @ApiProperty({ type: () => [AlertResponse] }) alerts!: AlertResponse[];
}
export class WorkdayDetailsResponse extends WorkdayResponse {
  @ApiProperty({ type: () => PlanDayResponse }) planDay!: PlanDayResponse;
  @ApiProperty({ type: () => [PlanDayAreaResponse] })
  attendance!: PlanDayAreaResponse[];
  @ApiProperty({ type: () => [ProgressRecordResponse] })
  progress!: ProgressRecordResponse[];
  @ApiProperty({ type: () => [AlertResponse] }) alerts!: AlertResponse[];
  @ApiProperty({ type: () => ExecutionMetricsResponse })
  metrics!: ExecutionMetricsResponse;
}
export class WorkdayListResponse extends WorkdayResponse {
  @ApiProperty({}) planId!: number;
  @ApiProperty({}) plantId!: number;
  @ApiProperty({}) date!: string;
}
export class DailyMetricsResponse {
  @ApiProperty({ nullable: true }) cratesPerWorker!: number | null;
  @ApiProperty({ nullable: true }) fulfillment!: number | null;
  @ApiProperty({ nullable: true }) absenteeism!: number | null;
  @ApiProperty({ nullable: true }) productivity!: number | null;
  @ApiProperty({ nullable: true }) discardRate!: number | null;
  @ApiProperty({ nullable: true }) looseRate!: number | null;
  @ApiProperty({ nullable: true }) fixedRate!: number | null;
}
export class DashboardAreaResponse extends PlanDayAreaResponse {
  @ApiProperty({ nullable: true }) absenteeism!: number | null;
}
export class DashboardDayResponse {
  @ApiProperty() defaultShiftHours!: number;
  @ApiProperty() defaultProductivity!: number;
  @ApiProperty() maxOvertimeHours!: number;
  @ApiProperty({}) planId!: number;
  @ApiProperty({}) plantId!: number;
  @ApiProperty({}) fruitId!: number;
  @ApiProperty({}) date!: string;
  @ApiProperty({}) targetCrates!: string;
  @ApiProperty({}) plannedWorkers!: number;
  @ApiProperty({}) plannedHours!: string;
  @ApiProperty({ nullable: true, type: () => WorkdayResponse })
  workday!: WorkdayResponse | null;
  @ApiProperty({ type: () => [DashboardAreaResponse] })
  areas!: DashboardAreaResponse[];
  @ApiProperty({ type: () => DailyMetricsResponse })
  metrics!: DailyMetricsResponse;
}
export class DashboardKpisResponse {
  @ApiProperty() weeklyTargetCrates!: string;
  @ApiProperty() overtimeDays!: number;
  @ApiProperty() closedDays!: number;
  @ApiProperty({ nullable: true }) cratesPerWorker!: number | null;
  @ApiProperty({}) targetCrates!: string;
  @ApiProperty({}) processedCrates!: string;
  @ApiProperty({ nullable: true }) fulfillment!: number | null;
  @ApiProperty({ nullable: true }) averageHours!: number | null;
  @ApiProperty({ nullable: true }) staffingRatio!: number | null;
  @ApiProperty({ nullable: true }) productivity!: number | null;
  @ApiProperty({ nullable: true }) discardRate!: number | null;
}
export class DashboardReferenceResponse {
  @ApiProperty() plantId!: number;
  @ApiProperty() shiftHours!: number;
  @ApiProperty() productivity!: number;
}
export class DashboardInsightResponse {
  @ApiProperty() code!: string;
  @ApiProperty({ nullable: true }) value!: number | null;
  @ApiProperty({ nullable: true }) reference!: number | null;
  @ApiProperty({ type: [String] }) dates!: string[];
}
export class DashboardResponse {
  @ApiProperty() pendingPlans!: number;
  @ApiProperty() alertCount!: number;
  @ApiProperty({ type: () => [DashboardReferenceResponse] })
  references!: DashboardReferenceResponse[];
  @ApiProperty({ type: () => [DashboardInsightResponse] })
  insights!: DashboardInsightResponse[];
  @ApiProperty({
    type: 'object',
    additionalProperties: {
      type: 'string',
      nullable: true,
      enum: ['OK', 'WARNING', 'ALERT', null],
    },
  })
  indicators!: Record<string, string | null>;
  @ApiProperty({}) year!: number;
  @ApiProperty({}) week!: number;
  @ApiProperty({ nullable: true }) plantId!: number | null;
  @ApiProperty({ type: () => [DashboardDayResponse] })
  days!: DashboardDayResponse[];
  @ApiProperty({ type: () => DashboardKpisResponse })
  kpis!: DashboardKpisResponse;
}

export class WorkdayEstimateResponse extends ExecutionMetricsResponse {
  @ApiProperty({ nullable: true, format: 'date-time' }) estimatedEndAt!:
    string | null;
}
export class PlanListResponse {
  @ApiProperty({ type: () => [PlanDetailsResponse] })
  items!: PlanDetailsResponse[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'integer' },
    description:
      'Counts across all states, respecting plant, fruit and week filters, before pagination',
  })
  statusCounts!: Record<string, number>;
}
