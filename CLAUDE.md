# CLAUDE.md

The Thomas Archive: an Astro site of family history write-ups, live at thomasarchive.com. The
recipes site (`thomas-recipes`) is its `recipes.` subdomain and is linked from the header.

## Running it

- `npm install`, then `npm run dev` (http://localhost:4321). `npm run build` is the only check: it
  validates every post's frontmatter against `src/content.config.ts`. There are no tests.
- It's on Astro 7 and Node 24 (`.nvmrc`). Posts use the content layer: `src/content.config.ts`
  loads `src/content/blog/` with a `glob` loader, and each post's `id` is its `slug` frontmatter.
  Don't upgrade Astro or its integrations as a side effect of another change; a major version is
  its own piece of work.

## Deploying

Netlify deploys `master`, and pull requests get a Netlify deploy preview. There's no
`netlify.toml`, so the build command, publish folder and Node version are set in the Netlify UI;
check there rather than assuming them. Netlify should build with Node 24: `.nvmrc` sets it unless a
`NODE_VERSION` environment variable in the Netlify UI overrides it.

## Content

- A post is a Markdown file in `src/content/blog/`. Its URL comes from the `slug` frontmatter field,
  not the file name, so never change a published post's `slug`: shared links would break.
- Scans and photos for a post live in `public/<post-folder>/` (for example `public/sb-thomas/`) and
  are served as they are, full size and with their metadata. Check a new photo for GPS data
  (`mdls -name kMDItemLatitude <file>`) and tell Sam if it has any.
- `public/html.epub` (16MB) is an ebook exported from a Google Doc titled "THOMAS!". No page links
  to it, but it's publicly downloadable at `/html.epub`. Leave it alone; ask Sam before changing,
  moving or removing it. The book page links to copies on Google Drive instead.
- The site and the repo are both public. Everything under `src/` and `public/` is published, linked
  or not, and anyone can read everything committed (history, branches, pull requests, this file).
  Ask before adding a living person's details to a page or a commit.
- Match the voice and spelling of the existing posts, which are Sam's. Transcribed records and
  obituaries stay as written.

## Books

- `/books` lists the digitized family books: `src/books/<slug>/` holds each book's `book.json` and one
  HTML file per chapter (rendered by `src/pages/books/[book]/`), and `public/books/<slug>/` its EPUB
  and images. The two books come from the private `thomas-genealogy` repo (made with its
  `books/tools`); edit the chapters there and re-export rather than by hand here.
- Living people's details are left out of these web editions and EPUBs (the rest is as printed):
  *The Thomas Family*'s Appendix A, and the residences of private people in the acknowledgements of
  *The Thomas and Bridges Story*. Keep it that way when re-exporting, and ask Sam before putting
  anything back.
- `/book` redirects to `/books`; the THOMAS! collection page is now `/books/thomas-collection`.
