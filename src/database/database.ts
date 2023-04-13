import path from 'path';
import { IDatabase, IMain, IInitOptions } from 'pg-promise';
import pgPromise from 'pg-promise';
import fs from 'fs';

const env = process.env;

// Database connection details
const connection = {
  host: env.POSTGRES_HOST || 'db',
  port: parseInt(env.POSTGRES_PORT || '5432'),
  database: env.POSTGRES_DB,
  user: env.POSTGRES_USER,
  password: env.POSTGRES_PASSWORD,
};

const initOpts: IInitOptions = {
  capSQL: true, // Generate capitalized SQL
};

const pgp: IMain = pgPromise(initOpts);

// Create the database instance with the provided connection details
const db: IDatabase<{}> = pgp(connection);

export default db;

export async function migrate() {
  try {
    // Read the migrations folder
    const migrationsFolder = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsFolder);

    // Sort migration files by name to ensure they are executed in the correct order
    migrationFiles.sort();

    // Execute each migration file
    for (const migrationFile of migrationFiles) {
      if (path.extname(migrationFile) === '.sql') {
        console.log(`Running migration: ${migrationFile}`);
        const migrationPath = path.join(migrationsFolder, migrationFile);
        const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
        await db.none(migrationSql);
      }
    }
    console.log('All migrations completed successfully.');
  } catch (error) {
    console.error('Error running migrations:', error);
  }
}
