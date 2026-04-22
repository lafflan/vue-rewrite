import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueRewrite from '../packages/plugin/src/index';

export default defineConfig({
  plugins: [
    vue(),
    vueRewrite({
      wsPort: 3457,
      verbose: true,
    }),
  ],
});
