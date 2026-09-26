import { Module } from '@nestjs/common';
import { SyncService } from './application/sync.service.js';
import { PrismaSyncRepository } from './infrastructure/prisma/PrismaSyncRepository.js';
import { SyncController } from './presentation/sync.controller.js';
import { SYNC_REPOSITORY } from './sync.tokens.js';

@Module({
  controllers: [SyncController],
  providers: [
    SyncService,
    { provide: SYNC_REPOSITORY, useClass: PrismaSyncRepository },
  ],
})
export class SyncModule {}
