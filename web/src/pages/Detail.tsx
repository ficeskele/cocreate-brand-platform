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
  if (!p) return <div className="page"><Empty icon="alert" title="This idea doesn’t exist or was removed" action={<Link className="btn btn-secondary" to="/explore">Back to Explore</Link>} /></div>;
  const root = rootOf(p); const a = agg[p.id]; const launched = drafts.find(d => d.productId === p.id && d.launched) || (p.status === 'Launched');
  const change = (t: T) => { setTab(t); setSp(t === 'conversacion' ? {} : { tab: t }, { replace: true }); };
  return (
    <div className="page detail">
      <Link to="/explore" className="back"><Icon name="back" size={18} />Explore</Link>
      <div className="detail-grid">
        <div className="detail-media"><ProductImage p={p} ratio="1/1" /></div>
        <div className="detail-content">
          {p.parentId && <DerivedFrom p={p} />}
          <div className="detail-meta"><span>{p.category}</span><span aria-hidden>·</span><span>{p.parentId ? 'Version' : 'Original'}</span><StatusTag status={p.status} /></div>
          <h1 className="detail-title">{p.title}</h1>
          <p className="muted">by {personName(p.author)} {p.source === 'api' ? <LiveTag /> : <Demo />}</p>
          <div className="utility-row"><VoteControl p={p} /><FollowButton p={p} /><ShareButton p={p} /></div>
          <p className="tiny muted">Votes belong to this version and don’t add up with others. Voting signals interest, not a purchase.</p>
          <Button block onClick={() => requireAuth('create your version of this idea', () => nav(`/crear-version/${p.slug}`))}><Icon name="branch" size={18} />Create version</Button>
          <section className="facts">
            {p.reason && <div><h2>What changes</h2><p>{p.change} <span className="muted">Reason: {p.reason}</span></p></div>}
            <div><h2>Need</h2><p>{p.need}</p></div>
            <div><h2>Description</h2><p>{p.description}</p></div>
            <div><h2>Usage context</h2><p>{p.usage}</p></div>
            <div><h2>Features</h2><ul className="features">{p.features.map(f => <li key={f}>{f}</li>)}</ul></div>
          </section>
        </div>
      </div>
      <Tabs<T> value={tab} onChange={change} items={[{ id: 'conversacion', label: 'Conversation' }, { id: 'versiones', label: 'Versions' }, { id: 'interes', label: 'Interest' }, { id: 'tiendas', label: 'Stores' }]} />
      <div className="tab-panel">
        {tab === 'conversacion' && p.source === 'api' && <ApiConversation p={p} />}
        {tab === 'conversacion' && p.source !== 'api' && <Comments p={p} initialPin={sp.get('pin') ? Number(sp.get('pin')) : undefined} />}
        {tab === 'versiones' && <div className="stack"><VersionTree root={root} current={p.id} />{p.source === 'api' && <><ApiProposals p={p} /><ApiCoauthors p={p} /></>}<Button variant="secondary" onClick={() => requireAuth('create your version', () => nav(`/crear-version/${p.slug}`))}>Propose another version</Button></div>}
        {tab === 'interes' && (
          <div className="two-col">
            <div className="panel">
              <h3>Community interest</h3>
              <p className="muted small">Unique people and aggregated voluntary answers. Not validated commercial demand.</p>
              <div className="kpis"><div><strong>{a?.unique ?? 0}</strong><span>interested people</span></div><div><strong>{a?.responses ?? 0}</strong><span>voluntary answers</span></div></div>
              {a && a.responses >= PRIVACY_MIN ? a.price.map(x => <Bar key={x.label} {...x} />) : <p className="small muted">Too few answers to show a breakdown (minimum {PRIVACY_MIN}).</p>}
              <Demo>Demo data</Demo>
            </div>
            <div className="stack"><PurchaseInterestForm p={p} /><MinRoyaltyForm p={p} /></div>
          </div>
        )}
        {tab === 'tiendas' && p.source === 'api' && <ApiRelease p={p} />}
        {tab === 'tiendas' && p.source !== 'api' && (launched
          ? <div className="panel store"><Icon name="store" /><div><h3>{proposal.merchant}</h3><p className="muted">Bike bag with bottle compartment · launch confirmed</p></div><a className="btn btn-secondary" href="#" onClick={e => e.preventDefault()}>Visit store (Demo)</a></div>
          : <Empty icon="store" title="Not in any store yet" text="When a store confirms a launch you’ll see it here. Follow the idea to stay posted." />)}
      </div>
      <p className="tiny muted">URL of this {p.parentId ? 'version' : 'idea'}: {urlOf(p)}</p>
    </div>
  );
}
