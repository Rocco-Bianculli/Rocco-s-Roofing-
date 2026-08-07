# Rocco's Roofing — upgrade pass

Notes on what changed in this pass, what you need to do to finish it, and how to
edit the site going forward. Written for whoever picks this up next, including
future-you.

The site is still plain HTML and CSS. There is no framework, no build step and
no `npm install` — open a `.html` file, change the words, save, push. That was
deliberate: you should be able to maintain your own site.

---

## 1. Do these three things first

Nothing else on this list matters until these are done.

### a) Claim `roccosroofing.com` — the site has no working address

Right now the domain resolves to Vercel (`216.198.79.1`) but **no project owns
it**, so no HTTPS certificate was ever issued and `https://roccosroofing.com`
fails to load entirely. The only working copy of the site is at
`rocco-bianculli.github.io/Roccos-Roofing`.

Meanwhile every page in this repo tells Google the *real* address is
`roccosroofing.com` (that's what a `<link rel="canonical">` does). So Google is
being pointed at a URL that doesn't answer. Until this is fixed the site cannot
rank for anything.

Fix: import this repo into Vercel under **Rocco's own account**, then add
`roccosroofing.com` and `www.roccosroofing.com` as domains on that project. The
DNS already points there, so the certificate should issue within minutes. No
build settings to change — Vercel serves the HTML as-is and picks up `/api`
automatically.

Deploying to Vercel is also what makes the contact form work (see below).
GitHub Pages cannot run server code, so the form can never send email there.

### b) Set the three environment variables so the form sends

In the Vercel project → Settings → Environment Variables:

| Variable | Value |
| --- | --- |
| `RESEND_API_KEY` | from [resend.com/api-keys](https://resend.com/api-keys) |
| `LEAD_TO` | `joe@roccos-roofing.com` (comma-separate for more than one) |
| `LEAD_FROM` | `Rocco's Roofing Website <website@roccosroofing.com>` |

`LEAD_FROM` has to be on a domain you've verified in Resend. Until you've done
that, set it to `onboarding@resend.dev` — that only delivers to the address that
owns the Resend account, which is fine for testing but not for real leads.

**Then send yourself a test message through the live form and confirm it
arrives.** A contact form nobody has tested is the same as no contact form.

Never put the API key in a file in this repo — this repository is public.

### c) Get reviews on the page

There is not a single customer testimonial on this site. For a $15,000 roof,
that is the number-one reason someone calls a competitor instead.

Get three real quotes with a first name and a town. There is a ready-made,
commented-out section in `index.html` (search for `TESTIMONIALS`) — paste them
in, delete the comment markers, and add matching `review` / `aggregateRating`
entries to the JSON-LD block at the top of that file so stars can appear in
Google results.

**Only ever use real quotes.** Invented reviews are illegal under FTC rules, and
Google penalises review markup it can't verify.

---

## 2. What changed in this pass

### Broken things that are now fixed

- **The contact form could never send anything.** It was
  `action="mailto:…" method="post" enctype="text/plain"`. Chrome ignores a POST
  to `mailto:` and most phones do nothing at all, so every estimate request
  typed into that form was silently discarded. It now posts to
  `/api/contact`, which emails Joe through Resend. If that call ever fails, the
  visitor is shown the phone number and email address instead of a dead end.
- **`tel:` links** are now `tel:+16177992976`. Bare 10-digit numbers don't
  reliably dial on all handsets.
- **The hero had an empty fourth stat**, leaving a visible gap in the row. It's
  now "Free — No-obligation estimates".
- **The Free Estimate button on the contact page** pointed at `#form`, an id
  that no longer existed after the form was rebuilt.

### Local SEO

This is what decides whether the phone rings. Nobody searches "roofer in New
England" — they search "roofer in Melrose".

- Added `service-area.html` listing every town, grouped by region, plus a town
  grid on the homepage.
- `areaServed` in the structured data was three entire states; it now names
  individual cities as well.
- Added `FAQPage` structured data to `faq.html`, which makes those questions
  eligible to show as drop-downs directly in Google results. Two new questions
  were added to the page ("what areas do you serve", "do you charge for
  estimates") because both get searched constantly.
- Added `hasOfferCatalog` so each service is a named entity.
- `thanks.html` and `404.html` are `noindex` on purpose.

> **The town lists need your eye.** They're a sensible Greater Boston / North
> Shore / RI / Southern NH starting point, not gospel. Cut any town you wouldn't
> actually drive to — an accurate short list beats a padded long one, and
> claiming towns you don't serve produces junk leads. Both lists are marked with
> `TODO(Rocco)` comments.

### Speed

- Photos were 4.9 MB of full-size portrait phone shots. They're now resized and
  ship as WebP with a JPEG fallback, at **1.86 MB** — about a third of the
  bytes, and on a phone that's the difference between waiting and leaving.
- The hero was a portrait photo used as a full-bleed landscape banner, loaded as
  a CSS background. CSS backgrounds are invisible to the browser's preloader, so
  the biggest image on the page was always the last thing requested. There's now
  a properly framed landscape crop (`images/hero.jpg`), loaded as a real `<img>`
  with `fetchpriority="high"` and a `<link rel="preload">`.
- Every image has `width` and `height` so the page doesn't jump around while
  loading.

### Accessibility

- Added a skip link, a `<main>` landmark, and visible focus outlines.
- The hamburger button now reports `aria-expanded` and closes on Escape.
- Added a `prefers-reduced-motion` block for people who get motion sickness from
  hover animations.

### Housekeeping

- Gallery thumbnails used to open the raw full-size JPEG in a new tab. They now
  open a proper lightbox with arrow-key navigation — and still work with
  JavaScript disabled, because the link is left intact and only intercepted.
- The mobile-menu script was copy-pasted into all five pages. It now lives in
  `site.js` along with the lightbox and the form handler.
- Deleted `Rocco's Roofing Logo.png` (908 KB) and `logo_small.png`, neither of
  which was referenced anywhere, and a stray committed `_to_delete/` folder.
- Removed `.github/workflows/pages.yml`. Two deploy pipelines were racing on
  every push — that workflow *and* GitHub's built-in branch build. The built-in
  one was the one actually serving the site.
- `theme-color` was `#5b8fd6`, a blue that appears nowhere else in the design.
- Added security headers and long-lived image caching in `vercel.json`.

---

## 3. How to edit things

**Change a phone number, email or address.** These appear in several places per
page because each page is standalone HTML. Find every one at once:

```sh
grep -rn "617-799-2976" *.html          # visible text
grep -rn "tel:+16177992976" *.html      # click-to-call links
```

Change them all, including the `telephone` field in the JSON-LD block at the top
of `index.html`.

**Add a project photo.** Drop the JPEG in `images/`, then copy an existing
`<a class="lb">` block in the gallery in `index.html` and change the filename,
the `alt` text and the caption. To keep it fast, resize it to about 1000px on
the long side first and save a `.webp` alongside it.

**Add a town.** Add an `<li>` to the right group in `service-area.html`, and to
the homepage grid if it's a main one.

**Preview locally.** From this folder:

```sh
python3 -m http.server 8000     # then open http://localhost:8000
```

The form won't send locally — there's no server running `/api` — so it will show
the "call us instead" fallback. That's expected.

---

## 4. Still worth doing

- **Google Business Profile.** For a local contractor this outranks the website
  itself. Claim it, add photos, and ask every happy customer for a review. Once
  it's live, drop the link into the footer (there's a commented-out slot in the
  "Get In Touch" column of every page) and add it to `sameAs` in the JSON-LD.
- **A real address and opening hours.** Nothing on the site says where you are
  or when you answer the phone. Google leans on that to match a website to a
  Business Profile, and visitors look for it. Add `address` and `openingHours`
  to the JSON-LD in `index.html` once you decide what to publish.
- **Analytics.** There is no tracking of any kind, so there's no way to know
  whether any of this is working. Google Analytics 4 plus Search Console is
  free; `thanks.html` exists specifically so you can count form submissions as
  conversions.
- **Per-service pages.** One page each for "Roof Replacement", "Roof Repair",
  "Siding" and "Gutters" would rank far better than the single combined
  Services page. Biggest remaining SEO win after the domain is fixed.
- **Rate-limiting the form.** The honeypot stops naive bots. If real spam shows
  up, put Cloudflare Turnstile in front of it.
