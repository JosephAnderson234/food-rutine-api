import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../../../shared/auth/auth.decorator.js';
import { CurrentUser } from '../../../shared/auth/current-user.decorator.js';
import type { AuthUser } from '../../../shared/auth/jwt.strategy.js';
import { UserService } from '../application/user.service.js';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly users: UserService) {}

  @Get('me')
  @Auth()
  @ApiOperation({ summary: 'Perfil del usuario autenticado' })
  me(@CurrentUser() user: AuthUser) {
    return this.users.getMe(user.userId);
  }
}
