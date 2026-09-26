export interface StoredRefreshToken {
  userId: string;
  expiresAt: Date;
  revoked: boolean;
}

export interface RefreshTokenRepository {
  create(userId: string, token: string, expiresAt: Date): Promise<void>;
  find(token: string): Promise<StoredRefreshToken | null>;
  /** Borra el token; devuelve false si ya no existía (reuso o carrera). */
  delete(token: string): Promise<boolean>;
}
