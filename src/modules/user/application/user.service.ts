import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { User } from '../domain/User.js';
import type { UserRepository } from '../ports/UserRepository.js';
import { USER_REPOSITORY } from '../user.tokens.js';

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async getMe(userId: string): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }
}
