import { Module } from '@nestjs/common';
import { SyncService } from './application/sync.service.js';
import { PrismaSyncRepository } from './infrastructure/prisma/PrismaSyncRepository.js';
import { SyncController } from './presentation/sync.controller.js';
import { SECRET_CIPHER, SYNC_REPOSITORY } from './sync.tokens.js';
import { AesGcmCipher } from './infrastructure/crypto/AesGcmCipher.js';

@Module({
  controllers: [SyncController],
  providers: [
    SyncService,
    { provide: SYNC_REPOSITORY, useClass: PrismaSyncRepository },
    { provide: SECRET_CIPHER, useClass: AesGcmCipher },
  ],
})
export class SyncModule {}
