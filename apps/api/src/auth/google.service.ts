import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';

export type GoogleIdentity = {
  /** Id único y estable de la cuenta de Google */
  sub: string;
  email: string;
  name: string | null;
};

/** Verifica el idToken que la app obtiene de Google (firma, caducidad y destinatario). */
@Injectable()
export class GoogleService {
  private readonly client = new OAuth2Client();

  get enabled(): boolean {
    return !!env.GOOGLE_WEB_CLIENT_ID;
  }

  async verify(idToken: string): Promise<GoogleIdentity> {
    if (!env.GOOGLE_WEB_CLIENT_ID) {
      throw new ServiceUnavailableException('El inicio con Google no está configurado en el servidor.');
    }
    let payload;
    try {
      const ticket = await this.client.verifyIdToken({ idToken, audience: env.GOOGLE_WEB_CLIENT_ID });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('No se pudo verificar tu cuenta de Google. Inténtalo de nuevo.');
    }
    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException('Google no ha compartido tu email.');
    }
    if (!payload.email_verified) {
      throw new UnauthorizedException('Tu email de Google no está verificado.');
    }
    return { sub: payload.sub, email: payload.email.toLowerCase(), name: payload.name ?? null };
  }
}
