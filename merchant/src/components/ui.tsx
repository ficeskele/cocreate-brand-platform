import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, GitBranch, Heart, ImageOff, SearchX, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ApplicationStatus, Branch, Idea } from '../types';
import { getCreator } from '../data/catalog';
export const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
export const percent = (rate: number) => new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(rate);
export const number = (n: number) => new Intl.NumberFormat('en-US').format(n);
export const date = (s: string) => new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
export function Status({ status }: { status: ApplicationStatus | 'draft' | 'available' | 'in-development' }) { return <span className={`badge status-${status}`}><span className="status-dot" />{({ pending: 'Pending', approved: 'Approved', rejected: 'Rejected', draft: 'Draft', available: 'Open for applications', 'in-development': 'In development' })[status]}</span>; }
export function ProductImage({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return failed ? <div className={`image-fallback ${className}`} role="img" aria-label={alt}><ImageOff size={28} /><span>Product preview unavailable</span></div> : <img className={className} src={src} alt={alt} onError={() => setFailed(true)} />;
}
export function Gallery({ images, name }: { images: string[]; name: string }) {
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [images]);
  return <div className="gallery"><div className="gallery-main"><ProductImage src={images[index] || images[0]} alt={`${name} · ${index === 0 ? 'front view' : 'detail view'}`} /><span className="image-caption">Concept illustration · mock preview</span></div><div className="thumbnails">{images.map((src, i) => <button key={src} className={i === index ? 'selected' : ''} aria-label={`Show ${i === 0 ? 'front' : 'detail'} view`} aria-pressed={i === index} onClick={() => setIndex(i)}><ProductImage src={src} alt="" /></button>)}</div></div>;
}
export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) { return <div className="page-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1><p className="muted">{description}</p></div>{action}</div>; }
export function Empty({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) { return <div className="empty-state"><div className="empty-icon"><SearchX size={27} /></div><h2>{title}</h2><p>{children}</p>{action}</div>; }
export function Back({ to, children }: { to: string; children: ReactNode }) { return <Link className="back-link" to={to}><ArrowLeft size={16} />{children}</Link>; }
export function ErrorNotice({ children }: { children: ReactNode }) { return <div className="notice error" role="alert">{children}</div>; }
export function EstimateNote() { return <p className="estimate-note">Illustrative mock estimates in USD, not an Arcade quotation or guaranteed earnings. This estimate excludes shipping costs, Shopify and payment processing fees, advertising costs, taxes, refunds and returns, and additional platform fees.</p>; }
export function IdeaCard({ idea, branches }: { idea: Idea; branches: Branch[] }) {
  const creator = getCreator(idea.creatorId);
  return <article className="idea-card"><Link to={`/ideas/${idea.id}`} className="card-image-link" aria-label={`Explore ${idea.title}`}><ProductImage src={branches[0].images[0]} alt={`${idea.title} concept illustration`} /><span className="image-category">{idea.category}</span></Link><div className="card-content"><div className="creator-line"><span className="avatar tiny">{creator.initials}</span>{creator.name}<span className="creator-label">Creator</span></div><h2><Link to={`/ideas/${idea.id}`}>{idea.title}</Link></h2><p className="card-description">{idea.description}</p><div className="engagement"><span><Heart size={14} />{number(idea.supportCount)} supporters</span><span><GitBranch size={14} />{branches.length} branches</span></div><div className="card-footer"><div><span className="mini-label">Est. production / unit</span><strong>{money(Math.min(...branches.map(b => b.estimatedManufacturingCost)))}<small> +</small></strong></div><Link className="button secondary small" to={`/ideas/${idea.id}`}>View details <ArrowRight size={14} /></Link></div></div></article>;
}
export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const previous = document.activeElement as HTMLElement; ref.current?.showModal(); return () => { ref.current?.close(); previous?.focus(); }; }, []);
  return <dialog ref={ref} aria-labelledby="dialog-title" onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}><div className="modal-content"><div className="section-heading"><h2 id="dialog-title">{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={20} /></button></div>{children}</div></dialog>;
}
