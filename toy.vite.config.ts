import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {browserRulesAdapter} from './scripts/browser-rules-adapter';
export default defineConfig({base:'./',plugins:[browserRulesAdapter(true),react()],define:{'import.meta.env.VITE_TOY_MODE':JSON.stringify('1')},publicDir:'public',build:{outDir:'dist/toy',rollupOptions:{input:'game.html'}}});
