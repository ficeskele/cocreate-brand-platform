// Cliente del backend real (Hono, cocreate-brand-platform). Solo endpoints que existen.
// Lo demás (votos, seguir, interés, regalías, derechos, notificaciones, Shopify) sigue en mock.ts, marcado Demo.
import type { Product } from './mock';

const BASE = import.meta.env.VITE_API_BASE ?? (import.meta.env.DEV ? '/api' : '');
let userId = localStorage.getItem('droplab-x-user-id') ?? 'u_alice';
export const getUserId = () => userId;
export const setUserId = (u: string) => { userId = u; localStorage.setItem('droplab-x-user-id', u); };

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(BASE + path, { ...init, headers: { 'content-type': 'application/json', 'x-user-id': userId, ...(init?.headers ?? {}) } });
  if (!r.ok) { const b = await r.json().catch(() => ({})); throw new Error(b?.error?.message ?? `HTTP ${r.status}`); }
  return r.json() as Promise<T>;
}

export interface ApiSpec { name: string; tagline: string; concept: string; category: string; target_audience: string; features: { id: string; text: string }[]; images: { url: string; role: string }[]; price_target: { currency: string; min: number | null; max: number | null }; arcade: { productId: string | null } }
export interface ApiBranch { id: string; product_id: string; name: string; kind: string; head_revision_id: string | null; created_by_type: string; created_by_id: string; created_at: string }
export interface ApiMessage { id: string; product_id: string; author_type: 'user' | 'agent'; author_id: string; body: string; agent_run_id: string | null; created_at: string }
export interface ApiProposal { id: string; product_id: string; summary: string; status: string; source_revision_id: string; created_at: string }
export interface ApiProductView { id: string; brand_id: string; name: string; main_branch_id: string; created_at: string; main_head?: { id: string; content: ApiSpec | string; author_type: string; author_id: string }; branches: ApiBranch[]; open_proposals: ApiProposal[]; messages: ApiMessage[] }
export interface ApiCoauthor { type: 'user' | 'agent'; id: string; on_behalf_of: string | null; revisions: number }

export const api = {
  health: () => req<{ ok: boolean }>('/health'),
  brands: () => req<{ id: string; name: string; products: { id: string; name: string }[] }[]>('/brands'),
  product: (id: string) => req<ApiProductView>(`/products/${id}`),
  messages: (id: string) => req<ApiMessage[]>(`/products/${id}/messages`),
  postMessage: (id: string, body: string) => req<{ message: ApiMessage; agent_run_id: string | null }>(`/products/${id}/messages`, { method: 'POST', body: JSON.stringify({ body }) }),
  agentRun: (id: string) => req<{ id: string; status: string; stage: string }>(`/agent-runs/${id}`),
  coauthors: (id: string) => req<ApiCoauthor[]>(`/products/${id}/coauthors`),
  proposal: (id: string) => req<ApiProposal & { diff: { path: string; kind: string }[] }>(`/proposals/${id}`),
  merge: (id: string) => req<{ proposal: ApiProposal }>(`/proposals/${id}/merge`, { method: 'POST' }),
  createRelease: (productId: string) => req<{ id: string; version: string }>(`/products/${productId}/releases`, { method: 'POST' }),
  openStore: (releaseId: string) => req<{ checkout_url?: string }>(`/releases/${releaseId}/open-store`, { method: 'POST' }),
};

const imgUrl = (u?: string) => (!u ? `${import.meta.env.BASE_URL}renders/placeholder.svg` : u.startsWith('http') || u.startsWith('/') ? (import.meta.env.DEV && u.startsWith('/images') ? '/api' + u : u) : u);
const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 48);

// Producto del backend → idea original; ramas no-main → versiones derivadas.
export function toProducts(v: ApiProductView): Product[] {
  const spec: ApiSpec | null = v.main_head ? (typeof v.main_head.content === 'string' ? JSON.parse(v.main_head.content) : v.main_head.content) : null;
  const base: Product = {
    id: 'api:' + v.id, apiId: v.id, source: 'api', slug: slugify(v.name) + '-' + v.id.slice(0, 6), parentId: null, title: spec?.name ?? v.name, author: v.main_head?.author_id ?? 'u_alice',
    category: spec?.category ?? 'General', status: 'Idea', image: imgUrl(spec?.images?.find(i => i.role === 'hero')?.url ?? spec?.images?.[0]?.url),
    need: spec?.tagline ?? '', description: spec?.concept ?? '', usage: spec?.target_audience ?? '', features: spec?.features?.map(f => f.text) ?? [],
    votes: { up: 0, down: 0 }, followers: 0, createdAt: v.created_at?.slice(0, 10) ?? '', imageRights: (spec?.images ?? []).map(i => ({ label: `Imagen ${i.role} (arcade.ai)`, owner: v.main_head?.author_id ?? 'u_alice', commercialOk: false })),
  };
  const versions: Product[] = v.branches.filter(b => b.kind !== 'main').map(b => ({ ...base, id: 'api:' + v.id + ':' + b.id, apiBranchId: b.id, slug: base.slug + '-' + slugify(b.name), parentId: base.id, title: `${base.title} · ${b.name}`, author: b.created_by_id, change: `Rama “${b.name}”`, reason: b.created_by_type === 'agent' ? 'Propuesta del agente de concepto' : 'Propuesta de la comunidad' }));
  return [base, ...versions];
}
export async function loadApiProducts(): Promise<{ products: Product[]; views: Record<string, ApiProductView> }> {
  const brands = await api.brands();
  const views = await Promise.all(brands.flatMap(b => b.products).map(p => api.product(p.id)));
  return { products: views.flatMap(toProducts), views: Object.fromEntries(views.map(v => [v.id, v])) };
}
