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
- **Booking calendar** on the contact page that shows the days I am free, in the visitor's own time zone. Visitors can browse 12 months ahead; months with no times say so
- **Private availability editor** (`admin.html`, kept on my computer and never published): pick days and hours, press Publish, and the calendar updates. No database needed
- **Blog** written in Markdown, with cover images, scroll animations, and link previews that look good when shared on LinkedIn. The home page shows the latest posts automatically
- Cursor, hover, and scroll effects that switch off for visitors who prefer reduced motion
- Contact form that delivers messages to my inbox, so my email address is never published on the page

## Project structure

```
edutanvir.github.io/
├── index.html                 Home page (its "From the blog" cards update automatically)
├── contact.html               Booking calendar and contact form
├── style.css                  Design system, themes, calendar, and blog styles
├── script.js                  Theme switch, effects, carousel, and contact form
├── booking.js                 Booking calendar
├── availability.json          The days and times I am free (the editor below updates this)
├── admin.html                 Private availability editor (in .gitignore: stays on my computer)
├── admin.js                   Logic for the editor (in .gitignore too)
├── case-studies/
│   ├── energy-data-lakehouse.html
│   └── nyc-taxi.html
├── blog/                      Generated pages (do not edit by hand)
│   ├── index.html
│   ├── paradox-to-practice.html
│   ├── same-logic-different-syntax.html
│   └── images/                Cover and article images
├── _posts-src/                My posts, written in Markdown
├── _tools/
│   └── build_blog.py          Turns the Markdown into blog pages
├── images/                    Screenshots, profile photo, favicon.png
├── .gitignore                 Files that stay on my computer
├── LICENSE
└── README.md
```

Folders that start with an underscore are not published as web pages by GitHub Pages. They are still visible in the GitHub repository if it is public, so unfinished posts go in `drafts/` instead (see below).

## Update my availability

The site has no database. The file `availability.json` in this repository is the data, and `admin.html` is the screen I use to change it.

### The easy way: the availability editor

The editor is not part of the published site. `admin.html` and `admin.js` are listed in `.gitignore`, so they stay on my computer. Open the project folder in VS Code, start Live Server, and visit `http://127.0.0.1:5500/admin.html` (the port may differ). It still saves to GitHub through the token below, so the live site updates as usual.

1. Click a day to select it (hold **Shift** and click to select a range, or use **Select weekdays**).
2. Choose the hours, then click **Set these hours** (replace the day), **Add hours** (keep what is there), **Block this time** (remove one slot after someone books it), or **Clear the day**.
3. **Fill several weeks at once** applies the same hours to chosen weekdays between two dates.
4. Press **Publish to website**. The change goes live about a minute later (GitHub Pages and browsers can cache the file for a few more minutes).

**One-time setup: the access token.** The editor saves by committing `availability.json` to this repository, which needs a GitHub token:

1. Open https://github.com/settings/personal-access-tokens/new
2. Name it `availability editor` and set an expiry (90 days is sensible).
3. Under **Repository access**, choose **Only select repositories** and pick `edutanvir.github.io`.
4. Under **Repository permissions**, set **Contents** to **Read and write**. Leave everything else off.
5. Click **Generate token**, copy it, and paste it into the editor.

The token is kept only in my own browser, and only when **Remember on this device** is ticked. It is never written into the site's files. It can only touch this one repository, and I can revoke it any time from the same GitHub settings page. If it expires, make a new one.

**No token?** Choose **Edit without a token**. Make the changes, then click **Download file** (or **Copy JSON**) and upload it over `availability.json` on GitHub.

Every publish is a normal commit, so the full history of my availability is in the repository.

### The manual way

Edit `availability.json` on GitHub (open the file, click the pencil icon, then **Commit changes**). One line per free day:

```json
"availability": {
  "2026-11-10": ["10:00-12:00", "14:00-15:30"],
  "2026-11-12": ["16:00"]
}
```

- A range such as `"10:00-12:00"` is split into 30-minute slots (change `slotMinutes` to alter this).
- Times are in the `timezone` set at the top of the file. Visitors see them converted to their own time zone.
- `minNoticeHours` stops people booking a time that is too close. Set it to `0` to allow any time that has not started.
- Requests arrive in my inbox. Once I confirm one, I block that time in the editor (or delete it from the file).
- Visitors can browse 12 months ahead. Months with no times show "Nothing open yet". To change the reach, set `data-months-ahead` on the `[data-booking]` element in `contact.html`.
- Preview the calendar with example dates and nothing sent: `contact.html?demo=1`.

## Write a blog post

1. Start the post in `drafts/` (this folder is in `.gitignore`, so it never leaves my computer). Copy `_posts-src/_formatting-guide.md` to begin: it shows every building block. When the post is ready, move the file into `_posts-src/`.
2. Start the file with the front matter (title, date, description, image, tags) and put the picture in `blog/images/`. A 1200 x 627 px cover works as-is. For an infographic of any other shape, add `image_layout: natural` (shown in full, never cropped) and `preview: your-1200x627-picture.jpg` (used for the blog list, the home page, and the LinkedIn preview).
3. One-time setup: `pip3 install markdown`. Then run `python3 _tools/build_blog.py`. This builds the post, the blog list, and the three newest cards on the home page.
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
