// Todos los datos de este archivo son ficticios (Demo). Sin backend.
export type Status = 'Idea' | 'Under review' | 'Feasibility confirmed' | 'Looking for a store' | 'Launched';
export interface Person { id: string; name: string; handle: string }
export interface Product {
  id: string; slug: string; parentId: string | null; title: string; author: string; category: string;
  status: Status; image: string; need: string; description: string; usage: string; reason?: string; change?: string;
  features: string[]; votes: { up: number; down: number }; followers: number; createdAt: string;
  imageRights: { label: string; owner: string; commercialOk: boolean }[];
  /** 'api' = viene del backend real; por defecto mock (Demo) */
  source?: 'mock' | 'api'; apiId?: string; apiBranchId?: string;
}
export const people: Record<string, Person> = {
  andres: { id: 'andres', name: 'Andrés R.', handle: '@andres' },
  lucia: { id: 'lucia', name: 'Lucía M.', handle: '@lucia' },
  pablo: { id: 'pablo', name: 'Pablo S.', handle: '@pablo' },
  ines: { id: 'ines', name: 'Inés T.', handle: '@ines' },
  tomas: { id: 'tomas', name: 'Tomás V.', handle: '@tomas' },
  marta: { id: 'marta', name: 'Marta G.', handle: '@marta' },
  diego: { id: 'diego', name: 'Diego P.', handle: '@diego' },
};
const R = (f: string) => `${import.meta.env.BASE_URL}renders/${f}`;
export const products: Product[] = [
  { id: 'p1', slug: 'bolso-bici', parentId: null, title: 'Compact bag for your bike essentials', author: 'andres', category: 'Mobility', status: 'Looking for a store', image: R('bolso-bici.svg'),
    need: 'Keep keys and phone handy without a backpack.', description: 'Small handlebar bag with quick-release clip and inner phone pocket.', usage: 'Short city rides; mounts on the handlebar or frame.',
    features: ['Tool-free mounting', 'Phone pocket', 'Water-resistant fabric'], votes: { up: 141, down: 13 }, followers: 64, createdAt: '2026-09-28',
    imageRights: [{ label: 'Main render', owner: 'andres', commercialOk: true }] },
  { id: 'p2', slug: 'bolso-bici-botella', parentId: 'p1', title: 'Version with a separate bottle compartment', author: 'lucia', category: 'Mobility', status: 'Looking for a store', image: R('bolso-botella.svg'),
    need: 'Keep keys and phone handy without a backpack.', description: 'The same bag with an insulated side compartment for a 500–750 ml bottle.', usage: 'Short rides where you also need water.',
    change: 'Add a separate bottle compartment.', reason: 'Avoid carrying a second bag on short rides.',
    features: ['Bottle compartment', 'Tool-free mounting', 'Side reflector'], votes: { up: 52, down: 6 }, followers: 21, createdAt: '2026-10-04',
    imageRights: [{ label: 'Version render', owner: 'lucia', commercialOk: true }, { label: 'Render inherited from the original', owner: 'andres', commercialOk: false }] },
  { id: 'p3', slug: 'bolso-bici-impermeable', parentId: 'p1', title: 'Waterproof version with magnetic clasp', author: 'pablo', category: 'Mobility', status: 'Idea', image: R('bolso-bici.svg'),
    need: 'Keep keys and phone handy without a backpack.', description: 'Sealed seams and a magnetic-clasp flap.', usage: 'Rainy days.', change: 'Magnetic clasp and sealed seams.', reason: 'Daily use in the rain.',
    features: ['Sealed seams', 'Magnetic clasp'], votes: { up: 22, down: 3 }, followers: 8, createdAt: '2026-10-06', imageRights: [{ label: 'Inherited render', owner: 'andres', commercialOk: false }] },
  { id: 'p4', slug: 'lampara-plegable', parentId: null, title: 'Folding clip-on reading lamp', author: 'ines', category: 'Home', status: 'Idea', image: R('lampara-plegable.svg'),
    need: 'Read at night without waking the person next to you.', description: 'Folding-arm clip lamp with dimmable warm light.', usage: 'Headboard, desk or shelf.',
    features: ['Dimmable warm light', 'Padded clip', 'USB-C battery'], votes: { up: 61, down: 7 }, followers: 19, createdAt: '2026-10-02', imageRights: [{ label: 'Main render', owner: 'ines', commercialOk: true }] },
  { id: 'p5', slug: 'maceta-autorregable', parentId: null, title: 'Self-watering planter for small balconies', author: 'tomas', category: 'Garden', status: 'Under review', image: R('maceta-autorregable.svg'),
    need: 'Keep plants alive when I travel for a few days.', description: 'Ceramic planter with a visible reservoir and watering wick.', usage: 'Narrow balconies and windowsills.',
    features: ['Visible reservoir', 'Level indicator', 'Outdoor-ready'], votes: { up: 95, down: 8 }, followers: 33, createdAt: '2026-09-30', imageRights: [{ label: 'Main render', owner: 'tomas', commercialOk: true }] },
];
export interface Comment { id: string; productId: string; author: string; text: string; parentId: string | null; pin?: { n: number; x: number; y: number }; time: string; useful?: boolean }
export const comments: Comment[] = [
  { id: 'c1', productId: 'p2', author: 'marta', text: 'This zipper would work better on the bottle side.', parentId: null, pin: { n: 1, x: 0.72, y: 0.3 }, time: '3 h ago', useful: true },
  { id: 'c2', productId: 'p2', author: 'lucia', text: 'Good idea, I’ll try it in the next version.', parentId: 'c1', time: '2 h ago' },
  { id: 'c3', productId: 'p2', author: 'diego', text: 'Is the compartment insulated?', parentId: null, pin: { n: 2, x: 0.4, y: 0.62 }, time: '1 h ago' },
  { id: 'c4', productId: 'p2', author: 'pablo', text: 'Does a 750 ml bottle fit?', parentId: null, time: '40 min ago' },
  { id: 'c5', productId: 'p1', author: 'diego', text: 'I’d use it daily to ride to the office.', parentId: null, time: 'yesterday' },
];
// Interés agregado (respuestas voluntarias). Nunca individual.
export const interest: Record<string, { unique: number; responses: number; intent: number; price: { label: string; pct: number }[]; usage: { label: string; pct: number }[] }> = {
  p1: { unique: 212, responses: 96, intent: 38, price: [{ label: '< $25', pct: 18 }, { label: '$25–40', pct: 46 }, { label: '$40–60', pct: 28 }, { label: '> $60', pct: 8 }], usage: [{ label: 'Daily', pct: 52 }, { label: 'Weekly', pct: 33 }, { label: 'Occasionally', pct: 15 }] },
  p2: { unique: 74, responses: 41, intent: 44, price: [{ label: '< $25', pct: 10 }, { label: '$25–40', pct: 54 }, { label: '$40–60', pct: 30 }, { label: '> $60', pct: 6 }], usage: [{ label: 'Daily', pct: 61 }, { label: 'Weekly', pct: 29 }, { label: 'Occasionally', pct: 10 }] },
  p3: { unique: 25, responses: 9, intent: 0, price: [], usage: [] },
  p4: { unique: 68, responses: 30, intent: 31, price: [{ label: '< $25', pct: 30 }, { label: '$25–40', pct: 50 }, { label: '$40–60', pct: 20 }], usage: [{ label: 'Daily', pct: 70 }, { label: 'Weekly', pct: 30 }] },
  p5: { unique: 103, responses: 52, intent: 40, price: [{ label: '< $25', pct: 12 }, { label: '$25–40', pct: 48 }, { label: '$40–60', pct: 40 }], usage: [{ label: 'Travel', pct: 64 }, { label: 'All year', pct: 36 }] },
};
export const PRIVACY_MIN = 20; // supuesto: segmentos con n < 20 se ocultan
// Propuesta comercial ilustrativa (Demo): $35 PVP, pool TOTAL de regalías $5 por unidad, repartido.
export const proposal = {
  productId: 'p2', merchant: 'Ruta Urbana (Demo)', retail: 35, royaltyPool: 5,
  split: [{ who: 'lucia', role: 'Version author', amount: 2.5 }, { who: 'andres', role: 'Original author', amount: 2.0 }, { who: 'marta', role: 'Useful feedback (pin 1)', amount: 0.5 }],
  approvals: [{ who: 'lucia', state: 'Approved' }, { who: 'andres', state: 'Pending' }, { who: 'marta', state: 'Approved' }] as { who: string; state: 'Approved' | 'Pending' | 'Rejected' }[],
};
export const notifications = [
  { id: 'n1', title: 'A store launched your version', detail: 'Ruta Urbana (Demo) confirmed the launch of the bottle version.', to: '/i/bolso-bici/v/bolso-bici-botella', unread: true, kind: 'launch' },
  { id: 'n2', title: 'New comment on pin 1', detail: 'Marta G.: “This zipper would work better…”', to: '/i/bolso-bici/v/bolso-bici-botella?tab=conversacion&pin=1', unread: true, kind: 'comment' },
  { id: 'n3', title: 'Commercial proposal to review', detail: 'Ruta Urbana (Demo) proposes an illustrative royalty split.', to: '/ganancias', unread: false, kind: 'proposal' },
  { id: 'n4', title: 'Your version got support', detail: '12 people voted this week (Demo).', to: '/aportes', unread: false, kind: 'vote' },
];
export const topics = ['Urban mobility', 'Bike', 'Home', 'Garden', 'Travel'];
export const findProduct = (slug?: string) => products.find(p => p.slug === slug);
export const extra: Product[] = []; // productos cargados del backend
export const byId = (id?: string | null) => products.find(p => p.id === id) ?? extra.find(p => p.id === id);
export const childrenOf = (id: string) => products.filter(p => p.parentId === id);
export const rootOf = (p: Product): Product => (p.parentId ? rootOf(byId(p.parentId)!) : p);
export const urlOf = (p: Product): string => (p.parentId ? `/i/${rootOf(p).slug}/v/${p.slug}` : `/i/${p.slug}`);
