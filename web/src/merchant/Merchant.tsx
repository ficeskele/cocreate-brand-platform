import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../state/AppState';
import { interest, PRIVACY_MIN, proposal, rootOf, type Product } from '../data/mock';
import { Bar, Button, Demo, DerivedFrom, Empty, ProductImage, StatusTag, personName } from '../components/ui';
import { Icon } from '../components/Icon';

function Guard({ children }: { children: React.ReactNode }) {
  const { user, mode, requireAuth, setMode } = useApp();
  if (!user || mode !== 'merchant') return <div className="page narrow"><Empty icon="store" title="Necesitas el modo comerciante" text="Actívalo desde Perfil con tu misma cuenta." action={<Button onClick={() => requireAuth('entrar como comerciante', () => setMode('merchant'))}>Activar modo comerciante</Button>} /></div>;
  return <>{children}</>;
}
const net = (p: Product) => p.votes.up - p.votes.down;
export function Oportunidades() {
  const { products } = useApp();
  const roots = products.filter(p => !p.parentId);
  return <Guard><div className="page">
    <header className="page-head"><h1>Oportunidades</h1><p className="lede">Interés de la comunidad agregado. Un voto indica interés, no una compra. <Demo>Datos Demo</Demo></p></header>
    <div className="table-wrap"><table className="opps"><thead><tr><th>Idea</th><th>Estado</th><th>Personas únicas</th><th>Intención declarada</th><th>Versiones</th><th /></tr></thead>
      <tbody>{roots.map(p => { const a = interest[p.id]; const vs = products.filter(x => rootOf(x).id === p.id && x.parentId).length; return <tr key={p.id}>
        <td><div className="opp"><img src={p.image} alt="" /><div><Link to={`/m/i/${p.slug}`}>{p.title}</Link><p className="tiny muted">{p.category}</p></div></div></td>
        <td><StatusTag status={p.status} /></td><td>{a?.unique ?? '—'}</td><td>{a && a.responses >= PRIVACY_MIN ? `${a.intent}%` : 'n insuficiente'}</td><td>{vs}</td><td><Link className="btn btn-secondary" to={`/m/i/${p.slug}`}>Evaluar</Link></td></tr>; })}</tbody></table></div>
  </div></Guard>;
}
export function DetalleComercial() {
  const { slug } = useParams(); const { products, showToast, selected, toggleSelected } = useApp(); const nav = useNavigate();
  const p = products.find(x => x.slug === slug); const [arcade, setArcade] = useState(false);
  if (!p) return <Empty title="No encontrada" />;
  const a = interest[p.id]; const versions = products.filter(x => rootOf(x).id === p.id);
  return <Guard><div className="page">
    <Link to="/m" className="back"><Icon name="back" size={18} />Oportunidades</Link>
    <div className="detail-grid">
      <div className="detail-media"><ProductImage p={p} ratio="1/1" /></div>
      <div className="detail-content">
        <div className="detail-meta"><span>{p.category}</span><StatusTag status={p.status} /></div>
        <h1 className="detail-title">{p.title}</h1>
        <p>{p.need}</p>
        <div className="insights">
          <div><strong>{a.unique}</strong><span>Personas únicas con interés</span><small>Deduplicado entre original y versiones</small></div>
          <div><strong>{a.responses >= PRIVACY_MIN ? `${a.intent}%` : '—'}</strong><span>Intención de compra declarada</span><small>Respuesta voluntaria, no una compra</small></div>
          <div><strong>Sin datos</strong><span>Evidencia comercial</span><small>Requiere ventas verificadas</small></div>
        </div>
        <div className="panel"><h3>Precio esperado (n = {a.responses})</h3>{a.responses >= PRIVACY_MIN ? a.price.map(x => <Bar key={x.label} {...x} />) : <p className="small muted">Menos de {PRIVACY_MIN} respuestas: oculto por privacidad.</p>}<p className="tiny muted">Solo agregados. Sin emails ni perfiles individuales. <Demo /></p></div>
        <div className="panel"><h3>Evaluación de producto · Arcade <span className="private">Mock</span></h3><p className="small muted">Integración propuesta. Una evaluación no garantiza viabilidad ni fabricación. API y categorías por confirmar.</p>{arcade ? <p className="small"><Icon name="sparkle" size={14} /> Evaluación pendiente <Demo /></p> : <Button variant="secondary" onClick={() => { setArcade(true); showToast('Solicitud de evaluación simulada'); }}>Solicitar evaluación</Button>}</div>
        <div className="row-btns"><Button onClick={() => nav(`/m/i/${p.slug}/version`)}>Elegir versión</Button><Button variant="secondary" onClick={() => toggleSelected(p.id)}>{selected.includes(p.id) ? 'Quitar de seleccionados' : 'Guardar en seleccionados'}</Button></div>
        <p className="small muted">{versions.length} versiones con votos independientes.</p>
      </div>
    </div>
  </div></Guard>;
}
export function SeleccionarVersion() {
  const { slug } = useParams(); const { products } = useApp(); const nav = useNavigate();
  const root = products.find(x => x.slug === slug); const [sel, setSel] = useState('p2');
  if (!root) return <Empty title="No encontrada" />;
  const vs = products.filter(x => rootOf(x).id === root.id);
  return <Guard><div className="page">
    <Link to={`/m/i/${root.slug}`} className="back"><Icon name="back" size={18} />Detalle comercial</Link>
    <header className="page-head"><h1>Elige la versión</h1><p className="lede">Cada versión tiene sus propios votos; no se suman entre sí.</p></header>
    <div className="dl-grid" role="radiogroup">{vs.map(v => <button key={v.id} role="radio" aria-checked={sel === v.id} className={`card pick${sel === v.id ? ' on' : ''}`} onClick={() => setSel(v.id)}>
      <ProductImage p={v} /><div className="card-body"><p className="tiny muted">{v.parentId ? 'Versión' : 'Original'}</p><h3 className="card-title">{v.title}</h3><p className="small muted">{personName(v.author)} · {net(v)} votos netos <Demo /></p>{sel === v.id && <p className="small strong"><Icon name="check" size={14} /> Seleccionada</p>}</div></button>)}</div>
    <Button onClick={() => nav(`/m/v/${products.find(x => x.id === sel)!.slug}/derechos`)}>Continuar: derechos de uso</Button>
  </div></Guard>;
}
// Aprobación de derechos comerciales antes de la importación (R15)
export function Derechos() {
  const { slug } = useParams(); const { products, showToast } = useApp(); const nav = useNavigate();
  const p = products.find(x => x.slug === slug); const [req, setReq] = useState<Record<number, boolean>>({});
  if (!p) return <Empty title="No encontrada" />;
  const allOk = p.imageRights.every((r, i) => r.commercialOk || req[i]);
  return <Guard><div className="page narrow">
    <button onClick={() => nav(-1)} className="back"><Icon name="back" size={18} />Volver</button>
    <h1>Derechos de uso</h1>
    <DerivedFrom p={p} />
    <p className="lede">Las imágenes de la comunidad necesitan permiso de su autor antes de usarse comercialmente.</p>
    <ul className="list">{p.imageRights.map((r, i) => <li key={i} className="list-item rights"><Icon name="image" /><div><p>{r.label}</p><p className="tiny muted">Autor: {personName(r.owner)}</p></div>
      {r.commercialOk ? <span className="appr appr-aprobado">Aprobado</span> : req[i] ? <span className="appr appr-aprobado">Aprobado (simulado)</span> : <Button variant="secondary" onClick={() => { setReq({ ...req, [i]: true }); showToast('Permiso aprobado (simulado)'); }}>Solicitar permiso</Button>}</li>)}</ul>
    <div className="panel"><h3>Propuesta comercial (ilustrativa)</h3><p className="small">PVP ${proposal.retail} · pool TOTAL de regalías ${proposal.royaltyPool} por unidad repartido entre {proposal.split.map(s => personName(s.who)).join(', ')}.</p><p className="tiny muted">Las propuestas mínimas privadas de cada contribuidor solo las ve la tienda. Sin pagos en esta demo.</p></div>
    {!allOk && <p className="small warn"><Icon name="alert" size={14} /> Falta aprobación: sin ella solo se importarían textos.</p>}
    <Button disabled={!allOk} onClick={() => nav(`/m/v/${p.slug}/preview`)}>Ver preview en Shopify</Button>
  </div></Guard>;
}
export function PreviewShopify() {
  const { slug } = useParams(); const { products, addDraft } = useApp(); const nav = useNavigate();
  const p = products.find(x => x.slug === slug); const [ok, setOk] = useState(false);
  if (!p) return <Empty title="No encontrada" />;
  return <Guard><div className="page narrow">
    <h1>Preview de importación</h1><p className="lede">Revisa antes de crear el draft. <Demo>Conexión Shopify simulada</Demo></p>
    <div className="shopify">
      <ProductImage p={p} ratio="16/9" />
      <dl className="kv"><div><dt>Título</dt><dd>Bolso de bici con compartimento para botella</dd></div><div><dt>Precio</dt><dd>${proposal.retail}.00 <Demo /></dd></div><div><dt>Estado en Shopify</dt><dd>Draft (no publicado)</dd></div><div><dt>Origen</dt><dd>{p.title} · {personName(p.author)} · derivado de {rootOf(p).title}</dd></div><div><dt>Imágenes</dt><dd>{p.imageRights.length} con permiso comercial</dd></div><div><dt>Etiquetas</dt><dd>movilidad, bici, droplab</dd></div></dl>
    </div>
    <label className="check"><input type="checkbox" checked={ok} onChange={e => setOk(e.target.checked)} />Confirmo crear un draft en mi tienda. Entiendo que no equivale a lanzar el producto.</label>
    <div className="row-btns"><Button variant="secondary" onClick={() => nav(-1)}>Volver</Button><Button disabled={!ok} onClick={() => { const id = 'd' + Date.now(); addDraft({ id, productId: p.id, title: p.title, createdAt: 'hoy', launched: false }); nav(`/m/draft/${id}`); }}>Crear draft</Button></div>
  </div></Guard>;
}
export function DraftCreado() {
  const { id } = useParams(); const { drafts, launchDraft, showToast } = useApp(); const d = drafts.find(x => x.id === id);
  if (!d) return <div className="page narrow"><Empty title="Draft no encontrado" action={<Link className="btn btn-secondary" to="/m">Oportunidades</Link>} /></div>;
  return <Guard><div className="page narrow center-page">
    <div className="success"><Icon name="check" size={28} /></div>
    <h1>{d.launched ? 'Lanzamiento confirmado' : 'Draft creado (Demo)'}</h1>
    <p className="lede">{d.launched ? 'Avisamos a quienes siguen la idea y activaron alertas de lanzamiento.' : '“Bolso de bici con compartimento para botella” está como borrador en tu tienda. Aún no está lanzado y la comunidad no recibe aviso.'}</p>
    <div className="row-btns"><Button variant="secondary" onClick={() => showToast('Abriendo Shopify (Demo)')}>Abrir en Shopify (Demo)</Button>{!d.launched && <Button onClick={() => launchDraft(d.id)}>Confirmar lanzamiento</Button>}</div>
  </div></Guard>;
}
export function Seleccionados() {
  const { products, selected, drafts } = useApp();
  return <Guard><div className="page"><header className="page-head"><h1>Productos seleccionados</h1></header>
    {selected.length ? <ul className="list">{selected.map(id => { const p = products.find(x => x.id === id)!; return <li key={id} className="list-item"><img src={p.image} alt="" className="thumb" /><Link to={`/m/i/${p.slug}`}>{p.title}</Link></li>; })}</ul> : <Empty title="Nada seleccionado" />}
    <h2 className="label">Drafts</h2>{drafts.length ? <ul className="list">{drafts.map(d => <li key={d.id} className="list-item"><Link to={`/m/draft/${d.id}`}>{d.title}</Link><span className="status">{d.launched ? 'Lanzado' : 'Draft'}</span></li>)}</ul> : <p className="small muted">Aún no hay drafts.</p>}
  </div></Guard>;
}
export function Tienda() {
  return <Guard><div className="page narrow"><header className="page-head"><h1>Tienda</h1></header>
    <div className="panel"><div className="panel-head"><h3>Ruta Urbana</h3><Demo>Conexión Demo</Demo></div><p className="small muted">Shopify simulado. Permisos y distribución de la app Shopify: decisión abierta.</p><Button variant="secondary">Gestionar conexión</Button></div></div></Guard>;
}
