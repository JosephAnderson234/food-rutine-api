/** Persona que usa la app, identificada por su cuenta de Google. */
export interface User {
  id: string;
  googleSub: string;
  email: string;
  name: string | null;
  pictureUrl: string | null;
  createdAt: Date;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}
