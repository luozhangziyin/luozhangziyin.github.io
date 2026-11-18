# luozhangziyin.github.io

My personal academic profile, published with GitHub Pages.

Live at: **https://luozhangziyin.github.io/**

---

## What is in here

| Path | Purpose |
| --- | --- |
| `index.html` | Home — biography and current work, with brief previews of the other pages. |
| `education.html` | Education timeline, taught skills, and languages. |
| `awards.html` | Honours at Tsinghua, then competition results. |
| `skills.html` | Both projects in detail, plus tools and languages. |
| `styles.css` | Styling for every page. **Edit colours and type here, not in the HTML.** |
| `files/` | Downloadable documents served by the site — the two project PDFs. |
| `sitemap.xml` | Lists the four pages so search engines find them all at once. |
| `robots.txt` | Permits indexing and points crawlers at the sitemap. |
| `.nojekyll` | Tells GitHub Pages to serve the files as-is instead of running Jekyll. |

## Search engines

Each page carries a `<link rel="canonical">`, an `og:url`, and a block of
**structured data** (JSON-LD) at the end of `<head>`. That block states in
machine-readable form that these pages are about a person named Ziyin Luo,
affiliated with Tsinghua University. It is the main thing that helps a search
engine connect this site to the *person* rather than treating it as an anonymous
page.

Two maintenance points:

- **When you edit a page, update its `<lastmod>` date in `sitemap.xml`.** Stale
  dates don't break anything, they just make the hint less useful.
- **The JSON-LD must remain valid JSON.** It has no comments inside it, and it
  cannot have any — a stray `//` or `/* */` makes the whole block unparseable and
  it is then silently ignored. The explanatory note sits in an HTML comment
  *outside* the `<script>` tag, which is safe.

### Why the biographical facts live in the JSON-LD and not the sitemap

A sitemap can only hold addresses. Each `<url>` entry accepts a location and a few
optional hints (`lastmod`, `changefreq`, `priority`) — **there is no field for
prose**, so sentences about finishing A-Levels at 14 or entering university at 16
cannot go in `sitemap.xml`. Any text there is simply invalid and ignored.

Those facts therefore live in two places instead:

| Place | Purpose |
| --- | --- |
| The JSON-LD `description` field | The machine-readable statement of the same facts, in the Person node |
| The visible pages (`education.html`) | What a human reads |

This split is the point: the sitemap gets crawlers to the pages, and the
structured data tells them what the pages are about. Keep the two consistent —
if a fact changes in the page text, change it in the JSON-LD as well.

To have Google actually index the site, submit
`https://luozhangziyin.github.io/sitemap.xml` in
[Google Search Console](https://search.google.com/search-console). A sitemap is a
hint; Search Console is where you ask directly.

Two folders on the computer are **gitignored and deliberately untracked**, so they are
not in this repository, not in its history, and not on the website:

| Folder | Holds | Why excluded |
| --- | --- | --- |
| `_source/` | Original notes and my CV | Private |
| `SmartCanteen/` | Working materials for the SmartCanteen project | Contains a 60 MB PowerPoint and the team's raw files |

Both exist only on local disk. Keep it that way.

## What is in `files/`

Only two documents are published — the ones safe for anyone to see.

| File | Served as |
| --- | --- |
| `moveit2-robotic-arm-report.pdf` | The robotics technical report, 32 pages |
| `smartcanteen-poster-a4.pdf` | The SmartCanteen A4 poster |

The rest of the SmartCanteen materials — the 40-page concept document, the slide deck
and the team's raw notes — stay in the untracked `SmartCanteen/` folder and are **not
published**. To publish the concept document later, copy it into `files/` first, then
link to `files/...`; do not link straight into `SmartCanteen/`, because that folder is
not in the repository.

Everything is plain HTML and CSS. No JavaScript, no frameworks, no build step — so there
is nothing to compile and nothing that can break on its own.

## Editing the page

Open any `.html` file in a text editor. Content sits inside `<section>` blocks, each one
labelled with an `id`, and each section has a visible `<h2>` heading above it.

**Every section is wrapped in comment markers.** They look like this and are not visible
on the website — they exist only to make editing safe:

```html
<!-- ===== START OF SECTION: BIO ===== -->
<section id="bio">
  ... the content ...
</section>
<!-- ===== END OF SECTION ===== -->
```

To delete a section, remove everything from its START marker down to its END marker,
inclusive. To move one, cut from START to END and paste it somewhere else at the same
indentation. You never have to count `</div>` tags.

- To change wording, edit the text between the tags.
- To add an award, copy an existing `<li>` inside the relevant list and change the text.
- To add a whole new section, copy a marked block, give the `<section>` a fresh `id`, and
  update the label in the START marker so the two do not get confused.

**Navigation is duplicated in every file.** Each page has the same `<nav class="nav">`
block near the top, and the only difference is which link carries
`aria-current="page"`. If you add a fifth page, add its link to the nav in *all* the
files, then set `aria-current="page"` on the correct one for each page.

The same applies to the `<head>` block and the `<footer>`, which are also repeated per
page. That repetition is normal for a small static site; it is the price of having no
build step.

### Changing the look

Open `styles.css` and edit the variables at the very top, under `:root`. Everything else
in the file refers back to them, so one change propagates across the whole site.

- `--accent` — the blue used for headings, links and underlines
- `--mark` — the gold underline used for grades and results
- `--serif`, `--sans`, `--cjk` — the font stacks
- `--bg`, `--surface`, `--ink` — background, card and text colours

There is a second set of the same variables inside
`@media (prefers-color-scheme: dark)`. That is what readers get if their device is in
dark mode, so if you change a colour, change it in both places.

### Previewing locally

Double-click any `.html` file. It opens in a browser and looks identical to the published
site. Clicking through the navigation works too, because all the files sit in one folder.

## Publishing for the first time

The repository on GitHub is currently **empty** — the site exists only on the computer.
Nothing is live until these steps are done.

### Step 1 — Make the repository public

**Settings → General → scroll to the bottom → Change visibility → Change to public.**

GitHub Pages will not serve from a private repository on a free account. This is the step
that most often catches people out, because everything else looks correct.

### Step 2 — Upload the files

On the repository page: **Add file → Upload files**.

- Drag in everything **except** the `.git` folder and the `_source` folder:
  `index.html`, `education.html`, `awards.html`, `skills.html`, `styles.css`,
  `README.md`, `.nojekyll`, and the `files` folder.
- **The `files` folder matters** — it holds the project report PDF. Drag the whole
  folder, not just the PDF inside it, so the path stays `files/…`.
- To include `.nojekyll`, drag it in; if your browser hides it, create it later with
  **Add file → Create new file**, naming it `.nojekyll` and leaving it empty.
- `_source/` contains the CV and private notes and does **not** need to be uploaded.
- Commit with any message, e.g. "Add site".

### Step 3 — Turn on Pages

**Settings → Pages**

- **Source**: `Deploy from a branch`
- **Branch**: `main`  ·  **Folder**: `/ (root)`
- **Save**

### Step 4 — Wait, then check

Give it about a minute, then open **https://luozhangziyin.github.io/**.

If you see a 404, wait another minute and refresh — the first build is the slowest. If the
page loads but looks unstyled, `styles.css` did not upload; check it is in the root, next
to `index.html`.

## Publishing changes afterwards

Once the files are on GitHub, editing is easier. Either:

**Upload again** — **Add file → Upload files**, drag in the changed files, commit. Best
for small text edits.

**Or use git**, if you have it installed and authenticated on your own machine:

```powershell
git add -A
git commit -m "Update awards"
git push
```

Any commit to `main` goes live automatically within about a minute.

## How GitHub Pages is configured

In the repository on GitHub: **Settings → Pages**.

- **Source**: `Deploy from a branch`
- **Branch**: `main`  ·  **Folder**: `/ (root)`

Because this repository is named `luozhangziyin.github.io`, it is a *user site*: it is
served from the root of the domain. That is why links between pages are written as plain
`education.html` rather than with a leading slash or a repository name. If the site were
ever moved into a repository with a different name, it would be served from a subfolder
and those relative links would keep working, but absolute ones would not.

**The repository must be public for Pages to serve it** on a free GitHub account. This is
the one setting to remember before the site will appear.

## Notes

- No phone number or email address appears anywhere on the site.
- The CV is deliberately **not** published here; it stays in `_source/` as a private
  document.
- The site adapts to phone screens, follows the reader's light/dark preference, and each
  page has a print stylesheet that drops the navigation.

## Dating conventions

These matter if you ever edit the awards, so they are recorded here.

**Olympiad results are dated by examination year.** The BPhO and BAAO rounds run late in
the academic year, so the 2025 competitions were actually sat in the 2026 portion of the
2025 – 2026 school year. This is the same convention the CV uses, which is why the CV's
"2025" slot and the site's "2025" agree.

**The physics results, as published:**

| Year | Result |
| --- | --- |
| 2022 | BPhO Bronze I |
| 2023 | BPhO Gold |
| 2024 | BPhO Gold, national Top 100 |
| 2025 | BPhO Top Gold, national Top 50 |
| 2025 | BPhO Round 2 — Silver (national team selection) |
| 2025 | BAAO Round 2 — Silver (qualified automatically from BPhO Top Gold, without sitting BAAO Round 1) |

**Education dates.** Harris Academy Greenwich ran 2022 – 2026. A-Levels were completed in
2024 at age 14, four years ahead of cohort. Years 12 and 13 were skipped, so the usual
route would have run to 2028.

**Mathematical Challenge years** all follow the CV and run continuously to 2026
(Intermediate: 2022 – 2026; Senior: 2022 – 2025).

## Two things left out on purpose

The CV gives the 2023 BPhO Gold as "top 150". That is real but is *not* printed on the
awards page: at that distance from the Top 50, naming a rank weakens the entry. The 2023
result therefore appears as a plain Gold. Add the ranking back in `awards.html` if you
want the complete progression shown.

The BPhO **Round 2** entry is described as *"the national team selection stage for the
training camp"*. Round 2 and the training camp selection are the same event — Round 2 is
how the camp selects — so the two names are used together to make the connection clear.
Earlier versions said "National Training Camp" on its own, which implied a separate
achievement and was corrected.
