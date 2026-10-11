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
  @ApiProperty() boxesPerWorkerHour!: string;
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
  @ApiProperty({}) name!: string;
  @ApiProperty({}) boxesPerWorkerHour!: string;
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
  @ApiProperty({}) targetBoxes!: string;
  @ApiProperty({}) workers!: number;
  @ApiProperty({}) hours!: string;
  @ApiProperty({ nullable: true }) adjustedHours!: string | null;
  @ApiProperty({ nullable: true, enum: HourAdjustmentReason })
  adjustmentReason!: HourAdjustmentReason | null;
}
export class PlanDayAreaResponse {
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
  @ApiProperty({}) hasParameterOverrides!: boolean;
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
  @ApiProperty({}) boxes!: string;
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
  @ApiProperty({}) id!: number;
  @ApiProperty({}) createdAt!: Date;
  @ApiProperty({}) updatedAt!: Date;
  @ApiProperty({}) planDayId!: number;
  @ApiProperty({}) startedAt!: Date;
  @ApiProperty({ nullable: true }) closedAt!: Date | null;
  @ApiProperty({}) presentWorkers!: number;
  @ApiProperty({}) receivedBoxes!: string;
  @ApiProperty({ nullable: true }) workedHours!: string | null;
  @ApiProperty({}) processedBoxes!: string;
  @ApiProperty({ nullable: true }) discardedBoxes!: string | null;
  @ApiProperty({ nullable: true }) looseKg!: string | null;
  @ApiProperty({ nullable: true }) fixedKg!: string | null;
  @ApiProperty({ nullable: true }) targetMet!: boolean | null;
  @ApiProperty({ nullable: true }) difference!: string | null;
}
export class ProgressRecordResponse {
  @ApiProperty({}) id!: number;
  @ApiProperty({}) createdAt!: Date;
  @ApiProperty({}) updatedAt!: Date;
  @ApiProperty({}) workdayId!: number;
  @ApiProperty({}) recordedAt!: Date;
  @ApiProperty({}) cumulativeReceivedBoxes!: string;
  @ApiProperty({}) cumulativeProcessedBoxes!: string;
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
}
export class PlanTotalsResponse {
  @ApiProperty({}) targetBoxes!: string;
  @ApiProperty({}) commercialBoxes!: string;
  @ApiProperty({}) commercialGapBoxes!: string;
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
export class PlanDetailsResponse extends PlanResponse {
  @ApiProperty({ type: () => [PlanDayDetailsResponse] })
  days!: PlanDayDetailsResponse[];
  @ApiProperty({ type: () => PlanTotalsResponse }) totals!: PlanTotalsResponse;
}
export class SimulatedAreaResponse {
  @ApiProperty({}) areaId!: number;
  @ApiProperty({}) plannedWorkers!: number;
  @ApiProperty({ nullable: true }) presentWorkers!: number | null;
}
export class SimulatedDayResponse {
  @ApiProperty({}) date!: string;
  @ApiProperty({}) targetBoxes!: string;
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
  parametersSnapshot!: ParametersResponse;
  @ApiProperty({}) hasParameterOverrides!: boolean;
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
  @ApiProperty({}) planId!: number;
  @ApiProperty({}) plantId!: number;
  @ApiProperty({}) fruitId!: number;
  @ApiProperty({}) date!: string;
  @ApiProperty({}) targetBoxes!: string;
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
  @ApiProperty({}) targetBoxes!: string;
  @ApiProperty({}) processedBoxes!: string;
  @ApiProperty({ nullable: true }) fulfillment!: number | null;
  @ApiProperty({ nullable: true }) averageHours!: number | null;
  @ApiProperty({ nullable: true }) staffingRatio!: number | null;
  @ApiProperty({ nullable: true }) productivity!: number | null;
  @ApiProperty({ nullable: true }) discardRate!: number | null;
}
export class DashboardResponse {
  @ApiProperty({}) year!: number;
  @ApiProperty({}) week!: number;
  @ApiProperty({ nullable: true }) plantId!: number | null;
  @ApiProperty({ type: () => [DashboardDayResponse] })
  days!: DashboardDayResponse[];
  @ApiProperty({ type: () => DashboardKpisResponse })
  kpis!: DashboardKpisResponse;
}
