import { Global, Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PackingStore } from '../../application/packing.store';
import { TypeOrmPackingStore } from './typeorm-packing.store';
@Global()
@Module({
  providers: [
    {
      provide: PackingStore,
      inject: [DataSource],
      useFactory: (source: DataSource) => new TypeOrmPackingStore(source),
    },
  ],
  exports: [PackingStore],
})
export class PersistenceModule {}
