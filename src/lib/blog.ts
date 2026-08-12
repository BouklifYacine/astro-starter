import type { CollectionEntry } from "astro:content";

export type BlogEntry = CollectionEntry<"blog">;

export function visiblePosts(posts: BlogEntry[]): BlogEntry[] {
  return posts
    .filter((post) => !post.data.draft && !post.data.noindex)
    .sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf());
}

export function primaryKeywordCount(post: BlogEntry): number {
  if (!post.data.primaryKeyword) return 0;
  const content = (post.body ?? "").toLocaleLowerCase();
  return content.split(post.data.primaryKeyword.toLocaleLowerCase()).length - 1;
}
