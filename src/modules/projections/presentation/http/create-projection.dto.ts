import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
  IsNumber,
  Min,
  Max,
  IsString,
  MinLength,
  MaxLength,
  ValidateIf,
  IsISO8601,
  Matches,
} from 'class-validator';
import { ProjectionImportDto } from '../../../../shared/presentation/http/request.dto';

class ProjectionRowDto {
  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1e9)
  quantity!: number;

  @ApiProperty({ required: false, format: 'date' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;

  @ApiProperty({ required: false })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  customerName?: string;

  @ApiProperty({ required: false })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  country?: string;
}

export class CreateProjectionDto extends ProjectionImportDto {
  @ApiProperty({ type: [ProjectionRowDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ProjectionRowDto)
  rows!: ProjectionRowDto[];
}
