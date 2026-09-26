import { Module } from '@nestjs/common';
import { UserService } from './application/user.service.js';
import { PrismaUserRepository } from './infrastructure/prisma/PrismaUserRepository.js';
import { UserController } from './presentation/user.controller.js';
import { USER_REPOSITORY } from './user.tokens.js';

@Module({
  controllers: [UserController],
  providers: [
    UserService,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
  ],
  exports: [USER_REPOSITORY],
})
export class UserModule {}
