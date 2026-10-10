import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {browserRulesAdapter} from './scripts/browser-rules-adapter';
export default defineConfig({plugins:[browserRulesAdapter(),react()],build:{outDir:'dist/solo',rollupOptions:{input:'game.html'}}});
