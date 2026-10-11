import { Module } from '@nestjs/common';
import { ProjectionsService } from './application/projections.service';
import { ProjectionsController } from './presentation/http/projections.controller';
import { SpreadsheetReader } from './application/spreadsheet-reader';
import { ExcelProjectionReader } from './infrastructure/excel-projection.reader';
@Module({
  providers: [
    ProjectionsService,
    { provide: SpreadsheetReader, useClass: ExcelProjectionReader },
  ],
  controllers: [ProjectionsController],
})
export class ProjectionsModule {}
