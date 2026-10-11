import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../state/AppState';
import { interest as agg, PRIVACY_MIN, rootOf, urlOf, proposal } from '../data/mock';
import { Bar, Button, Demo, DerivedFrom, Empty, ProductImage, StatusTag, Tabs, personName } from '../components/ui';
import { FollowButton, MinRoyaltyForm, PurchaseInterestForm, ShareButton, VersionTree, VoteControl } from '../components/social';
import { Comments } from '../components/Comments';
import { Icon } from '../components/Icon';
import { ApiConversation, ApiCoauthors, ApiProposals, ApiRelease, LiveTag } from '../components/ApiPanels';

type T = 'conversacion' | 'versiones' | 'interes' | 'tiendas';
export default function Detail() {
  const { slug, vslug } = useParams(); const [sp, setSp] = useSearchParams(); const nav = useNavigate();
  const { products, requireAuth, drafts } = useApp();
  const p = products.find(x => x.slug === (vslug ?? slug));
  const [tab, setTab] = useState<T>((sp.get('tab') as T) || 'conversacion');
  useEffect(() => { setTab((sp.get('tab') as T) || 'conversacion'); }, [sp, p?.id]);
  if (!p) return <div className="page"><Empty icon="alert" title="Esta idea no existe o fue retirada" action={<Link className="btn btn-secondary" to="/explorar">Volver a Explorar</Link>} /></div>;
  const root = rootOf(p); const a = agg[p.id]; const launched = drafts.find(d => d.productId === p.id && d.launched) || (p.status === 'Lanzado');
  const change = (t: T) => { setTab(t); setSp(t === 'conversacion' ? {} : { tab: t }, { replace: true }); };
  return (
    <div className="page detail">
      <Link to="/explorar" className="back"><Icon name="back" size={18} />Explorar</Link>
      <div className="detail-grid">
        <div className="detail-media"><ProductImage p={p} ratio="1/1" /></div>
        <div className="detail-content">
          {p.parentId && <DerivedFrom p={p} />}
          <div className="detail-meta"><span>{p.category}</span><span aria-hidden>·</span><span>{p.parentId ? 'Versión' : 'Original'}</span><StatusTag status={p.status} /></div>
          <h1 className="detail-title">{p.title}</h1>
          <p className="muted">por {personName(p.author)} {p.source === 'api' ? <LiveTag /> : <Demo />}</p>
          <div className="utility-row"><VoteControl p={p} /><FollowButton p={p} /><ShareButton p={p} /></div>
          <p className="tiny muted">Los votos son de esta versión y no se suman con otras. Votar indica interés, no una compra.</p>
          <Button block onClick={() => requireAuth('crear tu versión de esta idea', () => nav(`/crear-version/${p.slug}`))}><Icon name="branch" size={18} />Crear versión</Button>
          <section className="facts">
            {p.reason && <div><h2>Qué cambia</h2><p>{p.change} <span className="muted">Motivo: {p.reason}</span></p></div>}
            <div><h2>Necesidad</h2><p>{p.need}</p></div>
            <div><h2>Descripción</h2><p>{p.description}</p></div>
            <div><h2>Contexto de uso</h2><p>{p.usage}</p></div>
            <div><h2>Características</h2><ul className="features">{p.features.map(f => <li key={f}>{f}</li>)}</ul></div>
          </section>
        </div>
      </div>
      <Tabs<T> value={tab} onChange={change} items={[{ id: 'conversacion', label: 'Conversación' }, { id: 'versiones', label: 'Versiones' }, { id: 'interes', label: 'Interés' }, { id: 'tiendas', label: 'Tiendas' }]} />
      <div className="tab-panel">
        {tab === 'conversacion' && p.source === 'api' && <ApiConversation p={p} />}
        {tab === 'conversacion' && p.source !== 'api' && <Comments p={p} initialPin={sp.get('pin') ? Number(sp.get('pin')) : undefined} />}
        {tab === 'versiones' && <div className="stack"><VersionTree root={root} current={p.id} />{p.source === 'api' && <><ApiProposals p={p} /><ApiCoauthors p={p} /></>}<Button variant="secondary" onClick={() => requireAuth('crear tu versión', () => nav(`/crear-version/${p.slug}`))}>Proponer otra versión</Button></div>}
        {tab === 'interes' && (
          <div className="two-col">
            <div className="panel">
              <h3>Interés de la comunidad</h3>
              <p className="muted small">Personas únicas y respuestas voluntarias agregadas. No es demanda comercial comprobada.</p>
              <div className="kpis"><div><strong>{a?.unique ?? 0}</strong><span>personas con interés</span></div><div><strong>{a?.responses ?? 0}</strong><span>respuestas voluntarias</span></div></div>
              {a && a.responses >= PRIVACY_MIN ? a.price.map(x => <Bar key={x.label} {...x} />) : <p className="small muted">Aún hay pocas respuestas para mostrar un desglose (mínimo {PRIVACY_MIN}).</p>}
              <Demo>Datos Demo</Demo>
            </div>
            <div className="stack"><PurchaseInterestForm p={p} /><MinRoyaltyForm p={p} /></div>
          </div>
        )}
        {tab === 'tiendas' && p.source === 'api' && <ApiRelease p={p} />}
        {tab === 'tiendas' && p.source !== 'api' && (launched
          ? <div className="panel store"><Icon name="store" /><div><h3>{proposal.merchant}</h3><p className="muted">Bolso de bici con compartimento para botella · lanzamiento confirmado</p></div><a className="btn btn-secondary" href="#" onClick={e => e.preventDefault()}>Visitar tienda (Demo)</a></div>
          : <Empty icon="store" title="Aún no está en ninguna tienda" text="Cuando una tienda confirme el lanzamiento lo verás aquí. Sigue la idea para enterarte." />)}
      </div>
      <p className="tiny muted">URL de esta {p.parentId ? 'versión' : 'idea'}: {urlOf(p)}</p>
    </div>
  );
}
