// Demo data (tagged "Demo" in the UI). Reconstructed from the components' usage; replace freely.
export type Status = 'Idea' | 'Has versions' | 'In evaluation' | 'Launched';
export interface ImageRight { label: string; owner: string; commercialOk: boolean }
export interface Product {
  id: string; slug: string; parentId: string | null; title: string; author: string; category: string; status: Status; image: string;
  need: string; description: string; usage: string; change?: string; reason?: string; features: string[];
  votes: { up: number; down: number }; followers: number; createdAt: string; imageRights: ImageRight[];
  source?: 'demo' | 'api'; apiId?: string;
}
export interface Comment { id: string; productId: string; author: string; text: string; parentId: string | null; time: string; pin?: { n: number; x: number; y: number }; useful?: boolean }

const render = (f: string) => `${import.meta.env.BASE_URL}renders/${f}.jpg`; // arcade.ai hero renders, see web/public/renders

export const people: Record<string, { name: string }> = {
  u_alice: { name: 'alice' }, u_bob: { name: 'bob' }, u_carol: { name: 'carol' }, anna: { name: 'Anna R.' }, lucas: { name: 'Lucas M.' }, sophie: { name: 'Sophie T.' }, mark: { name: 'Mark V.' }, 'arcade.ai': { name: 'arcade.ai' },
};

export const products: Product[] = [
  { id: 'p1', slug: 'clown-pillow', parentId: null, title: 'Circus clown cushion', author: 'anna', category: 'Home', status: 'Has versions', image: render('clown-pillow'),
    need: 'A cushion loud enough to carry a plain sofa.', description: 'Linen cushion cover printed with dancing circus clowns on a cream ground, 20 x 20 in, hidden zip.', usage: 'Living room sofa, reading corner.',
    features: ['Linen cover', 'Hidden zip', '20 x 20 in'], votes: { up: 128, down: 6 }, followers: 41, createdAt: '2026-09-28', imageRights: [{ label: 'arcade.ai render', owner: 'anna', commercialOk: true }] },
  { id: 'p2', slug: 'clowns-riding-cats', parentId: 'p1', title: 'Version with clowns riding cats', author: 'lucas', category: 'Home', status: 'In evaluation', image: render('clowns-riding-cats'),
    need: 'A cushion loud enough to carry a plain sofa.', description: 'Same clowns, now riding cats on a slate grey ground that hides wear.', usage: 'Living room sofa, reading corner.',
    change: 'Put the clowns on cats and darken the ground', reason: 'Reads better on a light sofa and hides marks',
    features: ['Linen cover', 'Hidden zip', '20 x 20 in', 'Slate ground'], votes: { up: 86, down: 3 }, followers: 27, createdAt: '2026-10-03', imageRights: [{ label: 'Own image', owner: 'lucas', commercialOk: false }, { label: 'Inherited image', owner: 'anna', commercialOk: true }] },
  { id: 'p3', slug: 'pastel-circus-pillow', parentId: null, title: 'Pastel watercolor circus cushion', author: 'sophie', category: 'Home', status: 'Idea', image: render('pastel-circus-pillow'),
    need: 'Something playful that still fits a calm bedroom.', description: 'Watercolor acrobats and jugglers in pastel tones on a pale blue ground.', usage: 'Bedroom, nursery.',
    features: ['Watercolor print', 'Pastel palette', 'Machine washable'], votes: { up: 54, down: 2 }, followers: 19, createdAt: '2026-10-06', imageRights: [{ label: 'arcade.ai render', owner: 'sophie', commercialOk: true }] },
  { id: 'p4', slug: 'chinoiserie-pillow', parentId: null, title: 'Orange chinoiserie cushion', author: 'mark', category: 'Home', status: 'Idea', image: render('chinoiserie-pillow'),
    need: 'A warm accent cushion for a neutral armchair.', description: 'Pavilions, pines and birds in burnt orange on a soft grey ground, velvet feel.', usage: 'Armchair, window seat.',
    features: ['Velvet feel', 'Burnt orange', 'Pattern-matched seams'], votes: { up: 33, down: 1 }, followers: 12, createdAt: '2026-10-08', imageRights: [{ label: 'arcade.ai render', owner: 'mark', commercialOk: true }] },
];

/** Products loaded from the backend; AppState fills it so byId/rootOf also resolve them. */
export const extra: Product[] = [];

export const comments: Comment[] = [
  { id: 'c1', productId: 'p1', author: 'lucas', text: 'The cream ground will show every mark. A darker version would hide wear.', parentId: null, time: '3d ago', pin: { n: 1, x: 0.72, y: 0.55 }, useful: true },
  { id: 'c2', productId: 'p1', author: 'anna', text: 'Fair point, I will try a slate ground in the next version.', parentId: 'c1', time: '3d ago' },
  { id: 'c3', productId: 'p1', author: 'sophie', text: 'Is the zip hidden in the back seam or on the side?', parentId: null, time: '1d ago', pin: { n: 2, x: 0.3, y: 0.25 } },
  { id: 'c4', productId: 'p2', author: 'mark', text: 'The cats should be a little bigger.', parentId: null, time: '5h ago' },
];

export const byId = (id?: string | null) => (id ? [...products, ...extra].find(p => p.id === id) : undefined);
export const rootOf = (p: Product): Product => { let cur = p; for (let i = 0; i < 20; i++) { const parent = byId(cur.parentId); if (!parent) break; cur = parent; } return cur; };
export const urlOf = (p: Product) => { const root = rootOf(p); return root.id === p.id ? `/i/${root.slug}` : `/i/${root.slug}/v/${p.slug}`; };

export const topics = ['cushion', 'clown', 'sofa', 'bedroom', 'kitchen', 'pets'];

export const notifications: { id: string; kind: 'launch' | 'comment' | 'proposal' | 'vote'; title: string; detail: string; to: string; unread: boolean }[] = [
  { id: 'n1', kind: 'proposal', title: 'Urban Route made a commercial proposal', detail: 'Version with clowns riding cats · pending approval', to: '/earnings', unread: true },
  { id: 'n2', kind: 'comment', title: 'New pinned comment on your idea', detail: 'Sophie T. asked about the zip', to: '/i/clown-pillow?pin=2', unread: true },
  { id: 'n3', kind: 'vote', title: 'Your version passed 80 votes', detail: 'Version with clowns riding cats', to: '/i/clown-pillow/v/clowns-riding-cats', unread: false },
];

export const PRIVACY_MIN = 5;
export interface Interest { unique: number; responses: number; intent: number; price: { label: string; pct: number }[] }
const interestData: Record<string, Interest> = {
  p1: { unique: 212, responses: 64, intent: 58, price: [{ label: '< $25', pct: 12 }, { label: '$25–40', pct: 46 }, { label: '$40–60', pct: 31 }, { label: '> $60', pct: 11 }] },
  p2: { unique: 140, responses: 37, intent: 63, price: [{ label: '< $25', pct: 8 }, { label: '$25–40', pct: 41 }, { label: '$40–60', pct: 38 }, { label: '> $60', pct: 13 }] },
  p3: { unique: 71, responses: 9, intent: 44, price: [{ label: '< $25', pct: 22 }, { label: '$25–40', pct: 45 }, { label: '$40–60', pct: 22 }, { label: '> $60', pct: 11 }] },
  p4: { unique: 40, responses: 3, intent: 0, price: [] },
};
/** Aggregated interest per idea. Unknown ids (e.g. backend products) get an empty aggregate instead of undefined. */
export const interest: Record<string, Interest> = new Proxy(interestData, { get: (t, k: string) => t[k] ?? { unique: 0, responses: 0, intent: 0, price: [] } });

export const proposal = {
  merchant: 'Urban Route', retail: 35, royaltyPool: 5,
  split: [{ who: 'anna', role: 'Original idea', amount: 2.5 }, { who: 'lucas', role: 'Version', amount: 2 }, { who: 'sophie', role: 'Useful feedback', amount: 0.5 }],
  approvals: [{ who: 'anna', state: 'Approved' }, { who: 'lucas', state: 'Pending' }, { who: 'sophie', state: 'Pending' }] as { who: string; state: 'Approved' | 'Pending' }[],
};
