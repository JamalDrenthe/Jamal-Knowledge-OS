#!/usr/bin/env node
/**
 * Knowledge OS — Supabase → Firebase migratie (nog niet uitgevoerd).
 *
 * Gebruik:
 *   cp scripts/migration-config.example.json scripts/migration-config.json
 *   # vul supabaseUserId + firebaseUid in
 *   npm i @supabase/supabase-js firebase-admin   # eenmalig, lokaal
 *   node scripts/migrate-supabase-to-firebase.mjs --dry-run   # rapportage, schrijft niets
 *   node scripts/migrate-supabase-to-firebase.mjs --write     # voert de migratie uit
 *
 * Vereiste env vars:
 *   SUPABASE_SERVICE_ROLE_KEY        — service role key (leest alles, blijft lokaal)
 *   GOOGLE_APPLICATION_CREDENTIALS   — pad naar Firebase service-account JSON
 *
 * Schrijft naar users/{firebaseUid}/{folders|notes|attachments} in Firestore en
 * kopieert bijlagen van Supabase Storage naar Firebase Storage onder
 * knowledge-attachments/{firebaseUid}/{attachmentId}/{fileName} — de app gebruikt
 * altijd de huidige auth-uid in het pad, dus attachment.storagePath wordt
 * herschreven naar de Firebase-uid.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const BUCKET = 'knowledge-attachments';

function loadConfig() {
  const path = join(__dirname, 'migration-config.json');
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    console.error('migration-config.json ontbreekt — kopieer migration-config.example.json en vul de UIDs in.');
    process.exit(1);
  }
}

function required(name, value) {
  if (!value) {
    console.error(`Ontbrekende configuratie: ${name}`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const config = loadConfig();
  const supabaseUrl = required('supabaseUrl', config.supabaseUrl);
  const supabaseUserId = required('supabaseUserId', config.supabaseUserId);
  const firebaseUid = required('firebaseUid', config.firebaseUid);
  const serviceKey = required('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);
  required('GOOGLE_APPLICATION_CREDENTIALS', process.env.GOOGLE_APPLICATION_CREDENTIALS);

  let createClient, admin;
  try {
    ({ createClient } = await import('@supabase/supabase-js'));
    admin = (await import('firebase-admin')).default;
  } catch {
    console.error('Dependencies ontbreken — run: npm i @supabase/supabase-js firebase-admin');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  admin.initializeApp({ credential: admin.credential.applicationDefault() });
  const db = admin.firestore();
  const fbBucket = admin.storage().bucket();

  const { data: folders, error: fErr } = await supabase.from('folders').select('*').eq('user_id', supabaseUserId);
  const { data: notes, error: nErr } = await supabase.from('notes').select('*').eq('user_id', supabaseUserId);
  const { data: atts, error: aErr } = await supabase.from('attachments').select('*').eq('user_id', supabaseUserId);
  if (fErr || nErr || aErr) {
    console.error('Supabase read failed:', fErr || nErr || aErr);
    process.exit(1);
  }

  console.log(`Gevonden: ${folders.length} folders, ${notes.length} notes, ${atts.length} attachments`);
  if (!WRITE) {
    console.log('[dry-run] Er wordt niets geschreven. Gebruik --write om te migreren.');
    return;
  }

  const userRef = db.collection('users').doc(firebaseUid);
  const batch = db.batch();
  folders.forEach((f) => batch.set(userRef.collection('folders').doc(f.id), {
    name: f.name, parentId: f.parent_id, color: f.color, position: f.position,
    importKey: f.import_key, createdAt: f.created_at, updatedAt: f.updated_at,
  }));
  notes.forEach((n) => batch.set(userRef.collection('notes').doc(n.id), {
    folderId: n.folder_id, title: n.title, body: n.body, tags: n.tags,
    favorite: n.favorite, importKey: n.import_key, createdAt: n.created_at, updatedAt: n.updated_at,
  }));
  const migratedPaths = new Map();
  atts.forEach((a) => {
    const newPath = `${BUCKET}/${firebaseUid}/${a.id}/${a.file_name}`;
    migratedPaths.set(a.id, newPath);
    batch.set(userRef.collection('attachments').doc(a.id), {
      noteId: a.note_id, storagePath: newPath, fileName: a.file_name,
      mimeType: a.mime_type, fileSize: a.file_size, createdAt: a.created_at,
    });
  });
  batch.set(db.collection('allowedUsers').doc(firebaseUid), { createdAt: new Date().toISOString() });
  await batch.commit();
  console.log('Firestore geschreven.');

  for (const a of atts) {
    const { data: file, error } = await supabase.storage.from(BUCKET).download(a.storage_path);
    if (error) {
      console.error(`Download mislukt voor ${a.storage_path}:`, error.message);
      continue;
    }
    await fbBucket.file(migratedPaths.get(a.id)).save(Buffer.from(await file.arrayBuffer()), {
      contentType: a.mime_type || 'application/octet-stream',
    });
  }
  console.log(`Klaar: ${migratedPaths.size} bijlagen gekopieerd naar ${firebaseUid}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
