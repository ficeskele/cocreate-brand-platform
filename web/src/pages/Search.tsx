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
      <header className="page-head"><h1>Buscar</h1><p className="lede">Antes de crear, mira si alguien ya lo pensó. Puedes crear una versión o una idea nueva.</p></header>
      <label className="search-field"><Icon name="search" /><span className="sr">Buscar ideas</span><input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="¿Qué te gustaría que existiera?" /></label>
      {q.trim().length > 2 && <p className="assist"><Icon name="sparkle" size={16} />El asistente sugiere ideas parecidas y te ayuda a redactar. No certifica que se pueda fabricar.</p>}
      {q.trim().length > 2 && (res.length ? (
        <ul className="results">{res.map(p => (
          <li key={p.id} className="result"><img src={p.image} alt="" /><div><Link to={urlOf(p)} className="result-title">{p.title}</Link><p className="small muted">{p.parentId ? 'Versión' : 'Original'} · {personName(p.author)} · {p.category}</p></div>
            <div className="result-actions"><Link to={urlOf(p)} className="btn btn-ghost">Abrir</Link><Button variant="secondary" onClick={() => requireAuth('crear tu versión', () => nav(`/crear-version/${p.slug}`))}>Crear versión</Button></div></li>))}</ul>
      ) : <Empty title="No encontramos ideas parecidas" text={`Nadie ha propuesto “${q}” todavía.`} action={<Button onClick={() => requireAuth('crear esta idea', () => nav(`/crear?titulo=${encodeURIComponent(q)}`))}>Crear esta idea</Button>} />)}
      <section className="topics"><h2 className="label">Temas</h2><div className="chips">{topics.map(t => <Chip key={t} onClick={() => setQ(t)}>{t}</Chip>)}</div></section>
      {res.length > 0 && <p className="small">¿No es lo que buscas? <button className="link" onClick={() => requireAuth('crear una idea original', () => nav(`/crear?titulo=${encodeURIComponent(q)}`))}>Crear idea original</button></p>}
    </div>
  );
}
