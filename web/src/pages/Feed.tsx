import { useMemo, useState } from 'react';
import { useApp } from '../state/AppState';
import { IdeaCard } from '../components/social';
import { Demo, Empty } from '../components/ui';

type Tab = 'recientes' | 'apoyados' | 'originales' | 'versiones';
const tabs: { id: Tab; label: string }[] = [{ id: 'recientes', label: 'Recientes' }, { id: 'apoyados', label: 'Más apoyados' }, { id: 'originales', label: 'Originales' }, { id: 'versiones', label: 'Versiones' }];
export default function Feed({ state }: { state?: 'loading' | 'error' }) {
  const { products, backend } = useApp();
  const [tab, setTab] = useState<Tab>('recientes'); const [cat, setCat] = useState('Todas');
  const cats = ['Todas', ...new Set(products.map(p => p.category))];
  const list = useMemo(() => {
    let l = products.filter(p => cat === 'Todas' || p.category === cat);
    if (tab === 'originales') l = l.filter(p => !p.parentId);
    if (tab === 'versiones') l = l.filter(p => p.parentId);
    return [...l].sort((a, b) => tab === 'apoyados' ? (b.votes.up - b.votes.down) - (a.votes.up - a.votes.down) : b.createdAt.localeCompare(a.createdAt));
  }, [products, tab, cat]);
  return (
    <div className="page">
      <header className="page-head">
        <h1>Explorar</h1>
        <p className="lede">Productos que la comunidad quiere que existan. <Demo>Datos Demo</Demo></p>
        <p className="tiny muted">{backend === 'online' ? 'Conectado al backend: las tarjetas “Backend” son productos reales.' : backend === 'offline' ? 'Backend no disponible: mostrando solo datos Demo.' : 'Conectando con el backend…'}</p>
      </header>
      <div className="feed-controls">
        <nav className="text-tabs" aria-label="Ordenar">{tabs.map(t => <button key={t.id} className={tab === t.id ? 'on' : ''} aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>)}</nav>
        <label className="select"><span className="sr">Categoría</span><select value={cat} onChange={e => setCat(e.target.value)}>{cats.map(c => <option key={c}>{c}</option>)}</select></label>
      </div>
      {state === 'loading' ? <div className="dl-grid">{[0, 1, 2].map(i => <div key={i} className="card skeleton" aria-hidden><div className="sk-img" /><div className="sk-line" /><div className="sk-line short" /></div>)}</div>
        : state === 'error' ? <Empty icon="alert" title="No pudimos cargar las ideas" text="Revisa tu conexión e inténtalo de nuevo." action={<button className="btn btn-secondary" onClick={() => location.reload()}>Reintentar</button>} />
        : list.length === 0 ? <Empty title="Nada por aquí todavía" text="Prueba otra categoría." />
        : <div className="dl-grid">{list.map(p => <IdeaCard key={p.id} p={p} />)}</div>}
    </div>
  );
}
