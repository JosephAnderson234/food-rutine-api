import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import type { GoogleProfile, User } from '../../domain/User.js';
import type { UserRepository } from '../../ports/UserRepository.js';

const select = {
  id: true,
  googleSub: true,
  email: true,
  name: true,
  pictureUrl: true,
  createdAt: true,
} as const;

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  upsertFromGoogle(p: GoogleProfile): Promise<User> {
    return this.prisma.user.upsert({
      where: { googleSub: p.sub },
      create: {
        googleSub: p.sub,
        email: p.email,
        name: p.name,
        pictureUrl: p.picture,
      },
      update: { email: p.email, name: p.name, pictureUrl: p.picture },
      select,
    });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id }, select });
  }
}
