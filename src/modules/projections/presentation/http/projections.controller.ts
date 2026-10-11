import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  CurrentActor,
  Roles,
} from '../../../auth/presentation/http/auth.decorators';
import type { Actor } from '../../../auth/domain/actor';
import { RoleName } from '../../../auth/domain/enums';
import { ApiProtected } from '../../../../shared/presentation/http/api.decorators';
import { ProjectionsService } from '../../application/projections.service';
import {
  ProjectionImportDto,
  CreateProjectionDto,
  ProjectionQuery,
} from '../../../../shared/presentation/http/request.dto';
import {
  ProjectionResponse,
  ImportResponse,
} from '../../../../shared/presentation/http/response.dto';
@ApiTags('Projections')
@ApiProtected()
@Controller('projections')
export class ProjectionsController {
  constructor(private readonly service: ProjectionsService) {}
  @Post()
  @Roles(RoleName.PLANNER)
  @ApiOperation({ summary: 'Register weekly projections from a form' })
  @ApiCreatedResponse({ type: ImportResponse })
  create(@Body() body: CreateProjectionDto, @CurrentActor() actor: Actor) {
    return this.service.create(body, body.rows, actor);
  }
  @Get()
  @ApiOperation({ summary: 'Read immutable weekly projections' })
  @ApiOkResponse({ type: [ProjectionResponse] })
  list(@Query() query: ProjectionQuery, @CurrentActor() actor: Actor) {
    return this.service.list(query, actor);
  }
  @Post('import')
  @Roles(RoleName.PLANNER)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 6 },
    }),
  )
  @ApiOperation({
    summary: 'Import one XLSX projection per plant, fruit, ISO week and type',
    description:
      'One sheet, max 500 rows. Harvest columns: date (YYYY-MM-DD), quantity. Commercial columns: customerName, country, quantity. All quantities are crates (jabas), without conversions. Entire import is atomic; repeated imports return 409.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'plantId', 'fruitId', 'year', 'week', 'type'],
      properties: {
        file: { type: 'string', format: 'binary' },
        plantId: { type: 'integer', minimum: 1 },
        fruitId: { type: 'integer', minimum: 1 },
        year: { type: 'integer', example: 2026 },
        week: { type: 'integer', minimum: 1, maximum: 53 },
        type: { type: 'string', enum: ['COSECHA', 'COMERCIAL'] },
      },
    },
  })
  @ApiCreatedResponse({ type: ImportResponse })
  import(
    @Body() body: ProjectionImportDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentActor() actor: Actor,
  ) {
    if (!file) throw new BadRequestException('An XLSX file is required');
    return this.service.import(body, file.buffer, actor);
  }
}
