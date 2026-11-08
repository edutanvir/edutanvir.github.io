---
title: From Paradox to Practice
date: 2026-11-08
description: Frege, Russell and the power of precise definitions, and what they have to do with GROUP BY in SQL.
image: paradox-to-practice.webp
image_alt: Hand-drawn infographic titled From Paradox to Practice. The left side explains Frege's axiom of abstraction and Russell's paradox with its two contradicting cases. The right side shows what a group is in SQL, using an empty table and a small fruits table.
image_layout: natural
preview: frege-russell-preview.jpg
tags: SQL, GROUP BY, Logic
---

## Start with a great idea

Gottlob Frege is often called the founder of modern logic. One of the ideas behind his work was simple and appealing: if two collections are defined by the same property, treat them as the same thing. Turn that around and you get a second rule: every property gives you a collection.

"Animals that can fly" gives you {Birds, Bats}. "Animals that swim" gives you {Fish, Whales}. Every property creates a set. Nothing about that sounds dangerous.

## Then one question breaks it

Bertrand Russell noticed that this rule lets you describe a very strange collection. Call it **R**: the set of all sets that do *not* contain themselves. Then ask a plain question: does R contain itself?

1. **Suppose R contains itself.** But R is defined as the sets that do *not* contain themselves, so it can't be a member of itself. Contradiction.
2. **Suppose R does not contain itself.** Then it satisfies the rule "does not contain itself", so it *should* belong to R. Contradiction.

> Say yes and it's wrong. Say no and it's wrong.

## How Frege responded

Russell's letter reached Frege just as the second volume of his major work was close to being printed. Frege didn't look away from it. He added an appendix admitting the problem, and wrote that few things could be more unfortunate for an author than to see a foundation of the whole structure shaken once the work is finished.

**The lesson:** even brilliant ideas need precise foundations. A tiny flaw in logic can shake an entire system.

## What does this have to do with SQL?

More than you might think, just on a smaller scale. In data work we use words like "group", "duplicate" and "latest" all the time, and it's easy to assume everyone means the same thing by them. Assumptions are where surprises live.

So instead of assuming what a group is in SQL, let's let SQL show us.

### Step 1: An empty table has no groups

Create a table and leave it empty:

```sql
CREATE TABLE fruits (name VARCHAR(10));
```

Now run three different GROUP BY queries against it:

```sql
SELECT name FROM fruits GROUP BY name;

SELECT COUNT(*) AS cnt FROM fruits GROUP BY name;

SELECT name, COUNT(*) AS cnt FROM fruits GROUP BY name;
```

All three return **no rows selected**. No rows means no values, and no values means no groups. SQL only creates groups from rows that already exist.

It's worth noticing what happens when you take GROUP BY away. `SELECT COUNT(*) FROM fruits;` on the same empty table returns one row containing 0, because without GROUP BY the whole table is treated as a single group.

### Step 2: Add data and the groups appear

```sql
INSERT INTO fruits VALUES
    ('Oranges'),
    ('Oranges'),
    ('Oranges'),
    ('Apple'),
    ('Peach');
```

| Row | Name |
| --- | --- |
| 1 | Oranges |
| 2 | Oranges |
| 3 | Oranges |
| 4 | Apple |
| 5 | Peach |

Group by name and the five rows collapse into three distinct groups: Apple (1 row), Oranges (3 rows) and Peach (1 row).

```sql
SELECT name
FROM fruits
GROUP BY name;
```

| Name |
| --- |
| Apple |
| Oranges |
| Peach |

Add a count and you can see how many rows landed in each group:

```sql
SELECT name, COUNT(*) AS cnt
FROM fruits
GROUP BY name;
```

| Name | Cnt |
| --- | --- |
| Apple | 1 |
| Oranges | 3 |
| Peach | 1 |

One small caution: SQL doesn't promise any particular order for grouped results unless you add an `ORDER BY`. Alphabetical order is common, not guaranteed.

## Key takeaway

- `GROUP BY` creates distinct groups from existing rows.
- No rows means no groups.
- Duplicates are combined into one group.
- Each row belongs to exactly one group.

> In logic or in SQL, clarity defines truth.

Question. Test. Understand. Build on solid ground.
