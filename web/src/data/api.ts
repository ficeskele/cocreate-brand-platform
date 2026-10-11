// Real backend adapter (Hono API in src/). Everything here is tagged "Backend" in the UI.
// In `vite dev` requests go to /api/* and are proxied to :3456; in the built app (served at /app/) they hit the same origin.
import type { Product } from './mock';

const BASE = import.meta.env.DEV ? '/api' : '';
const USER_KEY = 'droplab-api-user';

export const getUserId = () => { try { return localStorage.getItem(USER_KEY) || 'u_alice'; } catch { return 'u_alice'; } };
export const setUserId = (u: string) => { try { localStorage.setItem(USER_KEY, u); } catch { /* ignore */ } };

async function req<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE + path, { method, headers: { 'content-type': 'application/json', 'x-user-id': getUserId() }, body: body === undefined ? undefined : JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: { message?: string } }).error?.message ?? res.statusText);
  return json as T;
}

// ---- backend shapes (subset) ----
export interface ApiSpec {
  name: string; tagline: string; concept: string; category: string; target_audience: string;
  features: { id: string; text: string }[]; materials: { id: string; name: string }[]; colorways: { id: string; name: string; hex: string }[];
  price_target: { currency: string; min: number | null; max: number | null };
  images: { url: string; role: 'pattern' | 'hero' | 'closeup' }[];
  arcade: { productId: string | null; unitPrice: { amount: string; currency: string } | null; maker: { name: string } | null; categoryName: string | null };
}
export interface ApiRevision { id: string; branch_id: string; author_type: 'user' | 'agent'; author_id: string; on_behalf_of_user_id: string | null; content: ApiSpec; summary: string; created_at: string }
export interface ApiBranch { id: string; product_id: string; name: string; kind: 'main' | 'human' | 'agent'; head_revision_id: string | null; created_by_type: string; created_by_id: string; created_at: string }
export interface ApiProposal { id: string; product_id: string; source_branch_id: string; source_revision_id: string; status: 'open' | 'merged'; opened_by_type: string; opened_by_id: string; summary: string; created_at: string }
export interface ApiMessage { id: string; product_id: string; author_type: 'user' | 'agent'; author_id: string; body: string; agent_run_id: string | null; created_at: string }
export interface ApiCoauthor { type: 'user' | 'agent'; id: string; on_behalf_of: string | null; revisions: number; handle: string }
export interface ApiProductView { id: string; brand_id: string; name: string; main_branch_id: string; created_at: string; main_head: ApiRevision | null; branches: ApiBranch[]; open_proposals: ApiProposal[]; messages: ApiMessage[] }
export interface ApiBrand { id: string; name: string; slug: string; identity: { mission: string; voice: string; palette: string[] }; created_by: string; products: { id: string; name: string }[] }
export interface ApiAgentRun { id: string; status: 'running' | 'succeeded' | 'failed'; stage: string; error: string | null; output_proposal_id: string | null }

export const api = {
  brands: () => req<ApiBrand[]>('GET', '/brands'),
  product: (id: string) => req<ApiProductView>('GET', `/products/${id}`),
  revision: (id: string) => req<ApiRevision>('GET', `/revisions/${id}`),
  messages: (id: string) => req<ApiMessage[]>('GET', `/products/${id}/messages`),
  postMessage: (id: string, body: string) => req<{ message: ApiMessage; agent_run_id: string | null }>('POST', `/products/${id}/messages`, { body }),
  agentRun: async (id: string) => { const r = await req<ApiAgentRun>('GET', `/agent-runs/${id}`); return { id: r.id, stage: r.stage, status: r.status, error: r.error }; },
  coauthors: (id: string) => req<ApiCoauthor[]>('GET', `/products/${id}/coauthors`),
  proposal: (id: string) => req<ApiProposal & { source: ApiRevision; main: ApiRevision | null; diff: { path: string; kind: 'added' | 'changed' | 'removed'; before?: unknown; after?: unknown }[] }>('GET', `/proposals/${id}`),
  merge: (id: string) => req<{ proposal: ApiProposal; coauthors: ApiCoauthor[] }>('POST', `/proposals/${id}/merge`),
  createRelease: (id: string) => req<{ id: string; version: string; export_payload: unknown }>('POST', `/products/${id}/releases`),
  openStore: (relId: string) => req<{ checkout_url: string; product: { title: string; unitPrice: { amount: string; currency: string } } }>('POST', `/releases/${relId}/open-store`),
};

const FALLBACK_RENDER = `${import.meta.env.BASE_URL}renders/placeholder.svg`;
const pick = (spec: ApiSpec | undefined) => spec?.images.find(i => i.role === 'hero')?.url ?? spec?.images.find(i => i.role === 'pattern')?.url ?? FALLBACK_RENDER;
const statusOf = (spec: ApiSpec | undefined, versions: number): Product['status'] => spec?.arcade?.productId ? 'In evaluation' : versions > 0 ? 'Has versions' : 'Idea';

function toProduct(view: ApiProductView, spec: ApiSpec | undefined, opts: { id: string; slug: string; parentId: string | null; author: string; createdAt: string; apiId: string; title?: string; change?: string; reason?: string; versions?: number }): Product {
  return {
    id: opts.id, slug: opts.slug, parentId: opts.parentId, title: opts.title ?? spec?.name ?? view.name, author: opts.author,
    category: spec?.category || 'Backend', status: statusOf(spec, opts.versions ?? 0), image: pick(spec),
    need: spec?.target_audience ?? '', description: spec?.concept ?? '', usage: spec?.tagline ?? '',
    change: opts.change, reason: opts.reason,
    features: spec?.features.map(f => f.text) ?? [], votes: { up: 0, down: 0 }, followers: 0, createdAt: opts.createdAt.slice(0, 10),
    imageRights: spec?.images.length ? [{ label: 'Render arcade.ai', owner: 'arcade.ai', commercialOk: true }] : [],
    source: 'api', apiId: opts.apiId,
  };
}

/** Brands/products become ideas; non-main branches with a head become derived versions. */
export async function loadApiProducts(): Promise<{ products: Product[]; views: Record<string, ApiProductView> }> {
  const brands = await api.brands();
  const products: Product[] = []; const views: Record<string, ApiProductView> = {};
  for (const b of brands) {
    for (const p of b.products) {
      const view = await api.product(p.id); views[p.id] = view;
      const spec = view.main_head?.content;
      const branches = view.branches.filter(x => x.kind !== 'main' && x.head_revision_id);
      const rootId = `api-${p.id}`;
      products.push(toProduct(view, spec, { id: rootId, slug: rootId, parentId: null, author: b.created_by, createdAt: view.created_at, apiId: p.id, versions: branches.length }));
      for (const br of branches) {
        const head = await api.revision(br.head_revision_id!).catch(() => null);
        const vid = `api-${br.id}`;
        products.push(toProduct(view, head?.content ?? spec, {
          id: vid, slug: vid, parentId: rootId, apiId: p.id,
          author: head?.author_type === 'agent' ? `agent:${head.author_id}` : (head?.author_id ?? br.created_by_id),
          createdAt: br.created_at, title: head?.content.name, change: head?.summary, reason: head?.on_behalf_of_user_id ? `requested by ${head.on_behalf_of_user_id.replace(/^u_/, '')}` : undefined,
        }));
      }
    }
  }
  return { products, views };
}
