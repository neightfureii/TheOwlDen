export function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export const config = {
  databaseUrl: required('DATABASE_URL'),
  port: Number(required('PORT')),
  clientOrigin: required('CLIENT_ORIGIN'),
  jwtSecret: required('JWT_SECRET'),
  isProd: process.env.NODE_ENV === 'production',
};