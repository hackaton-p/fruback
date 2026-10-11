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
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ProjectionImportDto } from '../../../../shared/presentation/http/request.dto';

class ProjectionRowDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(1e9)
  quantity!: number;

  @ApiProperty({ required: false })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(10)
  date?: string;

  @ApiProperty({ required: false })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(255)
  customerName?: string;

  @ApiProperty({ required: false })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
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
