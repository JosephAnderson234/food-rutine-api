import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../../shared/auth/jwt.strategy.js';
import { UserModule } from '../user/user.module.js';
import { AuthService } from './application/auth.service.js';
import {
  GOOGLE_IDENTITY_VERIFIER,
  REFRESH_TOKEN_REPOSITORY,
} from './auth.tokens.js';
import { GoogleIdTokenVerifier } from './infrastructure/google/GoogleIdTokenVerifier.js';
import { PrismaRefreshTokenRepository } from './infrastructure/prisma/PrismaRefreshTokenRepository.js';
import { AuthController } from './presentation/auth.controller.js';

@Module({
  imports: [
    UserModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get('JWT_ACCESS_EXPIRES_IN') ?? '15m',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useClass: PrismaRefreshTokenRepository,
    },
    { provide: GOOGLE_IDENTITY_VERIFIER, useClass: GoogleIdTokenVerifier },
  ],
})
export class AuthModule {}
