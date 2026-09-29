import { useMemo, useState } from "react";
import {
  Archive,
  ArrowUpRight,
  Bell,
  BookOpen,
  BrainCircuit,
  ChevronDown,
  FileText,
  Folder,
  Hash,
  LayoutGrid,
  Link2,
  Menu,
  Network,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Star,
  Tag,
  X,
} from "lucide-react";

type Note = {
  id: number;
  title: string;
  excerpt: string;
  updated: string;
  section: string;
  tags: string[];
  color: string;
  favorite?: boolean;
};

const notes: Note[] = [
  {
    id: 1,
    title: "The Knowledge OS thesis",
    excerpt: "A private, connected system for turning scattered ideas into durable decisions and action.",
    updated: "Just now",
    section: "Ideas",
    tags: ["vision", "systems"],
    color: "violet",
    favorite: true,
  },
  {
    id: 2,
    title: "Quantum Initium · 2026 direction",
    excerpt: "Clarify the holding narrative: a portfolio of useful, compounding businesses with a clear operating system.",
    updated: "Yesterday",
    section: "Projects",
    tags: ["quantum", "strategy"],
    color: "blue",
  },
  {
    id: 3,
    title: "Build once, reuse everywhere",
    excerpt: "Product decisions that should become shared patterns across the portfolio instead of one-off features.",
    updated: "Sep 27",
    section: "Principles",
    tags: ["leverage", "product"],
    color: "amber",
  },
  {
    id: 4,
    title: "AI-native operating rhythm",
    excerpt: "A weekly loop for capturing signal, choosing priorities, and converting context into focused execution.",
    updated: "Sep 25",
    section: "Systems",
    tags: ["ai", "workflow"],
    color: "mint",
  },
];

const linkedNotes = ["AI-native operating rhythm", "Build once, reuse everywhere", "Quantum Initium · 2026 direction"];

function App() {
  const [activeNote, setActiveNote] = useState(notes[0]);
  const [search, setSearch] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [activeView, setActiveView] = useState("All notes");

  const filteredNotes = useMemo(() => {
    const query = search.toLowerCase().trim();
    return notes.filter((note) => {
      const matchesQuery =
        !query ||
        note.title.toLowerCase().includes(query) ||
        note.excerpt.toLowerCase().includes(query) ||
        note.tags.some((tag) => tag.includes(query));
      const matchesView = activeView === "All notes" || note.section === activeView;
      return matchesQuery && matchesView;
    });
  }, [activeView, search]);

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileNav ? "is-open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark"><BrainCircuit size={18} /></div>
          <div>
            <div className="brand-name">Knowledge OS</div>
            <div className="brand-subtitle">Jamal&apos;s private vault</div>
          </div>
          <button className="icon-button mobile-close" onClick={() => setMobileNav(false)} aria-label="Close navigation">
            <X size={18} />
          </button>
        </div>

        <button className="vault-switcher">
          <span className="avatar">JD</span>
          <span className="vault-copy"><strong>Personal vault</strong><small>Private workspace</small></span>
          <ChevronDown size={15} />
        </button>

        <nav className="side-nav" aria-label="Main navigation">
          <NavItem icon={<LayoutGrid size={17} />} label="All notes" active={activeView === "All notes"} onClick={() => setActiveView("All notes")} count="24" />
          <NavItem icon={<Star size={17} />} label="Favorites" active={false} />
          <NavItem icon={<Archive size={17} />} label="Recently edited" active={false} />
          <div className="nav-label">Workspace</div>
          <NavItem icon={<Folder size={17} />} label="Ideas" active={activeView === "Ideas"} onClick={() => setActiveView("Ideas")} count="8" />
          <NavItem icon={<Folder size={17} />} label="Projects" active={activeView === "Projects"} onClick={() => setActiveView("Projects")} count="6" />
          <NavItem icon={<Folder size={17} />} label="Principles" active={activeView === "Principles"} onClick={() => setActiveView("Principles")} count="4" />
          <NavItem icon={<Folder size={17} />} label="Systems" active={activeView === "Systems"} onClick={() => setActiveView("Systems")} count="6" />
          <div className="nav-label">Explore</div>
          <NavItem icon={<Network size={17} />} label="Knowledge graph" />
          <NavItem icon={<Tag size={17} />} label="Tags" />
        </nav>

        <div className="sidebar-bottom">
          <div className="sync-card">
            <div className="sync-icon"><Sparkles size={15} /></div>
            <div><strong>Local-first workspace</strong><span>Your ideas stay yours.</span></div>
            <ArrowUpRight size={14} />
          </div>
          <NavItem icon={<Settings2 size={17} />} label="Settings" />
          <div className="profile-row"><span className="avatar avatar-large">JD</span><span><strong>Jamal Drenthe</strong><small>Founder workspace</small></span><MoreDots /></div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={19} /></button>
          <div className="breadcrumbs"><span>Personal vault</span><span className="crumb-separator">/</span><strong>{activeNote.section}</strong></div>
          <div className="topbar-actions">
            <div className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search notes..." /><kbd>⌘ K</kbd></div>
            <button className="icon-button notification-button" aria-label="Notifications"><Bell size={18} /><i /></button>
            <button className="new-note-button"><Plus size={17} /> New note</button>
          </div>
        </header>

        <div className="content-grid">
          <section className="notes-panel">
            <div className="panel-heading">
              <div><p className="eyebrow">Your knowledge base</p><h1>{activeView}</h1></div>
              <button className="view-toggle" aria-label="Change view"><LayoutGrid size={16} /><ChevronDown size={14} /></button>
            </div>
            <div className="notes-meta"><span>{filteredNotes.length} notes</span><button><Archive size={14} /> Sort by updated</button></div>
            <div className="note-list">
              {filteredNotes.map((note) => (
                <button className={`note-card ${activeNote.id === note.id ? "selected" : ""}`} key={note.id} onClick={() => setActiveNote(note)}>
                  <span className={`note-dot ${note.color}`} />
                  <span className="note-card-body"><strong>{note.title}</strong><span>{note.excerpt}</span><small>{note.updated} <i /> {note.tags.map((tag) => `#${tag}`).join("  ")}</small></span>
                  {note.favorite && <Star className="favorite-star" size={15} fill="currentColor" />}
                </button>
              ))}
              {!filteredNotes.length && <div className="empty-state"><Search size={22} /><strong>No notes found</strong><span>Try another search or section.</span></div>}
            </div>
            <button className="load-more">Load more notes <ChevronDown size={14} /></button>
          </section>

          <article className="editor-panel">
            <div className="editor-toolbar"><div className="status-pill"><span /> Saved locally</div><div className="editor-actions"><button className="icon-button" aria-label="Link note"><Link2 size={17} /></button><button className="icon-button" aria-label="More options"><MoreDots /></button></div></div>
            <div className="editor-content">
              <div className="editor-kicker"><span className={`note-dot ${activeNote.color}`} /> {activeNote.section} <span>·</span> Updated {activeNote.updated.toLowerCase()}</div>
              <h2>{activeNote.title}</h2>
              <div className="editor-tags">{activeNote.tags.map((tag) => <span key={tag}><Hash size={13} />{tag}</span>)}</div>
              <p className="lead-paragraph">The best ideas should not disappear into chat history. They need a home that makes them easy to revisit, connect and turn into something real.</p>
              <p>A personal knowledge operating system is the layer between <mark>what I notice</mark> and <mark>what I build</mark>. It should make context compound instead of resetting every time a new project starts.</p>
              <h3>Core principles</h3>
              <ul><li>Capture ideas with almost zero friction.</li><li>Connect related thoughts automatically and visibly.</li><li>Keep ownership, history and permissions explicit.</li></ul>
              <blockquote>“The value is not in storing more information. It is in making the right context available at the right moment.”</blockquote>
              <h3>Next experiment</h3>
              <p>Build a calm workspace where notes, project context and decisions live together — with AI as an assistant, not as the owner of the vault.</p>
              <div className="linked-section"><div className="section-title"><Link2 size={15} /> Linked notes <span>{linkedNotes.length}</span></div>{linkedNotes.map((note) => <button key={note}><FileText size={15} />{note}<ArrowUpRight size={14} /></button>)}</div>
            </div>
            <footer className="editor-footer"><span><BookOpen size={14} /> Markdown</span><span>1,284 words</span><span>Private</span></footer>
          </article>
        </div>
      </section>
    </main>
  );
}

function NavItem({ icon, label, count, active, onClick }: { icon: React.ReactNode; label: string; count?: string; active?: boolean; onClick?: () => void }) {
  return <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}><span>{icon}{label}</span>{count && <small>{count}</small>}</button>;
}

function MoreDots() {
  return <span className="more-dots"><i /><i /><i /></span>;
}

export default App;
