import { defineCollection, reference } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
	// Each post's id, and so its URL, comes from its `slug` frontmatter, not its file name
	loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
	// Type-check frontmatter using a schema
	schema: z.object({
		title: z.string(),
		description: z.string(),
		// Transform string to Date object
		pubDate: z
			.string()
			.or(z.date())
			.transform((val) => new Date(val)),
		updatedDate: z
			.string()
			.optional()
			.transform((str) => (str ? new Date(str) : undefined)),
		heroImage: z.string().optional(),
	}),
});

// The people the sources are filed under. Only people who have died: nobody living goes on the site.
const people = defineCollection({
	loader: file('src/data/people.yaml'),
	schema: z.object({
		name: z.string(),
		// Life dates as they should read, since many are uncertain
		life: z.string(),
		// For sorting, oldest first
		born: z.number().int(),
		post: reference('blog').optional(),
	}),
});

// The sources section: one file per record or published account, with its scans in
// src/assets/sources/<id>/ and any transcription in the body.
const sources = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/sources' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			// A record made at the time, or an account published later
			kind: z.enum(['record', 'published']),
			type: z.enum([
				'census',
				'land',
				'military',
				'obituary',
				'vital',
				'photograph',
				'marker',
				'article',
				'book',
			]),
			// The date as it should read, and the year it's filed under
			date: z.string(),
			year: z.number().int(),
			place: z.string(),
			people: z.array(reference('people')),
			// True when the person in the record may not be ours
			probable: z.boolean().default(false),
			images: z
				.array(
					z.object({
						src: image(),
						alt: z.string(),
						caption: z.string().optional(),
					})
				)
				.min(1),
			citation: z.string(),
			// Where the original is held, when that's known
			repository: z.string().optional(),
			posts: z.array(reference('blog')).default([]),
		}),
});

export const collections = { blog, people, sources };
