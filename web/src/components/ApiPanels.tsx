// Panels wired to the real backend (no Demo data).
import { useCallback, useEffect, useState } from 'react';
import { api, type ApiCoauthor, type ApiMessage } from '../data/api';
import { useApp } from '../state/AppState';
import type { Product } from '../data/mock';
import { Button, Empty } from './ui';
import { Icon } from './Icon';

const who = (id: string) => id.replace(/^u_/, '');
export const LiveTag = () => <span className="demo live">Backend</span>;

export function ApiConversation({ p }: { p: Product }) {
  const { showToast } = useApp(); const [msgs, setMsgs] = useState<ApiMessage[] | null>(null); const [err, setErr] = useState(''); const [text, setText] = useState(''); const [run, setRun] = useState<{ id: string; stage: string; status: string } | null>(null);
  const load = useCallback(() => api.messages(p.apiId!).then(setMsgs).catch(e => setErr(String(e.message))), [p.apiId]);
  const [instruction, setInstruction] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { load(); const t = setInterval(load, 3000); return () => clearInterval(t); }, [load]); // live for everyone in the room
  useEffect(() => { if (!run || run.status !== 'running') return; const t = setInterval(() => api.agentRun(run.id).then(r => { setRun(r); if (r.status !== 'running') load(); }).catch(() => {}), 2000); return () => clearInterval(t); }, [run, load]);
  const post = async () => { try { await api.postMessage(p.apiId!, text); setText(''); load(); } catch (e) { showToast('Could not post: ' + (e as Error).message); } };
  const generate = async () => { setBusy(true); try { const r = await api.generate(p.apiId!, instruction); setInstruction(''); load(); setRun({ id: r.agent_run_id, stage: 'designing', status: 'running' }); showToast('Generating a version on arcade.ai (1 to 2 minutes)'); } catch (e) { showToast('Could not start: ' + (e as Error).message); } finally { setBusy(false); } };
  if (err) return <Empty icon="alert" title="We could not load the conversation" text={err} />;
  if (!msgs) return <p className="muted">Loading…</p>;
  return (
    <div className="stack">
      <p className="small muted"><LiveTag /> Shared conversation about this idea. Updates live for everyone.</p>
      <div className="threads">{msgs.length === 0 && <p className="muted">No messages yet.</p>}{msgs.map(m => <div key={m.id} className="thread"><div className="comment"><span className="avatar" aria-hidden>{m.author_type === 'agent' ? 'A' : who(m.author_id)[0]}</span><div><p className="comment-head">{m.author_type === 'agent' ? 'Agent' : who(m.author_id)} · {m.created_at}</p><p style={{ whiteSpace: 'pre-wrap' }}>{m.body}</p></div></div></div>)}</div>
      <div className="composer"><label className="sr" htmlFor="api-composer">Message</label><textarea id="api-composer" rows={2} value={text} onChange={e => setText(e.target.value)} placeholder="Write a message" /><Button disabled={!text.trim()} onClick={post}>Post</Button></div>
      <div className="panel generate-box">
        <h3><Icon name="sparkle" size={16} /> Generate a version</h3>
        <p className="small muted">Separate from the discussion. Describe the change you want; the agent designs it and arcade.ai renders a real product (1 to 2 minutes). It becomes a new branch and never replaces the original.</p>
        {run && run.status === 'running' && <p className="assist"><Icon name="sparkle" size={16} />Your request is running: {run.stage}. Progress shows in the render area above.</p>}
        <div className="composer"><label className="sr" htmlFor="api-generate">Instruction</label><input id="api-generate" value={instruction} onChange={e => setInstruction(e.target.value)} placeholder="e.g. same clowns but pastel, linen 20x20" onKeyDown={e => { if (e.key === 'Enter' && instruction.trim()) generate(); }} /><Button disabled={busy || !instruction.trim()} onClick={generate}>{busy ? 'Starting…' : 'Generate a version'}</Button></div>
      </div>
    </div>
  );
}
export function ApiCoauthors({ p }: { p: Product }) {
  const { views } = useApp(); const headId = views[p.apiId!]?.main_head?.id; // refetch after a merge moves main
  const [list, setList] = useState<ApiCoauthor[] | null>(null);
  useEffect(() => { api.coauthors(p.apiId!).then(setList).catch(() => setList([])); }, [p.apiId, headId]);
  return <div className="panel"><h3>Co-authors <LiveTag /></h3>{!list ? <p className="muted small">Loading…</p> : list.length === 0 ? <p className="small muted">No co-authors yet.</p> : <ul className="list">{list.map(c => <li key={c.type + c.id + (c.on_behalf_of ?? '')} className="list-item"><span>{c.type === 'agent' ? `Agent ${c.id}${c.on_behalf_of ? ' (on behalf of ' + who(c.on_behalf_of) + ')' : ''}` : who(c.id)}</span><span className="muted">{c.revisions} revisions</span></li>)}</ul>}</div>;
}
export function ApiProposals({ p }: { p: Product }) {
  const { views, reloadApi, showToast } = useApp(); const v = views[p.apiId!]; const [diff, setDiff] = useState<Record<string, { path: string; kind: string }[]>>({});
  const open = v?.open_proposals ?? [];
  return <div className="panel"><h3>Open proposals <LiveTag /></h3>{open.length === 0 ? <p className="small muted">No open proposals.</p> : open.map(pr => <div key={pr.id} className="stack"><p><strong>{pr.summary}</strong></p>
    {diff[pr.id] ? <ul className="small">{diff[pr.id].map(d => <li key={d.path}>{d.kind}: {d.path}</li>)}</ul> : <button className="link small" onClick={() => api.proposal(pr.id).then(r => setDiff(s => ({ ...s, [pr.id]: r.diff })))}>View changes</button>}
    <Button variant="secondary" onClick={() => api.merge(pr.id).then(() => { showToast('Proposal merged'); reloadApi(); }).catch(e => showToast((e as Error).message))}>Merge proposal</Button></div>)}</div>;
}
export function ApiRelease({ p }: { p: Product }) {
  const { showToast } = useApp(); const [rel, setRel] = useState<{ id: string; version: string } | null>(null); const [url, setUrl] = useState(''); const [busy, setBusy] = useState(false);
  const act = async (f: () => Promise<void>) => { setBusy(true); try { await f(); } catch (e) { showToast((e as Error).message); } finally { setBusy(false); } };
  return <div className="panel"><h3>Release and store <LiveTag /></h3>
    <p className="small muted">A release freezes the current version. Open store creates a checkout on arcade.ai (requires a product generated by the agent). It is not a confirmed launch.</p>
    {!rel ? <Button variant="secondary" disabled={busy} onClick={() => act(async () => setRel(await api.createRelease(p.apiId!)))}>Create release</Button>
      : <><p className="small">Release {rel.version} created.</p>{url ? <a className="btn btn-secondary" href={url} target="_blank" rel="noreferrer">Open checkout</a> : <Button disabled={busy} onClick={() => act(async () => { const r = await api.openStore(rel.id); setUrl(r.checkout_url ?? ''); if (!r.checkout_url) showToast('Store opened'); })}>Open store</Button>}</>}
  </div>;
}
