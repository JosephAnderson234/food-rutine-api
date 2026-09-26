import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserRepository } from '../../user/ports/UserRepository.js';
import type { GoogleIdentityVerifier } from '../ports/GoogleIdentityVerifier.js';
import type {
  RefreshTokenRepository,
  StoredRefreshToken,
} from '../ports/RefreshTokenRepository.js';
import { AuthService } from './auth.service.js';

const user = {
  id: 'u1',
  googleSub: 'g1',
  email: 'a@b.com',
  name: 'Ana',
  pictureUrl: null,
  createdAt: new Date(),
};

function memoryTokens(): RefreshTokenRepository & {
  store: Map<string, StoredRefreshToken>;
} {
  const store = new Map<string, StoredRefreshToken>();
  return {
    store,
    create: async (userId, token, expiresAt) => {
      store.set(token, { userId, expiresAt, revoked: false });
    },
    find: async (token) => store.get(token) ?? null,
    delete: async (token) => store.delete(token),
  };
}

describe('AuthService', () => {
  let tokens: ReturnType<typeof memoryTokens>;
  let svc: AuthService;
  const google: GoogleIdentityVerifier = {
    verify: vi.fn(async () => ({ sub: 'g1', email: 'a@b.com', name: 'Ana' })),
  };
  const users: UserRepository = {
    upsertFromGoogle: vi.fn(async () => user),
    findById: vi.fn(async () => user),
  };
  const jwt = new JwtService({
    secret: 'x'.repeat(32),
    signOptions: { expiresIn: '15m' },
  });
  const config = { get: () => 30 } as unknown as ConfigService;

  beforeEach(() => {
    tokens = memoryTokens();
    svc = new AuthService(google, users, tokens, jwt, config);
  });

  it('login con Google emite un access token con el userId y un refresh token', async () => {
    const r = await svc.loginWithGoogle('id-token');
    expect(jwt.verify<{ userId: string }>(r.accessToken).userId).toBe('u1');
    expect(r.expiresIn).toBe(900);
    expect(tokens.store.has(r.refreshToken)).toBe(true);
    expect(r.user.email).toBe('a@b.com');
  });

  it('refresh rota: el token usado deja de servir', async () => {
    const first = await svc.loginWithGoogle('id-token');
    const second = await svc.refresh(first.refreshToken);
    expect(second.refreshToken).not.toBe(first.refreshToken);
    await expect(svc.refresh(first.refreshToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rechaza refresh tokens vencidos', async () => {
    await tokens.create('u1', 'viejo', new Date(Date.now() - 1000));
    await expect(svc.refresh('viejo')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('logout invalida el refresh token', async () => {
    const r = await svc.loginWithGoogle('id-token');
    await svc.logout(r.refreshToken);
    await expect(svc.refresh(r.refreshToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
