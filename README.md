# Bible & Truth

A Jekyll site for GitHub Pages. Articles are plain `.md` files. You never edit a list or an index page.

## 1. One-time setup

1. Open `_config.yml` and set:
   - `url`: `https://YOUR-USERNAME.github.io`
   - `baseurl`: `"/bible-and-truth"` (the repository name; use `""` if the repository is called `YOUR-USERNAME.github.io`)
2. Upload everything in this folder to the root of your repository (replace the old files and delete the old `css/`, `js/`, `fathers/` folders and the old `*.html` category pages).
3. On GitHub: **Settings → Pages → Build and deployment → Deploy from a branch → main / (root)**.
4. Wait about a minute. Open `https://YOUR-USERNAME.github.io/bible-and-truth/`.

## 2. Adding an article (two ways)

An article is one file. Its folder decides where it appears.

```
articles/
  theology/
    jesus-as-god.md                  -> Theology
    doctrine-of-god/
      how-many-powers.md             -> Theology › Doctrine of God
  islam/
    quranic-variant-part-1.md        -> Islamic Dilemma
  fathers/
    later-fathers/
      augustine.md                   -> Church Fathers › Later Church Fathers
```

The file must start with a small header between two `---` lines:

```
---
title: "How Many Powers Created the World?"
date: 2026-10-27
summary: "One or two sentences for the article card and search."
---

Your article text starts here. Leave a blank line between paragraphs.
```

Only `title` and `date` are needed. If `summary` is left out, the site uses the first words of the article. The file **must** begin with the `---` header, or GitHub will not turn it into a page.

**A. On GitHub.** Open the category folder, **Add file → Create new file**, type `my-article.md`, paste the header and text, **Commit**.

**B. On your computer.** Copy `_templates/new-article.md` into the right folder, rename it, edit it, upload it.

The home page, Articles page, category filters, search, article counts and "More in …" lists all update by themselves.

Headings use `## Heading`. A quotation uses a line starting with `> `. Bold is `**bold**`, italic is `*italic*`.

## 3. Categories

Folders can be used straight away. To give a category a proper name, icon, description or a place in the top menu, add it to `_data/categories.yml` (copy an existing block). Use folder names with no spaces: `islamic-dilemma`, not `islamic dilemma`.

## 4. Other things you can change

- Contact details, articles per page: `_config.yml`
- Daily verses: `_data/verses.yml`
- Colours and fonts: `assets/css/style.css`. The top of that file holds two colour sets, light (`:root`) and dark (`:root[data-theme="dark"]`); change a colour there and the whole site follows. The sun/moon button in the header switches theme, remembers the choice, and the first visit follows the visitor's device setting.
- Top menu: `_includes/header.html` (About and Contact are in the footer instead)
- Article pages automatically get reading time, a progress bar, a contents list (when there are 3 or more `##` headings), WhatsApp / copy-link share buttons and print styles. Nothing to configure.
- Search: `assets/js/site.js`. The header box shows live results (arrow keys + Enter, Esc to close, `/` to jump to it). On the Articles page every search box filters the list as you type.
- About page text: `about.html`

## 5. Running it on your computer (optional)

```
bundle install
bundle exec jekyll serve --baseurl ""
```
Then open http://localhost:4000
