import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive, ChevronDown, ChevronRight, File, FilePlus2, Folder, FolderPlus, Hash, LayoutGrid, Link2,
  LogOut, Menu, Moon, Network, Paperclip, Plus, Search, Settings2, Sparkles, Sun, X,
} from "lucide-react";
import { supabase } from "./lib/supabase";

type Theme = "light" | "dark";
type FolderItem = { id: string; name: string; parentId: string | null; color: string };
type Attachment = { id: string; name: string; size: string; storagePath?: string; mimeType?: string; file?: File };
type Note = {
  id: string; title: string; body: string; updated: string; folderId: string;
  tags: string[]; favorite?: boolean; attachments: Attachment[];
};

const initialFolders: FolderItem[] = [
  { id: "ideas", name: "Ideas", parentId: null, color: "violet" },
  { id: "projects", name: "Projects", parentId: null, color: "blue" },
  { id: "principles", name: "Principles", parentId: null, color: "amber" },
  { id: "systems", name: "Systems", parentId: null, color: "mint" },
  { id: "quantum", name: "Quantum Initium", parentId: "projects", color: "blue" },
];

const initialNotes: Note[] = [
  {
    id: "thesis", title: "The Knowledge OS thesis",
    body: "The best ideas should not disappear into chat history. They need a home that makes them easy to revisit, connect and turn into something real.\n\nA personal knowledge operating system is the layer between what I notice and what I build. It should make context compound instead of resetting every time a new project starts.\n\nCore principles\n- Capture ideas with almost zero friction.\n- Connect related thoughts automatically and visibly.\n- Keep ownership, history and permissions explicit.\n\nThe value is not in storing more information. It is in making the right context available at the right moment.",
    updated: "Just now", folderId: "ideas", tags: ["vision", "systems"], favorite: true, attachments: [],
  },
  { id: "quantum", title: "Quantum Initium · 2026 direction", body: "Clarify the holding narrative: a portfolio of useful, compounding businesses with a clear operating system.", updated: "Yesterday", folderId: "quantum", tags: ["quantum", "strategy"], attachments: [] },
  { id: "reuse", title: "Build once, reuse everywhere", body: "Product decisions that should become shared patterns across the portfolio instead of one-off features.", updated: "Sep 27", folderId: "principles", tags: ["leverage", "product"], attachments: [] },
  { id: "rhythm", title: "AI-native operating rhythm", body: "A weekly loop for capturing signal, choosing priorities, and converting context into focused execution.", updated: "Sep 25", folderId: "systems", tags: ["ai", "workflow"], attachments: [] },
];

function mapNotes(rows: Array<{ id: string; title: string; body: string; folder_id: string | null; tags: string[]; favorite: boolean; updated_at: string }>, attachmentRows: Array<{ id: string; note_id: string; storage_path: string; file_name: string; mime_type: string | null; file_size: number | null }>): Note[] {
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    updated: new Date(row.updated_at).toLocaleDateString(),
    folderId: row.folder_id || "",
    tags: row.tags || [],
    favorite: row.favorite,
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

function App() {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("knowledge-os-theme") as Theme) || "light");
  const [folders, setFolders] = useState<FolderItem[]>(supabase ? [] : initialFolders);
  const [notes, setNotes] = useState<Note[]>(supabase ? [] : initialNotes);
  const [activeNoteId, setActiveNoteId] = useState(initialNotes[0].id);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [workspaceView, setWorkspaceView] = useState<"notes" | "graph">("notes");
  const [mobileNav, setMobileNav] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ projects: true });
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [sessionReady, setSessionReady] = useState(!supabase);
  const [authenticated, setAuthenticated] = useState(!supabase);
  const [workspaceReady, setWorkspaceReady] = useState(!supabase);
  const [saved, setSaved] = useState(true);
  const [saveError, setSaveError] = useState("");
  const [authError, setAuthError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadWorkspace = async (currentUserId: string) => {
    if (!supabase) return;
    setWorkspaceReady(false);
    setSaveError("");
    const [folderResult, noteResult, attachmentResult] = await Promise.all([
      supabase.from("folders").select("id,name,parent_id,color").eq("user_id", currentUserId).order("created_at"),
      supabase.from("notes").select("id,title,body,folder_id,tags,favorite,updated_at").eq("user_id", currentUserId).order("updated_at", { ascending: false }),
      supabase.from("attachments").select("id,note_id,storage_path,file_name,mime_type,file_size").eq("user_id", currentUserId).order("created_at"),
    ]);
    const firstError = folderResult.error || noteResult.error || attachmentResult.error;
    if (firstError) {
      setSaveError(firstError.message);
      setWorkspaceReady(true);
      return;
    }
    let nextFolders = (folderResult.data || []).map((folder) => ({
      id: folder.id,
      name: folder.name,
      parentId: folder.parent_id,
      color: folder.color,
    }));
    let nextNotes = mapNotes(noteResult.data || [], attachmentResult.data || []);
    if (!nextFolders.length && !nextNotes.length) {
      const folderIds = new Map(initialFolders.map((folder) => [folder.id, crypto.randomUUID()]));
      nextFolders = initialFolders.map((folder) => ({ ...folder, id: folderIds.get(folder.id) || folder.id, parentId: folder.parentId ? folderIds.get(folder.parentId) || null : null }));
      nextNotes = initialNotes.map((note) => ({ ...note, id: crypto.randomUUID(), folderId: folderIds.get(note.folderId) || nextFolders[0].id }));
      const foldersToInsert = nextFolders.map((folder) => ({ id: folder.id, user_id: currentUserId, name: folder.name, parent_id: folder.parentId, color: folder.color }));
      const notesToInsert = nextNotes.map((note) => ({ id: note.id, user_id: currentUserId, folder_id: note.folderId, title: note.title, body: note.body, tags: note.tags, favorite: note.favorite || false }));
      const [foldersInsert, notesInsert] = await Promise.all([
        supabase.from("folders").insert(foldersToInsert),
        supabase.from("notes").insert(notesToInsert),
      ]);
      const seedError = foldersInsert.error || notesInsert.error;
      if (seedError) {
        setSaveError(seedError.message);
        setWorkspaceReady(true);
        return;
      }
    }
    setFolders(nextFolders);
    setNotes(nextNotes);
    setActiveNoteId(nextNotes[0]?.id || "");
    setWorkspaceReady(true);
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
    if (!supabase) return;
    const client = supabase;
    const loadSession = async () => {
      const { data } = await client.auth.getSession();
      const hasAccess = data.session ? await verifyAccess(data.session.user.id) : false;
      setAuthenticated(Boolean(data.session && hasAccess));
      setUserId(data.session && hasAccess ? data.session.user.id : null);
      setSessionReady(true);
      if (data.session && hasAccess) await loadWorkspace(data.session.user.id);
    };
    void loadSession();
    const { data: listener } = client.auth.onAuthStateChange(async (_event, nextSession) => {
      setSessionReady(true);
      const hasAccess = nextSession ? await verifyAccess(nextSession.user.id) : false;
      setAuthenticated(Boolean(nextSession && hasAccess));
      setUserId(nextSession && hasAccess ? nextSession.user.id : null);
      if (nextSession && hasAccess) await loadWorkspace(nextSession.user.id);
      else {
        setFolders([]);
        setNotes([]);
        setWorkspaceReady(true);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const activeNote = notes.find((note) => note.id === activeNoteId) || notes[0];
  const folderMap = useMemo(() => new Map(folders.map((folder) => [folder.id, folder])), [folders]);
  const filteredNotes = useMemo(() => {
    const query = search.toLowerCase().trim();
    return notes.filter((note) => {
      const inFolder = !activeFolderId || isDescendantFolder(note.folderId, activeFolderId, folderMap);
      const matches = !query || `${note.title} ${note.body} ${note.tags.join(" ")}`.toLowerCase().includes(query);
      return inFolder && matches;
    });
  }, [activeFolderId, folderMap, notes, search]);

  const updateNote = async (changes: Partial<Note>) => {
    if (!activeNote) return;
    setSaved(false);
    setSaveError("");
    setNotes((current) => current.map((note) => note.id === activeNote.id ? { ...note, ...changes, updated: "Just now" } : note));
    if (!supabase || !userId) return;
    const { error } = await supabase.from("notes").update({
      title: changes.title,
      body: changes.body,
      tags: changes.tags,
      favorite: changes.favorite,
      folder_id: changes.folderId,
      updated_at: new Date().toISOString(),
    }).eq("id", activeNote.id).eq("user_id", userId);
    if (error) {
      setSaveError(error.message);
      return;
    }
    setSaved(true);
  };

  const createNote = async () => {
    const folderId = activeFolderId || folders[0]?.id || null;
    const note: Note = { id: crypto.randomUUID(), title: "Untitled note", body: "", updated: "Just now", folderId: folderId || "", tags: [], attachments: [] };
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

  const createFolder = async () => {
    const name = window.prompt("Naam van de nieuwe map");
    if (!name?.trim()) return;
    const parentId = activeFolderId || null;
    const folder: FolderItem = { id: crypto.randomUUID(), name: name.trim(), parentId, color: "violet" };
    if (supabase && userId) {
      const { error } = await supabase.from("folders").insert({
        id: folder.id,
        user_id: userId,
        name: folder.name,
        parent_id: folder.parentId,
        color: folder.color,
      });
      if (error) {
        setSaveError(error.message);
        return;
      }
    }
    setFolders((current) => [...current, folder]);
    if (parentId) setExpanded((current) => ({ ...current, [parentId]: true }));
    setActiveFolderId(folder.id);
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
        <div className="sidebar-actions"><button onClick={createNote}><FilePlus2 size={15} /> New note</button><button onClick={createFolder}><FolderPlus size={15} /> New folder</button></div>
        <nav className="side-nav" aria-label="Main navigation">
          <NavItem icon={<LayoutGrid size={16} />} label="All notes" active={workspaceView === "notes" && !activeFolderId} onClick={() => { setActiveFolderId(null); setWorkspaceView("notes"); }} count={String(notes.length)} />
          <NavItem icon={<Archive size={16} />} label="Recently edited" onClick={() => setWorkspaceView("notes")} />
          <div className="nav-label">Folders</div>
          {folders.filter((folder) => !folder.parentId).map((folder) => <FolderTree key={folder.id} folder={folder} folders={folders} activeFolderId={activeFolderId} expanded={expanded} onToggle={(id) => setExpanded((current) => ({ ...current, [id]: !current[id] }))} onSelect={(id) => { setActiveFolderId(id); setWorkspaceView("notes"); }} />)}
          <div className="nav-label">Explore</div>
          <NavItem icon={<Network size={16} />} label="Knowledge graph" active={workspaceView === "graph"} onClick={() => setWorkspaceView("graph")} />
          <NavItem icon={<Hash size={16} />} label="Tags" />
        </nav>
        <div className="sidebar-bottom"><div className="sync-card"><Sparkles size={15} /><div><strong>Private by design</strong><span>Sync with your own vault.</span></div></div><NavItem icon={<Settings2 size={16} />} label="Settings" /><div className="profile-row"><span className="avatar avatar-large">JD</span><span><strong>Jamal Drenthe</strong><small>Owner</small></span><button className="profile-login" onClick={() => void handleSignOut()} aria-label="Log out"><LogOut size={15} /></button></div></div>
      </aside>

      <section className="workspace">
        <header className="topbar"><button className="icon-button menu-button" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={19} /></button><div className="breadcrumbs"><span>Personal vault</span><span className="crumb-separator">/</span><strong>{activeFolderId ? folderMap.get(activeFolderId)?.name : "All notes"}</strong></div><div className="topbar-actions"><div className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your vault..." /><kbd>⌘ K</kbd></div><button className="icon-button theme-toggle" onClick={() => setTheme(theme === "light" ? "dark" : "light")} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>{theme === "light" ? <Moon size={17} /> : <Sun size={17} />}</button><button className="new-note-button" onClick={createNote}><Plus size={17} /> New note</button></div></header>

        {workspaceView === "graph" ? <GraphView /> : <div className="content-grid">
          <section className="notes-panel"><div className="panel-heading"><div><p className="eyebrow">Your knowledge base</p><h1>{activeFolderId ? folderMap.get(activeFolderId)?.name : "All notes"}</h1></div><button className="view-toggle" aria-label="Grid view"><LayoutGrid size={16} /></button></div><div className="notes-meta"><span>{filteredNotes.length} notes</span><button onClick={() => setNotes((current) => [...current].sort((a, b) => a.title.localeCompare(b.title)))}>A–Z <ChevronDown size={13} /></button></div><div className="note-list">{filteredNotes.map((note) => <button className={`note-card ${activeNote.id === note.id ? "selected" : ""}`} key={note.id} onClick={() => setActiveNoteId(note.id)}><span className={`note-dot ${folderMap.get(note.folderId)?.color || "violet"}`} /><span className="note-card-body"><strong>{note.title}</strong><span>{note.body.split("\n")[0] || "Empty note"}</span><small>{note.updated} <i /> {note.tags.map((tag) => `#${tag}`).join("  ")}</small></span>{note.favorite && <span className="favorite-star">✦</span>}</button>)}{!filteredNotes.length && <div className="empty-state"><Search size={22} /><strong>No notes found</strong><span>Try another search or folder.</span></div>}</div><button className="load-more" onClick={createNote}><Plus size={14} /> Create a note</button></section>

          <article className="editor-panel"><div className="editor-toolbar"><div className={`status-pill ${saved ? "is-saved" : ""}`}><span /> {saveError || (saved ? "Saved" : "Saving…")}</div><div className="editor-actions"><button className="icon-button" onClick={() => fileInputRef.current?.click()} aria-label="Add attachment"><Paperclip size={17} /></button><button className="icon-button" aria-label="Link note"><Link2 size={17} /></button></div></div><div className="editor-content"><div className="editor-kicker"><span className={`note-dot ${folderMap.get(activeNote.folderId)?.color || "violet"}`} /> {folderMap.get(activeNote.folderId)?.name || "Notes"} <span>·</span> {activeNote.updated}</div><input className="title-input" value={activeNote.title} onChange={(event) => void updateNote({ title: event.target.value })} aria-label="Note title" /><div className="editor-tags">{activeNote.tags.map((tag) => <span key={tag}><Hash size={13} />{tag}</span>)}</div><textarea className="note-editor" value={activeNote.body} onChange={(event) => void updateNote({ body: event.target.value })} placeholder="Start writing your note..." aria-label="Note content" />{!!activeNote.attachments.length && <div className="attachments"><div className="section-title"><Paperclip size={15} /> Attachments <span>{activeNote.attachments.length}</span></div>{activeNote.attachments.map((attachment) => <div className="attachment-row" key={attachment.id}><button className="attachment-open" onClick={() => void openAttachment(attachment)}><File size={15} /><span>{attachment.name}<small>{attachment.size}</small></span></button><button aria-label={`Remove ${attachment.name}`} onClick={() => void removeAttachment(attachment)}><X size={14} /></button></div>)}</div>}<div className="linked-section"><div className="section-title"><Link2 size={15} /> Linked notes <span>3</span></div>{["AI-native operating rhythm", "Build once, reuse everywhere", "Quantum Initium · 2026 direction"].map((note) => <button key={note}><File size={15} />{note}<ChevronRight size={14} /></button>)}</div></div><footer className="editor-footer"><span>Markdown</span><span>{activeNote.body.split(/\s+/).filter(Boolean).length} words</span><span>Private</span></footer><input ref={fileInputRef} className="visually-hidden" type="file" multiple onChange={addAttachments} /></article>
        </div>}
      </section>
      {showAuth && <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setShowAuth(false)} onSubmit={handleEmailAuth} onGoogle={handleGoogleAuth} />}
    </main>
  );
}

function FolderTree({ folder, folders, activeFolderId, expanded, onToggle, onSelect }: { folder: FolderItem; folders: FolderItem[]; activeFolderId: string | null; expanded: Record<string, boolean>; onToggle: (id: string) => void; onSelect: (id: string) => void }) {
  const children = folders.filter((item) => item.parentId === folder.id);
  return <div className="folder-tree"><button className={`nav-item folder-item ${activeFolderId === folder.id ? "active" : ""}`} onClick={() => onSelect(folder.id)}><span>{children.length ? <span className="tree-toggle" onClick={(event) => { event.stopPropagation(); onToggle(folder.id); }}>{expanded[folder.id] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</span> : <span className="tree-spacer" />}<Folder size={16} />{folder.name}</span><small>{children.length || ""}</small></button>{expanded[folder.id] && children.map((child) => <div className="nested-folder" key={child.id}><FolderTree folder={child} folders={folders} activeFolderId={activeFolderId} expanded={expanded} onToggle={onToggle} onSelect={onSelect} /></div>)}</div>;
}

function AuthModal({ mode, setMode, onClose, onSubmit, onGoogle, error, locked = false }: { mode: "login" | "register"; setMode: (mode: "login" | "register") => void; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>, email: string, password: string) => void; onGoogle: () => void; error?: string; locked?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return <div className={`modal-backdrop ${locked ? "auth-locked" : ""}`} role="presentation" onMouseDown={locked ? undefined : onClose}><section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" onMouseDown={(event) => event.stopPropagation()}>{!locked && <button className="modal-close" onClick={onClose} aria-label="Close"><X size={17} /></button>}<div className="auth-icon"><Sparkles size={19} /></div><p className="eyebrow">Private workspace</p><h2 id="auth-title">Welcome back</h2><p className="auth-copy">This workspace is currently limited to the owner account.</p>{error && <p className="auth-error" role="alert">{error}</p>}<button className="google-button" onClick={onGoogle}><span>G</span> Continue with Google</button><div className="auth-divider"><span>or use email</span></div><form onSubmit={(event) => onSubmit(event, email, password)}><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" minLength={8} required /></label><button className="new-note-button auth-submit" type="submit">Log in</button></form></section></div>;
}

function NavItem({ icon, label, count, active, onClick }: { icon: React.ReactNode; label: string; count?: string; active?: boolean; onClick?: () => void }) {
  return <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}><span>{icon}{label}</span>{count && <small>{count}</small>}</button>;
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
