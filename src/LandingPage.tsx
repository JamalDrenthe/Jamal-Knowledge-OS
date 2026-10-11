import { ArrowRight, FolderTree, Link2, Lock, Network, Paperclip, Sparkles, Star, Tags } from "lucide-react";

const features = [
  { icon: <FolderTree size={19} />, title: "Mappen & hiërarchie", text: "Organiseer notities in een eigen mappenboom met nesting, volgorde en bewerkingsmodus." },
  { icon: <Link2 size={19} />, title: "Verbonden ideeën", text: "Notities linken aan elkaar zodat kennis een netwerk vormt in plaats van losse lijsten." },
  { icon: <Network size={19} />, title: "Knowledge graph", text: "Bekijk je hele vault als een visueel netwerk van verbonden notities en thema's." },
  { icon: <Sparkles size={19} />, title: "Direct opslaan", text: "Elke wijziging wordt automatisch en veilig opgeslagen — na verversen staat alles er nog." },
  { icon: <Tags size={19} />, title: "Tags & favorieten", text: "Filter op tags, markeer favorieten en vind alles terug via zoeken en quick actions." },
  { icon: <Paperclip size={19} />, title: "Bijlagen", text: "Voeg bestanden toe aan notities, privé opgeslagen en alleen voor jou toegankelijk." },
];

export default function LandingPage({ onLogin, authError }: { onLogin: () => void; authError?: string | null }) {
  return (
    <main className="landing-shell">
      {authError && <div className="landing-auth-error" role="alert">{authError}</div>}
      <header className="landing-nav">
        <div className="landing-brand">
          <span className="brand-mark"><Sparkles size={16} /></span>
          <span>Knowledge OS</span>
        </div>
        <button className="landing-login" onClick={onLogin}>Inloggen <ArrowRight size={14} /></button>
      </header>

      <section className="landing-hero">
        <div className="landing-badge"><Lock size={12} /> Privé vault — alleen voor jou</div>
        <h1>Eén plek voor<br />al je ideeën.</h1>
        <p>
          Knowledge OS combineert de rust van Apple Notes met de kracht van Obsidian:
          mappen, verbonden notities, tags en een grafiek van je kennis — altijd opgeslagen,
          overal beschikbaar.
        </p>
        <div className="landing-actions">
          <button className="landing-cta" onClick={onLogin}>Open je vault <ArrowRight size={16} /></button>
          <a className="landing-secondary" href="#features">Ontdek de functies</a>
        </div>
      </section>

      <section className="landing-features" id="features">
        {features.map((feature) => (
          <article className="landing-card" key={feature.title}>
            <span className="landing-card-icon">{feature.icon}</span>
            <h3>{feature.title}</h3>
            <p>{feature.text}</p>
          </article>
        ))}
      </section>

      <footer className="landing-footer">
        <span className="avatar">JD</span>
        <span>Knowledge OS — gebouwd voor Jamal Drenthe</span>
        <Star size={13} />
      </footer>
    </main>
  );
}
