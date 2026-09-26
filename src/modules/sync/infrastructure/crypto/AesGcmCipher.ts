import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SecretCipher } from '../../ports/SecretCipher.js';

const IV_BYTES = 12;
const TAG_BYTES = 16;

/**
 * AES-256-GCM (autenticado: detecta alteraciones). Formato: base64url(iv | tag | datos).
 * La llave (32 bytes en base64) vive solo en el servidor: SYNC_SECRETS_KEY.
 */
@Injectable()
export class AesGcmCipher implements SecretCipher {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    this.key = Buffer.from(
      config.getOrThrow<string>('SYNC_SECRETS_KEY'),
      'base64',
    );
    if (this.key.length !== 32)
      throw new Error('SYNC_SECRETS_KEY debe tener 32 bytes (base64)');
  }

  seal(plain: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64url');
  }

  open(sealed: string): string {
    const raw = Buffer.from(sealed, 'base64url');
    const iv = raw.subarray(0, IV_BYTES);
    const tag = raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(raw.subarray(IV_BYTES + TAG_BYTES)),
      decipher.final(),
    ]).toString('utf8');
  }
}
