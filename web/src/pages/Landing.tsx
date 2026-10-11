import { Link } from 'react-router-dom';
import { WorksWheel, type WorksWheelItem } from '@/components/ui/works-wheel';
import { useApp } from '../state/AppState';
import { urlOf } from '../data/mock';
import { Demo } from '../components/ui';
import { useState } from 'react';
import { AsciiLoader } from '@/components/ui/ascii-loader';

const SEEN = 'droplab-intro-seen';

// Portada: productos más apoyados en la rueda, ordenados por votos netos (Demo).
export default function Landing() {
  const { products } = useApp();
  const top = products
    .filter(p => p.source !== 'api')
    .map(p => ({ p, net: p.votes.up - p.votes.down }))
    .sort((a, b) => b.net - a.net)
    .slice(0, 8);
  const items: WorksWheelItem[] = top.map(({ p, net }) => ({
    title: `${p.title} · ${net}`,
    image: p.image,
    href: `${import.meta.env.BASE_URL}${urlOf(p).slice(1)}`,
  }));
  const [intro, setIntro] = useState(() => { try { return !sessionStorage.getItem(SEEN) || location.search.includes('intro'); } catch { return false; } });
  const endIntro = () => { try { sessionStorage.setItem(SEEN, '1'); } catch { /* ignore */ } setIntro(false); };
  return (
    <div className="landing">
      {intro ? <AsciiLoader src={`${import.meta.env.BASE_URL}creation-of-adam-hands.jpg`} renderMode="dither" cellSize={9} contrast={158} density={20} coverage={100} bgMode="none"
        animated animation="pulse" animSpeed={100} animIntensity={60} ink="#171717" paper="#F7F7F4" duration={1900}
        title="Creamos juntos. Ganamos todos." subtitle="Cada idea mejora cuando alguien más la toca." onDone={endIntro} /> : null}
      <header className="landing-head">
        <p className="tiny muted">DropLab · Interés de la comunidad</p>
        <h1>Lo que la comunidad quiere que exista</h1>
        <p className="lede">Gira la rueda para ver los productos más apoyados. Votar indica interés, no una compra. <Demo>Votos Demo</Demo></p>
      </header>
      <div className="landing-wheel">
        <WorksWheel items={items} label="Más apoyados" action="Ver idea" />
      </div>
      <footer className="landing-foot">
        <p className="small muted">Desplaza, arrastra o usa ↑ ↓. Ordenado por votos netos (Demo). Imágenes: renders conceptuales.</p>
        <Link to="/explorar" className="btn btn-primary">Explorar ideas</Link>
      </footer>
    </div>
  );
}
