import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './Icon';
import { Button, Chip, Demo, ProductImage, StatusTag, personName } from './ui';
import { useApp, voteCount } from '../state/AppState';
import { byId, urlOf, type Product } from '../data/mock';

export function VoteControl({ p }: { p: Product }) {
  const { votes, vote, requireAuth } = useApp(); const v = votes[p.id] ?? null;
  return (
    <div className="vote" aria-label="Votar esta versión">
      <button aria-pressed={v === 'up'} className={v === 'up' ? 'on' : ''} onClick={() => requireAuth('votar esta versión', () => vote(p.id, 'up'))} aria-label="Upvote"><Icon name="up" size={18} /></button>
      <span className="vote-n">{voteCount(p, v)}</span>
      <button aria-pressed={v === 'down'} className={v === 'down' ? 'on' : ''} onClick={() => requireAuth('votar esta versión', () => vote(p.id, 'down'))} aria-label="Downvote"><Icon name="down" size={18} /></button>
    </div>
  );
}
export function FollowButton({ p }: { p: Product }) {
  const { follows, toggleFollow, requireAuth } = useApp(); const on = !!follows[p.id];
  return <button className={`util${on ? ' on' : ''}`} aria-pressed={on} onClick={() => requireAuth('seguir esta idea', () => toggleFollow(p.id))}><Icon name="bookmark" size={18} />{on ? 'Siguiendo' : 'Seguir'}</button>;
}
export function ShareButton({ p }: { p: Product }) {
  const { showToast } = useApp();
  return <button className="util" onClick={() => { navigator.clipboard?.writeText(location.origin + urlOf(p)).catch(() => {}); showToast('Enlace copiado'); }}><Icon name="share" size={18} />Compartir</button>;
}
export function IdeaCard({ p }: { p: Product }) {
  const { products } = useApp(); const parent = byId(p.parentId); const n = products.filter(x => x.parentId === p.id).length;
  return (
    <article className="card">
      <Link to={urlOf(p)} className="card-link" aria-label={p.title}><ProductImage p={p} /></Link>
      <div className="card-body">
        <div className="card-meta"><span>{p.category}</span><span aria-hidden>·</span><StatusTag status={p.status} /></div>
        {parent && <div className="card-derived"><Icon name="branch" size={14} />Derivado de {parent.title}</div>}
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
  return <ul className="tree" aria-label="Árbol de versiones">{render(root, 0)}</ul>;
}
// Precio esperado + intención de compra opcional, separados de voto y seguimiento
export function PurchaseInterestForm({ p }: { p: Product }) {
  const { interest, setInterest, requireAuth, showToast } = useApp(); const cur = interest[p.id];
  const [price, setPrice] = useState(cur?.price ?? ''); const [intent, setIntent] = useState(cur?.intent ?? '');
  return (
    <div className="panel">
      <h3>¿Lo comprarías?</h3>
      <p className="muted small">Opcional y distinto de votar o seguir. Solo se comparte de forma agregada.</p>
      <p className="label">Rango de precio que esperarías</p>
      <div className="chips">{['< $25', '$25–40', '$40–60', '> $60'].map(x => <Chip key={x} on={price === x} onClick={() => setPrice(x)}>{x}</Chip>)}</div>
      <p className="label">Intención de compra (opcional)</p>
      <div className="chips">{['Sí, probablemente', 'Tal vez', 'No por ahora'].map(x => <Chip key={x} on={intent === x} onClick={() => setIntent(intent === x ? '' : x)}>{x}</Chip>)}</div>
      <Button variant="secondary" disabled={!price} onClick={() => requireAuth('guardar tu interés', () => { setInterest(p.id, { price, intent }); showToast('Interés guardado'); })}>{cur ? 'Actualizar interés' : 'Guardar interés'}</Button>
    </div>
  );
}
export function MinRoyaltyForm({ p }: { p: Product }) {
  const { minRoyalty, setMinRoyalty, requireAuth, showToast } = useApp(); const [v, setV] = useState(minRoyalty[p.id] ?? '');
  return (
    <div className="panel">
      <h3>Tu propuesta mínima de regalía <span className="private">Privada</span></h3>
      <p className="muted small">Solo la ven tú y la tienda que haga una propuesta. No es un pago garantizado.</p>
      <label className="field"><span>Mínimo por unidad (USD)</span><input inputMode="decimal" value={v} onChange={e => setV(e.target.value)} placeholder="Ej. 1.50" /></label>
      <Button variant="secondary" disabled={!v} onClick={() => requireAuth('guardar tu propuesta', () => { setMinRoyalty(p.id, v); showToast('Propuesta privada guardada'); })}>Guardar</Button>
    </div>
  );
}
export { StatusTag };
