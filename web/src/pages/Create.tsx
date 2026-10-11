import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../state/AppState';
import { rootOf, urlOf, comments as seedComments, type Product } from '../data/mock';
import { Button, Chip, DerivedFrom, Empty, ProductImage } from '../components/ui';
import { Field } from '../components/AuthModal';
import { Icon } from '../components/Icon';

// Wizard compartido: idea original y versión derivada. Borrador autoguardado (localStorage).
export default function Create({ kind }: { kind: 'idea' | 'version' }) {
  const { slug } = useParams(); const [sp] = useSearchParams(); const nav = useNavigate();
  const { products, addProduct, user, vote, requireAuth } = useApp();
  const parent = kind === 'version' ? products.find(p => p.slug === slug) : undefined;
  const fromC = seedComments.find(c => c.id === sp.get('desde'));
  const key = `droplab-draft-${kind}-${slug ?? 'new'}`;
  const init = { change: fromC?.text ?? '', reason: '', title: sp.get('titulo') ?? '', need: parent?.need ?? '', description: parent?.description ?? '', usage: parent?.usage ?? '', category: parent?.category ?? 'Movilidad', features: parent?.features.join(', ') ?? '', price: '', freq: '', demo: '', rights: false, selfVote: false, visibility: 'Pública' };
  const [d, setD] = useState<typeof init>(() => { try { return { ...init, ...JSON.parse(localStorage.getItem(key) ?? '{}') }; } catch { return init; } });
  const [step, setStep] = useState(0); const [err, setErr] = useState<Record<string, string>>({}); const [saved, setSaved] = useState(false);
  useEffect(() => { localStorage.setItem(key, JSON.stringify(d)); setSaved(true); const t = setTimeout(() => setSaved(false), 1200); return () => clearTimeout(t); }, [d, key]);
  if (!user) return <div className="page narrow"><Empty icon="user" title="Necesitas una cuenta para crear" action={<Button onClick={() => requireAuth('crear', () => {})}>Crear cuenta</Button>} /></div>;
  if (kind === 'version' && !parent) return <div className="page"><Empty icon="alert" title="No encontramos la idea original" /></div>;
  const set = (k: keyof typeof init) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setD({ ...d, [k]: e.target.value });
  const steps = kind === 'version' ? ['Tu cambio', 'Diseño', 'Interés', 'Revisión'] : ['Necesidad', 'Concepto', 'Interés', 'Revisión'];
  const validate = () => {
    const e: Record<string, string> = {};
    if (step === 0 && kind === 'version') { if (d.change.trim().length < 10) e.change = 'Cuéntanos qué cambiarías (mín. 10 caracteres)'; if (!d.reason.trim()) e.reason = 'Explica por qué te serviría más'; }
    if (step === 0 && kind === 'idea') { if (d.need.trim().length < 10) e.need = 'Describe el problema (mín. 10 caracteres)'; }
    if (step === 1) { if (!d.title.trim()) e.title = 'Ponle un nombre'; if (!d.description.trim()) e.description = 'Añade una descripción'; }
    if (step === 3 && !d.rights) e.rights = 'Confirma la autoría o permiso de las imágenes';
    setErr(e); return !Object.keys(e).length;
  };
  const publish = () => {
    if (!validate()) return;
    const s = (parent ? parent.slug + '-' : '') + (d.title || 'nueva').toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40);
    const np: Product = { id: 'u' + Date.now(), slug: s, parentId: parent?.id ?? null, title: d.title, author: 'me', category: d.category, status: 'Idea', image: parent?.image ?? `${import.meta.env.BASE_URL}renders/bolso-botella.svg`,
      need: d.need, description: d.description, usage: d.usage, change: d.change || undefined, reason: d.reason || undefined, features: d.features.split(',').map(x => x.trim()).filter(Boolean), votes: { up: 0, down: 0 }, followers: 0, createdAt: '2026-10-11',
      imageRights: [{ label: 'Imagen propia', owner: 'me', commercialOk: false }, ...(parent ? [{ label: 'Imagen heredada', owner: parent.author, commercialOk: false }] : [])] };
    addProduct(np); if (d.selfVote) vote(np.id, 'up'); localStorage.removeItem(key);
    nav(`/publicado/${np.slug}`, { state: { url: parent ? `/i/${rootOf(parent).slug}/v/${np.slug}` : `/i/${np.slug}` } });
  };
  return (
    <div className="page narrow wizard">
      <Link to={parent ? urlOf(parent) : '/buscar'} className="back"><Icon name="back" size={18} />Cancelar</Link>
      <h1>{kind === 'version' ? 'Nueva versión' : 'Nueva idea'}</h1>
      <div className="progress" aria-label={`Paso ${step + 1} de 4`}><div className="progress-top"><span>Paso {step + 1} de 4 · {steps[step]}</span><span className="muted small">{saved ? 'Borrador guardado' : ' '}</span></div><div className="progress-bar">{steps.map((s, i) => <span key={s} className={i <= step ? 'on' : ''} />)}</div></div>
      {parent && <DerivedFrom p={{ ...parent, parentId: parent.id } as Product} />}
      {step === 0 && (kind === 'version' ? <>
        <div className="parent-ref"><img src={parent!.image} alt="" /><div><p className="small muted">Partes de</p><p>{parent!.title}</p><p className="tiny muted">Se heredan necesidad, categoría, características e imágenes (con su autoría).</p></div></div>
        {fromC && <p className="assist"><Icon name="comment" size={16} />Partes del feedback de un comentario. No se crea automáticamente.</p>}
        <Field label="¿Qué cambiarías?" error={err.change}><textarea rows={3} value={d.change} onChange={set('change')} placeholder="Ej. añadir un compartimento separado para botella" /></Field>
        <Field label="¿Por qué esa versión te serviría más?" error={err.reason}><textarea rows={3} value={d.reason} onChange={set('reason')} placeholder="Ej. evitar llevar una segunda bolsa en trayectos cortos" /></Field>
      </> : <>
        <Field label="¿Qué problema tienes?" error={err.need}><textarea rows={3} value={d.need} onChange={set('need')} /></Field>
        <Field label="¿Cómo usarías el producto?"><textarea rows={2} value={d.usage} onChange={set('usage')} /></Field>
      </>)}
      {step === 1 && <>
        {parent && <ProductImage p={parent} ratio="16/9" />}
        <div className="row-btns"><Button variant="secondary" type="button"><Icon name="image" size={18} />Subir imagen</Button><Button variant="ghost" type="button">Añadir referencia</Button></div>
        <Field label="Nombre" error={err.title}><input value={d.title} onChange={set('title')} placeholder={kind === 'version' ? 'Versión con compartimento separado para botella' : ''} /></Field>
        <Field label="Descripción" error={err.description}><textarea rows={3} value={d.description} onChange={set('description')} /></Field>
        <Field label="Categoría"><select value={d.category} onChange={set('category')}>{['Movilidad', 'Hogar', 'Jardín', 'Viaje'].map(c => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Características deseadas" hint="Separadas por comas"><input value={d.features} onChange={set('features')} /></Field>
      </>}
      {step === 2 && <>
        <p className="muted">Ayuda a medir el interés. Solo se comparte agregado.</p>
        <p className="label">Precio que esperarías pagar</p><div className="chips">{['< $25', '$25–40', '$40–60', '> $60'].map(x => <Chip key={x} on={d.price === x} onClick={() => setD({ ...d, price: x })}>{x}</Chip>)}</div>
        <p className="label">¿Con qué frecuencia lo usarías?</p><div className="chips">{['A diario', 'Semanal', 'Ocasional'].map(x => <Chip key={x} on={d.freq === x} onClick={() => setD({ ...d, freq: x })}>{x}</Chip>)}</div>
        <div className="panel"><h3>Datos demográficos · Opcional</h3><p className="small muted">Edad y país ayudan a entender el interés agregado. Nunca se muestran de forma individual.</p>
          <Field label="Rango de edad"><select value={d.demo} onChange={set('demo')}><option value="">Prefiero no decirlo</option><option>18–24</option><option>25–34</option><option>35–44</option><option>45+</option></select></Field></div>
      </>}
      {step === 3 && <>
        {kind === 'version' && <div className="compare"><figure><img src={parent!.image} alt="" /><figcaption>Original</figcaption></figure><figure className="on"><img src={parent!.image.replace('bolso-bici.svg', 'bolso-botella.svg')} alt="" /><figcaption>Tu versión</figcaption></figure></div>}
        <div className="panel"><h3>{d.title || 'Sin nombre'}</h3>{d.change && <p><strong>Cambio:</strong> {d.change}</p>}{d.reason && <p className="muted">Motivo: {d.reason}</p>}<p className="small muted">{d.category} · Visibilidad: {d.visibility} · URL propia · empieza con 0 votos</p></div>
        <div className="panel"><h3>Imágenes y autoría</h3><p className="small">1 imagen propia{parent ? ` · 1 heredada (autor: ${parent.author === 'me' ? 'tú' : parent.author})` : ''}</p>
          <label className={`check${err.rights ? ' has-error' : ''}`}><input type="checkbox" checked={d.rights} onChange={e => setD({ ...d, rights: e.target.checked })} />Soy autor de las imágenes nuevas o tengo permiso para publicarlas. Las heredadas mantienen su autor.</label>{err.rights && <em className="err" role="alert">{err.rights}</em>}
          <p className="tiny muted">Publicar no autoriza el uso comercial: cada autor lo aprueba por separado antes de una importación.</p></div>
        <label className="check"><input type="checkbox" checked={d.selfVote} onChange={e => setD({ ...d, selfVote: e.target.checked })} />Dar mi upvote a esta versión (opcional)</label>
      </>}
      <div className="wizard-nav">{step > 0 && <Button variant="secondary" onClick={() => setStep(step - 1)}>Atrás</Button>}{step < 3 ? <Button onClick={() => validate() && setStep(step + 1)}>Siguiente</Button> : <Button onClick={publish}>Publicar {kind === 'version' ? 'versión' : 'idea'}</Button>}</div>
    </div>
  );
}
