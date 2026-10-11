import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './Icon';
import { byId, people, rootOf, urlOf, type Product, type Status } from '../data/mock';

export function Button({ variant = 'primary', block, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost'; block?: boolean }) {
  return <button {...rest} className={`btn btn-${variant}${block ? ' btn-block' : ''} ${rest.className ?? ''}`}>{children}</button>;
}
export const Demo = ({ children = 'Demo' }: { children?: ReactNode }) => <span className="demo">{children}</span>;
export const StatusTag = ({ status }: { status: Status }) => <span className={`status status-${status.replace(/\s/g, '-').toLowerCase()}`}>{status}</span>;
export function ProductImage({ p, ratio = '4/3', children }: { p: Product; ratio?: string; children?: ReactNode }) {
  return (
    <div className="pimg" style={{ aspectRatio: ratio }}>
      <img src={p.image} alt={`Render conceptual: ${p.title}`} loading="lazy" />
      <span className="render-label">Render conceptual</span>
      {children}
    </div>
  );
}
export function DerivedFrom({ p }: { p: Product }) {
  const parent = byId(p.parentId); if (!parent) return null;
  return (
    <div className="derived">
      <Icon name="branch" size={16} />
      <span>Derivado de <Link to={urlOf(parent)}>{parent.title}</Link></span>
      <Link className="derived-tree" to={`${urlOf(rootOf(p))}?tab=versiones`}>Ver árbol</Link>
    </div>
  );
}
export const personName = (id: string) => (id === 'me' ? 'Tú' : people[id]?.name ?? id.replace(/^u_/, ''));
export function Tabs<T extends string>({ items, value, onChange }: { items: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="tabs" role="tablist">
      {items.map(i => <button key={i.id} role="tab" aria-selected={value === i.id} className={value === i.id ? 'on' : ''} onClick={() => onChange(i.id)}>{i.label}</button>)}
    </div>
  );
}
export function Empty({ icon = 'sparkle', title, text, action }: { icon?: string; title: string; text?: string; action?: ReactNode }) {
  return <div className="empty"><Icon name={icon} size={28} /><h3>{title}</h3>{text && <p>{text}</p>}{action}</div>;
}
export function Bar({ label, pct }: { label: string; pct: number }) {
  return <div className="bar"><div className="bar-top"><span>{label}</span><span>{pct}%</span></div><div className="bar-track"><div style={{ width: `${pct}%` }} /></div></div>;
}
export function Chip({ on, children, onClick }: { on?: boolean; children: ReactNode; onClick?: () => void }) {
  return <button type="button" className={`chip${on ? ' on' : ''}`} aria-pressed={!!on} onClick={onClick}>{children}</button>;
}
