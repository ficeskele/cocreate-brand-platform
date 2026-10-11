// Paneles conectados al backend real (sin datos Demo).
import { useCallback, useEffect, useState } from 'react';
import { api, type ApiCoauthor, type ApiMessage } from '../data/api';
import { useApp } from '../state/AppState';
import type { Product } from '../data/mock';
import { Button, Empty } from './ui';
import { Icon } from './Icon';

const who = (id: string) => ({ u_alice: 'alice', u_bob: 'bob' } as Record<string, string>)[id] ?? id;
export const LiveTag = () => <span className="demo live">Backend</span>;

export function ApiConversation({ p }: { p: Product }) {
  const { showToast } = useApp(); const [msgs, setMsgs] = useState<ApiMessage[] | null>(null); const [err, setErr] = useState(''); const [text, setText] = useState(''); const [run, setRun] = useState<{ id: string; stage: string; status: string } | null>(null);
  const load = useCallback(() => api.messages(p.apiId!).then(setMsgs).catch(e => setErr(String(e.message))), [p.apiId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!run || run.status !== 'running') return; const t = setInterval(() => api.agentRun(run.id).then(r => { setRun(r); if (r.status !== 'running') load(); }).catch(() => {}), 2000); return () => clearInterval(t); }, [run, load]);
  const post = async () => { try { const r = await api.postMessage(p.apiId!, text); setText(''); load(); if (r.agent_run_id) setRun({ id: r.agent_run_id, stage: 'designing', status: 'running' }); } catch (e) { showToast('No se pudo publicar: ' + (e as Error).message); } };
  if (err) return <Empty icon="alert" title="No pudimos cargar la conversación" text={err} />;
  if (!msgs) return <p className="muted">Cargando…</p>;
  return (
    <div className="stack">
      <p className="small muted"><LiveTag /> Mensajes reales del producto. Menciona <code>@agent:concept</code> para pedir una evaluación/diseño con arcade.ai (no garantiza viabilidad).</p>
      {run && <p className="assist"><Icon name="sparkle" size={16} />Agente: {run.status} · {run.stage}</p>}
      <div className="threads">{msgs.length === 0 && <p className="muted">Aún no hay mensajes.</p>}{msgs.map(m => <div key={m.id} className="thread"><div className="comment"><span className="avatar" aria-hidden>{m.author_type === 'agent' ? 'A' : who(m.author_id)[0]}</span><div><p className="comment-head">{m.author_type === 'agent' ? 'Agente' : who(m.author_id)} · {m.created_at}</p><p style={{ whiteSpace: 'pre-wrap' }}>{m.body}</p></div></div></div>)}</div>
      <div className="composer"><label className="sr" htmlFor="api-composer">Mensaje</label><textarea id="api-composer" rows={2} value={text} onChange={e => setText(e.target.value)} placeholder="Escribe un mensaje" /><Button disabled={!text.trim()} onClick={post}>Publicar</Button></div>
    </div>
  );
}
export function ApiCoauthors({ p }: { p: Product }) {
  const [list, setList] = useState<ApiCoauthor[] | null>(null);
  useEffect(() => { api.coauthors(p.apiId!).then(setList).catch(() => setList([])); }, [p.apiId]);
  return <div className="panel"><h3>Coautores <LiveTag /></h3>{!list ? <p className="muted small">Cargando…</p> : list.length === 0 ? <p className="small muted">Sin coautores aún.</p> : <ul className="list">{list.map(c => <li key={c.type + c.id + (c.on_behalf_of ?? '')} className="list-item"><span>{c.type === 'agent' ? `Agente ${c.id}${c.on_behalf_of ? ' (por ' + who(c.on_behalf_of) + ')' : ''}` : who(c.id)}</span><span className="muted">{c.revisions} revisiones</span></li>)}</ul>}</div>;
}
export function ApiProposals({ p }: { p: Product }) {
  const { views, reloadApi, showToast } = useApp(); const v = views[p.apiId!]; const [diff, setDiff] = useState<Record<string, { path: string; kind: string }[]>>({});
  const open = v?.open_proposals ?? [];
  return <div className="panel"><h3>Propuestas abiertas <LiveTag /></h3>{open.length === 0 ? <p className="small muted">No hay propuestas abiertas.</p> : open.map(pr => <div key={pr.id} className="stack"><p><strong>{pr.summary}</strong></p>
    {diff[pr.id] ? <ul className="small">{diff[pr.id].map(d => <li key={d.path}>{d.kind}: {d.path}</li>)}</ul> : <button className="link small" onClick={() => api.proposal(pr.id).then(r => setDiff(s => ({ ...s, [pr.id]: r.diff })))}>Ver cambios</button>}
    <Button variant="secondary" onClick={() => api.merge(pr.id).then(() => { showToast('Propuesta integrada'); reloadApi(); }).catch(e => showToast((e as Error).message))}>Integrar propuesta</Button></div>)}</div>;
}
export function ApiRelease({ p }: { p: Product }) {
  const { showToast } = useApp(); const [rel, setRel] = useState<{ id: string; version: string } | null>(null); const [url, setUrl] = useState(''); const [busy, setBusy] = useState(false);
  const act = async (f: () => Promise<void>) => { setBusy(true); try { await f(); } catch (e) { showToast((e as Error).message); } finally { setBusy(false); } };
  return <div className="panel"><h3>Release y tienda <LiveTag /></h3>
    <p className="small muted">Un release congela la versión actual. Abrir tienda crea un checkout en arcade.ai (requiere producto generado por el agente). No equivale a un lanzamiento confirmado.</p>
    {!rel ? <Button variant="secondary" disabled={busy} onClick={() => act(async () => setRel(await api.createRelease(p.apiId!)))}>Crear release</Button>
      : <><p className="small">Release {rel.version} creado.</p>{url ? <a className="btn btn-secondary" href={url} target="_blank" rel="noreferrer">Abrir checkout</a> : <Button disabled={busy} onClick={() => act(async () => { const r = await api.openStore(rel.id); setUrl(r.checkout_url ?? ''); if (!r.checkout_url) showToast('Tienda abierta'); })}>Abrir tienda</Button>}</>}
  </div>;
}
