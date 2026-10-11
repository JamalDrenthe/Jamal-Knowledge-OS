# Firebase migratie — voorbereidingsplan (nog NIET uitgevoerd)

Dit document bevat alles wat nodig is om Knowledge OS van Supabase naar Firebase te migreren. Er is nog niets gemigreerd; dit is de complete voorbereiding.

## 1. Huidige Supabase-inventaris (live, project `poafujohkcylewlitvtz`)

### Tabellen

| Tabel | Kolommen | Doel |
|---|---|---|
| `folders` | `id uuid`, `user_id uuid`, `name text`, `parent_id uuid?`, `color text`, `position int`, `import_key text?`, `created_at`, `updated_at` | Mappenboom met nesting en volgorde |
| `notes` | `id uuid`, `user_id uuid`, `folder_id uuid?`, `title text`, `body text`, `tags text[]`, `favorite bool`, `import_key text?`, `created_at`, `updated_at` | Notities |
| `attachments` | `id uuid`, `user_id uuid`, `note_id uuid`, `storage_path text`, `file_name text`, `mime_type text?`, `file_size bigint?`, `created_at` | Bijlage-metadata |
| `allowed_users` | `user_id uuid`, `created_at` | Whitelist: alleen Jamal mag inloggen |

### Storage
- Bucket `knowledge-attachments`, pad `<user_id>/<attachment_id>/<file_name>`.

### Auth
- Supabase Auth (PKCE), Google OAuth + e-mail; RLS policies op alle tabellen: `auth.uid() = user_id` plus `allowed_users`-check.

## 2. Doelmodel in Firebase

### Firestore (collections per gebruiker)

```
users/{uid}                          # profiel + allowed-flag
users/{uid}/folders/{folderId}       # { name, parentId|null, color, position, importKey?, createdAt, updatedAt }
users/{uid}/notes/{noteId}           # { folderId|null, title, body, tags[], favorite, importKey?, createdAt, updatedAt }
users/{uid}/attachments/{attId}      # { noteId, storagePath, fileName, mimeType?, fileSize?, createdAt }
```

- Per-user subcollections maken RLS overbodig: rules beperken simpelweg tot `request.auth.uid == userId`.
- `import_key` blijft als veld `importKey` voor idempotente import-reparatie.
- `allowed_users` → aparte collectie `allowedUsers/{uid}` (alleen server-side schrijfbaar).

### Cloud Storage
- Bucket pad identiek houden: `knowledge-attachments/{uid}/{attachmentId}/{fileName}` — vereenvoudigt het verplaatsen van bestaande bestanden.

### Authentication
- Firebase Auth met Google-provider (zelfde OAuth-account).
- **Let op:** wachtwoorden/sessies kunnen niet meeverhuizen; eerste login op Firebase = vers account met **dezelfde e-mailadres**, en de migratie koppelt data op e-mail of een mapping `supabase_user_id → firebase_uid`. Omdat het maar één gebruiker is, is een handmatige UID-mapping in `scripts/migration-config.json` het simpelst.

## 3. Meegeleverde bestanden

| Bestand | Doel |
|---|---|
| `firebase/firestore.rules` | Klantklare security rules (owner-only, allowed-users check) |
| `firebase/storage.rules` | Owner-only access op `knowledge-attachments/{uid}/...` |
| `firebase/firestore.indexes.json` | Benodigde composiet-indexen |
| `firebase/firebase.json` | Firebase-projectconfig voor rules/index deploy |
| `scripts/migrate-supabase-to-firebase.mjs` | Migratiescript (dry-run standaard; `--write` om echt te schrijven) |
| `scripts/migration-config.example.json` | Voorbeeld UID-mapping en projectgegevens |

## 4. Migratiestappen (als besloten wordt te migreren)

1. Firebase-project aanmaken/kiezen (console of `firebase init`), Firestore + Storage + Auth aanzetten, Google-provider en eigenaar-account activeren.
2. Eenmalig inloggen in de app op Firebase om de `firebase_uid` te verkrijgen; invullen in `scripts/migration-config.json` naast de Supabase `user_id`.
3. `firebase deploy --only firestore:rules,firestore:indexes,storage` op het nieuwe project.
4. Env vars in Vercel toevoegen: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_APP_ID` (en service-account JSON als `FIREBASE_SERVICE_ACCOUNT` voor het script — nooit committen).
5. `node scripts/migrate-supabase-to-firebase.mjs --dry-run` → rapportage controleren.
6. `node scripts/migrate-supabase-to-firebase.mjs --write` → mappen, notities, attachment-metadata + bestanden kopiëren.
7. App-code: `src/lib/supabase.ts` vervangen door `src/lib/firebase.ts` (adapter met dezelfde interface); stapsgewijs per feature uitschakelen achter `VITE_BACKEND=firebase|supabase` flag.
8. Verificatie: aantallen vergelijken (folders/notes/attachments), inloggen, refresh-persistentie, bijlage download.
9. Cutover: Supabase env vars verwijderen uit Vercel; Supabase-tabellen 30 dagen bewaren als backup, dan exporteren naar Markdown/JSON.

## 5. Code-impact (voorbereid, niet uitgevoerd)

- `src/lib/supabase.ts` → vervangen door `src/lib/firebase.ts` met identieke export (`supabase`-vormige client of feature-functies: `loadWorkspace`, `upsertNote`, `deleteNote`, `deleteFolder`, `updateFolder`, `uploadAttachment`, `removeAttachments`).
- `App.tsx` gebruikt nu `supabase.auth.*`, `supabase.from(...)`, `supabase.storage.from(...)`. De adapter verbergt Firestore-queries (collectionGroup/eq filters) achter dezelfde calls, zodat `App.tsx` minimaal wijzigt.
- Autosave/debounce-logica en `import_key`-dedup blijven ongewijzigd — alleen de transportlaag verandert.

## 6. Open beslissingen

- Zelfde Firebase-project als Quantum Initium (`bustling-flux-510114-m0`) of een eigen project? Zelfde project = gedeelde IAM/Hosting, maar data zit dan wel in één project.
- Storage-bestanden fysiek kopiëren of lazy ophalen via eenmalige import?
