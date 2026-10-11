import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../state/AppState';
import { notifications, proposal, urlOf } from '../data/mock';
import { Button, Demo, Empty, ProductImage, Tabs, personName } from '../components/ui';
import { IdeaCard } from '../components/social';
import { Icon } from '../components/Icon';

export function Published() {
  const { slug } = useParams(); const { products, showToast } = useApp(); const loc = useLocation();
  const p = products.find(x => x.slug === slug); if (!p) return <Empty title="No encontrada" />;
  const url = (loc.state as { url?: string })?.url ?? urlOf(p);
  return (
    <div className="page narrow center-page">
      <div className="success"><Icon name="check" size={28} /></div>
      <h1>{p.parentId ? 'Tu versión está publicada' : 'Tu idea está publicada'}</h1>
      <p className="lede">Comparte tu {p.parentId ? 'versión' : 'idea'} para reunir apoyo. Los votos del original no se trasladan.</p>
      <ProductImage p={p} ratio="16/9" />
      <div className="share-link"><span>{location.host}{url}</span><button className="link" onClick={() => { navigator.clipboard?.writeText(location.origin + url).catch(() => {}); showToast('Enlace copiado'); }}>Copiar</button></div>
      <div className="row-btns"><Button variant="secondary" onClick={() => showToast('Abriendo WhatsApp (Demo)')}>WhatsApp</Button><Button variant="secondary" onClick={() => showToast('Compartir (Demo)')}>Más opciones</Button></div>
      <Link className="btn btn-primary btn-block" to={url}>Ver {p.parentId ? 'mi versión' : 'mi idea'}</Link>
    </div>
  );
}
type AT = 'ideas' | 'versiones' | 'seguidos' | 'borradores';
export function Aportes() {
  const { products, follows, user, requireAuth } = useApp(); const [t, setT] = useState<AT>('versiones');
  if (!user) return <div className="page narrow"><Empty icon="layers" title="Tus aportes aparecerán aquí" text="Ideas, versiones, lo que sigues y tus borradores." action={<Button onClick={() => requireAuth('ver tus aportes', () => {})}>Crear cuenta</Button>} /></div>;
  const mine = products.filter(p => p.author === 'me');
  const drafts = Object.keys(localStorage).filter(k => k.startsWith('droplab-draft-'));
  const list = t === 'ideas' ? mine.filter(p => !p.parentId) : t === 'versiones' ? mine.filter(p => p.parentId) : t === 'seguidos' ? products.filter(p => follows[p.id]) : [];
  return (
    <div className="page">
      <header className="page-head"><h1>Aportes</h1></header>
      <Tabs<AT> value={t} onChange={setT} items={[{ id: 'ideas', label: 'Mis ideas' }, { id: 'versiones', label: 'Versiones' }, { id: 'seguidos', label: 'Seguidos' }, { id: 'borradores', label: 'Borradores' }]} />
      {t === 'borradores' ? (drafts.length ? <ul className="list">{drafts.map(k => <li key={k} className="list-item"><Icon name="layers" /><span>{k.includes('version') ? 'Versión de ' + k.split('-').slice(3).join('-') : 'Idea nueva'}</span><Link to={k.includes('version') ? `/crear-version/${k.split('-').slice(3).join('-')}` : '/crear'}>Continuar</Link></li>)}</ul> : <Empty title="Sin borradores" text="Se guardan solos mientras escribes." />)
        : list.length ? <div className="grid">{list.map(p => <IdeaCard key={p.id} p={p} />)}</div>
        : <Empty title={t === 'seguidos' ? 'Aún no sigues ninguna idea' : 'Todavía no has publicado'} text={t === 'seguidos' ? 'Seguir es distinto de votar: te avisa de novedades.' : 'Busca una idea y crea tu versión.'} action={<Link className="btn btn-secondary" to="/buscar">Buscar ideas</Link>} />}
    </div>
  );
}
export function Ganancias() {
  const [t, setT] = useState<'regalias' | 'referidos'>('regalias');
  const total = proposal.split.reduce((s, x) => s + x.amount, 0);
  return (
    <div className="page narrow">
      <header className="page-head"><h1>Ganancias</h1><p className="lede">Programa en preparación. Todo lo que ves aquí es ilustrativo. <Demo>Demo · pendiente</Demo></p></header>
      <Tabs value={t} onChange={setT} items={[{ id: 'regalias', label: 'Regalías' }, { id: 'referidos', label: 'Comisiones por referidos' }]} />
      {t === 'regalias' ? <>
        <div className="panel">
          <div className="panel-head"><h3>Propuesta comercial · {proposal.merchant}</h3><span className="status">Pendiente de aprobación</span></div>
          <p className="small muted">Versión con compartimento separado para botella. Ilustrativo: no hay acuerdo firmado ni pagos.</p>
          <dl className="money"><div><dt>Precio de venta</dt><dd>${proposal.retail.toFixed(2)}</dd></div><div><dt>Pool TOTAL de regalías por unidad</dt><dd>${proposal.royaltyPool.toFixed(2)}</dd></div></dl>
          <table className="split"><caption className="sr">Reparto del pool de regalías</caption><thead><tr><th>Contribuidor</th><th>Rol</th><th>Por unidad</th><th>Aprobación</th></tr></thead>
            <tbody>{proposal.split.map(s => { const ap = proposal.approvals.find(a => a.who === s.who)!; return <tr key={s.who}><td>{personName(s.who)}</td><td>{s.role}</td><td>${s.amount.toFixed(2)}</td><td><span className={`appr appr-${ap.state.toLowerCase()}`}>{ap.state}</span></td></tr>; })}</tbody>
            <tfoot><tr><td colSpan={2}>Total repartido</td><td>${total.toFixed(2)}</td><td /></tr></tfoot></table>
          <p className="tiny muted">El pool de $5 es el total para todos los contribuidores, no por persona. Comentar no da derecho a regalías por sí solo.</p>
        </div>
        <div className="panel"><h3>Saldo</h3><p className="big">—</p><p className="small muted">Sin saldo real. Se activará cuando existan ventas verificadas y un acuerdo aprobado.</p></div>
      </> : <div className="panel"><h3>Comisiones por referidos</h3><p className="small muted">Separadas de las regalías: se basarían en ventas que lleguen desde tus enlaces compartidos, no en votos.</p><dl className="money"><div><dt>Clics en tus enlaces</dt><dd>38 <Demo /></dd></div><div><dt>Comisión</dt><dd>Próximamente</dd></div></dl></div>}
    </div>
  );
}
export function Perfil() {
  const { user, mode, setMode, signOut, requireAuth, apiUser, setApiUser, backend } = useApp(); const nav = useNavigate();
  const go = (m: 'consumer' | 'merchant') => requireAuth('cambiar de modo', () => { setMode(m); nav(m === 'merchant' ? '/m' : '/'); });
  return (
    <div className="page narrow">
      <header className="page-head"><h1>Perfil</h1></header>
      {user ? <div className="profile"><span className="avatar lg">{user.name[0]}</span><div><h2>{user.name}</h2><p className="small muted">{user.email}</p></div></div>
        : <Empty icon="user" title="Explora sin cuenta" text="Para votar, comentar o crear necesitas una cuenta." action={<Button onClick={() => requireAuth('ver tu perfil', () => {})}>Crear cuenta</Button>} />}
      <div className="panel"><h3>Modo</h3><div className="segmented" role="radiogroup">{(['consumer', 'merchant'] as const).map(m => <button key={m} role="radio" aria-checked={mode === m} className={mode === m ? 'on' : ''} onClick={() => go(m)}>{m === 'consumer' ? 'Comunidad' : 'Comerciante'}</button>)}</div><p className="small muted">Misma cuenta. El modo comerciante muestra oportunidades con datos agregados.</p></div>
      <div className="panel"><h3>Usuario del backend</h3><p className="small muted">Cabecera X-User-Id enviada a la API ({backend === 'online' ? 'conectada' : 'sin conexión'}).</p><div className="segmented" role="radiogroup">{['u_alice', 'u_bob'].map(u => <button key={u} role="radio" aria-checked={apiUser === u} className={apiUser === u ? 'on' : ''} onClick={() => setApiUser(u)}>{u.slice(2)}</button>)}</div></div>
      <ul className="list">{['Preferencias de notificaciones', 'Privacidad y datos', 'Tiendas conectadas (Demo)'].map(x => <li key={x} className="list-item"><span>{x}</span><Icon name="back" size={16} /></li>)}</ul>
      {user && <Button variant="ghost" onClick={signOut}>Cerrar sesión</Button>}
    </div>
  );
}
export function Notificaciones() {
  return (
    <div className="page narrow">
      <header className="page-head"><h1>Notificaciones</h1></header>
      <ul className="notifs">{notifications.map(n => <li key={n.id} className={n.unread ? 'unread' : ''}><Link to={n.to}><Icon name={n.kind === 'launch' ? 'store' : n.kind === 'comment' ? 'pin' : n.kind === 'proposal' ? 'wallet' : 'up'} /><div><p className="n-title">{n.title}</p><p className="small muted">{n.detail}</p></div>{n.unread && <span className="dot" aria-label="Sin leer" />}</Link></li>)}</ul>
      <p className="tiny muted">Solo avisamos de lanzamientos confirmados por la tienda y si activaste esas alertas. <Demo /></p>
    </div>
  );
}
