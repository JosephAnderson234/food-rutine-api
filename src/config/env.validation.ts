import Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN_DAYS: Joi.number().default(30),
  /** Mismo Client ID de Google que usa el frontend (NEXT_PUBLIC_GOOGLE_CLIENT_ID). */
  GOOGLE_CLIENT_ID: Joi.string().required(),
  /** Orígenes permitidos, separados por coma (p. ej. la URL de Vercel y localhost). */
  CORS_ORIGIN: Joi.string().required(),
  VAPID_PUBLIC_KEY: Joi.string().required(),
  VAPID_PRIVATE_KEY: Joi.string().required(),
  /** Contacto para los servicios de push, p. ej. mailto:tu@correo.com */
  VAPID_SUBJECT: Joi.string()
    .pattern(/^(mailto:|https:)/)
    .required(),
});
