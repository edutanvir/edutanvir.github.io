---
title: Hello, world. This is how my blog works
date: 2026-11-07
description: A sample post that shows every building block. Replace it with your first real article.
image: hello-world-cover.jpg
image_alt: Five colourful icons connected by a line, like a small data pipeline
tags: Sample, Blog
---

**This is a sample post.** Delete `_posts-src/hello-world.md` (and its cover image) when you publish your first real article.

## Write in plain text

Every post is one Markdown file. You write the way you would in a notes app, and the build script turns it into a fast, animated page. Paragraphs fade in as you scroll, the cover image drifts gently, and the share buttons stay beside you while you read.

Short paragraphs are easier to read on a phone. **Bold** pulls the eye to the important part, and *italics* add a little tone. Links look like [this one to my GitHub](https://github.com/edutanvir).

## Lists and steps

A numbered list is great for steps:

1. Create a new file in `_posts-src/`, for example `my-first-post.md`.
2. Add the front matter: title, date, description, image and tags.
3. Write the article underneath it.
4. Run the build script, then commit and push.

And a plain list works for ideas:

- What problem were you solving?
- How does the data move from A to B?
- What would you do differently next time?

## Pictures with captions

Put your image in `blog/images/` and add it with one line. The text in quotes becomes the caption.

![A soft gradient background with a dotted grid](default-cover.jpg "Images zoom in softly as they come into view.")

## Code, when you need it

Inline code looks like `SELECT * FROM trips`, and longer snippets get their own block:

```sql
SELECT
    payment_type,
    COUNT(*)          AS trips,
    ROUND(AVG(fare), 2) AS avg_fare
FROM trips
GROUP BY payment_type
ORDER BY trips DESC;
```

## A pull quote

> Good data work is mostly about making things easy to trust.

## A small table

| Part of the post | Where it comes from |
| --- | --- |
| Title, date, tags | The front matter at the top |
| Link preview image | The `image:` line |
| Reading time | Counted automatically |

## Sharing on LinkedIn

Use the **Copy link** button beside the article, then paste the link into a LinkedIn post. LinkedIn reads the cover image, title and description from the page and shows them as a large preview card, so people can open and read the article without leaving a tab they trust.
