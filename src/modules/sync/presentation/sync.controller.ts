import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../../../shared/auth/auth.decorator.js';
import { CurrentUser } from '../../../shared/auth/current-user.decorator.js';
import type { AuthUser } from '../../../shared/auth/jwt.strategy.js';
import { PullQueryDto, PushDto } from '../application/dto/sync.dto.js';
import { SyncService } from '../application/sync.service.js';

@ApiTags('sync')
@Controller('sync')
@Auth()
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  @Post('push')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Enviar cambios del dispositivo',
    description:
      'Gana el cambio más reciente; en porciones el estado nunca retrocede. ' +
      'Devuelve el cursor para el próximo pull.',
  })
  push(@CurrentUser() user: AuthUser, @Body() dto: PushDto) {
    return this.sync.push(user.userId, dto.changes);
  }

  @Get('pull')
  @ApiOperation({ summary: 'Traer los cambios posteriores al cursor' })
  pull(@CurrentUser() user: AuthUser, @Query() q: PullQueryDto) {
    return this.sync.pull(user.userId, BigInt(q.since ?? '0'), q.limit ?? 500);
  }
}
