# Md Tanvir Ahmed | Azure Data Engineering Portfolio

Live site: **https://edutanvir.github.io**

My portfolio of Azure data engineering projects: cloud pipelines, lakehouse architectures, and analytics dashboards, each with a case study that explains the problem, the engineering, and the findings.

## Projects

| Project | What it shows | Stack |
| --- | --- | --- |
| **Energy Data Lakehouse** | Energy generation, CO₂, prices, and energy-source patterns in an interactive report. [Case study](https://edutanvir.github.io/case-studies/energy-data-lakehouse.html) | Microsoft Fabric, PySpark, Power BI |
| **Oil & Gas Analytics** | Production trends, oil prices, inventory, suppliers, and shipping delays. Case study coming soon. | Microsoft Fabric, Power BI |
| **NYC Taxi Analytics** | Taxi trip data from cloud ingestion to SQL analytics. [Case study](https://edutanvir.github.io/case-studies/nyc-taxi.html) | Azure Data Factory, ADLS Gen2, Synapse Analytics, SQL |

## Core skills

Azure Data Factory, Databricks, PySpark, Spark SQL, SQL, ADLS Gen2, Azure Synapse, Azure SQL, Microsoft Fabric, Power BI, Azure DevOps CI/CD, Key Vault, RBAC, Managed Identities.

## About this site

A static site built with plain HTML, CSS, and JavaScript and hosted on GitHub Pages. No frameworks and no database. The only build step is the optional blog script.

- Apple-style design with a **dark and light theme** (the visitor's choice is remembered)
- Project carousel with keyboard and swipe support
- **Booking calendar** on the contact page that shows the days I am free, in the visitor's own time zone
- **Blog** written in Markdown, with cover images, scroll animations, and link previews that look good when shared on LinkedIn
- Cursor, hover, and scroll effects that switch off for visitors who prefer reduced motion
- Contact form that delivers messages to my inbox, so my email address is never published on the page

## Project structure

```
edutanvir.github.io/
├── index.html                 Home page
├── contact.html               Booking calendar and contact form
├── style.css                  Design system, themes, calendar, and blog styles
├── script.js                  Theme switch, effects, carousel, and contact form
├── booking.js                 Booking calendar
├── availability.json          The days and times I am free (edit this weekly)
├── case-studies/
│   ├── energy-data-lakehouse.html
│   └── nyc-taxi.html
├── blog/                      Generated pages (do not edit by hand)
│   ├── index.html
│   ├── hello-world.html
│   └── images/                Cover and article images
├── _posts-src/                My posts, written in Markdown
├── _tools/
│   └── build_blog.py          Turns the Markdown into blog pages
└── images/                    Screenshots, profile photo, favicon.png
```

Folders that start with an underscore are not published by GitHub Pages.

## Update my availability

Edit `availability.json` on GitHub (open the file, click the pencil icon, then **Commit changes**). One line per free day:

```json
"availability": {
  "2026-11-10": ["10:00-12:00", "14:00-15:30"],
  "2026-11-12": ["16:00"]
}
```

- A range such as `"10:00-12:00"` is split into 30-minute slots (change `slotMinutes` to alter this).
- Times are in the `timezone` set at the top of the file. Visitors see them converted to their own time zone.
- Requests arrive in my inbox. Once I confirm one, I delete that time from the file.
- Changes can take a few minutes to appear after publishing.
- Preview the calendar with example dates and nothing sent: `contact.html?demo=1`.

## Write a blog post

1. Add a file to `_posts-src/`, for example `my-post.md`, starting with the front matter (title, date, description, image, tags). See `hello-world.md` for every available building block.
2. Put the cover image (1200 x 627 px is ideal) in `blog/images/`.
3. One-time setup: `pip3 install markdown`. Then run `python3 _tools/build_blog.py`.
4. Commit and push. Share the post link on LinkedIn; the cover image, title, and description appear automatically.

LinkedIn remembers old previews. To refresh one, paste the link into the [Post Inspector](https://www.linkedin.com/post-inspector/).

## Theme

The site opens in dark mode on a first visit. To follow the visitor's device setting instead, see the comment in the small script at the top of each page's `<head>`.

## Run it locally

Open the folder in VS Code and start it with the Live Server extension, or run this from the project folder and visit http://localhost:8000:

```
python3 -m http.server 8000
```

## Connect

- GitHub: [@edutanvir](https://github.com/edutanvir)
- Contact form: [edutanvir.github.io/contact.html](https://edutanvir.github.io/contact.html)

## License

Copyright © 2026 Md Tanvir Ahmed. All rights reserved. See [LICENSE](LICENSE).
