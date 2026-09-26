import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import type {
  RefreshTokenRepository,
  StoredRefreshToken,
} from '../../ports/RefreshTokenRepository.js';

@Injectable()
export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, token: string, expiresAt: Date): Promise<void> {
    await this.prisma.refreshToken.create({
      data: { userId, token, expiresAt },
    });
  }

  find(token: string): Promise<StoredRefreshToken | null> {
    return this.prisma.refreshToken.findUnique({
      where: { token },
      select: { userId: true, expiresAt: true, revoked: true },
    });
  }

  async delete(token: string): Promise<boolean> {
    const { count } = await this.prisma.refreshToken.deleteMany({
      where: { token },
    });
    return count > 0;
  }
}
