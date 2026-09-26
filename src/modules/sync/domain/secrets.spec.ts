import { describe, expect, it } from 'vitest';
import { openSecrets, SEALED_PREFIX, sealSecrets } from './secrets.js';

// Cifrado de juguete para probar solo la lógica de campos.
const seal = (v: string) => Buffer.from(v).toString('base64');
const open = (v: string) => Buffer.from(v, 'base64').toString();

const settings = {
  id: 'default',
  todoist: { token: 'tok_123', projectId: 'p1' },
  coldPacks: 0,
};

describe('secretos en documentos sincronizados', () => {
  it('cifra el token de Todoist y deja el resto igual', () => {
    const sealed = sealSecrets('settings', settings, seal) as typeof settings;
    expect(sealed.todoist.token.startsWith(SEALED_PREFIX)).toBe(true);
    expect(JSON.stringify(sealed)).not.toContain('tok_123');
    expect(sealed.todoist.projectId).toBe('p1');
    expect(sealed.coldPacks).toBe(0);
    expect(settings.todoist.token).toBe('tok_123'); // no muta el original
  });

  it('ida y vuelta devuelve el valor original', () => {
    const back = openSecrets(
      'settings',
      sealSecrets('settings', settings, seal),
      open,
    );
    expect(back).toEqual(settings);
  });

  it('no cifra dos veces', () => {
    const once = sealSecrets('settings', settings, seal);
    expect(sealSecrets('settings', once, seal)).toEqual(once);
  });

  it('otras colecciones y documentos sin token no cambian', () => {
    expect(sealSecrets('portions', { token: 'x' }, seal)).toEqual({
      token: 'x',
    });
    expect(sealSecrets('settings', { id: 'default' }, seal)).toEqual({
      id: 'default',
    });
    expect(sealSecrets('settings', null, seal)).toBeNull();
  });

  it('si no se puede descifrar, omite el campo en vez de fallar', () => {
    const sealed = sealSecrets('settings', settings, seal);
    const back = openSecrets('settings', sealed, () => {
      throw new Error('llave rotada');
    }) as { todoist: Record<string, unknown> };
    expect(back.todoist).toEqual({ projectId: 'p1' });
  });
});
