import { useMemo, useState } from 'react';
import { useApp } from '../state/AppState';
import { IdeaCard } from '../components/social';
import { Demo, Empty } from '../components/ui';

type Tab = 'recent' | 'top' | 'originals' | 'versions';
const tabs: { id: Tab; label: string }[] = [{ id: 'recent', label: 'Recent' }, { id: 'top', label: 'Most supported' }, { id: 'originals', label: 'Originals' }, { id: 'versions', label: 'Versions' }];
export default function Feed({ state }: { state?: 'loading' | 'error' }) {
  const { products, backend } = useApp();
  const [tab, setTab] = useState<Tab>('recent'); const [cat, setCat] = useState('All');
  const cats = ['All', ...new Set(products.map(p => p.category))];
  const list = useMemo(() => {
    let l = products.filter(p => cat === 'All' || p.category === cat);
    if (tab === 'originals') l = l.filter(p => !p.parentId);
    if (tab === 'versions') l = l.filter(p => p.parentId);
    return [...l].sort((a, b) => tab === 'top' ? (b.votes.up - b.votes.down) - (a.votes.up - a.votes.down) : b.createdAt.localeCompare(a.createdAt));
  }, [products, tab, cat]);
  return (
    <div className="page">
      <header className="page-head">
        <h1>Explore</h1>
        <p className="lede">Products the community wants to exist. <Demo>Demo data</Demo></p>
        <p className="tiny muted">{backend === 'online' ? 'Connected to the backend: cards tagged “Backend” are real products.' : backend === 'offline' ? 'Backend unavailable: showing Demo data only.' : 'Connecting to the backend…'}</p>
      </header>
      <div className="feed-controls">
        <nav className="text-tabs" aria-label="Sort">{tabs.map(t => <button key={t.id} className={tab === t.id ? 'on' : ''} aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>)}</nav>
        <label className="select"><span className="sr">Category</span><select value={cat} onChange={e => setCat(e.target.value)}>{cats.map(c => <option key={c}>{c}</option>)}</select></label>
      </div>
      {state === 'loading' ? <div className="grid">{[0, 1, 2].map(i => <div key={i} className="card skeleton" aria-hidden><div className="sk-img" /><div className="sk-line" /><div className="sk-line short" /></div>)}</div>
        : state === 'error' ? <Empty icon="alert" title="We could not load the ideas" text="Check your connection and try again." action={<button className="btn btn-secondary" onClick={() => location.reload()}>Retry</button>} />
        : list.length === 0 ? <Empty title="Nothing here yet" text="Try another category." />
        : <div className="grid">{list.map(p => <IdeaCard key={p.id} p={p} />)}</div>}
    </div>
  );
}
