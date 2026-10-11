// Todos los datos de este archivo son ficticios (Demo). Sin backend.
export type Status = 'Idea' | 'En evaluación' | 'Viabilidad confirmada' | 'Buscando tienda' | 'Lanzado';
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
  { id: 'p1', slug: 'bolso-bici', parentId: null, title: 'Bolso compacto para llevar lo esencial en bici', author: 'andres', category: 'Movilidad', status: 'Buscando tienda', image: R('bolso-bici.svg'),
    need: 'Tener llaves y teléfono a mano sin cargar mochila.', description: 'Bolso pequeño de manillar con cierre rápido y bolsillo interior para teléfono.', usage: 'Trayectos urbanos cortos; se fija al manillar o al cuadro.',
    features: ['Montaje sin herramientas', 'Bolsillo para teléfono', 'Tejido resistente al agua'], votes: { up: 141, down: 13 }, followers: 64, createdAt: '2026-09-28',
    imageRights: [{ label: 'Render principal', owner: 'andres', commercialOk: true }] },
  { id: 'p2', slug: 'bolso-bici-botella', parentId: 'p1', title: 'Versión con compartimento separado para botella', author: 'lucia', category: 'Movilidad', status: 'Buscando tienda', image: R('bolso-botella.svg'),
    need: 'Tener llaves y teléfono a mano sin cargar mochila.', description: 'El mismo bolso con un compartimento lateral aislado para una botella de 500–750 ml.', usage: 'Trayectos cortos donde también necesitas agua.',
    change: 'Añadir un compartimento separado para botella.', reason: 'Evitar llevar una segunda bolsa en trayectos cortos.',
    features: ['Compartimento para botella', 'Montaje sin herramientas', 'Reflectante lateral'], votes: { up: 52, down: 6 }, followers: 21, createdAt: '2026-10-04',
    imageRights: [{ label: 'Render de la versión', owner: 'lucia', commercialOk: true }, { label: 'Render heredado del original', owner: 'andres', commercialOk: false }] },
  { id: 'p3', slug: 'bolso-bici-impermeable', parentId: 'p1', title: 'Versión impermeable con cierre magnético', author: 'pablo', category: 'Movilidad', status: 'Idea', image: R('bolso-bici.svg'),
    need: 'Tener llaves y teléfono a mano sin cargar mochila.', description: 'Costuras selladas y tapa con cierre magnético.', usage: 'Días de lluvia.', change: 'Cierre magnético y costuras selladas.', reason: 'Uso diario con lluvia.',
    features: ['Costuras selladas', 'Cierre magnético'], votes: { up: 22, down: 3 }, followers: 8, createdAt: '2026-10-06', imageRights: [{ label: 'Render heredado', owner: 'andres', commercialOk: false }] },
  { id: 'p4', slug: 'lampara-plegable', parentId: null, title: 'Lámpara de lectura plegable con pinza', author: 'ines', category: 'Hogar', status: 'Idea', image: R('lampara-plegable.svg'),
    need: 'Leer de noche sin molestar a quien duerme al lado.', description: 'Lámpara de brazo plegable con pinza y luz cálida regulable.', usage: 'Cabecero, escritorio o estantería.',
    features: ['Luz cálida regulable', 'Pinza acolchada', 'Batería USB-C'], votes: { up: 61, down: 7 }, followers: 19, createdAt: '2026-10-02', imageRights: [{ label: 'Render principal', owner: 'ines', commercialOk: true }] },
  { id: 'p5', slug: 'maceta-autorregable', parentId: null, title: 'Maceta autorregable para balcón pequeño', author: 'tomas', category: 'Jardín', status: 'En evaluación', image: R('maceta-autorregable.svg'),
    need: 'Mantener plantas vivas cuando viajo varios días.', description: 'Maceta cerámica con depósito visible y mecha de riego.', usage: 'Balcones estrechos y alféizares.',
    features: ['Depósito visible', 'Indicador de nivel', 'Apta para exterior'], votes: { up: 95, down: 8 }, followers: 33, createdAt: '2026-09-30', imageRights: [{ label: 'Render principal', owner: 'tomas', commercialOk: true }] },
];
export interface Comment { id: string; productId: string; author: string; text: string; parentId: string | null; pin?: { n: number; x: number; y: number }; time: string; useful?: boolean }
export const comments: Comment[] = [
  { id: 'c1', productId: 'p2', author: 'marta', text: 'Este cierre quedaría mejor del lado de la botella.', parentId: null, pin: { n: 1, x: 0.72, y: 0.3 }, time: 'hace 3 h', useful: true },
  { id: 'c2', productId: 'p2', author: 'lucia', text: 'Buena idea, lo pruebo en la próxima versión.', parentId: 'c1', time: 'hace 2 h' },
  { id: 'c3', productId: 'p2', author: 'diego', text: '¿El compartimento es térmico?', parentId: null, pin: { n: 2, x: 0.4, y: 0.62 }, time: 'hace 1 h' },
  { id: 'c4', productId: 'p2', author: 'pablo', text: '¿Cabe una botella de 750 ml?', parentId: null, time: 'hace 40 min' },
  { id: 'c5', productId: 'p1', author: 'diego', text: 'Lo usaría a diario para ir a la oficina.', parentId: null, time: 'ayer' },
];
// Interés agregado (respuestas voluntarias). Nunca individual.
export const interest: Record<string, { unique: number; responses: number; intent: number; price: { label: string; pct: number }[]; usage: { label: string; pct: number }[] }> = {
  p1: { unique: 212, responses: 96, intent: 38, price: [{ label: '< $25', pct: 18 }, { label: '$25–40', pct: 46 }, { label: '$40–60', pct: 28 }, { label: '> $60', pct: 8 }], usage: [{ label: 'A diario', pct: 52 }, { label: 'Semanal', pct: 33 }, { label: 'Ocasional', pct: 15 }] },
  p2: { unique: 74, responses: 41, intent: 44, price: [{ label: '< $25', pct: 10 }, { label: '$25–40', pct: 54 }, { label: '$40–60', pct: 30 }, { label: '> $60', pct: 6 }], usage: [{ label: 'A diario', pct: 61 }, { label: 'Semanal', pct: 29 }, { label: 'Ocasional', pct: 10 }] },
  p3: { unique: 25, responses: 9, intent: 0, price: [], usage: [] },
  p4: { unique: 68, responses: 30, intent: 31, price: [{ label: '< $25', pct: 30 }, { label: '$25–40', pct: 50 }, { label: '$40–60', pct: 20 }], usage: [{ label: 'A diario', pct: 70 }, { label: 'Semanal', pct: 30 }] },
  p5: { unique: 103, responses: 52, intent: 40, price: [{ label: '< $25', pct: 12 }, { label: '$25–40', pct: 48 }, { label: '$40–60', pct: 40 }], usage: [{ label: 'Viajes', pct: 64 }, { label: 'Todo el año', pct: 36 }] },
};
export const PRIVACY_MIN = 20; // supuesto: segmentos con n < 20 se ocultan
// Propuesta comercial ilustrativa (Demo): $35 PVP, pool TOTAL de regalías $5 por unidad, repartido.
export const proposal = {
  productId: 'p2', merchant: 'Ruta Urbana (Demo)', retail: 35, royaltyPool: 5,
  split: [{ who: 'lucia', role: 'Autora de la versión', amount: 2.5 }, { who: 'andres', role: 'Autor del original', amount: 2.0 }, { who: 'marta', role: 'Feedback útil (pin 1)', amount: 0.5 }],
  approvals: [{ who: 'lucia', state: 'Aprobado' }, { who: 'andres', state: 'Pendiente' }, { who: 'marta', state: 'Aprobado' }] as { who: string; state: 'Aprobado' | 'Pendiente' | 'Rechazado' }[],
};
export const notifications = [
  { id: 'n1', title: 'Una tienda lanzó tu versión', detail: 'Ruta Urbana (Demo) confirmó el lanzamiento de la versión con botella.', to: '/i/bolso-bici/v/bolso-bici-botella', unread: true, kind: 'launch' },
  { id: 'n2', title: 'Nuevo comentario en el pin 1', detail: 'Marta G.: “Este cierre quedaría mejor…”', to: '/i/bolso-bici/v/bolso-bici-botella?tab=conversacion&pin=1', unread: true, kind: 'comment' },
  { id: 'n3', title: 'Propuesta comercial para revisar', detail: 'Ruta Urbana (Demo) propone un reparto de regalías ilustrativo.', to: '/ganancias', unread: false, kind: 'proposal' },
  { id: 'n4', title: 'Tu versión recibió apoyo', detail: '12 personas votaron esta semana (Demo).', to: '/aportes', unread: false, kind: 'vote' },
];
export const topics = ['Movilidad urbana', 'Bici', 'Hogar', 'Jardín', 'Viaje'];
export const findProduct = (slug?: string) => products.find(p => p.slug === slug);
export const extra: Product[] = []; // productos cargados del backend
export const byId = (id?: string | null) => products.find(p => p.id === id) ?? extra.find(p => p.id === id);
export const childrenOf = (id: string) => products.filter(p => p.parentId === id);
export const rootOf = (p: Product): Product => (p.parentId ? rootOf(byId(p.parentId)!) : p);
export const urlOf = (p: Product): string => (p.parentId ? `/i/${rootOf(p).slug}/v/${p.slug}` : `/i/${p.slug}`);
