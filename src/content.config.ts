import {defineCollection} from 'astro:content';
import {glob} from 'astro/loaders';
import {z} from 'astro/zod';
import {docsLoader} from '@astrojs/starlight/loaders';
import {docsSchema} from '@astrojs/starlight/schema';

const blog = defineCollection({
  loader: glob({base: './src/content/blog', pattern: '**/*.{md,mdx}'}),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z
      .string()
      .or(z.date())
      .transform((val) => new Date(val)),
    image: z
      .object({
        url: z.string(),
        alt: z.string(),
      })
      .optional(),
  }),
});

export const collections = {
  blog,
  docs: defineCollection({loader: docsLoader(), schema: docsSchema()}),
};
