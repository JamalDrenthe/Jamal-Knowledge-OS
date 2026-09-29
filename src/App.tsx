import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive, ChevronDown, ChevronRight, File, FilePlus2, Folder, FolderPlus, Hash, LayoutGrid, Link2,
  LogIn, Menu, Moon, Network, Paperclip, Plus, Search, Settings2, Sparkles, Sun, X,
} from "lucide-react";
import { supabase } from "./lib/supabase";

type Theme = "light" | "dark";
type FolderItem = { id: string; name: string; parentId: string | null; color: string };
type Attachment = { id: string; name: string; size: string };
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

function App() {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("knowledge-os-theme") as Theme) || "light");
  const [folders, setFolders] = useState(initialFolders);
  const [notes, setNotes] = useState(initialNotes);
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
  const [saved, setSaved] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("knowledge-os-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setAuthenticated(Boolean(data.session));
      setSessionReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setAuthenticated(Boolean(nextSession));
      setSessionReady(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const activeNote = notes.find((note) => note.id === activeNoteId) || notes[0];
  const folderMap = useMemo(() => new Map(folders.map((folder) => [folder.id, folder])), [folders]);
  const filteredNotes = useMemo(() => {
    const query = search.toLowerCase().trim();
    return notes.filter((note) => {
      const parent = folderMap.get(note.folderId)?.parentId;
      const inFolder = !activeFolderId || note.folderId === activeFolderId || parent === activeFolderId;
      const matches = !query || `${note.title} ${note.body} ${note.tags.join(" ")}`.toLowerCase().includes(query);
      return inFolder && matches;
    });
  }, [activeFolderId, folderMap, notes, search]);

  const updateNote = (changes: Partial<Note>) => {
    setSaved(false);
    setNotes((current) => current.map((note) => note.id === activeNote.id ? { ...note, ...changes, updated: "Just now" } : note));
  };

  const createNote = () => {
    const note: Note = { id: crypto.randomUUID(), title: "Untitled note", body: "", updated: "Just now", folderId: activeFolderId || folders[0].id, tags: [], attachments: [] };
    setNotes((current) => [note, ...current]);
    setActiveNoteId(note.id);
    setWorkspaceView("notes");
    setSaved(false);
  };

  const createFolder = () => {
    const name = window.prompt("Naam van de nieuwe map");
    if (!name?.trim()) return;
    const parentId = activeFolderId || null;
    const folder: FolderItem = { id: crypto.randomUUID(), name: name.trim(), parentId, color: "violet" };
    setFolders((current) => [...current, folder]);
    if (parentId) setExpanded((current) => ({ ...current, [parentId]: true }));
    setActiveFolderId(folder.id);
  };

  const addAttachments = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    updateNote({ attachments: [...activeNote.attachments, ...files.map((file) => ({ id: crypto.randomUUID(), name: file.name, size: formatBytes(file.size) }))] });
    event.target.value = "";
  };

  const handleEmailAuth = async (event: FormEvent<HTMLFormElement>, email: string, password: string) => {
    event.preventDefault();
    if (!supabase) {
      setShowAuth(false);
      return;
    }
    const result = authMode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    if (!result.error) setShowAuth(false);
  };

  const handleGoogleAuth = async () => {
    if (!supabase) {
      setShowAuth(false);
      return;
    }
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
  };

  if (!sessionReady) return <main className="loading-screen">Loading your private vault…</main>;
  if (!authenticated) return <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => undefined} onSubmit={handleEmailAuth} onGoogle={handleGoogleAuth} locked />;

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
        <div className="sidebar-bottom"><div className="sync-card"><Sparkles size={15} /><div><strong>Private by design</strong><span>Sync with your own vault.</span></div></div><NavItem icon={<Settings2 size={16} />} label="Settings" /><div className="profile-row"><span className="avatar avatar-large">JD</span><span><strong>Jamal Drenthe</strong><small>Owner</small></span><button className="profile-login" onClick={() => setShowAuth(true)}><LogIn size={15} /></button></div></div>
      </aside>

      <section className="workspace">
        <header className="topbar"><button className="icon-button menu-button" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={19} /></button><div className="breadcrumbs"><span>Personal vault</span><span className="crumb-separator">/</span><strong>{activeFolderId ? folderMap.get(activeFolderId)?.name : "All notes"}</strong></div><div className="topbar-actions"><div className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your vault..." /><kbd>⌘ K</kbd></div><button className="icon-button theme-toggle" onClick={() => setTheme(theme === "light" ? "dark" : "light")} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>{theme === "light" ? <Moon size={17} /> : <Sun size={17} />}</button><button className="login-button" onClick={() => setShowAuth(true)}>Log in</button><button className="new-note-button" onClick={createNote}><Plus size={17} /> New note</button></div></header>

        {workspaceView === "graph" ? <GraphView /> : <div className="content-grid">
          <section className="notes-panel"><div className="panel-heading"><div><p className="eyebrow">Your knowledge base</p><h1>{activeFolderId ? folderMap.get(activeFolderId)?.name : "All notes"}</h1></div><button className="view-toggle" aria-label="Grid view"><LayoutGrid size={16} /></button></div><div className="notes-meta"><span>{filteredNotes.length} notes</span><button onClick={() => setNotes((current) => [...current].sort((a, b) => a.title.localeCompare(b.title)))}>A–Z <ChevronDown size={13} /></button></div><div className="note-list">{filteredNotes.map((note) => <button className={`note-card ${activeNote.id === note.id ? "selected" : ""}`} key={note.id} onClick={() => setActiveNoteId(note.id)}><span className={`note-dot ${folderMap.get(note.folderId)?.color || "violet"}`} /><span className="note-card-body"><strong>{note.title}</strong><span>{note.body.split("\n")[0] || "Empty note"}</span><small>{note.updated} <i /> {note.tags.map((tag) => `#${tag}`).join("  ")}</small></span>{note.favorite && <span className="favorite-star">✦</span>}</button>)}{!filteredNotes.length && <div className="empty-state"><Search size={22} /><strong>No notes found</strong><span>Try another search or folder.</span></div>}</div><button className="load-more" onClick={createNote}><Plus size={14} /> Create a note</button></section>

          <article className="editor-panel"><div className="editor-toolbar"><div className={`status-pill ${saved ? "is-saved" : ""}`}><span /> {saved ? "Saved locally" : "Unsaved changes"}</div><div className="editor-actions"><button className="icon-button" onClick={() => fileInputRef.current?.click()} aria-label="Add attachment"><Paperclip size={17} /></button><button className="icon-button" aria-label="Link note"><Link2 size={17} /></button></div></div><div className="editor-content"><div className="editor-kicker"><span className={`note-dot ${folderMap.get(activeNote.folderId)?.color || "violet"}`} /> {folderMap.get(activeNote.folderId)?.name || "Notes"} <span>·</span> {activeNote.updated}</div><input className="title-input" value={activeNote.title} onChange={(event) => updateNote({ title: event.target.value })} aria-label="Note title" /><div className="editor-tags">{activeNote.tags.map((tag) => <span key={tag}><Hash size={13} />{tag}</span>)}</div><textarea className="note-editor" value={activeNote.body} onChange={(event) => updateNote({ body: event.target.value })} placeholder="Start writing your note..." aria-label="Note content" />{!!activeNote.attachments.length && <div className="attachments"><div className="section-title"><Paperclip size={15} /> Attachments <span>{activeNote.attachments.length}</span></div>{activeNote.attachments.map((attachment) => <div className="attachment-row" key={attachment.id}><File size={15} /><span>{attachment.name}<small>{attachment.size}</small></span><button aria-label={`Remove ${attachment.name}`} onClick={() => updateNote({ attachments: activeNote.attachments.filter((item) => item.id !== attachment.id) })}><X size={14} /></button></div>)}</div>}<div className="linked-section"><div className="section-title"><Link2 size={15} /> Linked notes <span>3</span></div>{["AI-native operating rhythm", "Build once, reuse everywhere", "Quantum Initium · 2026 direction"].map((note) => <button key={note}><File size={15} />{note}<ChevronRight size={14} /></button>)}</div></div><footer className="editor-footer"><span>Markdown</span><span>{activeNote.body.split(/\s+/).filter(Boolean).length} words</span><span>Private</span></footer><input ref={fileInputRef} className="visually-hidden" type="file" multiple onChange={addAttachments} /></article>
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

function AuthModal({ mode, setMode, onClose, onSubmit, onGoogle, locked = false }: { mode: "login" | "register"; setMode: (mode: "login" | "register") => void; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>, email: string, password: string) => void; onGoogle: () => void; locked?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return <div className={`modal-backdrop ${locked ? "auth-locked" : ""}`} role="presentation" onMouseDown={locked ? undefined : onClose}><section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" onMouseDown={(event) => event.stopPropagation()}>{!locked && <button className="modal-close" onClick={onClose} aria-label="Close"><X size={17} /></button>}<div className="auth-icon"><Sparkles size={19} /></div><p className="eyebrow">Private workspace</p><h2 id="auth-title">{mode === "login" ? "Welcome back" : "Create your vault"}</h2><p className="auth-copy">Your notes stay yours. Sign in to access your connected knowledge workspace.</p><button className="google-button" onClick={onGoogle}><span>G</span> Continue with Google</button><div className="auth-divider"><span>or use email</span></div><form onSubmit={(event) => onSubmit(event, email, password)}><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" minLength={8} required /></label><button className="new-note-button auth-submit" type="submit">{mode === "login" ? "Log in" : "Register"}</button></form><button className="auth-switch" onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Need an account? Register" : "Already have an account? Log in"}</button></section></div>;
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
