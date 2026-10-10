import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

test('migration D1 cria tabelas e restrições esperadas', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../migrations/0001_contact_admin.sql', import.meta.url), 'utf8'));
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map(row => row.name);
  assert.ok(tables.includes('contact_messages'));
  assert.ok(tables.includes('admin_sessions'));
  assert.ok(tables.includes('rate_limits'));
  assert.throws(() => db.prepare('INSERT INTO contact_messages (name, subject, message, created_at) VALUES (?, ?, ?, ?)').run('A', 'Ok', 'curta', 1));
  db.close();
});
