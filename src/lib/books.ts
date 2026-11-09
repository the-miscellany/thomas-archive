// The digitized family books: src/books/<slug>/book.json, plus one HTML file per chapter.
// The EPUB and images for each are in public/books/<slug>/.
export interface Chapter {
  slug: string;
  title: string;
}

export interface Book {
  slug: string;
  title: string;
  author: string;
  epub: string;
  epubSize: number;
  chapters: Chapter[];
}

const metas = import.meta.glob<Book>("/src/books/*/book.json", {
  eager: true,
  import: "default",
});
const pages = import.meta.glob<string>("/src/books/*/*.html", {
  eager: true,
  query: "?raw",
  import: "default",
});

export function getBooks(): Book[] {
  return Object.values(metas);
}

export function getBook(slug: string): Book | undefined {
  return getBooks().find((b) => b.slug === slug);
}

/** The HTML of one chapter, or "index" for a book's own front page if it has one. */
export function getPage(book: string, page: string): string | undefined {
  return pages[`/src/books/${book}/${page}.html`];
}

export function megabytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
