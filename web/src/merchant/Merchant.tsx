import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../state/AppState';
import { interest, PRIVACY_MIN, proposal, rootOf, type Product } from '../data/mock';
import { Bar, Button, Demo, DerivedFrom, Empty, ProductImage, StatusTag, personName } from '../components/ui';
import { Icon } from '../components/Icon';

function Guard({ children }: { children: React.ReactNode }) {
  const { user, mode, requireAuth, setMode } = useApp();
  if (!user || mode !== 'merchant') return <div className="page narrow"><Empty icon="store" title="Merchant mode required" text="Turn it on from Profile with the same account." action={<Button onClick={() => requireAuth('enter as a merchant', () => setMode('merchant'))}>Enable merchant mode</Button>} /></div>;
  return <>{children}</>;
}
const net = (p: Product) => p.votes.up - p.votes.down;
export function Opportunities() {
  const { products } = useApp();
  const roots = products.filter(p => !p.parentId);
  return <Guard><div className="page">
    <header className="page-head"><h1>Opportunities</h1><p className="lede">Aggregated community interest. A vote signals interest, not a purchase. <Demo>Demo data</Demo></p></header>
    <div className="table-wrap"><table className="opps"><thead><tr><th>Idea</th><th>Status</th><th>Unique people</th><th>Declared intent</th><th>Versions</th><th /></tr></thead>
      <tbody>{roots.map(p => { const a = interest[p.id]; const vs = products.filter(x => rootOf(x).id === p.id && x.parentId).length; return <tr key={p.id}>
        <td><div className="opp"><img src={p.image} alt="" /><div><Link to={`/m/i/${p.slug}`}>{p.title}</Link><p className="tiny muted">{p.category}</p></div></div></td>
        <td><StatusTag status={p.status} /></td><td>{a?.unique ?? '—'}</td><td>{a && a.responses >= PRIVACY_MIN ? `${a.intent}%` : 'n too small'}</td><td>{vs}</td><td><Link className="btn btn-secondary" to={`/m/i/${p.slug}`}>Evaluate</Link></td></tr>; })}</tbody></table></div>
  </div></Guard>;
}
export function MerchantDetail() {
  const { slug } = useParams(); const { products, showToast, selected, toggleSelected } = useApp(); const nav = useNavigate();
  const p = products.find(x => x.slug === slug); const [arcade, setArcade] = useState(false);
  if (!p) return <Empty title="Not found" />;
  const a = interest[p.id]; const versions = products.filter(x => rootOf(x).id === p.id);
  return <Guard><div className="page">
    <Link to="/m" className="back"><Icon name="back" size={18} />Opportunities</Link>
    <div className="detail-grid">
      <div className="detail-media"><ProductImage p={p} ratio="1/1" /></div>
      <div className="detail-content">
        <div className="detail-meta"><span>{p.category}</span><StatusTag status={p.status} /></div>
        <h1 className="detail-title">{p.title}</h1>
        <p>{p.need}</p>
        <div className="insights">
          <div><strong>{a.unique}</strong><span>Unique interested people</span><small>Deduplicated across original and versions</small></div>
          <div><strong>{a.responses >= PRIVACY_MIN ? `${a.intent}%` : '—'}</strong><span>Declared purchase intent</span><small>Voluntary response, not a purchase</small></div>
          <div><strong>No data</strong><span>Commercial evidence</span><small>Requires verified sales</small></div>
        </div>
        <div className="panel"><h3>Expected price (n = {a.responses})</h3>{a.responses >= PRIVACY_MIN ? a.price.map(x => <Bar key={x.label} {...x} />) : <p className="small muted">Fewer than {PRIVACY_MIN} responses: hidden for privacy.</p>}<p className="tiny muted">Aggregates only. No emails or individual profiles. <Demo /></p></div>
        <div className="panel"><h3>Product evaluation · Arcade <span className="private">Mock</span></h3><p className="small muted">Proposed integration. An evaluation does not guarantee feasibility or manufacturing. API and categories to be confirmed.</p>{arcade ? <p className="small"><Icon name="sparkle" size={14} /> Evaluation pending <Demo /></p> : <Button variant="secondary" onClick={() => { setArcade(true); showToast('Evaluation request simulated'); }}>Request evaluation</Button>}</div>
        <div className="row-btns"><Button onClick={() => nav(`/m/i/${p.slug}/version`)}>Choose version</Button><Button variant="secondary" onClick={() => toggleSelected(p.id)}>{selected.includes(p.id) ? 'Remove from selected' : 'Save to selected'}</Button></div>
        <p className="small muted">{versions.length} versions with independent votes.</p>
      </div>
    </div>
  </div></Guard>;
}
export function SelectVersion() {
  const { slug } = useParams(); const { products } = useApp(); const nav = useNavigate();
  const root = products.find(x => x.slug === slug); const [sel, setSel] = useState('p2');
  if (!root) return <Empty title="Not found" />;
  const vs = products.filter(x => rootOf(x).id === root.id);
  return <Guard><div className="page">
    <Link to={`/m/i/${root.slug}`} className="back"><Icon name="back" size={18} />Merchant detail</Link>
    <header className="page-head"><h1>Choose the version</h1><p className="lede">Each version has its own votes; they are not added together.</p></header>
    <div className="dl-grid" role="radiogroup">{vs.map(v => <button key={v.id} role="radio" aria-checked={sel === v.id} className={`card pick${sel === v.id ? ' on' : ''}`} onClick={() => setSel(v.id)}>
      <ProductImage p={v} /><div className="card-body"><p className="tiny muted">{v.parentId ? 'Version' : 'Original'}</p><h3 className="card-title">{v.title}</h3><p className="small muted">{personName(v.author)} · {net(v)} net votes <Demo /></p>{sel === v.id && <p className="small strong"><Icon name="check" size={14} /> Selected</p>}</div></button>)}</div>
    <Button onClick={() => nav(`/m/v/${products.find(x => x.id === sel)!.slug}/rights`)}>Continue: usage rights</Button>
  </div></Guard>;
}
// Commercial rights approval before the import (R15)
export function Rights() {
  const { slug } = useParams(); const { products, showToast } = useApp(); const nav = useNavigate();
  const p = products.find(x => x.slug === slug); const [req, setReq] = useState<Record<number, boolean>>({});
  if (!p) return <Empty title="Not found" />;
  const allOk = p.imageRights.every((r, i) => r.commercialOk || req[i]);
  return <Guard><div className="page narrow">
    <button onClick={() => nav(-1)} className="back"><Icon name="back" size={18} />Back</button>
    <h1>Usage rights</h1>
    <DerivedFrom p={p} />
    <p className="lede">Community images need their author's permission before commercial use.</p>
    <ul className="list">{p.imageRights.map((r, i) => <li key={i} className="list-item rights"><Icon name="image" /><div><p>{r.label}</p><p className="tiny muted">Author: {personName(r.owner)}</p></div>
      {r.commercialOk ? <span className="appr appr-approved">Approved</span> : req[i] ? <span className="appr appr-approved">Approved (simulated)</span> : <Button variant="secondary" onClick={() => { setReq({ ...req, [i]: true }); showToast('Permission approved (simulated)'); }}>Request permission</Button>}</li>)}</ul>
    <div className="panel"><h3>Commercial proposal (illustrative)</h3><p className="small">Retail ${proposal.retail} · TOTAL royalty pool ${proposal.royaltyPool} per unit, split between {proposal.split.map(s => personName(s.who)).join(', ')}.</p><p className="tiny muted">Each contributor's private minimum proposal is visible only to the store. No payments in this demo.</p></div>
    {!allOk && <p className="small warn"><Icon name="alert" size={14} /> Approval missing: without it only the text would be imported.</p>}
    <Button disabled={!allOk} onClick={() => nav(`/m/v/${p.slug}/preview`)}>Preview in Shopify</Button>
  </div></Guard>;
}
export function ShopifyPreview() {
  const { slug } = useParams(); const { products, addDraft } = useApp(); const nav = useNavigate();
  const p = products.find(x => x.slug === slug); const [ok, setOk] = useState(false);
  if (!p) return <Empty title="Not found" />;
  return <Guard><div className="page narrow">
    <h1>Import preview</h1><p className="lede">Review before creating the draft. <Demo>Simulated Shopify connection</Demo></p>
    <div className="shopify">
      <ProductImage p={p} ratio="16/9" />
      <dl className="kv"><div><dt>Title</dt><dd>Bike bag with bottle compartment</dd></div><div><dt>Price</dt><dd>${proposal.retail}.00 <Demo /></dd></div><div><dt>Shopify status</dt><dd>Draft (unpublished)</dd></div><div><dt>Source</dt><dd>{p.title} · {personName(p.author)} · derived from {rootOf(p).title}</dd></div><div><dt>Images</dt><dd>{p.imageRights.length} with commercial permission</dd></div><div><dt>Tags</dt><dd>mobility, bike, droplab</dd></div></dl>
    </div>
    <label className="check"><input type="checkbox" checked={ok} onChange={e => setOk(e.target.checked)} />I confirm creating a draft in my store. I understand this is not a product launch.</label>
    <div className="row-btns"><Button variant="secondary" onClick={() => nav(-1)}>Back</Button><Button disabled={!ok} onClick={() => { const id = 'd' + Date.now(); addDraft({ id, productId: p.id, title: p.title, createdAt: 'today', launched: false }); nav(`/m/draft/${id}`); }}>Create draft</Button></div>
  </div></Guard>;
}
export function DraftCreated() {
  const { id } = useParams(); const { drafts, launchDraft, showToast } = useApp(); const d = drafts.find(x => x.id === id);
  if (!d) return <div className="page narrow"><Empty title="Draft not found" action={<Link className="btn btn-secondary" to="/m">Opportunities</Link>} /></div>;
  return <Guard><div className="page narrow center-page">
    <div className="success"><Icon name="check" size={28} /></div>
    <h1>{d.launched ? 'Launch confirmed' : 'Draft created (Demo)'}</h1>
    <p className="lede">{d.launched ? 'We notified the people who follow the idea and enabled launch alerts.' : '“Bike bag with bottle compartment” is a draft in your store. It is not launched yet and the community is not notified.'}</p>
    <div className="row-btns"><Button variant="secondary" onClick={() => showToast('Opening Shopify (Demo)')}>Open in Shopify (Demo)</Button>{!d.launched && <Button onClick={() => launchDraft(d.id)}>Confirm launch</Button>}</div>
  </div></Guard>;
}
export function Selected() {
  const { products, selected, drafts } = useApp();
  return <Guard><div className="page"><header className="page-head"><h1>Selected products</h1></header>
    {selected.length ? <ul className="list">{selected.map(id => { const p = products.find(x => x.id === id)!; return <li key={id} className="list-item"><img src={p.image} alt="" className="thumb" /><Link to={`/m/i/${p.slug}`}>{p.title}</Link></li>; })}</ul> : <Empty title="Nothing selected" />}
    <h2 className="label">Drafts</h2>{drafts.length ? <ul className="list">{drafts.map(d => <li key={d.id} className="list-item"><Link to={`/m/draft/${d.id}`}>{d.title}</Link><span className="status">{d.launched ? 'Launched' : 'Draft'}</span></li>)}</ul> : <p className="small muted">No drafts yet.</p>}
  </div></Guard>;
}
export function Store() {
  return <Guard><div className="page narrow"><header className="page-head"><h1>Store</h1></header>
    <div className="panel"><div className="panel-head"><h3>Urban Route</h3><Demo>Demo connection</Demo></div><p className="small muted">Simulated Shopify. Shopify app permissions and distribution: open decision.</p><Button variant="secondary">Manage connection</Button></div></div></Guard>;
}
