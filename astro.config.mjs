// @ts-check
import {defineConfig} from 'astro/config';
import {fileURLToPath} from 'node:url';

import icon from 'astro-icon';
import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';

import starlight from '@astrojs/starlight';

import starlightThemeNova from 'starlight-theme-nova';

// https://astro.build/config
export default defineConfig({
  site: 'https://dafnik.me',
  integrations: [
    icon(),
    react(),
    starlight({
      title: 'dafnik.me',
      logo: {
        src: './src/assets/logo.png',
      },
      plugins: [starlightThemeNova()],
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/Dafnik',
        },
        {
          icon: 'seti:gitlab',
          label: 'GitLab',
          href: 'https://gitlab.com/Dafnik',
        },
        {
          icon: 'mastodon',
          label: 'voi.social',
          href: 'https://voi.social/@Dafnik',
        },
        {
          icon: 'email',
          label: 'Email',
          href: 'mailto:contact+AT+dafnik.me',
        },
      ],
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: [
        {
          find: /^@\//,
          replacement: fileURLToPath(new URL('./screenshot-editor/src/', import.meta.url)),
        },
      ],
    },
  },
});
