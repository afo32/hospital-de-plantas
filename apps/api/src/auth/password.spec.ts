import { hashPassword, verifyPassword } from './password.js';

describe('password', () => {
  it('verifica la contraseña correcta y rechaza la incorrecta', async () => {
    const hash = await hashPassword('hobbit1234');
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(await verifyPassword('hobbit1234', hash)).toBe(true);
    expect(await verifyPassword('Hobbit1234', hash)).toBe(false);
  });

  it('genera un hash distinto cada vez (sal aleatoria)', async () => {
    expect(await hashPassword('igual')).not.toBe(await hashPassword('igual'));
  });

  it('rechaza hashes con formato desconocido', async () => {
    expect(await verifyPassword('x', 'md5$abc')).toBe(false);
  });
});
