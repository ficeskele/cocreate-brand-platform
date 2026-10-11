import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { Button, personName, ProductImage } from './ui';
import { useApp } from '../state/AppState';
import type { Product } from '../data/mock';
import { useNavigate } from 'react-router-dom';

// Pins on the image linked to their thread (R7)
export function Comments({ p, initialPin }: { p: Product; initialPin?: number }) {
  const { comments, addComment, requireAuth, user } = useApp(); const nav = useNavigate();
  const list = comments.filter(c => c.productId === p.id);
  const roots = list.filter(c => !c.parentId);
  const [sel, setSel] = useState<number | null>(initialPin ?? null);
  const [marking, setMarking] = useState(false); const [draftPin, setDraftPin] = useState<{ x: number; y: number } | null>(null);
  const [text, setText] = useState(''); const [replyTo, setReplyTo] = useState<string | null>(null);
  const refs = useRef<Record<number, HTMLDivElement | null>>({});
  useEffect(() => { if (sel && refs.current[sel]) refs.current[sel]!.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [sel]);
  const nextN = Math.max(0, ...list.map(c => c.pin?.n ?? 0)) + 1;
  const post = () => requireAuth('comment', () => {
    if (!text.trim()) return;
    addComment({ id: 'c' + Date.now(), productId: p.id, author: 'me', text, parentId: replyTo, time: 'now', pin: draftPin && !replyTo ? { n: nextN, ...draftPin } : undefined });
    if (draftPin) setSel(nextN); setText(''); setDraftPin(null); setMarking(false); setReplyTo(null);
  });
  return (
    <div className="comments">
      <div className={`pin-stage${marking ? ' marking' : ''}`} onClick={e => { if (!marking) return; const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect(); setDraftPin({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }); }}>
        <ProductImage p={p}>
          {list.filter(c => c.pin).map(c => <button key={c.id} className={`pin${sel === c.pin!.n ? ' on' : ''}`} style={{ left: `${c.pin!.x * 100}%`, top: `${c.pin!.y * 100}%` }} onClick={e => { e.stopPropagation(); setSel(c.pin!.n); }} aria-label={`View comment for pin ${c.pin!.n}`}>{c.pin!.n}</button>)}
          {draftPin && <span className="pin on" style={{ left: `${draftPin.x * 100}%`, top: `${draftPin.y * 100}%` }}>{nextN}</span>}
        </ProductImage>
      </div>
      <div className="comments-tools">
        <button className="util" onClick={() => requireAuth('mark the image', () => { setMarking(m => !m); setDraftPin(null); })}><Icon name="pin" size={18} />{marking ? (draftPin ? 'Point marked' : 'Tap the image') : 'Add feedback on the image'}</button>
      </div>
      <div className="threads">
        {roots.length === 0 && <p className="muted">What would you change? Be the first to comment.</p>}
        {roots.map(c => (
          <div key={c.id} ref={el => { if (c.pin) refs.current[c.pin.n] = el; }} className={`thread${c.pin && sel === c.pin.n ? ' on' : ''}`} onClick={() => c.pin && setSel(c.pin.n)}>
            <div className="comment">
              {c.pin ? <span className="pin static">{c.pin.n}</span> : <span className="avatar" aria-hidden>{personName(c.author)[0]}</span>}
              <div>
                <p className="comment-head">{c.author === 'me' ? (user?.name ?? 'You') : personName(c.author)} · {c.time}{c.useful && <span className="useful">Useful feedback</span>}</p>
                <p>{c.text}</p>
                <div className="comment-actions"><button onClick={e => { e.stopPropagation(); setReplyTo(c.id); }}>Reply</button><button onClick={e => { e.stopPropagation(); requireAuth('turn the feedback into a version', () => nav(`/create-version/${p.slug}?from=${c.id}`)); }}>Turn this suggestion into a version</button><button aria-label="Report"><Icon name="flag" size={14} /></button></div>
              </div>
            </div>
            {list.filter(r => r.parentId === c.id).map(r => <div key={r.id} className="comment reply"><span className="avatar" aria-hidden>{personName(r.author)[0]}</span><div><p className="comment-head">{r.author === 'me' ? (user?.name ?? 'You') : personName(r.author)} · {r.time}</p><p>{r.text}</p></div></div>)}
          </div>
        ))}
      </div>
      <div className="composer">
        {replyTo && <p className="small muted">Replying · <button className="link" onClick={() => setReplyTo(null)}>cancel</button></p>}
        <label className="sr" htmlFor="composer">Your feedback</label>
        <textarea id="composer" rows={2} value={text} onChange={e => setText(e.target.value)} placeholder={draftPin ? `Comment for pin ${nextN}` : 'Share a suggestion or ask a question…'} />
        <Button onClick={post} disabled={!text.trim()}>Post comment</Button>
      </div>
    </div>
  );
}
