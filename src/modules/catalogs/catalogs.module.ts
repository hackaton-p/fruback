import { Module } from '@nestjs/common';
import { CatalogsService } from './application/catalogs.service';
import { CatalogsController } from './presentation/http/catalogs.controller';
@Module({ providers: [CatalogsService], controllers: [CatalogsController] })
export class CatalogsModule {}
