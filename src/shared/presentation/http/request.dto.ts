import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  Min,
  Max,
  IsNumber,
  IsString,
  IsEmail,
  IsEnum,
  Matches,
  MinLength,
  MaxLength,
  ValidateIf,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  IsArray,
  IsISO8601,
} from 'class-validator';
import { RoleName } from '../../../modules/auth/domain/enums';
import { ProjectionType } from '../../../modules/projections/domain/enums';
import {
  PlanStatus,
  HarvestScenario,
  HourAdjustmentReason,
} from '../../../modules/plans/domain/enums';
export class PaginationQuery {
  @ApiProperty({ required: false })
  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page?: number;
  @ApiProperty({ required: false })
  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class PlantFilterQuery extends PaginationQuery {
  @ApiProperty({ required: false })
  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  plantId?: number;
}

export class WeekQuery {
  @ApiProperty({})
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;
  @ApiProperty({})
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(53)
  week!: number;
  @ApiProperty({ required: false })
  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  plantId?: number;
  @ApiProperty({ required: false })
  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  fruitId?: number;
}

export class PlantParametersDto {
  @ApiProperty({})
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  @Max(1000000000.0)
  boxesPerWorkerHour!: number;
  @ApiProperty({})
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  maxWorkers!: number;
  @ApiProperty({})
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(1)
  @Max(24)
  shiftHours!: number;
  @ApiProperty({})
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(24)
  maxOvertimeHours!: number;
  @ApiProperty({ example: '17:00' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime!: string;
  @ApiProperty({})
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.1)
  @Max(1)
  efficiencyFactor!: number;
  @ApiProperty({})
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(100)
  volumeTolerancePercent!: number;
}

export class ParameterOverridesDto extends PartialType(PlantParametersDto, {
  skipNullProperties: false,
}) {}

export class CustomerDto {
  @ApiProperty({})
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;
  @ApiProperty({})
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  country!: string;
}

export class UpdateCustomerDto extends PartialType(CustomerDto, {
  skipNullProperties: false,
}) {}

export class CreateUserDto {
  @ApiProperty({})
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;
  @ApiProperty({})
  @IsEmail()
  @MaxLength(255)
  email!: string;
  @ApiProperty({})
  @IsString()
  @MinLength(12)
  @MaxLength(72)
  password!: string;
  @ApiProperty({ enum: RoleName })
  @IsEnum(RoleName)
  role!: RoleName;
  @ApiProperty({ required: false })
  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  plantId?: number;
}

export class ProjectionImportDto {
  @ApiProperty({})
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  plantId!: number;
  @ApiProperty({})
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  fruitId!: number;
  @ApiProperty({})
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;
  @ApiProperty({})
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(53)
  week!: number;
  @ApiProperty({ enum: ProjectionType })
  @IsEnum(ProjectionType)
  type!: ProjectionType;
  @ApiProperty({ required: false, enum: ['BOXES', 'TONNES'], default: 'BOXES' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum({ BOXES: 'BOXES', TONNES: 'TONNES' })
  unit?: 'BOXES' | 'TONNES';
}

export class ProjectionQuery extends WeekQuery {
  @ApiProperty({ required: false, enum: ProjectionType })
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(ProjectionType)
  type?: ProjectionType;
}

export class CreatePlanDto {
  @ApiProperty({})
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  plantId!: number;
  @ApiProperty({})
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  fruitId!: number;
  @ApiProperty({})
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;
  @ApiProperty({})
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(53)
  week!: number;
  @ApiProperty({ enum: HarvestScenario })
  @IsEnum(HarvestScenario)
  harvestScenario!: HarvestScenario;
  @ApiProperty({ required: false, type: () => ParameterOverridesDto })
  @ValidateIf((_object, value) => value !== undefined)
  @ValidateNested()
  @Type(() => ParameterOverridesDto)
  overrides?: ParameterOverridesDto;
}

export class PlanQuery extends PlantFilterQuery {
  @ApiProperty({ required: false })
  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;
  @ApiProperty({ required: false })
  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(53)
  week?: number;
  @ApiProperty({ required: false })
  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  fruitId?: number;
  @ApiProperty({ required: false, enum: PlanStatus })
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(PlanStatus)
  status?: PlanStatus;
}

export class RejectPlanDto {
  @ApiProperty({})
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  comment!: string;
}

export class AdjustHoursDto {
  @ApiProperty({})
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(72)
  adjustedHours!: number;
  @ApiProperty({ enum: HourAdjustmentReason })
  @IsEnum(HourAdjustmentReason)
  reason!: HourAdjustmentReason;
}

export class AttendanceDto {
  @ApiProperty({})
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  areaId!: number;
  @ApiProperty({})
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  workers!: number;
}

export class OpenWorkdayDto {
  @ApiProperty({})
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  planDayId!: number;
  @ApiProperty({ required: false, format: 'date-time' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsISO8601({ strict: true })
  @Matches(/(Z|[+-]\d{2}:\d{2})$/)
  startedAt?: string;
  @ApiProperty({ type: [AttendanceDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => AttendanceDto)
  attendance!: AttendanceDto[];
}

export class ProgressDto {
  @ApiProperty({ format: 'date-time' })
  @IsISO8601({ strict: true })
  @Matches(/(Z|[+-]\d{2}:\d{2})$/)
  recordedAt!: string;
  @ApiProperty({})
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1000000000.0)
  cumulativeReceivedBoxes!: number;
  @ApiProperty({})
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1000000000.0)
  cumulativeProcessedBoxes!: number;
  @ApiProperty({ type: [AttendanceDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => AttendanceDto)
  attendance!: AttendanceDto[];
}

export class CloseWorkdayDto {
  @ApiProperty({})
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(72)
  workedHours!: number;
  @ApiProperty({})
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1000000000.0)
  receivedBoxes!: number;
  @ApiProperty({})
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1000000000.0)
  processedBoxes!: number;
  @ApiProperty({})
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1000000000.0)
  discardedBoxes!: number;
  @ApiProperty({})
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1000000000.0)
  looseKg!: number;
  @ApiProperty({})
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1000000000.0)
  fixedKg!: number;
}

export class WorkdayQuery extends PlantFilterQuery {
  @ApiProperty({ required: false, format: 'date' })
  @ValidateIf((_object, value) => value !== undefined)
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;
  @ApiProperty({ required: false })
  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  planId?: number;
}

export class AlertQuery extends PlantFilterQuery {
  @ApiProperty({ required: false, format: 'date' })
  @ValidateIf((_object, value) => value !== undefined)
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;
}
