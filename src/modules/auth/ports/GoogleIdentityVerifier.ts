import type { GoogleProfile } from '../../user/domain/User.js';

/** Verifica un ID token de Google (firma, audiencia y vencimiento) y devuelve el perfil. */
export interface GoogleIdentityVerifier {
  verify(idToken: string): Promise<GoogleProfile>;
}
