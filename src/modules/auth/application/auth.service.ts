import { randomBytes } from 'node:crypto';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { User } from '../../user/domain/User.js';
import type { UserRepository } from '../../user/ports/UserRepository.js';
import { USER_REPOSITORY } from '../../user/user.tokens.js';
import {
  GOOGLE_IDENTITY_VERIFIER,
  REFRESH_TOKEN_REPOSITORY,
} from '../auth.tokens.js';
import type { GoogleIdentityVerifier } from '../ports/GoogleIdentityVerifier.js';
import type { RefreshTokenRepository } from '../ports/RefreshTokenRepository.js';
/** Par de tokens emitido (la clase TokenPairDto solo documenta la respuesta en Swagger). */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

const EXPIRED = 'Sesión vencida: vuelve a iniciar sesión';

@Injectable()
export class AuthService {
  private readonly refreshDays: number;

  constructor(
    @Inject(GOOGLE_IDENTITY_VERIFIER)
    private readonly google: GoogleIdentityVerifier,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly tokens: RefreshTokenRepository,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.refreshDays = Number(config.get('JWT_REFRESH_EXPIRES_IN_DAYS') ?? 30);
  }

  /** Login con Google: verifica el ID token, crea el usuario si es nuevo y emite tokens. */
  async loginWithGoogle(idToken: string): Promise<TokenPair & { user: User }> {
    const profile = await this.google.verify(idToken);
    const user = await this.users.upsertFromGoogle(profile);
    const pair = await this.issue(user.id);
    return {
      accessToken: pair.accessToken,
      refreshToken: pair.refreshToken,
      expiresIn: pair.expiresIn,
      user,
    };
  }

  /** Rota: el refresh token presentado se borra y se emite un par nuevo. */
  async refresh(refreshToken: string): Promise<TokenPair> {
    const stored = await this.tokens.find(refreshToken);
    if (!stored || stored.revoked || stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException(EXPIRED);
    }
    // Si otro pedido ya lo usó (reuso o carrera), no se emite nada.
    if (!(await this.tokens.delete(refreshToken)))
      throw new UnauthorizedException(EXPIRED);
    return this.issue(stored.userId);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokens.delete(refreshToken);
  }

  private async issue(userId: string): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync({ userId });
    const { exp = 0, iat = 0 } = this.jwt.decode<{
      exp?: number;
      iat?: number;
    }>(accessToken);
    const refreshToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.refreshDays * 86_400_000);
    await this.tokens.create(userId, refreshToken, expiresAt);
    return { accessToken, refreshToken, expiresIn: exp - iat };
  }
}
