import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../state/AppState';
import { rootOf, urlOf, comments as seedComments, type Product } from '../data/mock';
import { Button, Chip, DerivedFrom, Empty, ProductImage } from '../components/ui';
import { Field } from '../components/AuthModal';
import { Icon } from '../components/Icon';

// Shared wizard: original idea and derived version. Draft autosaved to localStorage.
export default function Create({ kind }: { kind: 'idea' | 'version' }) {
  const { slug } = useParams(); const [sp] = useSearchParams(); const nav = useNavigate();
  const { products, addProduct, user, vote, requireAuth } = useApp();
  const parent = kind === 'version' ? products.find(p => p.slug === slug) : undefined;
  const fromC = seedComments.find(c => c.id === sp.get('from'));
  const key = `droplab-draft-${kind}-${slug ?? 'new'}`;
  const init = { change: fromC?.text ?? '', reason: '', title: sp.get('title') ?? '', need: parent?.need ?? '', description: parent?.description ?? '', usage: parent?.usage ?? '', category: parent?.category ?? 'Mobility', features: parent?.features.join(', ') ?? '', price: '', freq: '', demo: '', rights: false, selfVote: false, visibility: 'Public' };
  const [d, setD] = useState<typeof init>(() => { try { return { ...init, ...JSON.parse(localStorage.getItem(key) ?? '{}') }; } catch { return init; } });
  const [step, setStep] = useState(0); const [err, setErr] = useState<Record<string, string>>({}); const [saved, setSaved] = useState(false);
  useEffect(() => { localStorage.setItem(key, JSON.stringify(d)); setSaved(true); const t = setTimeout(() => setSaved(false), 1200); return () => clearTimeout(t); }, [d, key]);
  if (!user) return <div className="page narrow"><Empty icon="user" title="You need an account to create" action={<Button onClick={() => requireAuth('create', () => {})}>Create account</Button>} /></div>;
  if (kind === 'version' && !parent) return <div className="page"><Empty icon="alert" title="We could not find the original idea" /></div>;
  const set = (k: keyof typeof init) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setD({ ...d, [k]: e.target.value });
  const steps = kind === 'version' ? ['Your change', 'Design', 'Interest', 'Review'] : ['Need', 'Concept', 'Interest', 'Review'];
  const validate = () => {
    const e: Record<string, string> = {};
    if (step === 0 && kind === 'version') { if (d.change.trim().length < 10) e.change = 'Tell us what you would change (at least 10 characters)'; if (!d.reason.trim()) e.reason = 'Explain why it would serve you better'; }
    if (step === 0 && kind === 'idea') { if (d.need.trim().length < 10) e.need = 'Describe the problem (at least 10 characters)'; }
    if (step === 1) { if (!d.title.trim()) e.title = 'Give it a name'; if (!d.description.trim()) e.description = 'Add a description'; }
    if (step === 3 && !d.rights) e.rights = 'Confirm you own or have permission for the images';
    setErr(e); return !Object.keys(e).length;
  };
  const publish = () => {
    if (!validate()) return;
    const s = (parent ? parent.slug + '-' : '') + (d.title || 'new').toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40);
    const np: Product = { id: 'u' + Date.now(), slug: s, parentId: parent?.id ?? null, title: d.title, author: 'me', category: d.category, status: 'Idea', image: parent?.image ?? `${import.meta.env.BASE_URL}renders/bottle-bag.svg`,
      need: d.need, description: d.description, usage: d.usage, change: d.change || undefined, reason: d.reason || undefined, features: d.features.split(',').map(x => x.trim()).filter(Boolean), votes: { up: 0, down: 0 }, followers: 0, createdAt: '2026-10-11',
      imageRights: [{ label: 'Own image', owner: 'me', commercialOk: false }, ...(parent ? [{ label: 'Inherited image', owner: parent.author, commercialOk: false }] : [])] };
    addProduct(np); if (d.selfVote) vote(np.id, 'up'); localStorage.removeItem(key);
    nav(`/published/${np.slug}`, { state: { url: parent ? `/i/${rootOf(parent).slug}/v/${np.slug}` : `/i/${np.slug}` } });
  };
  return (
    <div className="page narrow wizard">
      <Link to={parent ? urlOf(parent) : '/search'} className="back"><Icon name="back" size={18} />Cancel</Link>
      <h1>{kind === 'version' ? 'New version' : 'New idea'}</h1>
      <div className="progress" aria-label={`Step ${step + 1} of 4`}><div className="progress-top"><span>Step {step + 1} of 4 · {steps[step]}</span><span className="muted small">{saved ? 'Draft saved' : ' '}</span></div><div className="progress-bar">{steps.map((s, i) => <span key={s} className={i <= step ? 'on' : ''} />)}</div></div>
      {parent && <DerivedFrom p={{ ...parent, parentId: parent.id } as Product} />}
      {step === 0 && (kind === 'version' ? <>
        <div className="parent-ref"><img src={parent!.image} alt="" /><div><p className="small muted">Starting from</p><p>{parent!.title}</p><p className="tiny muted">Need, category, features and images (with their authorship) are inherited.</p></div></div>
        {fromC && <p className="assist"><Icon name="comment" size={16} />You are starting from feedback in a comment. Nothing is created automatically.</p>}
        <Field label="What would you change?" error={err.change}><textarea rows={3} value={d.change} onChange={set('change')} placeholder="e.g. add a separate bottle compartment" /></Field>
        <Field label="Why would that version serve you better?" error={err.reason}><textarea rows={3} value={d.reason} onChange={set('reason')} placeholder="e.g. avoid carrying a second bag on short trips" /></Field>
      </> : <>
        <Field label="What problem do you have?" error={err.need}><textarea rows={3} value={d.need} onChange={set('need')} /></Field>
        <Field label="How would you use the product?"><textarea rows={2} value={d.usage} onChange={set('usage')} /></Field>
      </>)}
      {step === 1 && <>
        {parent && <ProductImage p={parent} ratio="16/9" />}
        <div className="row-btns"><Button variant="secondary" type="button"><Icon name="image" size={18} />Upload image</Button><Button variant="ghost" type="button">Add reference</Button></div>
        <Field label="Name" error={err.title}><input value={d.title} onChange={set('title')} placeholder={kind === 'version' ? 'Version with a separate bottle compartment' : ''} /></Field>
        <Field label="Description" error={err.description}><textarea rows={3} value={d.description} onChange={set('description')} /></Field>
        <Field label="Category"><select value={d.category} onChange={set('category')}>{['Mobility', 'Home', 'Garden', 'Travel'].map(c => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Desired features" hint="Comma-separated"><input value={d.features} onChange={set('features')} /></Field>
      </>}
      {step === 2 && <>
        <p className="muted">Help us measure interest. Shared only in aggregate.</p>
        <p className="label">Price you would expect to pay</p><div className="chips">{['< $25', '$25–40', '$40–60', '> $60'].map(x => <Chip key={x} on={d.price === x} onClick={() => setD({ ...d, price: x })}>{x}</Chip>)}</div>
        <p className="label">How often would you use it?</p><div className="chips">{['Daily', 'Weekly', 'Occasionally'].map(x => <Chip key={x} on={d.freq === x} onClick={() => setD({ ...d, freq: x })}>{x}</Chip>)}</div>
        <div className="panel"><h3>Demographics · Optional</h3><p className="small muted">Age and country help us understand aggregate interest. They are never shown individually.</p>
          <Field label="Age range"><select value={d.demo} onChange={set('demo')}><option value="">Prefer not to say</option><option>18–24</option><option>25–34</option><option>35–44</option><option>45+</option></select></Field></div>
      </>}
      {step === 3 && <>
        {kind === 'version' && <div className="compare"><figure><img src={parent!.image} alt="" /><figcaption>Original</figcaption></figure><figure className="on"><img src={parent!.image.replace('bike-bag.svg', 'bottle-bag.svg')} alt="" /><figcaption>Your version</figcaption></figure></div>}
        <div className="panel"><h3>{d.title || 'Untitled'}</h3>{d.change && <p><strong>Change:</strong> {d.change}</p>}{d.reason && <p className="muted">Reason: {d.reason}</p>}<p className="small muted">{d.category} · Visibility: {d.visibility} · Own URL · starts with 0 votes</p></div>
        <div className="panel"><h3>Images and authorship</h3><p className="small">1 own image{parent ? ` · 1 inherited (author: ${parent.author === 'me' ? 'you' : parent.author})` : ''}</p>
          <label className={`check${err.rights ? ' has-error' : ''}`}><input type="checkbox" checked={d.rights} onChange={e => setD({ ...d, rights: e.target.checked })} />I am the author of the new images or have permission to publish them. Inherited images keep their author.</label>{err.rights && <em className="err" role="alert">{err.rights}</em>}
          <p className="tiny muted">Publishing does not authorize commercial use: each author approves it separately before an import.</p></div>
        <label className="check"><input type="checkbox" checked={d.selfVote} onChange={e => setD({ ...d, selfVote: e.target.checked })} />Upvote this version myself (optional)</label>
      </>}
      <div className="wizard-nav">{step > 0 && <Button variant="secondary" onClick={() => setStep(step - 1)}>Back</Button>}{step < 3 ? <Button onClick={() => validate() && setStep(step + 1)}>Next</Button> : <Button onClick={publish}>Publish {kind === 'version' ? 'version' : 'idea'}</Button>}</div>
    </div>
  );
}
