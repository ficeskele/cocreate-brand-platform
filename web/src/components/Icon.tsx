// Iconos de trazo fino (1.5px)
const paths: Record<string, string> = {
  up: 'M12 19V5M6 11l6-6 6 6', down: 'M12 5v14M6 13l6 6 6-6',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4', bell: 'M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16zM10 21h4',
  explore: 'M3 10.5 12 4l9 6.5V20H3z', layers: 'M12 4l9 5-9 5-9-5 9-5zM3 14l9 5 9-5', wallet: 'M3 7h18v12H3zM3 7l3-3h12l3 3M16 13h2',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5', share: 'M12 15V4M8 8l4-4 4 4M5 13v7h14v-7',
  bookmark: 'M7 4h10v16l-5-4-5 4z', branch: 'M7 4v16M7 9c0 4 10 2 10 7M7 4a2 2 0 1 0 0 .1M17 18a2 2 0 1 0 0 .1',
  pin: 'M12 21s-6-5.6-6-10.5a6 6 0 0 1 12 0C18 15.4 12 21 12 21zM12 12a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2',
  close: 'M6 6l12 12M18 6 6 18', check: 'M5 12.5 9.5 17 19 7.5', back: 'M15 5l-7 7 7 7', store: 'M4 9l1.5-5h13L20 9M4 9h16v11H4zM9 20v-6h6v6',
  comment: 'M4 5h16v11H9l-5 4z', more: 'M5 12h.01M12 12h.01M19 12h.01', plus: 'M12 5v14M5 12h14', alert: 'M12 4l9 16H3zM12 10v4M12 17v.01',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 2-2 5 5', grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z', link: 'M10 14l4-4M8 16l-2 2a3 3 0 0 1-4-4l3-3a3 3 0 0 1 4 0M16 8l2-2a3 3 0 0 1 4 4l-3 3a3 3 0 0 1-4 0',
  sparkle: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18', flag: 'M5 21V4h11l-2 4 2 4H5',
};
export function Icon({ name, size = 20, label }: { name: keyof typeof paths | string; size?: number; label?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden={label ? undefined : true} aria-label={label} role={label ? 'img' : undefined}>
      <path d={paths[name] ?? ''} />
    </svg>
  );
}
