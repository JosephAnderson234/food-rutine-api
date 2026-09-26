import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import type { GoogleProfile } from '../../../user/domain/User.js';
import type { GoogleIdentityVerifier } from '../../ports/GoogleIdentityVerifier.js';

@Injectable()
export class GoogleIdTokenVerifier implements GoogleIdentityVerifier {
  private readonly client = new OAuth2Client();
  private readonly audience: string;

  constructor(config: ConfigService) {
    this.audience = config.getOrThrow<string>('GOOGLE_CLIENT_ID');
  }

  async verify(idToken: string): Promise<GoogleProfile> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.audience,
      });
      const p = ticket.getPayload();
      if (!p?.sub || !p.email || !p.email_verified)
        throw new Error('perfil incompleto');
      return { sub: p.sub, email: p.email, name: p.name, picture: p.picture };
    } catch {
      throw new UnauthorizedException('Token de Google inválido');
    }
  }
}
