import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from '../application/auth.service.js';
import {
  GoogleLoginDto,
  RefreshDto,
  TokenPairDto,
} from '../application/dto/auth.dto.js';

/** Endpoints públicos de sesión: limitados a 5 por minuto por IP. */
@ApiTags('auth')
@Controller('auth')
@Throttle({ default: { limit: 5, ttl: 60_000 } })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('google')
  @HttpCode(200)
  @ApiOperation({ summary: 'Iniciar sesión con el ID token de Google' })
  @ApiOkResponse({ type: TokenPairDto })
  google(@Body() dto: GoogleLoginDto) {
    return this.auth.loginWithGoogle(dto.idToken);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Renovar la sesión (rota el refresh token)' })
  @ApiOkResponse({ type: TokenPairDto })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Cerrar sesión en este dispositivo' })
  logout(@Body() dto: RefreshDto) {
    return this.auth.logout(dto.refreshToken);
  }
}
