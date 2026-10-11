import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './Icon';
import { Button, Chip, Demo, ProductImage, StatusTag, personName } from './ui';
import { useApp, voteCount } from '../state/AppState';
import { byId, urlOf, type Product } from '../data/mock';

export function VoteControl({ p }: { p: Product }) {
  const { votes, vote, requireAuth } = useApp(); const v = votes[p.id] ?? null;
  return (
    <div className="vote" aria-label="Vote for this version">
      <button aria-pressed={v === 'up'} className={v === 'up' ? 'on' : ''} onClick={() => requireAuth('vote for this version', () => vote(p.id, 'up'))} aria-label="Upvote"><Icon name="up" size={18} /></button>
      <span className="vote-n">{voteCount(p, v)}</span>
      <button aria-pressed={v === 'down'} className={v === 'down' ? 'on' : ''} onClick={() => requireAuth('vote for this version', () => vote(p.id, 'down'))} aria-label="Downvote"><Icon name="down" size={18} /></button>
    </div>
  );
}
export function FollowButton({ p }: { p: Product }) {
  const { follows, toggleFollow, requireAuth } = useApp(); const on = !!follows[p.id];
  return <button className={`util${on ? ' on' : ''}`} aria-pressed={on} onClick={() => requireAuth('follow this idea', () => toggleFollow(p.id))}><Icon name="bookmark" size={18} />{on ? 'Following' : 'Follow'}</button>;
}
export function ShareButton({ p }: { p: Product }) {
  const { showToast } = useApp();
  return <button className="util" onClick={() => { navigator.clipboard?.writeText(location.origin + urlOf(p)).catch(() => {}); showToast('Link copied'); }}><Icon name="share" size={18} />Share</button>;
}
export function IdeaCard({ p }: { p: Product }) {
  const { products } = useApp(); const parent = byId(p.parentId); const n = products.filter(x => x.parentId === p.id).length;
  return (
    <article className="card">
      <Link to={urlOf(p)} className="card-link" aria-label={p.title}><ProductImage p={p} /></Link>
      <div className="card-body">
        <div className="card-meta"><span>{p.category}</span><span aria-hidden>·</span><StatusTag status={p.status} /></div>
        {parent && <div className="card-derived"><Icon name="branch" size={14} />Derived from {parent.title}</div>}
        <h3 className="card-title"><Link to={urlOf(p)}>{p.title}</Link></h3>
        <div className="card-foot">
          <span className="muted">{personName(p.author)}</span>
          <span className="card-stats"><span><Icon name="up" size={14} />{p.votes.up - p.votes.down}</span>{!parent && <span><Icon name="branch" size={14} />{n}</span>}{p.source === 'api' ? <span className="demo live">Backend</span> : <Demo />}</span>
        </div>
      </div>
    </article>
  );
}
export function VersionTree({ root, current }: { root: Product; current: string }) {
  const { products } = useApp();
  const render = (p: Product, depth: number): React.ReactNode => (
    <li key={p.id}>
      <Link to={urlOf(p)} className={`tree-node${p.id === current ? ' on' : ''}`} style={{ paddingLeft: depth * 20 }}>
        <Icon name="branch" size={14} /><span className="tree-title">{p.parentId ? p.title : `Original · ${p.title}`}</span><span className="muted">{personName(p.author)} · {p.votes.up - p.votes.down} <Demo /></span>
      </Link>
      <ul>{products.filter(c => c.parentId === p.id).map(c => render(c, depth + 1))}</ul>
    </li>
  );
  return <ul className="tree" aria-label="Version tree">{render(root, 0)}</ul>;
}
// Precio esperado + intención de compra opcional, separados de voto y seguimiento
export function PurchaseInterestForm({ p }: { p: Product }) {
  const { interest, setInterest, requireAuth, showToast } = useApp(); const cur = interest[p.id];
  const [price, setPrice] = useState(cur?.price ?? ''); const [intent, setIntent] = useState(cur?.intent ?? '');
  return (
    <div className="panel">
      <h3>Would you buy it?</h3>
      <p className="muted small">Optional and separate from voting or following. Only shared in aggregate.</p>
      <p className="label">Price range you’d expect</p>
      <div className="chips">{['< $25', '$25–40', '$40–60', '> $60'].map(x => <Chip key={x} on={price === x} onClick={() => setPrice(x)}>{x}</Chip>)}</div>
      <p className="label">Purchase intent (optional)</p>
      <div className="chips">{['Yes, probably', 'Maybe', 'Not for now'].map(x => <Chip key={x} on={intent === x} onClick={() => setIntent(intent === x ? '' : x)}>{x}</Chip>)}</div>
      <Button variant="secondary" disabled={!price} onClick={() => requireAuth('save your interest', () => { setInterest(p.id, { price, intent }); showToast('Interest saved'); })}>{cur ? 'Update interest' : 'Save interest'}</Button>
    </div>
  );
}
export function MinRoyaltyForm({ p }: { p: Product }) {
  const { minRoyalty, setMinRoyalty, requireAuth, showToast } = useApp(); const [v, setV] = useState(minRoyalty[p.id] ?? '');
  return (
    <div className="panel">
      <h3>Your minimum royalty ask <span className="private">Private</span></h3>
      <p className="muted small">Only you and the store making an offer can see it. Not a guaranteed payment.</p>
      <label className="field"><span>Minimum per unit (USD)</span><input inputMode="decimal" value={v} onChange={e => setV(e.target.value)} placeholder="Ej. 1.50" /></label>
      <Button variant="secondary" disabled={!v} onClick={() => requireAuth('save your proposal', () => { setMinRoyalty(p.id, v); showToast('Private proposal saved'); })}>Save</Button>
    </div>
  );
}
export { StatusTag };
