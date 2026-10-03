import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

export default defineConfig({
  schema: './src/infrastructure/database/schema/tables.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://agrul_user:agrul_pass@localhost:5432/agrul_db',
  },
  verbose: true,
  strict: true,
});
