import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Auth } from '../../../shared/auth/auth.decorator.js';
import { CurrentUser } from '../../../shared/auth/current-user.decorator.js';
import type { AuthUser } from '../../../shared/auth/jwt.strategy.js';
import {
  ReplaceRemindersDto,
  SubscriptionDto,
  UnsubscribeDto,
} from '../application/dto/notifications.dto.js';
import { NotificationsService } from '../application/notifications.service.js';

@ApiTags('push')
@Controller('push')
export class PushController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('public-key')
  @ApiOperation({
    summary: 'Clave pública VAPID para suscribirse en el navegador',
  })
  publicKey() {
    return this.notifications.publicKey();
  }

  @Post('subscriptions')
  @Auth()
  @HttpCode(204)
  @ApiOperation({ summary: 'Registrar este dispositivo para recibir avisos' })
  subscribe(@CurrentUser() user: AuthUser, @Body() dto: SubscriptionDto) {
    return this.notifications.subscribe(user.userId, dto);
  }

  @Delete('subscriptions')
  @Auth()
  @HttpCode(204)
  @ApiOperation({ summary: 'Dejar de recibir avisos en este dispositivo' })
  unsubscribe(@CurrentUser() user: AuthUser, @Body() dto: UnsubscribeDto) {
    return this.notifications.unsubscribe(user.userId, dto.endpoint);
  }
}

@ApiTags('reminders')
@Controller('reminders')
@Auth()
export class RemindersController {
  constructor(private readonly notifications: NotificationsService) {}

  @Put(':scope')
  @ApiParam({
    name: 'scope',
    example: '2026-09-27',
    description: 'Grupo, p. ej. la semana',
  })
  @ApiOperation({
    summary: 'Reemplazar los avisos de un grupo',
    description: 'Idempotente: reenviar la misma lista no duplica avisos.',
  })
  replace(
    @CurrentUser() user: AuthUser,
    @Param('scope') scope: string,
    @Body() dto: ReplaceRemindersDto,
  ) {
    return this.notifications.replace(
      user.userId,
      scope.slice(0, 50),
      dto.reminders,
    );
  }
}
