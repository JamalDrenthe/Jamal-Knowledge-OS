import { ChangeEvent, FormEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Archive, ChevronDown, ChevronRight, ChevronUp, Clock3, File, Folder, FolderPlus, GripVertical, Hash, LayoutGrid, Link2,
  LogOut, Menu, Moon, Network, Paperclip, Plus, Search, Sparkles, Star, Sun, Tag, X,
} from "lucide-react";
import { supabase } from "./lib/supabase";

type Theme = "light" | "dark";
type FolderItem = { id: string; name: string; parentId: string | null; color: string; position: number; importKey?: string };
type Attachment = { id: string; name: string; size: string; storagePath?: string; mimeType?: string; file?: File };
type Note = {
  id: string; title: string; body: string; updated: string; folderId: string;
  tags: string[]; favorite?: boolean; attachments: Attachment[]; importKey?: string; updatedAt?: string;
};

const importedFolderBlueprint: Array<{ name: string; parent: string | null; color: string }> = [
  { name: "Bedrijven", parent: null, color: "violet" },
  { name: "Jamal Drenthe", parent: "Bedrijven", color: "violet" },
  { name: "Angels Mediate", parent: "Jamal Drenthe", color: "blue" },
  { name: "CloudiAudi", parent: "Jamal Drenthe", color: "blue" },
  { name: "CyberSec360", parent: "Jamal Drenthe", color: "blue" },
  { name: "Huasca", parent: "Jamal Drenthe", color: "blue" },
  { name: "In De Roos", parent: "Jamal Drenthe", color: "blue" },
  { name: "OpenCourse", parent: "Jamal Drenthe", color: "blue" },
  { name: "Overskilled", parent: "Jamal Drenthe", color: "blue" },
  { name: "Prompt DJ", parent: "Jamal Drenthe", color: "blue" },
  { name: "Speech Tool or Make The Conversation", parent: "Jamal Drenthe", color: "blue" },
  { name: "QuantumInitium", parent: "Jamal Drenthe", color: "mint" },
  { name: "Afterstudenthousing", parent: "Jamal Drenthe", color: "mint" },
  { name: "Boostplug", parent: "Jamal Drenthe", color: "mint" },
  { name: "CRMos", parent: "Jamal Drenthe", color: "mint" },
  { name: "Djobba", parent: "Jamal Drenthe", color: "mint" },
  { name: "Immigratiepunt", parent: "Jamal Drenthe", color: "mint" },
  { name: "Investbotiq", parent: "Jamal Drenthe", color: "mint" },
  { name: "Logs Rent", parent: "Jamal Drenthe", color: "mint" },
  { name: "Spontiva", parent: "Jamal Drenthe", color: "mint" },
  { name: "VVC", parent: "Jamal Drenthe", color: "mint" },
  { name: "WoningVry", parent: "Jamal Drenthe", color: "mint" },
  { name: "Xabi World", parent: "Jamal Drenthe", color: "mint" },
  { name: "Zheavenzy", parent: "Jamal Drenthe", color: "mint" },
  { name: "To-Do", parent: null, color: "amber" },
];

const createImportedFolders = (idFactory: () => string): FolderItem[] => {
  const ids = new Map<string, string>();
  return importedFolderBlueprint.map((folder, index) => {
    const id = idFactory();
    ids.set(folder.name, id);
    return {
      id,
      name: folder.name,
      parentId: folder.parent ? ids.get(folder.parent) || null : null,
      color: folder.color,
      position: index,
      importKey: `blueprint:${folderNameKey(folder.name)}`,
    };
  });
};

const initialFolders: FolderItem[] = [
  ...createImportedFolders(() => crypto.randomUUID()),
  { id: "ideas", name: "Ideas", parentId: null, color: "violet", position: 25 },
  { id: "projects", name: "Projects", parentId: null, color: "blue", position: 26 },
  { id: "principles", name: "Principles", parentId: null, color: "amber", position: 27 },
  { id: "systems", name: "Systems", parentId: null, color: "mint", position: 28 },
];
const expandedFolderNames = new Set(["Bedrijven", "Jamal Drenthe", "Angels Mediate", "QuantumInitium", "Overskilled", "Investbotiq", "VVC", "Projects"]);
const importedDocumentBlueprint = [
  { key: "quantuminitium-growth-engine-pdf", title: "QuantumInitium Growth Engine (PDF)" },
];

const initialNotes: Note[] = [
  {
    id: "thesis", title: "The Knowledge OS thesis",
    body: "The best ideas should not disappear into chat history. They need a home that makes them easy to revisit, connect and turn into something real.\n\nA personal knowledge operating system is the layer between what I notice and what I build. It should make context compound instead of resetting every time a new project starts.\n\nCore principles\n- Capture ideas with almost zero friction.\n- Connect related thoughts automatically and visibly.\n- Keep ownership, history and permissions explicit.\n\nThe value is not in storing more information. It is in making the right context available at the right moment.",
    updated: "Just now", updatedAt: "2026-09-29T08:40:00.000Z", folderId: "ideas", tags: ["vision", "systems"], favorite: true, attachments: [],
  },
  { id: "quantum", title: "Quantum Initium · 2026 direction", body: "Clarify the holding narrative: a portfolio of useful, compounding businesses with a clear operating system.", updated: "Yesterday", updatedAt: "2026-09-28T08:40:00.000Z", folderId: "quantum", tags: ["quantum", "strategy"], attachments: [] },
  { id: "reuse", title: "Build once, reuse everywhere", body: "Product decisions that should become shared patterns across the portfolio instead of one-off features.", updated: "Sep 27", updatedAt: "2026-09-27T08:40:00.000Z", folderId: "principles", tags: ["leverage", "product"], attachments: [] },
  { id: "rhythm", title: "AI-native operating rhythm", body: "A weekly loop for capturing signal, choosing priorities, and converting context into focused execution.", updated: "Sep 25", updatedAt: "2026-09-25T08:40:00.000Z", folderId: "systems", tags: ["ai", "workflow"], attachments: [] },
];

function mapNotes(rows: Array<{ id: string; title: string; body: string; folder_id: string | null; tags: string[]; favorite: boolean; updated_at: string; import_key: string | null }>, attachmentRows: Array<{ id: string; note_id: string; storage_path: string; file_name: string; mime_type: string | null; file_size: number | null }>): Note[] {
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    updated: new Date(row.updated_at).toLocaleDateString(),
    updatedAt: row.updated_at,
    folderId: row.folder_id || "",
    tags: row.tags || [],
    favorite: row.favorite,
    importKey: row.import_key || undefined,
    attachments: attachmentRows.filter((attachment) => attachment.note_id === row.id).map((attachment) => ({
      id: attachment.id,
      name: attachment.file_name,
      size: formatBytes(attachment.file_size || 0),
      storagePath: attachment.storage_path,
      mimeType: attachment.mime_type || undefined,
    })),
  }));
}

function isDescendantFolder(folderId: string, selectedFolderId: string, folderMap: Map<string, FolderItem>) {
  let currentId: string | null = folderId;
  while (currentId) {
    if (currentId === selectedFolderId) return true;
    currentId = folderMap.get(currentId)?.parentId || null;
  }
  return false;
}

function folderNameKey(name: string) {
  return name
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function canonicalFolderName(name: string) {
  return folderNameKey(name) === "quantuminitium" ? "QuantumInitium" : name.trim();
}

function importedFolderKey(name: string) {
  return `blueprint:${folderNameKey(name)}`;
}

function inferImportedFolderKey(
  folder: FolderItem,
  folders: FolderItem[],
  visiting = new Set<string>(),
): string | undefined {
  if (folder.importKey) return folder.importKey;
  if (visiting.has(folder.id)) return undefined;
  const blueprint = importedFolderBlueprint.find((item) => folderNameKey(item.name) === folderNameKey(folder.name));
  if (!blueprint || folder.color !== blueprint.color) return undefined;
  const foldersById = new Map(folders.map((item) => [item.id, item]));
  if (blueprint.parent === null) return folder.parentId === null ? importedFolderKey(folder.name) : undefined;
  let parentId = folder.parentId;
  const ancestorIds = new Set<string>();
  while (parentId && !ancestorIds.has(parentId)) {
    ancestorIds.add(parentId);
    const parent = foldersById.get(parentId);
    if (!parent) return undefined;
    const parentImportKey: string | undefined = inferImportedFolderKey(
      parent,
      folders,
      new Set([...visiting, folder.id]),
    );
    if (parentImportKey === importedFolderKey(blueprint.parent)) {
      return importedFolderKey(folder.name);
    }
    parentId = parent.parentId;
  }
  return undefined;
}

function markLegacyImportedFolders(folders: FolderItem[]) {
  return folders.map((folder) => {
    const importKey = inferImportedFolderKey(folder, folders);
    return importKey ? { ...folder, importKey } : folder;
  });
}

function addMissingImportedFolders(folders: FolderItem[]) {
  const nextFolders = [...folders];
  const foldersByImportKey = new Map(nextFolders.filter((folder) => folder.importKey).map((folder) => [folder.importKey, folder]));

  importedFolderBlueprint.forEach((blueprint) => {
    const importKey = importedFolderKey(blueprint.name);
    if (foldersByImportKey.has(importKey)) return;

    const parent = blueprint.parent
      ? foldersByImportKey.get(importedFolderKey(blueprint.parent)) || null
      : null;
    const siblingCount = nextFolders.filter((folder) => folder.parentId === (parent?.id || null)).length;
    const folder: FolderItem = {
      id: crypto.randomUUID(),
      name: canonicalFolderName(blueprint.name),
      parentId: parent?.id || null,
      color: blueprint.color,
      position: siblingCount,
      importKey,
    };
    nextFolders.push(folder);
    foldersByImportKey.set(importKey, folder);
  });

  return nextFolders;
}

function alignImportedFolderParents(folders: FolderItem[]) {
  const foldersByImportKey = new Map(folders.filter((folder) => folder.importKey).map((folder) => [folder.importKey, folder]));
  return folders.map((folder) => {
    const blueprint = importedFolderBlueprint.find(
      (item) => importedFolderKey(item.name) === folder.importKey,
    );
    if (!blueprint) return folder;
    if (blueprint.parent && !foldersByImportKey.has(importedFolderKey(blueprint.parent))) return folder;
    const expectedParentId = blueprint.parent
      ? foldersByImportKey.get(importedFolderKey(blueprint.parent))?.id || folder.parentId
      : null;
    return folder.parentId === expectedParentId
      ? folder
      : { ...folder, parentId: expectedParentId };
  });
}

function deduplicateFolders(folders: FolderItem[]) {
  const foldersById = new Map(folders.map((folder) => [folder.id, folder]));
  const canonicalById = new Map<string, string>();
  const canonicalByKey = new Map<string, string>();
  const normalizedFolders: FolderItem[] = [];

  const getPathKey = (folderId: string, visiting = new Set<string>()): string => {
    const folder = foldersById.get(folderId);
    if (!folder || visiting.has(folderId)) return "";
    visiting.add(folderId);
    const parentPath = folder.parentId ? getPathKey(folder.parentId, visiting) : "";
    return [parentPath, folderNameKey(folder.name)].filter(Boolean).join("/");
  };

  const sortPriority = (folder: FolderItem) => {
    const pathKey = getPathKey(folder.id);
    const isCompanyFolder = pathKey === "bedrijven/jamaldrenthe" || pathKey.startsWith("bedrijven/jamaldrenthe/");
    return [isCompanyFolder ? 0 : 1, folder.position, folder.id] as const;
  };
  const getDeduplicationKey = (folder: FolderItem) => (
    folder.importKey || `${getPathKey(folder.id)}:${folderNameKey(folder.name)}`
  );
  const getDepth = (folder: FolderItem) => {
    let depth = 0;
    let parentId = folder.parentId;
    const visited = new Set<string>();
    while (parentId && !visited.has(parentId)) {
      visited.add(parentId);
      depth += 1;
      parentId = foldersById.get(parentId)?.parentId || null;
    }
    return depth;
  };

  const resolve = (folderId: string, visiting = new Set<string>()): string | null => {
    const knownCanonical = canonicalById.get(folderId);
    if (knownCanonical) return knownCanonical;
    const folder = foldersById.get(folderId);
    if (!folder || visiting.has(folderId)) return null;
    visiting.add(folderId);
    const parentId = folder.parentId ? resolve(folder.parentId, visiting) : null;
    const key = getDeduplicationKey(folder);
    const existingId = canonicalByKey.get(key);
    if (existingId) {
      canonicalById.set(folderId, existingId);
      return existingId;
    }
    canonicalByKey.set(key, folder.id);
    canonicalById.set(folderId, folder.id);
    normalizedFolders.push({ ...folder, name: canonicalFolderName(folder.name), parentId });
    return folder.id;
  };

  [...folders].sort((a, b) => {
    const depthDifference = getDepth(a) - getDepth(b);
    const [aCompany, aPosition, aId] = sortPriority(a);
    const [bCompany, bPosition, bId] = sortPriority(b);
    return depthDifference || aCompany - bCompany || aPosition - bPosition || aId.localeCompare(bId);
  }).forEach((folder) => resolve(folder.id));
  return {
    folders: normalizedFolders,
    duplicateMap: new Map([...canonicalById].filter(([id, canonicalId]) => id !== canonicalId)),
  };
}

function rebalanceFolderPositions(folders: FolderItem[]) {
  const foldersByParent = new Map<string, FolderItem[]>();
  folders.forEach((folder) => {
    const key = folder.parentId || "root";
    foldersByParent.set(key, [...(foldersByParent.get(key) || []), folder]);
  });
  const order = new Map(folders.map((folder, index) => [folder.id, index]));
  const positions = new Map<string, number>();
  foldersByParent.forEach((siblings) => {
    siblings
      .sort((a, b) => a.position - b.position || (order.get(a.id) || 0) - (order.get(b.id) || 0))
      .forEach((folder, index) => positions.set(folder.id, index));
  });
  return folders.map((folder) => ({ ...folder, position: positions.get(folder.id) || 0 }));
}

function App() {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("knowledge-os-theme") as Theme) || "light");
  const [folders, setFolders] = useState<FolderItem[]>(supabase ? [] : initialFolders);
  const [notes, setNotes] = useState<Note[]>(supabase ? [] : initialNotes);
  const [activeNoteId, setActiveNoteId] = useState(initialNotes[0].id);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [noteFilter, setNoteFilter] = useState<"all" | "recent" | "favorites">("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [workspaceView, setWorkspaceView] = useState<"notes" | "graph">("notes");
  const [mobileNav, setMobileNav] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderNameDraft, setFolderNameDraft] = useState("");
  const [folderParentDraft, setFolderParentDraft] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => Object.fromEntries(initialFolders.filter((folder) => expandedFolderNames.has(folder.name)).map((folder) => [folder.id, true])));
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [sessionReady, setSessionReady] = useState(!supabase);
  const [authenticated, setAuthenticated] = useState(!supabase);
  const [workspaceReady, setWorkspaceReady] = useState(!supabase);
  const [saved, setSaved] = useState(true);
  const [saveError, setSaveError] = useState("");
  const [noteSavePending, setNoteSavePending] = useState<Record<string, boolean>>({});
  const [noteSaveErrors, setNoteSaveErrors] = useState<Record<string, string>>({});
  const [authError, setAuthError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; mode: "before" | "inside" | "after" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<number | null>(null);
  const pendingNoteChangesRef = useRef<Map<string, Partial<Note>>>(new Map());
  const saveGenerationRef = useRef(0);
  const authGenerationRef = useRef(0);
  const authenticatedUserRef = useRef<string | null>(null);
  const pendingAuthUserRef = useRef<string | null>(null);
  const loadedWorkspaceUserRef = useRef<string | null>(null);
  const workspaceLoadTokenRef = useRef(0);
  const activeWorkspaceLoadRef = useRef<{ userId: string; token: number } | null>(null);

  const invalidatePendingNoteSaves = () => {
    saveGenerationRef.current += 1;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
    pendingNoteChangesRef.current.clear();
    setNoteSavePending({});
    setNoteSaveErrors({});
  };

  const loadWorkspace = async (currentUserId: string, authGeneration: number): Promise<boolean> => {
    const client = supabase;
    if (!client || authGeneration !== authGenerationRef.current) return false;
    invalidatePendingNoteSaves();
    setWorkspaceReady(false);
    setSaveError("");
    const [folderResult, noteResult, attachmentResult] = await Promise.all([
      client.from("folders").select("id,name,parent_id,color,position,import_key").eq("user_id", currentUserId).order("position").order("created_at"),
      client.from("notes").select("id,title,body,folder_id,tags,favorite,updated_at,import_key").eq("user_id", currentUserId).order("updated_at", { ascending: false }),
      client.from("attachments").select("id,note_id,storage_path,file_name,mime_type,file_size").eq("user_id", currentUserId).order("created_at"),
    ]);
    const firstError = folderResult.error || noteResult.error || attachmentResult.error;
    if (firstError) {
      if (authGeneration !== authGenerationRef.current) return false;
      setSaveError(firstError.message);
      setWorkspaceReady(true);
      return false;
    }
    let nextFolders: FolderItem[] = (folderResult.data || []).map((folder, index) => ({
      id: folder.id,
      name: folder.name,
      parentId: folder.parent_id,
      color: folder.color,
      position: folder.position ?? index,
      importKey: folder.import_key || undefined,
    }));
    let nextNotes = mapNotes(noteResult.data || [], attachmentResult.data || []);
    if (!nextFolders.length && !nextNotes.length) {
      const folderIds = new Map(initialFolders.map((folder) => [folder.id, crypto.randomUUID()]));
      nextFolders = initialFolders.map((folder) => ({ ...folder, id: folderIds.get(folder.id) || folder.id, parentId: folder.parentId ? folderIds.get(folder.parentId) || null : null }));
      nextNotes = initialNotes.map((note) => ({
        ...note,
        id: crypto.randomUUID(),
        folderId: folderIds.get(note.folderId)
          || nextFolders.find((folder) => folder.name === "QuantumInitium")?.id
          || nextFolders[0].id,
      }));
      const foldersToInsert = nextFolders.map((folder) => ({ id: folder.id, user_id: currentUserId, name: folder.name, parent_id: folder.parentId, color: folder.color, position: folder.position, import_key: folder.importKey || null }));
      const notesToInsert = nextNotes.map((note) => ({ id: note.id, user_id: currentUserId, folder_id: note.folderId, title: note.title, body: note.body, tags: note.tags, favorite: note.favorite || false, import_key: note.importKey || null }));
      const [foldersInsert, notesInsert] = await Promise.all([
        client.from("folders").insert(foldersToInsert),
        client.from("notes").insert(notesToInsert),
      ]);
      const seedError = foldersInsert.error || notesInsert.error;
      if (seedError) {
        if (authGeneration !== authGenerationRef.current) return false;
        setSaveError(seedError.message);
        setWorkspaceReady(true);
        return false;
      }
    }
    nextFolders = markLegacyImportedFolders(nextFolders);
    const legacyImportKeyUpdates = nextFolders.filter((folder) => folder.importKey && !folderResult.data?.find((row) => row.id === folder.id)?.import_key);
    if (legacyImportKeyUpdates.length) {
      const legacyImportResults = await Promise.all(legacyImportKeyUpdates.map((folder) => (
        client.from("folders")
          .update({ import_key: folder.importKey })
          .eq("id", folder.id)
          .eq("user_id", currentUserId)
      )));
      const legacyImportError = legacyImportResults.find((result) => result.error)?.error;
      if (legacyImportError) setSaveError(`De geïmporteerde mappen konden niet worden gemarkeerd: ${legacyImportError.message}`);
    }
    const foldersBeforeImport = nextFolders;
    nextFolders = addMissingImportedFolders(nextFolders);
    const newImportedFolders = nextFolders.filter(
      (folder) => !foldersBeforeImport.some((existingFolder) => existingFolder.id === folder.id),
    );
    if (newImportedFolders.length) {
      const { error } = await client.from("folders").insert(
        newImportedFolders.map((folder) => ({
          id: folder.id,
          user_id: currentUserId,
          name: folder.name,
          parent_id: folder.parentId,
          color: folder.color,
          position: folder.position,
          import_key: folder.importKey || null,
        })),
      );
      if (error) {
        setSaveError(error.message);
        nextFolders = foldersBeforeImport;
      }
    }
    const desiredFolders = alignImportedFolderParents(nextFolders);
    const parentChanges = desiredFolders.filter((folder) => {
      const previous = nextFolders.find((item) => item.id === folder.id);
      return previous?.parentId !== folder.parentId;
    });
    if (parentChanges.length) {
      const parentUpdates = await Promise.all(parentChanges.map(async (folder) => ({
        folderId: folder.id,
        result: await client.from("folders")
          .update({ parent_id: folder.parentId })
          .eq("id", folder.id)
          .eq("user_id", currentUserId),
      })));
      const parentError = parentUpdates.find(({ result }) => result.error)?.result.error;
      if (parentError) {
        setSaveError(`De bedrijfsstructuur kon niet veilig worden hersteld: ${parentError.message}`);
      }
      const persistedParentIds = new Set(
        parentUpdates
          .filter(({ result }) => !result.error)
          .map(({ folderId }) => folderId),
      );
      nextFolders = nextFolders.map((folder) => {
        const desired = desiredFolders.find((item) => item.id === folder.id);
        return desired && persistedParentIds.has(folder.id)
          ? desired
          : folder;
      });
    }
    const foldersById = new Map(nextFolders.map((folder) => [folder.id, folder]));
    const angelsMediateFolders = nextFolders.filter((folder) => folder.name === "Angels Mediate");
    if (angelsMediateFolders.length) {
      const legacyCompanyNames = new Set(["CloudiAudi", "CyberSec360", "Huasca", "In De Roos", "OpenCourse", "Overskilled"]);
      const foldersToRepair = nextFolders.flatMap((folder) => {
        if (!legacyCompanyNames.has(folder.name)) return [];
        const parent = folder.parentId ? foldersById.get(folder.parentId) : undefined;
        const targetParent = parent?.parentId ? foldersById.get(parent.parentId) : undefined;
        return parent?.name === "Angels Mediate" && targetParent?.name === "Jamal Drenthe"
          ? [{ folder, targetParent }]
          : [];
      });
      if (foldersToRepair.length) {
        const repairResults = await Promise.all(foldersToRepair.map(({ folder, targetParent }) => (
          client.from("folders").update({
            parent_id: targetParent.id,
          }).eq("id", folder.id).eq("user_id", currentUserId)
        )));
        const repairError = repairResults.find((result) => result.error)?.error;
        if (repairError) {
          setSaveError(repairError.message);
        } else {
          const repairTargets = new Map(foldersToRepair.map(({ folder, targetParent }) => [folder.id, targetParent]));
          nextFolders = nextFolders.map((folder) => {
            const repairedParent = repairTargets.get(folder.id);
            return repairedParent
              ? { ...folder, parentId: repairedParent.id }
              : folder;
          });
        }
      }
    }
    const { folders: deduplicatedFolders, duplicateMap } = deduplicateFolders(nextFolders);
    if (duplicateMap.size) {
      const duplicateIds = [...duplicateMap.keys()];
      const childUpdates = await Promise.all(duplicateIds.map((duplicateId) => (
        client.from("folders")
          .update({ parent_id: duplicateMap.get(duplicateId) || null })
          .eq("parent_id", duplicateId)
          .eq("user_id", currentUserId)
      )));
      const childError = childUpdates.find((result) => result.error)?.error;
      if (childError) {
        setSaveError(`Submappen konden niet veilig worden samengevoegd: ${childError.message}`);
        setWorkspaceReady(true);
        return false;
      }
      const noteUpdates = await Promise.all(duplicateIds.map((duplicateId) => (
        client.from("notes")
          .update({ folder_id: duplicateMap.get(duplicateId) || null })
          .eq("folder_id", duplicateId)
          .eq("user_id", currentUserId)
      )));
      const noteError = noteUpdates.find((result) => result.error)?.error;
      if (noteError) {
        setSaveError(`Notities konden niet veilig worden verplaatst: ${noteError.message}`);
        setWorkspaceReady(true);
        return false;
      }
      const rebalancedFolders = rebalanceFolderPositions(deduplicatedFolders);
      const positionUpdates = await Promise.all(rebalancedFolders.map((folder) => (
        client.from("folders")
          .update({ parent_id: folder.parentId, position: folder.position })
          .eq("id", folder.id)
          .eq("user_id", currentUserId)
      )));
      const positionError = positionUpdates.find((result) => result.error)?.error;
      if (positionError) {
        setSaveError(`De mapvolgorde kon niet veilig worden opgeslagen: ${positionError.message}`);
        setWorkspaceReady(true);
        return false;
      }
      const deleteResults = await Promise.all(duplicateIds.map((duplicateId) => (
        client.from("folders").delete().eq("id", duplicateId).eq("user_id", currentUserId)
      )));
      const deleteError = deleteResults.find((result) => result.error)?.error;
      if (deleteError) {
        setSaveError(`Dubbele mappen konden niet worden verwijderd: ${deleteError.message}`);
        setWorkspaceReady(true);
        return false;
      } else {
        const movedNotes = new Map(duplicateMap);
        nextFolders = rebalancedFolders;
        nextNotes = nextNotes.map((note) => ({
          ...note,
          folderId: movedNotes.get(note.folderId) || note.folderId,
        }));
      }
    } else {
      nextFolders = deduplicatedFolders;
    }
    const positionedFolders = rebalanceFolderPositions(nextFolders);
    const positionChanges = positionedFolders.filter((folder) => {
      const previous = nextFolders.find((item) => item.id === folder.id);
      return previous?.position !== folder.position;
    });
    if (positionChanges.length) {
      const positionUpdates = await Promise.all(positionChanges.map((folder) => (
        client.from("folders")
          .update({ position: folder.position })
          .eq("id", folder.id)
          .eq("user_id", currentUserId)
      )));
      const positionError = positionUpdates.find((result) => result.error)?.error;
      if (positionError) {
        setSaveError(`De bedrijfsvolgorde kon niet veilig worden opgeslagen: ${positionError.message}`);
        setWorkspaceReady(true);
        return false;
      }
    }
    nextFolders = positionedFolders;
    const quantumFolder = nextFolders.find((folder) => (
      folder.name === "QuantumInitium"
      && nextFolders.some((parent) => parent.id === folder.parentId && parent.name === "Jamal Drenthe")
      && nextFolders.some((grandparent) => {
        const parent = nextFolders.find((candidate) => candidate.id === folder.parentId);
        return parent?.parentId === grandparent.id && grandparent.name === "Bedrijven";
      })
    ));
    if (quantumFolder) {
      const existingImportKeys = new Set(
        nextNotes
          .filter((note) => note.folderId === quantumFolder.id)
          .map((note) => note.importKey)
          .filter((key): key is string => Boolean(key)),
      );
      const missingImportedNotes = importedDocumentBlueprint
        .filter(({ key }) => !existingImportKeys.has(key))
        .map(({ key, title }) => ({
          id: crypto.randomUUID(),
          user_id: currentUserId,
          folder_id: quantumFolder.id,
          import_key: key,
          title,
          body: "Imported from the Knowledge OS folder structure. Attach the original file here when it is available.",
          tags: ["imported"],
          favorite: false,
        }));
      if (missingImportedNotes.length) {
        const { error: notesError } = await client.from("notes").upsert(
          missingImportedNotes,
          { onConflict: "user_id,import_key", ignoreDuplicates: true },
        );
        if (notesError) {
          setSaveError(notesError.message);
        } else {
          const importKeys = missingImportedNotes.map((note) => note.import_key);
          const { data: importedNoteRows, error: importedNotesError } = await client
            .from("notes")
            .select("id,title,body,folder_id,tags,favorite,updated_at,import_key")
            .eq("user_id", currentUserId)
            .in("import_key", importKeys);
          if (importedNotesError) {
            setSaveError(importedNotesError.message);
          } else {
            const importedNotes = mapNotes(importedNoteRows || [], []);
            const importedKeys = new Set(importKeys);
            nextNotes = [
              ...nextNotes.filter((note) => !note.importKey || !importedKeys.has(note.importKey)),
              ...importedNotes,
            ];
          }
        }
      }
    }
    const quantumCompanyNote = nextNotes.find((note) => note.importKey === "quantuminitium");
    if (quantumCompanyNote) {
      const renamedTitle = "QuantumInitium overview";
      const { error } = await client.from("notes")
        .update({ title: renamedTitle })
        .eq("id", quantumCompanyNote.id)
        .eq("user_id", currentUserId);
      if (error) {
        setSaveError(`De QuantumInitium-notitie kon niet netjes worden hernoemd: ${error.message}`);
      } else {
        nextNotes = nextNotes.map((note) => (
          note.id === quantumCompanyNote.id ? { ...note, title: renamedTitle } : note
        ));
      }
    }
    if (authGeneration !== authGenerationRef.current) return false;
    setFolders(nextFolders);
    setNotes(nextNotes);
    setActiveNoteId(nextNotes[0]?.id || "");
    setExpanded(Object.fromEntries(nextFolders.filter((folder) => expandedFolderNames.has(folder.name)).map((folder) => [folder.id, true])));
    setWorkspaceReady(true);
    return true;
  };

  const verifyAccess = async (currentUserId: string) => {
    if (!supabase) return true;
    const { data, error } = await supabase.from("allowed_users").select("user_id").eq("user_id", currentUserId).maybeSingle();
    if (error || !data) {
      await supabase.auth.signOut();
      setAuthError("Dit account heeft momenteel geen toegang tot deze private workspace.");
      return false;
    }
    return true;
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("knowledge-os-theme", theme);
  }, [theme]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (!commandPaletteOpen) searchInputRef.current?.focus();
      }
      if (modifier && event.key.toLowerCase() === "p") {
        event.preventDefault();
        setCommandPaletteOpen(true);
      }
      if (modifier && event.key.toLowerCase() === "n") {
        event.preventDefault();
        setCommandPaletteOpen(false);
        void createNote();
      }
      if (event.key === "Escape") {
        setMobileNav(false);
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  });

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    const commitAuthIdentity = (currentUserId: string | null) => {
      if (authenticatedUserRef.current === currentUserId) return;
      authenticatedUserRef.current = currentUserId;
      pendingAuthUserRef.current = currentUserId;
      if (loadedWorkspaceUserRef.current !== currentUserId) {
        activeWorkspaceLoadRef.current = null;
        workspaceLoadTokenRef.current += 1;
        loadedWorkspaceUserRef.current = null;
      }
    };
    const loadWorkspaceForUser = async (currentUserId: string, authGeneration: number) => {
      if (
        authGeneration !== authGenerationRef.current
        || loadedWorkspaceUserRef.current === currentUserId
        || activeWorkspaceLoadRef.current?.userId === currentUserId
      ) return;
      const loadToken = workspaceLoadTokenRef.current + 1;
      workspaceLoadTokenRef.current = loadToken;
      activeWorkspaceLoadRef.current = { userId: currentUserId, token: loadToken };
      loadedWorkspaceUserRef.current = currentUserId;
      const loaded = await loadWorkspace(currentUserId, authGeneration);
      if (activeWorkspaceLoadRef.current?.token === loadToken) {
        activeWorkspaceLoadRef.current = null;
      }
      if (!loaded && loadedWorkspaceUserRef.current === currentUserId && workspaceLoadTokenRef.current === loadToken) {
        loadedWorkspaceUserRef.current = null;
      }
    };
    const loadSession = async () => {
      const authGeneration = authGenerationRef.current;
      const { data } = await client.auth.getSession();
      const hasAccess = data.session ? await verifyAccess(data.session.user.id) : false;
      if (authGeneration !== authGenerationRef.current) return;
      const currentUserId = data.session && hasAccess ? data.session.user.id : null;
      commitAuthIdentity(currentUserId);
      const currentAuthGeneration = authGenerationRef.current;
      setAuthenticated(Boolean(data.session && hasAccess));
      setUserId(currentUserId);
      setSessionReady(true);
      if (data.session && hasAccess) {
        await loadWorkspaceForUser(data.session.user.id, currentAuthGeneration);
      }
    };
    const { data: listener } = client.auth.onAuthStateChange(async (_event, nextSession) => {
      const nextUserId = nextSession?.user.id || null;
      if (pendingAuthUserRef.current !== nextUserId) {
        pendingAuthUserRef.current = nextUserId;
        authGenerationRef.current += 1;
      }
      const authGeneration = authGenerationRef.current;
      setSessionReady(true);
      const hasAccess = nextSession ? await verifyAccess(nextSession.user.id) : false;
      if (authGeneration !== authGenerationRef.current) return;
      const currentUserId = nextSession && hasAccess ? nextSession.user.id : null;
      commitAuthIdentity(currentUserId);
      setAuthenticated(Boolean(currentUserId));
      setUserId(currentUserId);
      if (nextSession && hasAccess) {
        await loadWorkspaceForUser(nextSession.user.id, authGeneration);
      } else {
        activeWorkspaceLoadRef.current = null;
        workspaceLoadTokenRef.current += 1;
        loadedWorkspaceUserRef.current = null;
        invalidatePendingNoteSaves();
        setFolders([]);
        setNotes([]);
        setWorkspaceReady(true);
      }
    });
    void loadSession();
    return () => listener.subscription.unsubscribe();
  }, []);

  const activeNote = notes.find((note) => note.id === activeNoteId) || notes[0];
  const statusError = activeNote ? noteSaveErrors[activeNote.id] || saveError : saveError;
  const activeNoteSavePending = activeNote ? noteSavePending[activeNote.id] : false;
  const statusSaved = !statusError && !activeNoteSavePending;
  const folderMap = useMemo(() => new Map(folders.map((folder) => [folder.id, folder])), [folders]);
  const filteredNotes = useMemo(() => {
    const query = search.toLowerCase().trim();
    const visibleNotes = notes.filter((note) => {
      const inFolder = !activeFolderId || isDescendantFolder(note.folderId, activeFolderId, folderMap);
      const matches = !query || `${note.title} ${note.body} ${note.tags.join(" ")}`.toLowerCase().includes(query);
      const matchesFilter = noteFilter === "all"
        || (noteFilter === "favorites" && note.favorite)
        || (noteFilter === "recent" && Boolean(note.updatedAt));
      const matchesTag = !tagFilter || note.tags.includes(tagFilter);
      return inFolder && matches && matchesFilter && matchesTag;
    });
    return noteFilter === "recent"
      ? visibleNotes.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
      : visibleNotes;
  }, [activeFolderId, folderMap, noteFilter, notes, search, tagFilter]);

  const availableTags = useMemo(
    () => Array.from(new Set(notes.flatMap((note) => note.tags))).sort((a, b) => a.localeCompare(b)),
    [notes],
  );

  const updateNote = async (changes: Partial<Note>) => {
    if (!activeNote) return;
    const noteId = activeNote.id;
    const saveGeneration = saveGenerationRef.current;
    const updatedAt = new Date().toISOString();
    setSaved(false);
    setNoteSavePending((current) => ({ ...current, [noteId]: true }));
    setNoteSaveErrors((current) => ({ ...current, [noteId]: "" }));
    setNotes((current) => current.map((note) => note.id === activeNote.id
      ? { ...note, ...changes, updated: "Just now", updatedAt }
      : note));
    const client = supabase;
    if (!client || !userId) {
      setNoteSavePending((current) => ({ ...current, [noteId]: false }));
      setSaved(true);
      return;
    }

    const pendingChanges = pendingNoteChangesRef.current.get(noteId) || {};
    pendingNoteChangesRef.current.set(noteId, { ...pendingChanges, ...changes });
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(async () => {
      if (saveGeneration !== saveGenerationRef.current) return;
      const pendingChanges = Array.from(pendingNoteChangesRef.current.entries());
      pendingNoteChangesRef.current.clear();
      if (!pendingChanges.length) return;
      const results = await Promise.all(pendingChanges.map(async ([pendingNoteId, noteChanges]) => {
        const noteUpdate: {
          title?: string;
          body?: string;
          tags?: string[];
          favorite?: boolean;
          folder_id?: string | null;
          updated_at: string;
        } = { updated_at: new Date().toISOString() };
        if (noteChanges.title !== undefined) noteUpdate.title = noteChanges.title;
        if (noteChanges.body !== undefined) noteUpdate.body = noteChanges.body;
        if (noteChanges.tags !== undefined) noteUpdate.tags = noteChanges.tags;
        if (noteChanges.favorite !== undefined) noteUpdate.favorite = noteChanges.favorite;
        if (noteChanges.folderId !== undefined) noteUpdate.folder_id = noteChanges.folderId || null;
        const { error } = await client.from("notes").update(noteUpdate)
          .eq("id", pendingNoteId)
          .eq("user_id", userId);
        return { noteId: pendingNoteId, error: error?.message || "" };
      }));
      if (saveGeneration !== saveGenerationRef.current) return;
      const failedResults = results.filter((result) => result.error);
      setNoteSaveErrors((current) => {
        const next = { ...current };
        results.forEach(({ noteId: resultNoteId, error }) => {
          if (error) next[resultNoteId] = error;
          else delete next[resultNoteId];
        });
        return next;
      });
      setNoteSavePending((current) => {
        const next = { ...current };
        results.forEach(({ noteId: resultNoteId }) => {
          next[resultNoteId] = false;
        });
        return next;
      });
      if (failedResults.length) {
        setSaved(false);
        return;
      }
      setSaved(true);
    }, 500);
  };

  useEffect(() => () => {
    saveGenerationRef.current += 1;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    pendingNoteChangesRef.current.clear();
  }, []);

  const createNote = async () => {
    const folderId = activeFolderId || folders[0]?.id || null;
    const updatedAt = new Date().toISOString();
    const note: Note = { id: crypto.randomUUID(), title: "Untitled note", body: "", updated: "Just now", updatedAt, folderId: folderId || "", tags: [], attachments: [] };
    if (supabase && userId) {
      const { error } = await supabase.from("notes").insert({
        id: note.id,
        user_id: userId,
        folder_id: folderId,
        title: note.title,
        body: note.body,
        tags: note.tags,
      });
      if (error) {
        setSaveError(error.message);
        return;
      }
    }
    setNotes((current) => [note, ...current]);
    setActiveNoteId(note.id);
    setWorkspaceView("notes");
    setSaved(true);
  };

  const addTag = () => {
    if (!activeNote) return;
    const tag = tagDraft.trim().replace(/^#/, "").replace(/\s+/g, "-").toLowerCase();
    if (!tag || activeNote.tags.includes(tag)) {
      setTagDraft("");
      return;
    }
    void updateNote({ tags: [...activeNote.tags, tag] });
    setTagDraft("");
  };

  const removeTag = (tag: string) => {
    if (!activeNote) return;
    void updateNote({ tags: activeNote.tags.filter((item) => item !== tag) });
  };

  const createFolder = () => {
    setFolderNameDraft("");
    setFolderParentDraft(activeFolderId);
    setFolderModalOpen(true);
  };

  const saveNewFolder = async (name: string, parentId: string | null) => {
    setFolderModalOpen(false);
    if (folders.some((folder) => folderNameKey(folder.name) === folderNameKey(name))) {
      setSaveError(`De map "${name.trim()}" bestaat al in het menu.`);
      setSaved(false);
      return;
    }
    const siblingCount = folders.filter((item) => item.parentId === parentId).length;
    const folder: FolderItem = { id: crypto.randomUUID(), name: name.trim(), parentId, color: "violet", position: siblingCount };
    setSaved(false);
    setSaveError("");
    if (supabase && userId) {
      const { error } = await supabase.from("folders").insert({
        id: folder.id,
        user_id: userId,
        name: folder.name,
        parent_id: folder.parentId,
        color: folder.color,
        position: folder.position,
      });
      if (error) {
        setSaveError(error.message);
        setSaved(false);
        return;
      }
    }
    setFolders((current) => [...current, folder]);
    if (parentId) setExpanded((current) => ({ ...current, [parentId]: true }));
    setActiveFolderId(folder.id);
    setSaved(true);
  };

  const persistFolderPositions = async (nextFolders: FolderItem[]) => {
    const client = supabase;
    if (!client || !userId) return true;
    const updates = nextFolders.map((folder) => client.from("folders").update({
      parent_id: folder.parentId,
      position: folder.position,
      updated_at: new Date().toISOString(),
    }).eq("id", folder.id).eq("user_id", userId));
    const results = await Promise.all(updates);
    const error = results.find((result) => result.error)?.error;
    if (error) {
      setSaveError(error.message);
      return false;
    }
    setSaveError("");
    return true;
  };

  const moveFolderTo = async (folderId: string, parentId: string | null, targetIndex: number) => {
    const moving = folders.find((folder) => folder.id === folderId);
    if (!moving || parentId === folderId) return;
    const descendants = new Set<string>();
    const collectDescendants = (currentId: string) => {
      folders.filter((folder) => folder.parentId === currentId).forEach((child) => {
        descendants.add(child.id);
        collectDescendants(child.id);
      });
    };
    collectDescendants(folderId);
    if (parentId && descendants.has(parentId)) return;

    const withoutMoving = folders.filter((folder) => folder.id !== folderId);
    const targetSiblings = withoutMoving
      .filter((folder) => folder.parentId === parentId)
      .sort((a, b) => a.position - b.position);
    const boundedIndex = Math.max(0, Math.min(targetIndex, targetSiblings.length));
    targetSiblings.splice(boundedIndex, 0, { ...moving, parentId });
    const positionById = new Map(targetSiblings.map((folder, index) => [folder.id, index]));
    const nextFolders = withoutMoving.map((folder) => {
      const position = positionById.get(folder.id);
      return position === undefined ? folder : { ...folder, position };
    });
    const movedFolder = { ...moving, parentId, position: boundedIndex };
    nextFolders.push(movedFolder);
    const normalized = nextFolders
      .map((folder) => ({ ...folder }))
      .sort((a, b) => a.position - b.position);
    const finalFolders = normalized.map((folder) => {
      const siblings = normalized.filter((candidate) => candidate.parentId === folder.parentId);
      return { ...folder, position: siblings.findIndex((candidate) => candidate.id === folder.id) };
    });
    setFolders(finalFolders);
    setSaved(false);
    const persisted = await persistFolderPositions(finalFolders);
    setSaved(persisted);
  };

  const shiftFolder = async (folderId: string, delta: number) => {
    const folder = folders.find((item) => item.id === folderId);
    if (!folder) return;
    const siblings = folders.filter((item) => item.parentId === folder.parentId).sort((a, b) => a.position - b.position);
    const currentIndex = siblings.findIndex((item) => item.id === folderId);
    const targetIndex = currentIndex + delta;
    if (targetIndex < 0 || targetIndex >= siblings.length) return;
    await moveFolderTo(folderId, folder.parentId, targetIndex);
  };

  const handleFolderDragOver = (event: React.DragEvent<HTMLDivElement>, folderId: string) => {
    event.preventDefault();
    if (!draggedFolderId || draggedFolderId === folderId) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const relativePosition = (event.clientY - bounds.top) / bounds.height;
    const mode = relativePosition < 0.3 ? "before" : relativePosition > 0.7 ? "after" : "inside";
    setDropTarget({ id: folderId, mode });
  };

  const handleFolderDrop = async (event: React.DragEvent<HTMLDivElement>, folderId: string) => {
    event.preventDefault();
    const target = folders.find((folder) => folder.id === folderId);
    const moving = folders.find((folder) => folder.id === draggedFolderId);
    const mode = dropTarget?.id === folderId ? dropTarget.mode : "inside";
    setDraggedFolderId(null);
    setDropTarget(null);
    if (!target || !moving || moving.id === target.id) return;
    const targetSiblings = folders.filter((folder) => folder.parentId === (mode === "inside" ? target.id : target.parentId)).sort((a, b) => a.position - b.position);
    const targetIndex = mode === "before"
      ? targetSiblings.findIndex((folder) => folder.id === target.id)
      : mode === "after"
        ? targetSiblings.findIndex((folder) => folder.id === target.id) + 1
        : targetSiblings.length;
    const movingIndex = folders
      .filter((folder) => folder.parentId === moving.parentId)
      .sort((a, b) => a.position - b.position)
      .findIndex((folder) => folder.id === moving.id);
    const destinationParent = mode === "inside" ? target.id : target.parentId;
    const adjustedTargetIndex = moving.parentId === destinationParent && movingIndex < targetIndex
      ? targetIndex - 1
      : targetIndex;
    await moveFolderTo(moving.id, destinationParent, adjustedTargetIndex);
    if (mode === "inside") setExpanded((current) => ({ ...current, [target.id]: true }));
  };

  const addAttachments = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length || !activeNote) return;
    void uploadAttachments(files);
    event.target.value = "";
  };

  const uploadAttachments = async (files: File[]) => {
    if (!activeNote) return;
    const uploaded: Attachment[] = [];
    for (const file of files) {
      if (!supabase || !userId) {
        uploaded.push({ id: crypto.randomUUID(), name: file.name, size: formatBytes(file.size), mimeType: file.type, file });
        continue;
      }
      const id = crypto.randomUUID();
      const storagePath = `${userId}/${activeNote.id}/${id}-${file.name}`;
      const upload = await supabase.storage.from("knowledge-attachments").upload(storagePath, file, { upsert: false });
      if (upload.error) {
        setSaveError(upload.error.message);
        continue;
      }
      const { error } = await supabase.from("attachments").insert({
        id,
        user_id: userId,
        note_id: activeNote.id,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type || null,
        file_size: file.size,
      });
      if (error) {
        await supabase.storage.from("knowledge-attachments").remove([storagePath]);
        setSaveError(error.message);
        continue;
      }
      uploaded.push({ id, name: file.name, size: formatBytes(file.size), storagePath, mimeType: file.type || undefined });
    }
    if (uploaded.length) {
      setNotes((current) => current.map((note) => note.id === activeNote.id ? { ...note, attachments: [...note.attachments, ...uploaded] } : note));
      setSaved(true);
    }
  };

  const removeAttachment = async (attachment: Attachment) => {
    if (!activeNote) return;
    if (supabase && userId && attachment.storagePath) {
      const storageResult = await supabase.storage.from("knowledge-attachments").remove([attachment.storagePath]);
      const { error } = await supabase.from("attachments").delete().eq("id", attachment.id).eq("user_id", userId);
      if (storageResult.error || error) {
        setSaveError(storageResult.error?.message || error?.message || "Attachment could not be removed.");
        return;
      }
    }
    setNotes((current) => current.map((note) => note.id === activeNote.id ? { ...note, attachments: note.attachments.filter((item) => item.id !== attachment.id) } : note));
    setSaved(true);
  };

  const openAttachment = async (attachment: Attachment) => {
    if (attachment.file) {
      window.open(URL.createObjectURL(attachment.file), "_blank", "noopener,noreferrer");
      return;
    }
    if (!supabase || !attachment.storagePath) return;
    const { data, error } = await supabase.storage.from("knowledge-attachments").createSignedUrl(attachment.storagePath, 60);
    if (error) {
      setSaveError(error.message);
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const handleEmailAuth = async (event: FormEvent<HTMLFormElement>, email: string, password: string) => {
    event.preventDefault();
    setAuthError("");
    if (!supabase) {
      setShowAuth(false);
      return;
    }
    const result = authMode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    if (result.error) setAuthError(result.error.message);
    else setShowAuth(false);
  };

  const handleGoogleAuth = async () => {
    setAuthError("");
    if (!supabase) {
      setShowAuth(false);
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
    if (error) setAuthError(error.message);
  };

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
  };

  if (!sessionReady) return <main className="loading-screen">Loading your private vault…</main>;
  if (!authenticated) return <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => undefined} onSubmit={handleEmailAuth} onGoogle={handleGoogleAuth} error={authError} locked />;
  if (!workspaceReady || !activeNote) return <main className="loading-screen">{saveError || "Loading your private vault…"}</main>;

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileNav ? "is-open" : ""}`}>
        <div className="brand-row"><div className="brand-mark"><Sparkles size={17} /></div><div><div className="brand-name">Knowledge OS</div><div className="brand-subtitle">Your connected second brain</div></div><button className="icon-button mobile-close" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={18} /></button></div>
        <div className="vault-switcher"><span className="avatar">JD</span><span className="vault-copy"><strong>Personal vault</strong><small>Private workspace</small></span><ChevronDown size={15} /></div>
        <nav className="side-nav" aria-label="Main navigation">
          <NavItem icon={<LayoutGrid size={16} />} label="All notes" active={workspaceView === "notes" && !activeFolderId && noteFilter === "all" && !tagFilter} onClick={() => { setActiveFolderId(null); setTagFilter(null); setNoteFilter("all"); setWorkspaceView("notes"); }} count={String(notes.length)} />
          <NavItem icon={<Clock3 size={16} />} label="Recently edited" active={noteFilter === "recent"} onClick={() => { setActiveFolderId(null); setTagFilter(null); setNoteFilter("recent"); setWorkspaceView("notes"); }} />
          <NavItem icon={<Star size={16} />} label="Favorites" active={noteFilter === "favorites"} onClick={() => { setActiveFolderId(null); setTagFilter(null); setNoteFilter("favorites"); setWorkspaceView("notes"); }} count={String(notes.filter((note) => note.favorite).length)} />
          <div className="nav-label nav-label-with-action"><span>Folders</span><button className="nav-add-button" onClick={createFolder} aria-label="Create folder"><FolderPlus size={14} /></button></div>
          {folders.filter((folder) => !folder.parentId).sort((a, b) => a.position - b.position).map((folder) => <FolderTree key={folder.id} folder={folder} folders={folders} activeFolderId={activeFolderId} expanded={expanded} dropTarget={dropTarget} onToggle={(id) => setExpanded((current) => ({ ...current, [id]: !current[id] }))} onSelect={(id) => { setActiveFolderId(id); setTagFilter(null); setNoteFilter("all"); setWorkspaceView("notes"); }} onShift={shiftFolder} onDragStart={setDraggedFolderId} onDragOver={handleFolderDragOver} onDrop={handleFolderDrop} />)}
          <div className="nav-label">Explore</div>
          <NavItem icon={<Network size={16} />} label="Knowledge graph" active={workspaceView === "graph"} onClick={() => setWorkspaceView("graph")} />
          <div className="nav-label">Tags</div>
          <div className="tags-nav">{availableTags.slice(0, 8).map((tag) => <button key={tag} className={`tag-nav-item ${tagFilter === tag ? "active" : ""}`} onClick={() => { setActiveFolderId(null); setNoteFilter("all"); setTagFilter(tag); setWorkspaceView("notes"); }}> <span><Tag size={13} />#{tag}</span><small>{notes.filter((note) => note.tags.includes(tag)).length}</small></button>)}</div>
        </nav>
        <div className="sidebar-bottom"><div className="sync-card"><Sparkles size={15} /><div><strong>Private workspace</strong><span>Changes save securely.</span></div></div><div className="profile-row"><span className="avatar avatar-large">JD</span><span><strong>Jamal Drenthe</strong><small>Owner</small></span><button className="profile-login" onClick={() => void handleSignOut()} aria-label="Log out"><LogOut size={15} /></button></div></div>
      </aside>

      <section className="workspace">
        <header className="topbar"><button className="icon-button menu-button" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={19} /></button><div className="breadcrumbs"><span>Personal vault</span><span className="crumb-separator">/</span><strong>{activeFolderId ? folderMap.get(activeFolderId)?.name : tagFilter ? `#${tagFilter}` : noteFilter === "recent" ? "Recently edited" : noteFilter === "favorites" ? "Favorites" : "All notes"}</strong></div><div className="topbar-actions"><div className="search-box"><Search size={16} /><input ref={searchInputRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your vault..." /><kbd>Ctrl K</kbd></div><button className="icon-button command-button" onClick={() => setCommandPaletteOpen(true)} aria-label="Open quick actions"><span>⌘</span></button><button className="icon-button theme-toggle" onClick={() => setTheme(theme === "light" ? "dark" : "light")} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>{theme === "light" ? <Moon size={17} /> : <Sun size={17} />}</button><button className="new-note-button" onClick={() => void createNote()}><Plus size={17} /> New note</button></div></header>

        {workspaceView === "graph" ? <GraphView /> : <div className="content-grid">
          <section className="notes-panel"><div className="panel-heading"><div><p className="eyebrow">Your knowledge base</p><h1>{activeFolderId ? folderMap.get(activeFolderId)?.name : tagFilter ? `#${tagFilter}` : noteFilter === "recent" ? "Recently edited" : noteFilter === "favorites" ? "Favorites" : "All notes"}</h1></div><button className="view-toggle" aria-label="Grid view"><LayoutGrid size={16} /></button></div><div className="notes-meta"><span>{filteredNotes.length} notes</span><button onClick={() => setNotes((current) => [...current].sort((a, b) => a.title.localeCompare(b.title)))}>A–Z <ChevronDown size={13} /></button></div><div className="note-list">{filteredNotes.map((note) => <button className={`note-card ${activeNote.id === note.id ? "selected" : ""}`} key={note.id} onClick={() => setActiveNoteId(note.id)}><span className={`note-dot ${folderMap.get(note.folderId)?.color || "violet"}`} /><span className="note-card-body"><strong>{note.title}</strong><span>{note.body.split("\n")[0] || "Empty note"}</span><small>{note.updated} <i /> {note.tags.map((tag) => `#${tag}`).join("  ")}</small></span>{note.favorite && <span className="favorite-star"><Star size={13} fill="currentColor" /></span>}</button>)}{!filteredNotes.length && <div className="empty-state"><Search size={22} /><strong>No notes found</strong><span>Try another search or folder.</span></div>}</div></section>

          <article className="editor-panel"><div className="editor-toolbar"><div className={`status-pill ${statusSaved ? "is-saved" : ""}`}><span /> {statusError || (activeNoteSavePending ? "Saving…" : "Saved")}</div><div className="editor-actions"><button className={`icon-button ${activeNote.favorite ? "is-active" : ""}`} onClick={() => void updateNote({ favorite: !activeNote.favorite })} aria-label={activeNote.favorite ? "Remove from favorites" : "Add to favorites"}><Star size={17} fill={activeNote.favorite ? "currentColor" : "none"} /></button><button className="icon-button" onClick={() => fileInputRef.current?.click()} aria-label="Add attachment"><Paperclip size={17} /></button><button className="icon-button" aria-label="Link note"><Link2 size={17} /></button></div></div><div className="editor-content"><div className="editor-kicker"><span className={`note-dot ${folderMap.get(activeNote.folderId)?.color || "violet"}`} /> <select className="note-folder-select" value={activeNote.folderId} onChange={(event) => void updateNote({ folderId: event.target.value })} aria-label="Move note to folder">{[...folders].sort((a, b) => a.name.localeCompare(b.name)).map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select> <span>·</span> {activeNote.updated}</div><input className="title-input" value={activeNote.title} onChange={(event) => void updateNote({ title: event.target.value })} aria-label="Note title" /><div className="editor-tags">{activeNote.tags.map((tag) => <button key={tag} type="button" onClick={() => removeTag(tag)} aria-label={`Remove tag ${tag}`}><Hash size={13} />{tag}<X size={11} /></button>)}<input value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTag(); } }} placeholder="Add tag" aria-label="Add tag" /></div><textarea className="note-editor" value={activeNote.body} onChange={(event) => void updateNote({ body: event.target.value })} placeholder="Start writing your note..." aria-label="Note content" />{!!activeNote.attachments.length && <div className="attachments"><div className="section-title"><Paperclip size={15} /> Attachments <span>{activeNote.attachments.length}</span></div>{activeNote.attachments.map((attachment) => <div className="attachment-row" key={attachment.id}><button className="attachment-open" onClick={() => void openAttachment(attachment)}><File size={15} /><span>{attachment.name}<small>{attachment.size}</small></span></button><button aria-label={`Remove ${attachment.name}`} onClick={() => void removeAttachment(attachment)}><X size={14} /></button></div>)}</div>}<div className="linked-section"><div className="section-title"><Link2 size={15} /> Linked notes <span>3</span></div>{["AI-native operating rhythm", "Build once, reuse everywhere", "Quantum Initium · 2026 direction"].map((note) => <button key={note}><File size={15} />{note}<ChevronRight size={14} /></button>)}</div></div><footer className="editor-footer"><span>Markdown</span><span>{activeNote.body.split(/\s+/).filter(Boolean).length} words</span><span>Private</span></footer><input ref={fileInputRef} className="visually-hidden" type="file" multiple onChange={addAttachments} /></article>
        </div>}
      </section>
      {commandPaletteOpen && <CommandPalette onClose={() => setCommandPaletteOpen(false)} onNewNote={() => { setCommandPaletteOpen(false); void createNote(); }} onNewFolder={() => { setCommandPaletteOpen(false); createFolder(); }} onAllNotes={() => { setCommandPaletteOpen(false); setActiveFolderId(null); setTagFilter(null); setNoteFilter("all"); setWorkspaceView("notes"); }} onFavorites={() => { setCommandPaletteOpen(false); setActiveFolderId(null); setTagFilter(null); setNoteFilter("favorites"); setWorkspaceView("notes"); }} onRecent={() => { setCommandPaletteOpen(false); setActiveFolderId(null); setTagFilter(null); setNoteFilter("recent"); setWorkspaceView("notes"); }} onGraph={() => { setCommandPaletteOpen(false); setWorkspaceView("graph"); }} onToggleTheme={() => { setCommandPaletteOpen(false); setTheme(theme === "light" ? "dark" : "light"); }} />}
      {folderModalOpen && <FolderModal name={folderNameDraft} parentId={folderParentDraft} folders={folders} onNameChange={setFolderNameDraft} onParentChange={setFolderParentDraft} onClose={() => setFolderModalOpen(false)} onSubmit={(name, parentId) => void saveNewFolder(name, parentId)} />}
      {showAuth && <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setShowAuth(false)} onSubmit={handleEmailAuth} onGoogle={handleGoogleAuth} />}
    </main>
  );
}

function FolderTree({ folder, folders, activeFolderId, expanded, dropTarget, onToggle, onSelect, onShift, onDragStart, onDragOver, onDrop }: { folder: FolderItem; folders: FolderItem[]; activeFolderId: string | null; expanded: Record<string, boolean>; dropTarget: { id: string; mode: "before" | "inside" | "after" } | null; onToggle: (id: string) => void; onSelect: (id: string) => void; onShift: (id: string, delta: number) => void; onDragStart: (id: string) => void; onDragOver: (event: React.DragEvent<HTMLDivElement>, id: string) => void; onDrop: (event: React.DragEvent<HTMLDivElement>, id: string) => void }) {
  const children = folders.filter((item) => item.parentId === folder.id).sort((a, b) => a.position - b.position);
  const siblings = folders.filter((item) => item.parentId === folder.parentId).sort((a, b) => a.position - b.position);
  const siblingIndex = siblings.findIndex((item) => item.id === folder.id);
  const dropMode = dropTarget?.id === folder.id ? dropTarget.mode : "";
  return <div className="folder-tree"><div className={`folder-drop-row ${dropMode ? `drop-${dropMode}` : ""}`} draggable onDragStart={() => onDragStart(folder.id)} onDragOver={(event) => onDragOver(event, folder.id)} onDrop={(event) => void onDrop(event, folder.id)}><div className={`nav-item folder-item ${activeFolderId === folder.id ? "active" : ""}`}><div className="folder-main">{children.length ? <button type="button" className="tree-toggle" onClick={() => onToggle(folder.id)} aria-label={`${expanded[folder.id] ? "Collapse" : "Expand"} ${folder.name}`} aria-expanded={expanded[folder.id]}>{expanded[folder.id] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</button> : <span className="tree-spacer" aria-hidden="true" />}<button type="button" className="folder-select" onClick={() => onSelect(folder.id)} title={folder.name}><span><Folder size={16} />{folder.name}</span></button></div><span className="folder-row-actions"><button type="button" className="folder-move-button" disabled={siblingIndex <= 0} onClick={() => void onShift(folder.id, -1)} aria-label={`Move ${folder.name} up`} title={siblingIndex <= 0 ? "Already first" : `Move ${folder.name} up`}><ChevronUp size={13} /></button><button type="button" className="folder-move-button" disabled={siblingIndex === siblings.length - 1} onClick={() => void onShift(folder.id, 1)} aria-label={`Move ${folder.name} down`} title={siblingIndex === siblings.length - 1 ? "Already last" : `Move ${folder.name} down`}><ChevronDown size={13} /></button><span className="folder-drag-handle" title={`Drag ${folder.name} to reorder`} aria-label={`Drag ${folder.name} to reorder`}><GripVertical size={15} aria-hidden="true" /></span></span></div></div>{expanded[folder.id] && children.map((child) => <div className="nested-folder" key={child.id}><FolderTree folder={child} folders={folders} activeFolderId={activeFolderId} expanded={expanded} dropTarget={dropTarget} onToggle={onToggle} onSelect={onSelect} onShift={onShift} onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} /></div>)}</div>;
}

function AuthModal({ mode, setMode, onClose, onSubmit, onGoogle, error, locked = false }: { mode: "login" | "register"; setMode: (mode: "login" | "register") => void; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>, email: string, password: string) => void; onGoogle: () => void; error?: string; locked?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return <div className={`modal-backdrop ${locked ? "auth-locked" : ""}`} role="presentation" onMouseDown={locked ? undefined : onClose}><section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" onMouseDown={(event) => event.stopPropagation()}>{!locked && <button className="modal-close" onClick={onClose} aria-label="Close"><X size={17} /></button>}<div className="auth-icon"><Sparkles size={19} /></div><p className="eyebrow">Private workspace</p><h2 id="auth-title">Welcome back</h2><p className="auth-copy">This workspace is currently limited to the owner account.</p>{error && <p className="auth-error" role="alert">{error}</p>}<button className="google-button" onClick={onGoogle}><span>G</span> Continue with Google</button><div className="auth-divider"><span>or use email</span></div><form onSubmit={(event) => onSubmit(event, email, password)}><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" minLength={8} required /></label><button className="new-note-button auth-submit" type="submit">Log in</button></form></section></div>;
}

function NavItem({ icon, label, count, active, onClick }: { icon: React.ReactNode; label: string; count?: string; active?: boolean; onClick?: () => void }) {
  return <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}><span>{icon}{label}</span>{count && <small>{count}</small>}</button>;
}

function FolderModal({ name, parentId, folders, onNameChange, onParentChange, onClose, onSubmit }: { name: string; parentId: string | null; folders: FolderItem[]; onNameChange: (name: string) => void; onParentChange: (parentId: string | null) => void; onClose: () => void; onSubmit: (name: string, parentId: string | null) => void }) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName) onSubmit(trimmedName, parentId);
  };

  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className="folder-modal" role="dialog" aria-modal="true" aria-labelledby="folder-modal-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose} aria-label="Close"><X size={17} /></button><div className="auth-icon"><FolderPlus size={19} /></div><p className="eyebrow">Organize your vault</p><h2 id="folder-modal-title">New folder</h2><p className="auth-copy">Create a folder at the root or inside another folder. It will be saved immediately.</p><form className="folder-form" onSubmit={handleSubmit}><label>Folder name<input autoFocus value={name} onChange={(event) => onNameChange(event.target.value)} placeholder="e.g. Client research" required /></label><label>Location<select value={parentId || ""} onChange={(event) => onParentChange(event.target.value || null)}><option value="">Root folders</option>{folders.slice().sort((a, b) => a.name.localeCompare(b.name)).map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label><div className="folder-form-actions"><button type="button" className="modal-secondary" onClick={onClose}>Cancel</button><button type="submit" className="new-note-button">Create folder</button></div></form></section></div>;
}

function CommandPalette({ onClose, onNewNote, onNewFolder, onAllNotes, onFavorites, onRecent, onGraph, onToggleTheme }: { onClose: () => void; onNewNote: () => void; onNewFolder: () => void; onAllNotes: () => void; onFavorites: () => void; onRecent: () => void; onGraph: () => void; onToggleTheme: () => void }) {
  const dialogRef = useRef<HTMLElement>(null);
  const firstActionRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    firstActionRef.current?.focus();
    return () => previousFocus?.focus();
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab") return;
    const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled])") || []);
    if (!focusable.length) return;
    const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
    const nextIndex = event.shiftKey
      ? currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1
      : currentIndex === focusable.length - 1 ? 0 : currentIndex + 1;
    event.preventDefault();
    focusable[nextIndex]?.focus();
  };

  return <div className="command-backdrop" role="presentation" onMouseDown={onClose}><section ref={dialogRef} className="command-palette" role="dialog" aria-modal="true" aria-labelledby="command-title" onKeyDown={handleKeyDown} onMouseDown={(event) => event.stopPropagation()}><div className="command-heading"><div><p className="eyebrow">Quick actions</p><h2 id="command-title">What do you want to do?</h2></div><button className="modal-close" onClick={onClose} aria-label="Close quick actions"><X size={17} /></button></div><div className="command-list"><CommandAction buttonRef={firstActionRef} icon={<Plus size={16} />} label="New note" shortcut="Ctrl N" onClick={onNewNote} /><CommandAction icon={<FolderPlus size={16} />} label="New folder" onClick={onNewFolder} /><CommandAction icon={<LayoutGrid size={16} />} label="Show all notes" onClick={onAllNotes} /><CommandAction icon={<Star size={16} />} label="Show favorites" onClick={onFavorites} /><CommandAction icon={<Clock3 size={16} />} label="Show recently edited" onClick={onRecent} /><CommandAction icon={<Network size={16} />} label="Open knowledge graph" onClick={onGraph} /><CommandAction icon={<Moon size={16} />} label="Toggle appearance" onClick={onToggleTheme} /></div><p className="command-hint">Press Esc to close</p></section></div>;
}

function CommandAction({ buttonRef, icon, label, shortcut, onClick }: { buttonRef?: React.RefObject<HTMLButtonElement | null>; icon: React.ReactNode; label: string; shortcut?: string; onClick: () => void }) {
  return <button ref={buttonRef} className="command-action" onClick={onClick}><span>{icon}{label}</span>{shortcut && <kbd>{shortcut}</kbd>}</button>;
}

function GraphView() {
  return <section className="graph-view"><div className="graph-heading"><div><p className="eyebrow">Explore connections</p><h1>Knowledge graph</h1><p>See the ideas, projects and principles that shape your vault.</p></div><span className="graph-readonly"><Network size={15} /> Read-only map</span></div><div className="graph-canvas"><svg className="graph-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line x1="50" y1="50" x2="19" y2="28" /><line x1="50" y1="50" x2="23" y2="76" /><line x1="50" y1="50" x2="77" y2="77" /></svg><div className="graph-node node-center"><Sparkles size={20} /><strong>Knowledge OS thesis</strong><span>4 connections</span></div><div className="graph-node node-one"><span className="graph-node-dot blue" /><strong>Quantum Initium</strong><span>Strategy</span></div><div className="graph-node node-two"><span className="graph-node-dot amber" /><strong>Build once, reuse</strong><span>Principles</span></div><div className="graph-node node-three"><span className="graph-node-dot mint" /><strong>AI-native rhythm</strong><span>Systems</span></div></div><div className="graph-footer"><span><Network size={15} /> 4 notes in this view</span><span><span className="legend-dot" /> Ideas <span className="legend-dot blue-dot" /> Projects <span className="legend-dot mint-dot" /> Systems</span></div></section>;
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, index)).toFixed(index ? 1 : 0)} ${units[index]}`;
}

export default App;
