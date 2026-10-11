import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../state/AppState';
import { notifications, proposal, urlOf } from '../data/mock';
import { Button, Demo, Empty, ProductImage, Tabs, personName } from '../components/ui';
import { IdeaCard } from '../components/social';
import { Icon } from '../components/Icon';

export function Published() {
  const { slug } = useParams(); const { products, showToast } = useApp(); const loc = useLocation();
  const p = products.find(x => x.slug === slug); if (!p) return <Empty title="Not found" />;
  const url = (loc.state as { url?: string })?.url ?? urlOf(p);
  return (
    <div className="page narrow center-page">
      <div className="success"><Icon name="check" size={28} /></div>
      <h1>{p.parentId ? 'Your version is published' : 'Your idea is published'}</h1>
      <p className="lede">Share your {p.parentId ? 'version' : 'idea'} to gather support. Votes on the original do not carry over.</p>
      <ProductImage p={p} ratio="16/9" />
      <div className="share-link"><span>{location.host}{url}</span><button className="link" onClick={() => { navigator.clipboard?.writeText(location.origin + url).catch(() => {}); showToast('Link copied'); }}>Copy</button></div>
      <div className="row-btns"><Button variant="secondary" onClick={() => showToast('Opening WhatsApp (Demo)')}>WhatsApp</Button><Button variant="secondary" onClick={() => showToast('Share (Demo)')}>More options</Button></div>
      <Link className="btn btn-primary btn-block" to={url}>View {p.parentId ? 'my version' : 'my idea'}</Link>
    </div>
  );
}
type AT = 'ideas' | 'versions' | 'following' | 'drafts';
export function Contributions() {
  const { products, follows, user, requireAuth } = useApp(); const [t, setT] = useState<AT>('versions');
  if (!user) return <div className="page narrow"><Empty icon="layers" title="Your contributions will appear here" text="Ideas, versions, what you follow and your drafts." action={<Button onClick={() => requireAuth('see your contributions', () => {})}>Create account</Button>} /></div>;
  const mine = products.filter(p => p.author === 'me');
  const drafts = Object.keys(localStorage).filter(k => k.startsWith('droplab-draft-'));
  const list = t === 'ideas' ? mine.filter(p => !p.parentId) : t === 'versions' ? mine.filter(p => p.parentId) : t === 'following' ? products.filter(p => follows[p.id]) : [];
  return (
    <div className="page">
      <header className="page-head"><h1>Contributions</h1></header>
      <Tabs<AT> value={t} onChange={setT} items={[{ id: 'ideas', label: 'My ideas' }, { id: 'versions', label: 'Versions' }, { id: 'following', label: 'Following' }, { id: 'drafts', label: 'Drafts' }]} />
      {t === 'drafts' ? (drafts.length ? <ul className="list">{drafts.map(k => <li key={k} className="list-item"><Icon name="layers" /><span>{k.includes('version') ? 'Version of ' + k.split('-').slice(3).join('-') : 'New idea'}</span><Link to={k.includes('version') ? `/create-version/${k.split('-').slice(3).join('-')}` : '/create'}>Continue</Link></li>)}</ul> : <Empty title="No drafts" text="They are saved automatically while you write." />)
        : list.length ? <div className="grid">{list.map(p => <IdeaCard key={p.id} p={p} />)}</div>
        : <Empty title={t === 'following' ? 'You are not following any idea yet' : 'You have not published yet'} text={t === 'following' ? 'Following is different from voting: it notifies you about news.' : 'Search for an idea and create your version.'} action={<Link className="btn btn-secondary" to="/search">Search ideas</Link>} />}
    </div>
  );
}
export function Earnings() {
  const [t, setT] = useState<'royalties' | 'referrals'>('royalties');
  const total = proposal.split.reduce((s, x) => s + x.amount, 0);
  return (
    <div className="page narrow">
      <header className="page-head"><h1>Earnings</h1><p className="lede">Program in preparation. Everything here is illustrative. <Demo>Demo · pending</Demo></p></header>
      <Tabs value={t} onChange={setT} items={[{ id: 'royalties', label: 'Royalties' }, { id: 'referrals', label: 'Referral commissions' }]} />
      {t === 'royalties' ? <>
        <div className="panel">
          <div className="panel-head"><h3>Commercial proposal · {proposal.merchant}</h3><span className="status">Pending approval</span></div>
          <p className="small muted">Version with a separate bottle compartment. Illustrative: no signed agreement and no payments.</p>
          <dl className="money"><div><dt>Retail price</dt><dd>${proposal.retail.toFixed(2)}</dd></div><div><dt>TOTAL royalty pool per unit</dt><dd>${proposal.royaltyPool.toFixed(2)}</dd></div></dl>
          <table className="split"><caption className="sr">Royalty pool split</caption><thead><tr><th>Contributor</th><th>Role</th><th>Per unit</th><th>Approval</th></tr></thead>
            <tbody>{proposal.split.map(s => { const ap = proposal.approvals.find(a => a.who === s.who)!; return <tr key={s.who}><td>{personName(s.who)}</td><td>{s.role}</td><td>${s.amount.toFixed(2)}</td><td><span className={`appr appr-${ap.state === 'Approved' ? 'approved' : 'pending'}`}>{ap.state}</span></td></tr>; })}</tbody>
            <tfoot><tr><td colSpan={2}>Total distributed</td><td>${total.toFixed(2)}</td><td /></tr></tfoot></table>
          <p className="tiny muted">The $5 pool is the total for all contributors, not per person. Commenting alone does not entitle you to royalties.</p>
        </div>
        <div className="panel"><h3>Balance</h3><p className="big">—</p><p className="small muted">No real balance. It activates once there are verified sales and an approved agreement.</p></div>
      </> : <div className="panel"><h3>Referral commissions</h3><p className="small muted">Separate from royalties: they would be based on sales arriving through your shared links, not on votes.</p><dl className="money"><div><dt>Clicks on your links</dt><dd>38 <Demo /></dd></div><div><dt>Commission</dt><dd>Coming soon</dd></div></dl></div>}
    </div>
  );
}
export function Profile() {
  const { user, mode, setMode, signOut, requireAuth, apiUser, setApiUser, backend } = useApp(); const nav = useNavigate();
  const go = (m: 'consumer' | 'merchant') => requireAuth('switch mode', () => { setMode(m); nav(m === 'merchant' ? '/m' : '/'); });
  return (
    <div className="page narrow">
      <header className="page-head"><h1>Profile</h1></header>
      {user ? <div className="profile"><span className="avatar lg">{user.name[0]}</span><div><h2>{user.name}</h2><p className="small muted">{user.email}</p></div></div>
        : <Empty icon="user" title="Explore without an account" text="To vote, comment or create you need an account." action={<Button onClick={() => requireAuth('see your profile', () => {})}>Create account</Button>} />}
      <div className="panel"><h3>Mode</h3><div className="segmented" role="radiogroup">{(['consumer', 'merchant'] as const).map(m => <button key={m} role="radio" aria-checked={mode === m} className={mode === m ? 'on' : ''} onClick={() => go(m)}>{m === 'consumer' ? 'Community' : 'Merchant'}</button>)}</div><p className="small muted">Same account. Merchant mode shows opportunities with aggregated data.</p></div>
      <div className="panel"><h3>Backend user</h3><p className="small muted">X-User-Id header sent to the API ({backend === 'online' ? 'connected' : 'offline'}).</p><div className="segmented" role="radiogroup">{['u_alice', 'u_bob'].map(u => <button key={u} role="radio" aria-checked={apiUser === u} className={apiUser === u ? 'on' : ''} onClick={() => setApiUser(u)}>{u.slice(2)}</button>)}</div></div>
      <ul className="list">{['Notification preferences', 'Privacy and data', 'Connected stores (Demo)'].map(x => <li key={x} className="list-item"><span>{x}</span><Icon name="back" size={16} /></li>)}</ul>
      {user && <Button variant="ghost" onClick={signOut}>Sign out</Button>}
    </div>
  );
}
export function Notifications() {
  return (
    <div className="page narrow">
      <header className="page-head"><h1>Notifications</h1></header>
      <ul className="notifs">{notifications.map(n => <li key={n.id} className={n.unread ? 'unread' : ''}><Link to={n.to}><Icon name={n.kind === 'launch' ? 'store' : n.kind === 'comment' ? 'pin' : n.kind === 'proposal' ? 'wallet' : 'up'} /><div><p className="n-title">{n.title}</p><p className="small muted">{n.detail}</p></div>{n.unread && <span className="dot" aria-label="Unread" />}</Link></li>)}</ul>
      <p className="tiny muted">We only notify about launches confirmed by the store, and only if you enabled those alerts. <Demo /></p>
    </div>
  );
}
