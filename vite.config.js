import { resolve } from 'node:path';
import { defineConfig, normalizePath } from 'vite';
import vue from '@vitejs/plugin-vue';
import prism from 'vite-plugin-prismjs';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    prism({
      languages: ['xml', 'json'],
      plugins: ['copy-to-clipboard'],
      theme: 'default',
      css: true,
    }),
  ],
  build: {
    minify: false,
    rollupOptions: {
      input: {
        app: resolve(__dirname, 'index.html'),
        //'content': resolve(__dirname, 'src/content-script.ts'),
        'background': resolve(__dirname, 'src/background.js'),
      },
      output: {
        entryFileNames: '[name].js',
      },
    },
  },
})
