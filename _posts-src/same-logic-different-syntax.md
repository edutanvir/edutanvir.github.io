---
title: Same Logic, Different Syntax
date: 2026-11-08
description: Get the latest record for each customer with ROW_NUMBER(), written in SQL and in PySpark side by side.
image: same-logic-different-syntax.webp
image_alt: Infographic titled Same logic, different syntax. It shows SQL and PySpark code that both use ROW_NUMBER() to get the latest record for each customer, with sample data, the output, and the key differences between the two.
image_layout: natural
preview: same-logic-preview.jpg
tags: SQL, PySpark, Window Functions
---

## The problem

Picture a customers table where every change adds a new row instead of overwriting the old one. The history is useful, but most of the time you only want the current picture: one row per customer, the most recent one.

Here is the table we start with:

| CustomerID | CustomerName | City | UpdatedDate |
| --- | --- | --- | --- |
| 101 | John | Ottawa | 2026-09-15 |
| 101 | John | Ottawa | 2026-10-01 |
| 102 | Priya | Toronto | 2026-09-10 |
| 102 | Priya | Toronto | 2026-09-25 |
| 103 | David | Vancouver | 2026-09-20 |

And here is what we want back, the latest record for each customer:

| CustomerID | CustomerName | City | UpdatedDate |
| --- | --- | --- | --- |
| 101 | John | Ottawa | 2026-10-01 |
| 102 | Priya | Toronto | 2026-09-25 |
| 103 | David | Vancouver | 2026-09-20 |

## The idea in four steps

The logic is the same whichever tool you use:

1. Split the rows into one bucket per customer (`PARTITION BY CustomerID`).
2. Sort each bucket from newest to oldest (`ORDER BY UpdatedDate DESC`).
3. Number the rows in that order with `ROW_NUMBER()`.
4. Keep only row number 1.

## In SQL

```sql
SELECT
    CustomerID,
    CustomerName,
    City,
    UpdatedDate
FROM
(
    SELECT
        CustomerID,
        CustomerName,
        City,
        UpdatedDate,
        ROW_NUMBER() OVER
        (
            PARTITION BY CustomerID
            ORDER BY UpdatedDate DESC
        ) AS rn
    FROM dbo.Customers
) AS C
WHERE rn = 1;
```

The numbering happens in the inner query, and the outer query keeps `rn = 1`. It's written as a subquery because SQL doesn't let you filter on a window function in the same query where it is calculated.

## In PySpark

```python
from pyspark.sql import functions as F
from pyspark.sql.window import Window

df = (customers
      .withColumn(
          "rn",
          F.row_number().over(
              Window.partitionBy("CustomerID")
                    .orderBy(F.col("UpdatedDate").desc())
          )
      )
)

result = (df
          .filter(F.col("rn") == 1)
          .select("CustomerID", "CustomerName",
                  "City", "UpdatedDate"))

result.show()
```

Same four moves, spelled differently: describe the window with `Window.partitionBy()` and `orderBy()`, add the numbering as a new column with `F.row_number().over(...)`, then filter and select.

## Side by side

| Step | SQL | PySpark |
| --- | --- | --- |
| Define the window | `OVER (PARTITION BY ... ORDER BY ...)` | `Window.partitionBy(...).orderBy(...)` |
| Number the rows | `ROW_NUMBER()` | `F.row_number().over(window)` |
| Keep the latest | `WHERE rn = 1` | `.filter(F.col("rn") == 1)` |

## One thing to watch: ties

If two rows for the same customer share the same `UpdatedDate`, `ROW_NUMBER()` still hands out 1 and 2, but which row gets the 1 isn't guaranteed. When ties are possible, add a tie-breaker to the sort, such as a unique record ID, so the answer is the same every time you run it.

## Pick the tool you're comfortable with

> Same goal. Different syntax. Choose the tool you're comfortable with.

Once you see the pattern, you can move between SQL and PySpark without relearning the idea. Only the spelling changes.
