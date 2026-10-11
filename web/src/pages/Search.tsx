import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppState';
import { topics, urlOf } from '../data/mock';
import { Button, Chip, Empty, personName } from '../components/ui';
import { Icon } from '../components/Icon';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
export default function Search() {
  const { products, requireAuth } = useApp(); const nav = useNavigate();
  const [q, setQ] = useState('');
  const res = useMemo(() => { const w = norm(q).split(/\s+/).filter(x => x.length > 2); if (!w.length) return []; return products.map(p => ({ p, s: w.filter(x => norm(p.title + ' ' + p.need + ' ' + p.category + ' ' + p.description).includes(x)).length })).filter(x => x.s).sort((a, b) => b.s - a.s).map(x => x.p); }, [q, products]);
  return (
    <div className="page narrow">
      <header className="page-head"><h1>Search</h1><p className="lede">Before creating, check if someone already thought of it. You can create a version or a new idea.</p></header>
      <label className="search-field"><Icon name="search" /><span className="sr">Search ideas</span><input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="What would you like to exist?" /></label>
      {q.trim().length > 2 && <p className="assist"><Icon name="sparkle" size={16} />The assistant suggests similar ideas and helps you write. It doesn’t certify it can be manufactured.</p>}
      {q.trim().length > 2 && (res.length ? (
        <ul className="results">{res.map(p => (
          <li key={p.id} className="result"><img src={p.image} alt="" /><div><Link to={urlOf(p)} className="result-title">{p.title}</Link><p className="small muted">{p.parentId ? 'Version' : 'Original'} · {personName(p.author)} · {p.category}</p></div>
            <div className="result-actions"><Link to={urlOf(p)} className="btn btn-ghost">Open</Link><Button variant="secondary" onClick={() => requireAuth('create your version', () => nav(`/crear-version/${p.slug}`))}>Create version</Button></div></li>))}</ul>
      ) : <Empty title="No similar ideas found" text={`Nobody has proposed “${q}” yet.`} action={<Button onClick={() => requireAuth('create this idea', () => nav(`/crear?titulo=${encodeURIComponent(q)}`))}>Create this idea</Button>} />)}
      <section className="topics"><h2 className="label">Topics</h2><div className="chips">{topics.map(t => <Chip key={t} onClick={() => setQ(t)}>{t}</Chip>)}</div></section>
      {res.length > 0 && <p className="small">Not what you’re looking for? <button className="link" onClick={() => requireAuth('create an original idea', () => nav(`/crear?titulo=${encodeURIComponent(q)}`))}>Create original idea</button></p>}
    </div>
  );
}
