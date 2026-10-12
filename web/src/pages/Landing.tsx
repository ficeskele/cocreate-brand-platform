import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion, useScroll, useTransform, type MotionProps, type MotionValue } from 'motion/react';
import { WorksWheel, type WorksWheelItem } from '@/components/ui/works-wheel';
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button';
import { AsciiLoader } from '@/components/ui/ascii-loader';
import { useApp } from '../state/AppState';
import { urlOf } from '../data/mock';
import { Demo } from '../components/ui';

// Landing in the spirit of the Mindloop template (MIT, see web/ATTRIBUTION.md):
// hero → scroll-revealed mission → four-up features → CTA → footer.
// Intro plays on every visit and stays until clicked (duration 0 disables the auto-dismiss). Scripts set this sessionStorage key to skip it; ?intro forces it.
const SKIP = 'droplab-intro-skip';

function useFadeUp() {
  const reduce = useReducedMotion();
  return (delay = 0): MotionProps => ({
    initial: reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: reduce ? { duration: 0 } : { duration: 0.6, delay, ease: 'easeOut' },
  });
}

const P1 = 'Every product here starts as one person’s idea and gets better because others branch it, question it and back it.';
const P1_HL = ['branch', 'question', 'back'];
const P2 = 'When a store launches it, the people who shaped it share the credit and the royalties. We create together. Everyone wins.';

function Word({ text, hl, i, total, progress, reduce }: { text: string; hl: boolean; i: number; total: number; progress: MotionValue<number>; reduce: boolean }) {
  const opacity = useTransform(progress, [i / total, (i + 0.9) / total], [0.15, 1]);
  return <motion.span className={hl ? 'hl' : undefined} style={reduce ? undefined : { opacity }}>{text} </motion.span>;
}

function Mission() {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.4'] });
  const w1 = P1.split(' '), w2 = P2.split(' '), total = w1.length + w2.length;
  const clean = (w: string) => w.replace(/[^a-zA-Z]/g, '');
  return (
    <section className="ml-mission" id="mission" aria-label="Mission">
      <div ref={ref}>
        <p>{w1.map((w, i) => <Word key={i} text={w} hl={P1_HL.includes(clean(w))} i={i} total={total} progress={scrollYProgress} reduce={reduce} />)}</p>
        <p>{w2.map((w, i) => <Word key={i} text={w} hl={false} i={w1.length + i} total={total} progress={scrollYProgress} reduce={reduce} />)}</p>
      </div>
    </section>
  );
}

const FEATURES = [
  { title: 'Propose', text: 'Post the product you wish existed: the problem, how you’d use it, a render.' },
  { title: 'Branch', text: 'Create your own version of any idea. It keeps its own votes and credits the original.' },
  { title: 'Signal interest', text: 'Vote, follow and share what you’d pay. Community interest, not a purchase.' },
  { title: 'Launch with a merchant', text: 'Stores see aggregated interest, ask for image rights and launch on Shopify.' },
];

export default function Landing() {
  const { products } = useApp();
  const nav = useNavigate();
  const fade = useFadeUp();
  const top = products.filter(p => p.source !== 'api').map(p => ({ p, net: p.votes.up - p.votes.down })).sort((a, b) => b.net - a.net).slice(0, 8);
  const items: WorksWheelItem[] = top.map(({ p, net }) => ({ title: `${p.title} · ${net}`, image: p.image, href: `${import.meta.env.BASE_URL}${urlOf(p).slice(1)}` }));
  const [intro, setIntro] = React.useState(() => { try { return !sessionStorage.getItem(SKIP) || location.search.includes('intro'); } catch { return false; } });
  const endIntro = () => setIntro(false);
  return (
    <div className="landing-ml">
      {intro ? <AsciiLoader src={`${import.meta.env.BASE_URL}creation-of-adam-hands.jpg`} renderMode="dither" cellSize={9} contrast={158} density={20} coverage={100} bgMode="none"
        animated animation="pulse" animSpeed={100} animIntensity={60} ink="#FFFFFF" paper="#000000" duration={0}
        title="We create together. Everyone wins." subtitle="Every idea gets better when someone else touches it. Click anywhere to start." onDone={endIntro} /> : null}

      <section className="ml-hero" id="home">
        <div className="stack" style={{ gap: 24 }}>
          <motion.p {...fade(0)} className="ml-eyebrow">DropLab · Community interest</motion.p>
          <motion.h1 {...fade(0.1)}>Products the <em>community</em> wants to exist</motion.h1>
          <motion.p {...fade(0.2)} className="ml-sub">Turn the wheel to see the most-supported ideas. Voting signals interest, not a purchase. <Demo>Demo votes</Demo></motion.p>
          <motion.div {...fade(0.3)} className="ml-actions">
            <span className="lm-wrap"><LiquidMetalButton label="Explore ideas" onClick={() => nav('/explore')} /></span>
            <Link to="/search" className="btn btn-secondary">Propose an idea</Link>
          </motion.div>
          <motion.p {...fade(0.4)} className="ml-note">Scroll, drag or use ↑ ↓ on the wheel. Sorted by net votes (Demo). Images: arcade.ai renders.</motion.p>
        </div>
        <motion.div {...fade(0.2)} className="ml-wheel">
          <WorksWheel items={items} label="Most supported" action="View idea" />
        </motion.div>
      </section>

      <Mission />

      <section className="ml-solution" id="how-it-works">
        <motion.p {...fade(0)} className="ml-eyebrow">How it works</motion.p>
        <motion.h2 {...fade(0.1)} className="ml-h2">From a shared idea to a <em>real</em> product</motion.h2>
        <div className="ml-features">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} {...fade(0.1 * i)}>
              <span className="n">0{i + 1}</span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="ml-cta">
        <motion.h2 {...fade(0)} className="ml-h2" style={{ margin: 0 }}>Start <em>creating</em></motion.h2>
        <motion.p {...fade(0.1)}>Find an idea worth improving, or post the one only you have thought of yet.</motion.p>
        <motion.div {...fade(0.2)} className="ml-actions" style={{ justifyContent: 'center' }}>
          <span className="lm-wrap"><LiquidMetalButton label="Explore ideas" onClick={() => nav('/explore')} /></span>
          <span className="lm-wrap" title="Propose an idea"><LiquidMetalButton viewMode="icon" label="Propose an idea" onClick={() => nav('/search')} /></span>
        </motion.div>
      </section>

      <footer className="ml-footer">
        <p style={{ margin: 0 }}>© 2026 DropLab · Demo. Layout inspired by Mindloop (MIT).</p>
        <nav aria-label="Footer"><Link to="/explore">Explore</Link><Link to="/search">Search</Link><Link to="/m">For merchants</Link><Link to="/profile">Profile</Link></nav>
      </footer>
    </div>
  );
}
