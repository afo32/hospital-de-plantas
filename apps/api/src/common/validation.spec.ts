import { registerSchema } from '@hdp/shared';

describe('esquemas compartidos', () => {
  it('normaliza el email a minúsculas', () => {
    const r = registerSchema.parse({ email: 'Juan@Test.COM', password: 'hobbit1234', name: 'Juan' });
    expect(r.email).toBe('juan@test.com');
  });

  it('da mensajes en español', () => {
    const r = registerSchema.safeParse({ email: 'malo', password: '1', name: '' });
    expect(r.success).toBe(false);
    const messages = r.error?.issues.map((i) => i.message) ?? [];
    expect(messages).toContain('Email no válido');
    expect(messages).toContain('Dinos cómo te llamas');
  });
});
