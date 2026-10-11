import { defineConfig } from 'vite';

// Vite's built-in esbuild handles TypeScript and React's automatic JSX runtime.
export default defineConfig({ esbuild: { jsx: 'automatic' }, base: './' });
