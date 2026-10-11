import { PersistenceModule } from './shared/infrastructure/persistence/persistence.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { PlantsModule } from './modules/plants/plants.module';
import { CatalogsModule } from './modules/catalogs/catalogs.module';
import { ProjectionsModule } from './modules/projections/projections.module';
import { PlansModule } from './modules/plans/plans.module';
import { WorkdaysModule } from './modules/workdays/workdays.module';
import { AlertsModule } from './modules/alerts/alerts.module';
@Module({
  imports: [
    DatabaseModule,
    PersistenceModule,
    AuthModule,
    PlantsModule,
    CatalogsModule,
    ProjectionsModule,
    PlansModule,
    WorkdaysModule,
    AlertsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
