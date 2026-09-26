import type { GoogleProfile, User } from '../domain/User.js';

export interface UserRepository {
  /** Crea el usuario la primera vez; después solo actualiza nombre y foto. */
  upsertFromGoogle(profile: GoogleProfile): Promise<User>;
  findById(id: string): Promise<User | null>;
}
