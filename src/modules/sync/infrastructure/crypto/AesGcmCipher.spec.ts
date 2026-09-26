import { randomBytes } from 'node:crypto';
import type { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { AesGcmCipher } from './AesGcmCipher.js';

const config = (key: string) =>
  ({ getOrThrow: () => key }) as unknown as ConfigService;
const newKey = () => randomBytes(32).toString('base64');

describe('AesGcmCipher', () => {
  it('ida y vuelta, y cada cifrado es distinto (IV aleatorio)', () => {
    const c = new AesGcmCipher(config(newKey()));
    const a = c.seal('tok_123');
    const b = c.seal('tok_123');
    expect(a).not.toBe(b);
    expect(c.open(a)).toBe('tok_123');
  });

  it('otra llave no puede descifrar', () => {
    const sealed = new AesGcmCipher(config(newKey())).seal('tok_123');
    expect(() => new AesGcmCipher(config(newKey())).open(sealed)).toThrow();
  });

  it('detecta datos alterados', () => {
    const c = new AesGcmCipher(config(newKey()));
    const sealed = c.seal('tok_123');
    const tampered = `${sealed.slice(0, -2)}${sealed.at(-2) === 'A' ? 'B' : 'A'}${sealed.at(-1)}`;
    expect(() => c.open(tampered)).toThrow();
  });

  it('rechaza llaves de largo incorrecto', () => {
    expect(
      () => new AesGcmCipher(config(randomBytes(16).toString('base64'))),
    ).toThrow();
  });
});
