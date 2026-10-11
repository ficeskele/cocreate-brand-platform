// Demo data (tagged "Demo" in the UI). Reconstructed from the components' usage; replace freely.
export type Status = 'Idea' | 'Con versiones' | 'En evaluación' | 'Lanzado';
export interface ImageRight { label: string; owner: string; commercialOk: boolean }
export interface Product {
  id: string; slug: string; parentId: string | null; title: string; author: string; category: string; status: Status; image: string;
  need: string; description: string; usage: string; change?: string; reason?: string; features: string[];
  votes: { up: number; down: number }; followers: number; createdAt: string; imageRights: ImageRight[];
  source?: 'demo' | 'api'; apiId?: string;
}
export interface Comment { id: string; productId: string; author: string; text: string; parentId: string | null; time: string; pin?: { n: number; x: number; y: number }; useful?: boolean }

const render = (f: string) => `${import.meta.env.BASE_URL}renders/${f}.svg`;

export const people: Record<string, { name: string }> = {
  u_alice: { name: 'alice' }, u_bob: { name: 'bob' }, ana: { name: 'Ana R.' }, luis: { name: 'Luis M.' }, sofia: { name: 'Sofía T.' }, marco: { name: 'Marco V.' }, 'arcade.ai': { name: 'arcade.ai' },
};

export const products: Product[] = [
  { id: 'p1', slug: 'bolso-bici', parentId: null, title: 'Bolso de bici para el trayecto diario', author: 'ana', category: 'Movilidad', status: 'Con versiones', image: render('bolso-bici'),
    need: 'Llevar portátil y compra sin que todo se mueva al pedalear.', description: 'Bolso lateral rígido que se engancha al portaequipajes y se lleva como bandolera al bajar.', usage: 'Trayectos cortos en ciudad, a diario.',
    features: ['Enganche rápido', 'Base rígida', 'Correa de bandolera'], votes: { up: 128, down: 6 }, followers: 41, createdAt: '2026-09-28', imageRights: [{ label: 'Render conceptual', owner: 'ana', commercialOk: true }] },
  { id: 'p2', slug: 'bolso-botella', parentId: 'p1', title: 'Versión con compartimento separado para botella', author: 'luis', category: 'Movilidad', status: 'En evaluación', image: render('bolso-botella'),
    need: 'Llevar portátil y compra sin que todo se mueva al pedalear.', description: 'Igual que el original, con un bolsillo lateral aislado para una botella de 750 ml.', usage: 'Trayectos cortos en ciudad, a diario.',
    change: 'Añadir un compartimento separado para botella', reason: 'Evitar llevar una segunda bolsa en trayectos cortos',
    features: ['Enganche rápido', 'Base rígida', 'Correa de bandolera', 'Bolsillo para botella'], votes: { up: 86, down: 3 }, followers: 27, createdAt: '2026-10-03', imageRights: [{ label: 'Imagen propia', owner: 'luis', commercialOk: false }, { label: 'Imagen heredada', owner: 'ana', commercialOk: true }] },
  { id: 'p3', slug: 'lampara-plegable', parentId: null, title: 'Lámpara de escritorio plegable', author: 'sofia', category: 'Hogar', status: 'Idea', image: render('lampara-plegable'),
    need: 'Una lámpara que quepa en la mochila para trabajar desde cualquier sitio.', description: 'Brazo plegable en tres tramos, base imantada, carga por USB-C.', usage: 'Coworkings, bibliotecas, viajes.',
    features: ['Plegado plano', 'Base imantada', 'USB-C'], votes: { up: 54, down: 2 }, followers: 19, createdAt: '2026-10-06', imageRights: [{ label: 'Render conceptual', owner: 'sofia', commercialOk: true }] },
  { id: 'p4', slug: 'maceta-autorregable', parentId: null, title: 'Maceta autorregable para balcón', author: 'marco', category: 'Jardín', status: 'Idea', image: render('maceta-autorregable'),
    need: 'Que las plantas sobrevivan a dos semanas de vacaciones.', description: 'Depósito inferior con mecha capilar y ventana para ver el nivel de agua.', usage: 'Balcones pequeños, hierbas aromáticas.',
    features: ['Depósito de 2 l', 'Ventana de nivel', 'Apilable'], votes: { up: 33, down: 1 }, followers: 12, createdAt: '2026-10-08', imageRights: [{ label: 'Render conceptual', owner: 'marco', commercialOk: true }] },
];

/** Products loaded from the backend; AppState fills it so byId/rootOf also resolve them. */
export const extra: Product[] = [];

export const comments: Comment[] = [
  { id: 'c1', productId: 'p1', author: 'luis', text: 'La botella acaba mojando el portátil. Un bolsillo aparte lo arreglaría.', parentId: null, time: 'hace 3 d', pin: { n: 1, x: 0.72, y: 0.55 }, useful: true },
  { id: 'c2', productId: 'p1', author: 'ana', text: 'Buena idea, lo valoro para la siguiente versión.', parentId: 'c1', time: 'hace 3 d' },
  { id: 'c3', productId: 'p1', author: 'sofia', text: '¿La correa se puede guardar dentro cuando va en la bici?', parentId: null, time: 'hace 1 d', pin: { n: 2, x: 0.3, y: 0.25 } },
  { id: 'c4', productId: 'p2', author: 'marco', text: 'El bolsillo debería ser térmico.', parentId: null, time: 'hace 5 h' },
];

export const byId = (id?: string | null) => (id ? [...products, ...extra].find(p => p.id === id) : undefined);
export const rootOf = (p: Product): Product => { let cur = p; for (let i = 0; i < 20; i++) { const parent = byId(cur.parentId); if (!parent) break; cur = parent; } return cur; };
export const urlOf = (p: Product) => { const root = rootOf(p); return root.id === p.id ? `/i/${root.slug}` : `/i/${root.slug}/v/${p.slug}`; };

export const topics = ['bici', 'balcón', 'escritorio', 'viaje', 'cocina', 'mascotas'];

export const notifications: { id: string; kind: 'launch' | 'comment' | 'proposal' | 'vote'; title: string; detail: string; to: string; unread: boolean }[] = [
  { id: 'n1', kind: 'proposal', title: 'Ruta Urbana hizo una propuesta comercial', detail: 'Versión con compartimento para botella · pendiente de aprobación', to: '/ganancias', unread: true },
  { id: 'n2', kind: 'comment', title: 'Nuevo comentario con pin en tu idea', detail: 'Sofía T. preguntó por la correa', to: '/i/bolso-bici?pin=2', unread: true },
  { id: 'n3', kind: 'vote', title: 'Tu versión superó 80 votos', detail: 'Versión con compartimento separado para botella', to: '/i/bolso-bici/v/bolso-botella', unread: false },
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
  merchant: 'Ruta Urbana', retail: 35, royaltyPool: 5,
  split: [{ who: 'ana', role: 'Idea original', amount: 2.5 }, { who: 'luis', role: 'Versión', amount: 2 }, { who: 'sofia', role: 'Feedback útil', amount: 0.5 }],
  approvals: [{ who: 'ana', state: 'Aprobado' }, { who: 'luis', state: 'Pendiente' }, { who: 'sofia', state: 'Pendiente' }] as { who: string; state: 'Aprobado' | 'Pendiente' }[],
};
