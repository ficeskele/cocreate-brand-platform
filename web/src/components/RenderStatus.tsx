// Media area for backend ideas: the render if there is one; live, animated progress of the agent
// runs generating versions of this idea; failures with their message; and a strip of the versions
// that already have renders. Branches never replace the original.
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../data/api';
import { useApp } from '../state/AppState';
import type { Product } from '../data/mock';
import { urlOf } from '../data/mock';
import { Icon } from './Icon';

type Run = Awaited<ReturnType<typeof api.agentRun>> & { by: string };
const STAGES: { id: string; label: string }[] = [
  { id: 'designing', label: 'Designing' },
  { id: 'generating', label: 'arcade.ai pattern' },
  { id: 'building', label: 'arcade.ai product' },
  { id: 'done', label: 'Done' },
];
const who = (id: string) => id.replace(/^u_/, '');

function Progress({ running }: { running: Run[] }) {
  return (
    <div className="gen">
      <div className="gen-orb" aria-hidden />
      <p className="gen-title">Generating {running.length > 1 ? `${running.length} versions` : 'a version'}…</p>
      {running.map(r => (
        <div key={r.id} className="gen-run">
          <span className="gen-by">{who(r.by)}</span>
          <ol className="gen-stages" aria-label={`Progress for ${who(r.by)}'s request`}>
            {STAGES.map((s, i) => { const cur = STAGES.findIndex(x => x.id === r.stage); return <li key={s.id} className={i < cur ? 'done' : i === cur ? 'on' : ''}>{s.label}</li>; })}
          </ol>
        </div>
      ))}
      <p className="tiny muted">Pattern generation on arcade.ai takes 1 to 2 minutes. This page updates by itself.</p>
    </div>
  );
}

const Failure = ({ r }: { r: Run }) => <p className="gen-error" role="alert"><Icon name="alert" size={14} /> {who(r.by)}'s run failed: {r.error ?? 'unknown error'}</p>;

export function RenderStatus({ p }: { p: Product }) {
  const { products, reloadApi, apiUser, showToast } = useApp(); const nav = useNavigate();
  const [runs, setRuns] = useState<Run[]>([]);
  const versions = products.filter(x => x.parentId === p.id && x.source === 'api');
  // refs so the polling closure always sees the latest values without re-creating the interval
  const versionIdsRef = useRef<string[]>([]); versionIdsRef.current = versions.map(v => v.id);
  const apiUserRef = useRef(apiUser); apiUserRef.current = apiUser;
  const myFinishedRef = useRef<{ before: string[] } | null>(null);
  const seenRunningRef = useRef<Set<string>>(new Set());

  // poll this idea's agent runs every 2s; when one finishes, reload so the new version appears
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const msgs = await api.messages(p.apiId!);
        const ids = msgs.filter(m => m.agent_run_id && m.author_type === 'user').map(m => ({ id: m.agent_run_id!, by: m.author_id }));
        const list = await Promise.all(ids.slice(-6).map(async ({ id, by }) => ({ ...(await api.agentRun(id)), by })));
        if (stop) return;
        setRuns(list);
        const justFinished = list.filter(r => r.status !== 'running' && seenRunningRef.current.has(r.id));
        for (const r of list) { if (r.status === 'running') seenRunningRef.current.add(r.id); else seenRunningRef.current.delete(r.id); }
        if (justFinished.length) {
          if (justFinished.some(r => r.by === apiUserRef.current && r.status === 'succeeded')) myFinishedRef.current = { before: [...versionIdsRef.current] };
          reloadApi();
        }
      } catch { /* keep the last state */ }
    };
    tick();
    const t = setInterval(tick, 2000);
    return () => { stop = true; clearInterval(t); };
  }, [p.apiId, reloadApi]);

  // my run finished and the reload brought a new version: open it
  useEffect(() => {
    const pending = myFinishedRef.current; if (!pending) return;
    const fresh = versions.filter(v => !pending.before.includes(v.id));
    if (fresh.length) { myFinishedRef.current = null; showToast('Your version is ready'); nav(urlOf(fresh[fresh.length - 1])); }
  }, [versions, nav, showToast]);

  const running = runs.filter(r => r.status === 'running');
  // only your own failures, and only for 10 minutes; old or other people's failed runs stay out of the way
  const failed = runs.filter(r => r.status === 'failed' && r.by === apiUser && Date.now() - new Date(r.updated_at.replace(' ', 'T') + 'Z').getTime() < 10 * 60 * 1000).slice(-1);
  const hasImage = !/placeholder\.svg$/.test(p.image);

  return (
    <div className="stack">
      <div className="pimg render-stage" style={{ aspectRatio: '1/1' }}>
        {hasImage ? <img src={p.image} alt={`Concept render: ${p.title}`} /> : (
          <div className="render-empty">
            {running.length > 0 ? <Progress running={running} /> : (
              <div className="gen idle">
                <Icon name="image" size={28} />
                <p className="gen-title">{versions.length ? 'The original has no render; its versions do' : 'No render yet'}</p>
                <p className="tiny muted">{versions.length ? 'Each version is its own branch with its own render. The original is never replaced.' : 'Describe a change in the conversation and confirm the agent\'s draft, or use Generate a version below.'}</p>
              </div>
            )}
            {failed.map(r => <Failure key={r.id} r={r} />)}
          </div>
        )}
        <span className="render-label">{hasImage ? 'Concept render' : running.length ? 'Generating' : 'No render'}</span>
      </div>
      {hasImage && running.length > 0 && <div className="gen-under"><Progress running={running} /></div>}
      {hasImage && failed.map(r => <Failure key={r.id} r={r} />)}
      {versions.length > 0 && (
        <div className="versions-strip" aria-label="Versions of this idea">
          {versions.map(v => <Link key={v.id} to={urlOf(v)} className="versions-thumb" title={v.title}><img src={v.image} alt="" /><span>{v.author.replace(/^u_/, '').replace(/^agent:/, '')}</span></Link>)}
          {running.length > 0 && <div className="versions-thumb pending" aria-hidden><span className="gen-orb small" /><span>soon</span></div>}
        </div>
      )}
    </div>
  );
}
