// Thin-stroke icons (lucide-react, 1.5px), mapped to the app's existing icon names.
import { ArrowBigDown, ArrowBigUp, Bell, Bookmark, BookmarkCheck, Check, ChevronLeft, Compass, Ellipsis, Flag, GitBranch, Image, Layers, LayoutGrid, Link2, MapPin, MessageCircle, Plus, Search, Share2, Sparkles, Store, TriangleAlert, User, Wallet, X, type LucideIcon } from 'lucide-react';
const icons: Record<string, LucideIcon> = {
  up: ArrowBigUp, down: ArrowBigDown, search: Search, bell: Bell, explore: Compass, layers: Layers, wallet: Wallet, user: User, share: Share2,
  bookmark: Bookmark, 'bookmark-check': BookmarkCheck, branch: GitBranch, pin: MapPin, close: X, check: Check, back: ChevronLeft, store: Store,
  comment: MessageCircle, more: Ellipsis, plus: Plus, alert: TriangleAlert, image: Image, grid: LayoutGrid, link: Link2, sparkle: Sparkles, flag: Flag,
};
export function Icon({ name, size = 20, label, fill }: { name: string; size?: number; label?: string; fill?: boolean }) {
  const C = icons[name] ?? Ellipsis;
  return <C size={size} strokeWidth={1.5} fill={fill ? 'currentColor' : 'none'} aria-hidden={label ? undefined : true} aria-label={label} role={label ? 'img' : undefined} />;
}
