# Tasks 12-14 — Lead form, neighborhood articles, SEO

The three pieces that were still missing between "the pages render" and "the site is finished":
somewhere for a visitor to write to the agency, the hyperlocal content, and the machine-readable
half the whole project exists to demonstrate.

## Task 12 — Lead capture

`src/lib/lead.ts`, `src/app/api/lead/route.ts`, `src/components/lead-form.tsx`.

The only write path on the site, and it owns no database: the agency already has an inbox.

**Delivery is configured, not compiled in.** With `RESEND_API_KEY`, `LEAD_FROM_EMAIL` and
`LEAD_TO_EMAIL` set, the enquiry is emailed; without them it is logged to the server console and
the visitor is still thanked. A clone of this repo therefore works with no account anywhere,
which matters for a portfolio piece someone else may want to run.

**Resend is called over plain HTTP rather than through its SDK.** It is one POST with a JSON
body. A dependency for that is a dependency to keep patched.

**The same Zod schema validates in the browser and again in the handler**, because a browser is
not a trustworthy place to enforce anything. A honeypot field — hidden from people and from
screen readers — rejects naive bots without asking a real visitor to solve a puzzle or loading a
third-party script.

Verified against the running app: a valid enquiry returns 200 and produces the right email body
with a working link back to the listing; a bad address, a two-character message, an unknown
locale, a filled honeypot, a missing slug and malformed JSON all return 400. Submitted through
the real form in Portuguese, the enquiry arrived with `locale: pt` and the Portuguese listing URL.

## Task 13 — Neighborhood articles

`/[locale]/neighborhoods` and `/[locale]/neighborhoods/[slug]`. The last dead link in the header.

Articles are ordinary posts filed under a category, and **Polylang translates the category term
along with the posts**: the English site must ask for "Neighborhoods" and the Portuguese one for
"Bairros". Asking for the wrong name returns nothing rather than erroring, so the names live in
the query layer with a comment rather than being guessed at a call site.

Unlike `name` (see the task 11 report), `categoryName` *does* compose with the language filter.
That was measured before relying on it.

**Route resolution and hreflang building are now shared with listings** rather than copied:
`resolveTranslatedRoute` and `alternateLinks` work on anything Polylang translates. Both page
types were about to grow the same two bugs.

## A bug the language guard exposed

Fixing the cross-language check in task 11 turned `/pt/properties/riverside-villa` into a 404 —
and that URL is exactly what the language switcher produces on a detail page, because it swaps
the locale segment and leaves the slug alone. The fix made a real feature worse.

A slug from the other language is not a mistake to punish: it is a visitor asking for this
listing in a language they can read. Both detail routes now redirect to the translation, and 404
only when there isn't one. Verified in both directions, for listings and for articles.

## Task 14 — SEO and AI-search readiness

| Output | Notes |
| --- | --- |
| JSON-LD | `RealEstateListing` per listing, `Article` per neighborhood, built by pure functions |
| `sitemap.xml` | 26 URLs, generated from the CMS, with hreflang alternates |
| `robots.txt` | everything indexable except `/api/` |
| `/llms.txt` | plain-text catalogue index, localised per section |
| hreflang + canonical | from Polylang's own links, absolute via `metadataBase` |

The JSON-LD is asserted in tests rather than eyeballed in a validator. It declines to call a lot
or a shop a residence, omits an offer entirely when there is no price rather than claiming the
listing is free, omits bedrooms rather than claiming zero, and drops every empty key instead of
emitting `null`.

`/llms.txt` is the bet behind the whole project: an assistant answering "three-bedroom houses
near the river in Terra" will not run our JavaScript or parse our grid, but it will read one
plain-text file that says what exists and where. The JSON-LD describes a page it already found;
this is how it finds them at all. It speaks the language of the section it is in, through the
same dictionary the pages use — an assistant reading the Portuguese catalogue should not have to
know that "for sale" and "à venda" are the same thing.

## Home page

Added the two things the design asked for and the page did not have: featured neighborhoods, and
a search entry point. The entry point is three links into the existing filter query string rather
than a search box — the filters are already shareable URLs, and a box that only searches eight
listings would be a worse version of the page it links to. Verified: sale returns 6, rent 2, land
1, out of 8.

## Housekeeping

Five copies of "strip the HTML out of this WordPress field" had accumulated across pages and the
schema builders. They are now `toPlainText` / `toSummary` in `src/lib/html.ts`, tested — including
the case that motivated the shared version, where replacing a tag with nothing welds two
paragraphs into one word.

## Known, not ours

The seeded coordinates are in New Jersey while the addresses are Brazilian. Seed data; fix in
`dev/seed.php`.

## Next

Deployment: WordPress on the HostGator subdomain, the front end on Vercel, then the portfolio
card and the `/work` case study.
