// @ts-check
import {defineConfig} from 'astro/config';

import icon from 'astro-icon';

import tailwindcss from '@tailwindcss/vite';

import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
  site: 'https://dafnik.me',
  integrations: [
    icon(),
    starlight({
      title: 'dafnik.me',
      logo: {
        src: './public/logo.png',
      },
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
          label: 'fedi.at',
          href: 'https://fedi.at/@dafnik',
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
  },
});
