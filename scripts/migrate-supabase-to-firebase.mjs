#!/usr/bin/env node
/**
 * Knowledge OS — Supabase → Firebase migratie (nog niet uitgevoerd).
 *
 * Gebruik:
 *   cp scripts/migration-config.example.json scripts/migration-config.json
 *   # vul supabaseUserId + firebaseUid in
 *   node scripts/migrate-supabase-to-firebase.mjs --dry-run   # rapportage, schrijft niets
 *   node scripts/migrate-supabase-to-firebase.mjs --write     # voert de migratie uit
 *
 * Vereiste env vars:
 *   SUPABASE_SERVICE_ROLE_KEY   — service role key (leest alles, blijft lokaal)
 *   GOOGLE_APPLICATION_CREDENTIALS — pad naar Firebase service-account JSON
 *
 * Schrijft naar users/{firebaseUid}/{folders|notes|attachments} in Firestore en
 * kopieert bijlagen van Supabase Storage naar Firebase Storage onder hetzelfde pad.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const WRITE = args.includes('--write');

function loadConfig() {
  const path = join(__dirname, 'migration-config.json');
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    console.error('migration-config.json ontbreekt — kopieer migration-config.example.json en vul de UIDs in.');
    process.exit(1);
  }
}

async function main() {
  const config = loadConfig();
  const { supabaseUrl, supabaseUserId, firebaseUid } = config;

  if (!WRITE) {
    console.log('[dry-run] Er wordt niets geschreven. Gebruik --write om te migreren.');
  }

  // --- Stap 1: Supabase data uitlezen ---
  // TODO: const { createClient } = await import('@supabase/supabase-js');
  // const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
  // const { data: folders }  = await supabase.from('folders').select('*').eq('user_id', supabaseUserId);
  // const { data: notes }    = await supabase.from('notes').select('*').eq('user_id', supabaseUserId);
  // const { data: atts }     = await supabase.from('attachments').select('*').eq('user_id', supabaseUserId);

  // --- Stap 2: Mapping Supabase-rij → Firestore-document ---
  const mapFolder = (f) => ({
    name: f.name,
    parentId: f.parent_id,
    color: f.color,
    position: f.position,
    importKey: f.import_key,
    createdAt: f.created_at,
    updatedAt: f.updated_at,
  });
  const mapNote = (n) => ({
    folderId: n.folder_id,
    title: n.title,
    body: n.body,
    tags: n.tags,
    favorite: n.favorite,
    importKey: n.import_key,
    createdAt: n.created_at,
    updatedAt: n.updated_at,
  });
  const mapAttachment = (a) => ({
    noteId: a.note_id,
    storagePath: a.storage_path,
    fileName: a.file_name,
    mimeType: a.mime_type,
    fileSize: a.file_size,
    createdAt: a.created_at,
  });
  void mapFolder; void mapNote; void mapAttachment;

  // --- Stap 3: Firestore schrijven ---
  // TODO: const admin = await import('firebase-admin');
  // admin.initializeApp({ credential: admin.credential.applicationDefault() });
  // const db = admin.firestore();
  // const userRef = db.collection('users').doc(firebaseUid);
  // for (const f of folders) await userRef.collection('folders').doc(f.id).set(mapFolder(f));
  // for (const n of notes)   await userRef.collection('notes').doc(n.id).set(mapNote(n));
  // for (const a of atts)    await userRef.collection('attachments').doc(a.id).set(mapAttachment(a));
  // await db.collection('allowedUsers').doc(firebaseUid).set({ createdAt: new Date().toISOString() });

  // --- Stap 4: Bijlagen kopiëren Supabase Storage → Firebase Storage ---
  // TODO: download supabase.storage.from('knowledge-attachments').download(a.storage_path)
  //       upload naar Firebase bucket onder hetzelfde storage_path.

  console.log(`Config geladen voor user ${supabaseUserId} → ${firebaseUid}`);
  console.log('Stappen 1–4 staan als TODO klaar; vul credentials en haal de TODO-commentaar weg.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
