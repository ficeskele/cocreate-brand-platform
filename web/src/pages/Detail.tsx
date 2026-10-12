import { LiquidMetalButton } from '@/components/ui/liquid-metal-button';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../state/AppState';
import { interest as agg, PRIVACY_MIN, rootOf, urlOf, proposal } from '../data/mock';
import { Bar, Button, Demo, DerivedFrom, Empty, ProductImage, StatusTag, Tabs, personName } from '../components/ui';
import { FollowButton, MinRoyaltyForm, PurchaseInterestForm, ShareButton, VersionTree, VoteControl } from '../components/social';
import { Comments } from '../components/Comments';
import { Icon } from '../components/Icon';
import { ApiConversation, ApiCoauthors, ApiProposals, ApiRelease, LiveTag } from '../components/ApiPanels';
import { RenderStatus } from '../components/RenderStatus';

type T = 'conversation' | 'versions' | 'interest' | 'stores';
export default function Detail() {
  const { slug, vslug } = useParams(); const [sp, setSp] = useSearchParams(); const nav = useNavigate();
  const { products, requireAuth, drafts } = useApp();
  const p = products.find(x => x.slug === (vslug ?? slug));
  const [tab, setTab] = useState<T>((sp.get('tab') as T) || 'conversation');
  const [launchOpen, setLaunchOpen] = useState(false);
  const launchButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { setTab((sp.get('tab') as T) || 'conversation'); }, [sp, p?.id]);
  if (!p) return <div className="page"><Empty icon="alert" title="This idea does not exist or was removed" action={<Link className="btn btn-secondary" to="/explore">Back to Explore</Link>} /></div>;
  const root = rootOf(p); const a = agg[p.id]; const launched = drafts.find(d => d.productId === p.id && d.launched) || (p.status === 'Launched');
  const change = (t: T) => { setTab(t); setSp(t === 'conversation' ? {} : { tab: t }, { replace: true }); };
  return (
    <div className="page detail">
      <Link to="/explore" className="back"><Icon name="back" size={18} />Explore</Link>
      <div className="detail-grid">
        <div className="detail-media">{p.source === 'api' ? <RenderStatus p={p} /> : <ProductImage p={p} ratio="1/1" />}</div>
        <div className="detail-content">
          {p.parentId && <DerivedFrom p={p} />}
          <div className="detail-meta"><span>{p.category}</span><span aria-hidden>·</span><span>{p.parentId ? 'Version' : 'Original'}</span><StatusTag status={p.status} /></div>
          <h1 className="detail-title">{p.title}</h1>
          <p className="muted">by {personName(p.author)} {p.source === 'api' ? <LiveTag /> : <Demo />}</p>
          <div className="utility-row"><VoteControl p={p} /><FollowButton p={p} /><ShareButton p={p} /></div>
          <p className="tiny muted">Votes belong to this version and are not added to others. Voting signals interest, not a purchase.</p>
          <div className="cta-metal"><span className="lm-wrap"><LiquidMetalButton label="Create version" onClick={() => requireAuth('create your version of this idea', () => nav(`/create-version/${p.slug}`))} /></span><button ref={launchButton} type="button" className="btn btn-secondary launch-product-trigger" onClick={() => setLaunchOpen(true)}>Launch as a Product <span aria-hidden="true">→</span></button><span className="small muted">Branch it: your version gets its own votes.</span></div>
          <section className="facts">
            {p.reason && <div><h2>What changes</h2><p>{p.change} <span className="muted">Reason: {p.reason}</span></p></div>}
            <div><h2>Need</h2><p>{p.need}</p></div>
            <div><h2>Description</h2><p>{p.description}</p></div>
            <div><h2>Usage context</h2><p>{p.usage}</p></div>
            <div><h2>Features</h2><ul className="features">{p.features.map(f => <li key={f}>{f}</li>)}</ul></div>
          </section>
        </div>
      </div>
      <Tabs<T> value={tab} onChange={change} items={[{ id: 'conversation', label: 'Conversation' }, { id: 'versions', label: 'Versions' }, { id: 'interest', label: 'Interest' }, { id: 'stores', label: 'Stores' }]} />
      <div className="tab-panel">
        {tab === 'conversation' && p.source === 'api' && <ApiConversation p={p} />}
        {tab === 'conversation' && p.source !== 'api' && <Comments p={p} initialPin={sp.get('pin') ? Number(sp.get('pin')) : undefined} />}
        {tab === 'versions' && <div className="stack"><VersionTree root={root} current={p.id} />{p.source === 'api' && <><ApiProposals p={p} /><ApiCoauthors p={p} /></>}<Button variant="secondary" onClick={() => requireAuth('create your version', () => nav(`/create-version/${p.slug}`))}>Propose another version</Button></div>}
        {tab === 'interest' && (
          <div className="two-col">
            <div className="panel">
              <h3>Community interest</h3>
              <p className="muted small">Unique people and voluntary responses, aggregated. Not proven commercial demand.</p>
              <div className="kpis"><div><strong>{a?.unique ?? 0}</strong><span>interested people</span></div><div><strong>{a?.responses ?? 0}</strong><span>voluntary responses</span></div></div>
              {a && a.responses >= PRIVACY_MIN ? a.price.map(x => <Bar key={x.label} {...x} />) : <p className="small muted">Too few responses to show a breakdown yet (minimum {PRIVACY_MIN}).</p>}
              <Demo>Demo data</Demo>
            </div>
            <div className="stack"><PurchaseInterestForm p={p} /><MinRoyaltyForm p={p} /></div>
          </div>
        )}
        {tab === 'stores' && p.source === 'api' && <ApiRelease p={p} />}
        {tab === 'stores' && p.source !== 'api' && (launched
          ? <div className="panel store"><Icon name="store" /><div><h3>{proposal.merchant}</h3><p className="muted">Bike bag with bottle compartment · confirmed launch</p></div><a className="btn btn-secondary" href="#" onClick={e => e.preventDefault()}>Visit store (Demo)</a></div>
          : <Empty icon="store" title="Not in any store yet" text="When a store confirms a launch you will see it here. Follow the idea to find out." />)}
      </div>
      <p className="tiny muted">URL of this {p.parentId ? 'version' : 'idea'}: {urlOf(p)}</p>
      {launchOpen && <LaunchProductDialog title={p.title} onClose={() => setLaunchOpen(false)} returnFocus={launchButton} />}
    </div>
  );
}

function LaunchProductDialog({ title, onClose, returnFocus }: { title: string; onClose: () => void; returnFocus: React.RefObject<HTMLButtonElement | null> }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    closeRef.current?.focus();
    return () => { dialog.close(); returnFocus.current?.focus(); };
  }, [returnFocus]);

  return <dialog ref={dialogRef} className="launch-product-dialog" aria-labelledby="launch-product-title" aria-describedby="launch-product-intro" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="launch-product-content">
      <header className="launch-product-heading">
        <div><p className="launch-product-eyebrow">COMMUNITY IDEA → REAL PRODUCT</p><h2 id="launch-product-title">Bring This Idea to Life</h2></div>
        <button ref={closeRef} type="button" className="icon-btn" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button>
      </header>
      <p id="launch-product-intro" className="launch-product-intro">Here is how <strong>{title}</strong> could move from a community design to a product customers can buy.</p>
      <ol className="launch-product-steps">
        <li><span className="launch-product-number">1</span><div><p className="launch-product-service">ARCADE</p><h3>Production &amp; Pricing</h3><p>Arcade verifies manufacturing options and estimates production costs for the selected design.</p></div></li>
        <li><span className="launch-product-number">2</span><div><p className="launch-product-service">SHOPIFY</p><h3>Find a Seller &amp; Launch</h3><p>Shopify merchants can discover community-created designs, apply to sell them, and prepare a product listing after creator approval.</p></div></li>
        <li><span className="launch-product-number">3</span><div><p className="launch-product-service">ARCADE</p><h3>Make &amp; Ship</h3><p>Once customers purchase the product through Shopify, Arcade can handle on-demand manufacturing and shipping through a future integration.</p></div></li>
      </ol>
      <div className="launch-product-footer"><span /><button type="button" className="btn btn-secondary" onClick={onClose}>Close</button></div>
    </div>
  </dialog>;
}
