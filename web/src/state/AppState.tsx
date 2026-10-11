import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { loadApiProducts, getUserId, setUserId as persistUser, type ApiProductView } from '../data/api';
import { extra } from '../data/mock';
import { products as seedProducts, comments as seedComments, type Product, type Comment } from '../data/mock';

type Vote = 'up' | 'down' | null;
export interface User { name: string; email: string; prefs: { activity: boolean; commercial: boolean } }
export interface PurchaseInterest { price: string; intent: string }
export interface Draft { id: string; productId: string; title: string; createdAt: string; launched: boolean }
interface Pending { label: string; run: () => void }
interface Ctx {
  user: User | null; signUp: (u: User) => void; signOut: () => void;
  mode: 'consumer' | 'merchant'; setMode: (m: 'consumer' | 'merchant') => void;
  products: Product[]; addProduct: (p: Product) => void;
  comments: Comment[]; addComment: (c: Comment) => void;
  votes: Record<string, Vote>; vote: (id: string, v: 'up' | 'down') => void;
  follows: Record<string, boolean>; toggleFollow: (id: string) => void;
  interest: Record<string, PurchaseInterest>; setInterest: (id: string, i: PurchaseInterest) => void;
  minRoyalty: Record<string, string>; setMinRoyalty: (id: string, v: string) => void;
  requireAuth: (label: string, run: () => void) => void;
  pending: Pending | null; authOpen: boolean; closeAuth: () => void;
  toast: string | null; showToast: (t: string) => void;
  drafts: Draft[]; addDraft: (d: Draft) => void; launchDraft: (id: string) => void;
  selected: string[]; toggleSelected: (id: string) => void;
  backend: 'loading' | 'online' | 'offline'; views: Record<string, ApiProductView>; reloadApi: () => void;
  apiUser: string; setApiUser: (u: string) => void;
}
const C = createContext<Ctx | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<'consumer' | 'merchant'>('consumer');
  const [products, setProducts] = useState(seedProducts);
  const [comments, setComments] = useState(seedComments);
  const [votes, setVotes] = useState<Record<string, Vote>>({});
  const [follows, setFollows] = useState<Record<string, boolean>>({});
  const [interest, setInterestS] = useState<Record<string, PurchaseInterest>>({});
  const [minRoyalty, setMinRoyaltyS] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<Pending | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [selected, setSelected] = useState<string[]>(['p1']);
  const [backend, setBackend] = useState<'loading' | 'online' | 'offline'>('loading');
  const [views, setViews] = useState<Record<string, ApiProductView>>({});
  const [apiUser, setApiUserS] = useState(getUserId());
  const reloadApi = useCallback(() => {
    loadApiProducts().then(({ products: ap, views }) => {
      extra.splice(0, extra.length, ...ap); setViews(views); setBackend('online');
      setProducts(ps => [...ps.filter(p => p.source !== 'api'), ...ap]);
    }).catch(() => setBackend('offline')); // sin backend: solo datos Demo
  }, []);
  useEffect(() => { reloadApi(); }, [reloadApi]);
  const tRef = useRef<number | undefined>(undefined);
  const showToast = useCallback((t: string) => { setToast(t); window.clearTimeout(tRef.current); tRef.current = window.setTimeout(() => setToast(null), 2400); }, []);
  const requireAuth = useCallback((label: string, run: () => void) => {
    if (user) return run();
    setPending({ label, run }); setAuthOpen(true);
  }, [user]);
  const signUp = useCallback((u: User) => {
    setUser(u); setAuthOpen(false);
    // Continúa la acción pendiente (R2)
    setPending(p => { if (p) setTimeout(p.run, 0); return null; });
  }, []);
  const value = useMemo<Ctx>(() => ({
    user, signUp, signOut: () => { setUser(null); setMode('consumer'); },
    mode, setMode, products, addProduct: p => setProducts(ps => [...ps, p]),
    comments, addComment: c => setComments(cs => [...cs, c]),
    votes, vote: (id, v) => setVotes(s => ({ ...s, [id]: s[id] === v ? null : v })), // exclusivo y reversible (R5)
    follows, toggleFollow: id => setFollows(s => ({ ...s, [id]: !s[id] })),
    interest, setInterest: (id, i) => setInterestS(s => ({ ...s, [id]: i })),
    minRoyalty, setMinRoyalty: (id, v) => setMinRoyaltyS(s => ({ ...s, [id]: v })),
    requireAuth, pending, authOpen, closeAuth: () => { setAuthOpen(false); setPending(null); },
    toast, showToast,
    drafts, addDraft: d => setDrafts(ds => [...ds, d]), launchDraft: id => setDrafts(ds => ds.map(d => d.id === id ? { ...d, launched: true } : d)),
    selected, toggleSelected: id => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]),
    backend, views, reloadApi, apiUser, setApiUser: (u: string) => { persistUser(u); setApiUserS(u); },
  }), [backend, views, reloadApi, apiUser, user, signUp, mode, products, comments, votes, follows, interest, minRoyalty, requireAuth, pending, authOpen, toast, showToast, drafts, selected]);
  return <C.Provider value={value}>{children}</C.Provider>;
}
export const useApp = () => { const c = useContext(C); if (!c) throw new Error('AppProvider missing'); return c; };
export const voteCount = (p: Product, v: Vote) => p.votes.up - p.votes.down + (v === 'up' ? 1 : v === 'down' ? -1 : 0);
