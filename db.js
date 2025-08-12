import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs/promises';

export async function getDB() {
  return open({ filename: './gpt-study.db', driver: sqlite3.Database });
}

export async function setupSchema() {
  const db = await getDB();
  const schema = await fs.readFile('./schema.sql', 'utf8');
  await db.exec(schema);
  await db.close();
  console.log('✅ Database schema applied');
}
