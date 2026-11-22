import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// base: './' ensures assets work correctly on GitHub Pages under any path
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 3001,
    open: true
  }
});
