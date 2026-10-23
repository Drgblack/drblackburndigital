# MedicalGerman launch runbook

## Review status

Phase 1 supplies the build-time switch. Phase 3 replaces its review scaffolding
with bilingual product, portfolio and billing-help drafts plus share images.
Do not enable Production until the acquisition has closed, phases 2–6 have
been reviewed and merged, all TODO-CONFIRM facts have been resolved, and the
legal drafts have received lawyer approval. Each phase has a separate PR and
review stop. The product pages still contain explicit placeholders, not finished
launch copy. Resolve those facts during review before activating the flag.

No MedicalGerman repository or live product source is needed for this work.
Write original copy from the approved brief and mark unknown facts
TODO-CONFIRM. Keep credentials exclusively in Vercel environment variables.

## Switch behavior

`SHOW_MEDICALGERMAN` is read by the Node build script. Only the exact string
`true` enables the feature. Missing, empty, `false`, `TRUE`, `1` and other
values leave it disabled. It is not a browser or runtime switch: changing the
variable requires a fresh build and deployment.

| Environment | Setting before closing | Result |
| --- | --- | --- |
| Vercel Production | Unset (or `false`) | Current site, no product routes, text, links, assets or structured data |
| Vercel Preview | `true`, all preview branches | Review content included; every page remains noindex/nofollow, robots disallows crawling, sitemap is empty |
| Local | Unset by default | Current site; set `true` explicitly to review launch content |

The `--preview` build argument controls output location and the local review
banner; it does not enable launch content. `VERCEL_ENV=preview` controls
search indexing; it does not enable launch content either. Keep Vercel
Deployment Protection enabled for preview sharing where available. Noindex
is a crawler instruction, not access control.

The build clears the resolved `dist` or `preview-dist` directory before
writing it, so disabling the flag removes previously generated product
pages. With the flag off, a final scan rejects product names in every output
path and file (including shared assets) and removes failed output. The
tracked root `index.html` is only refreshed by flag-off, non-preview builds;
never deploy the repository root or `preview-dist`.

Product review routes are `/medicalgerman/` and `/de/medicalgerman/`.
Navigation, language alternates, sitemap entries and Product structured data
are derived from the same gated page collection. Keep future product pages
and modifications to existing pages behind that same flag. Any future product
asset must be explicitly included only when the flag is on; shared CSS/JS
must not contain product references in flag-off builds.

## Local verification

Run from a clean checkout with the flag unset:

```sh
npm ci
npm run build
npm run build:preview
npm test
npm run test:launch:browser
```

The launch browser script builds isolated temporary copies; no live email is
sent and no external sites are fetched. It checks both flag states against
both Production and Vercel Preview behavior, all routes at desktop and mobile
widths, gated-route 404s, language switches, navigation and axe accessibility
on the new pages. The existing full browser suite is available through
`npm run test:browser` with `npm run dev` and `npm run preview` running.
Chrome must be installed (`npx playwright install chrome` if needed).

To view the enabled content locally in PowerShell:

```powershell
$env:SHOW_MEDICALGERMAN = 'true'
npm run build:preview
Remove-Item Env:SHOW_MEDICALGERMAN
npm run preview
```

Use `http://127.0.0.1:4174/medicalgerman/` and the DE language switch.
Rebuild without the flag before running the baseline site tests, which
intentionally expect the current flag-off production and local preview site.
The isolated launch tests check the enabled builds separately.

## Go live after closing

1. Confirm closing, approval to publish, completion of phases 2–6, EN/DE
   parity, legal sign-off and resolution of every TODO-CONFIRM marker. Record
   the release commit and the current known-good Production deployment URL.
2. Review that release on a Vercel Preview deployment. Verify the launch
   checks and existing site/form checks are green for that commit.
3. In Vercel, select the `drblackburndigital` project → Settings → Environment
   Variables. Set `SHOW_MEDICALGERMAN` to the exact value `true` for
   **Production**. Keep the Preview setting separate. Do not change email
   credentials, rate-limit configuration or other deployment variables.
4. Redeploy the reviewed `main` commit to **Production**, using the current
   environment variables and a fresh build (disable reuse of the build cache).
   Do not promote a Preview artifact: it has Preview indexing and mail rules.
5. Wait for the Production deployment to be Ready and assigned to
   `www.drblackburndigital.com`, then complete the checklist below.

The activation itself requires no source edit once the remaining phases are
complete and approved.

## Post-launch checklist

- [ ] Home and portfolio entries link to the product in both languages.
- [ ] Product, billing help, partner hub and launch article return 200 and
      show approved copy; no TODO-CONFIRM or unapproved legal draft remains.
- [ ] Registration and operator details match Dr. Blackburn Digital GmbH,
      HRB 112680, Amtsgericht Saarbrücken. Add USt-IdNr only when confirmed.
- [ ] EN/DE switches and hreflang point to the corresponding pages.
- [ ] Canonical URLs use the production domain; public launch pages are
      indexable, existing legal pages retain their intended noindex setting,
      and the production sitemap includes only approved indexable pages.
- [ ] Organization, Product and FAQ data match the visible approved copy.
- [ ] Social images, logos, navigation, redirects and the 404 page work.
- [ ] The approved outbound product links work after closing.
- [ ] Contact and partner forms validate and handle disabled/error states;
      confirm real inbox delivery only as a separately authorized mail test.
- [ ] Cookie choices can be changed from the footer; non-essential scripts
      and conversion events load only after the appropriate consent.
- [ ] Playwright, axe, broken-link and performance checks for the completed
      launch pass. Preview URLs remain noindex and outside the sitemap.

Items for phases 2–6 are release requirements, not claims that Phase 1 has
implemented them.

## Phase 3 review material

With the flag on, review these language pairs:

| Content | English | German |
| --- | --- | --- |
| Home portfolio entry | `/` | `/de/` |
| Portfolio | `/portfolio/` | `/de/portfolio/` |
| Product, preparation, pricing and FAQ | `/medicalgerman/` | `/de/medicalgerman/` |
| Invoices, cancellation and support | `/medicalgerman/billing/` | `/de/medicalgerman/abrechnung/` |

The existing English portfolio and both home entries change only in flag-on
builds. The German portfolio, product and billing pages do not exist when off.
Their language alternates, nav entries, schema and image references follow the
same gated page collection. The default site remains unchanged by Phase 3.

`src/medicalgerman.mjs` holds original EN/DE copy based only on the brief. No
MedicalGerman repository, live product source, logo or screenshot was accessed.
The outbound link uses only the supplied `https://medicalgerman.app` address;
automated checks do not visit it. Verify that destination after closing.

Confirm before release in both languages:

- Closing, operator transition and permission to publish the operator statement.
- Product scope, supported professions, exams, regions and starting level.
- Actual learning journey, topics, practice, feedback, access and device support.
- Plans, inclusions, amounts, currency, VAT, billing periods, renewal and trials.
- Invoice access/delivery, issuing entity and correction procedure.
- Subscription-management and cancellation links, notice, confirmation and access end.
- Product support channel, responsibilities and response times.

The billing page is guidance, not a working cancellation interface. It links to
the existing DBD contact channels and legal drafts. It does not claim that
sending a general enquiry cancels a subscription. The draft legal documents
still require review under Phase 2.

Product pages contain the existing Organization entity plus Product and FAQPage
JSON-LD. FAQ markup and visible answers use the same source data; unknown offers,
prices, ratings and exam claims are omitted. The Product entity is the page's
main entity. This is structured data, not a promise of search rich results.
Reference vocabulary: [Product](https://schema.org/Product),
[FAQPage](https://schema.org/FAQPage).

The EN/DE share cards use original typography and the existing DBD mark. They
are not MedicalGerman brand assets. Rebuild with
`node scripts/render-product-social.mjs` (local Chrome required); committed
1200 × 630 PNGs are copied only with the flag on. Vercel does not render images
or need Chrome during its build.

Tests cover both flag states, stale-output cleanup (including images), all local
links/assets/anchors, schema/visible FAQ parity, canonical and reciprocal
hreflang, and 404s for gated routes and images. Playwright exercises all eight
changed/new pages at four widths with axe in production and preview modes.
Every preview page remains noindex. No analytics provider is enabled by Phase 3.

## Roll back visibility

Set `SHOW_MEDICALGERMAN=false` in Vercel **Production** and redeploy the same
reviewed commit with a fresh build. Confirm that gated URLs return 404 and
the output, navigation, metadata, assets and sitemap contain no product
references. Keep the Preview value `true` for investigation. For an urgent
incident, restore the recorded known-good flag-off Production deployment,
then correct the Production variable before the next build. Search engines
may retain previously indexed launch URLs until they recrawl them; rollback
removes them from the site but cannot instantly clear external indexes.

## Phase 2 review material

The corporate legal drafts and consent controls are documented in [PHASE-2-REVIEW.md](PHASE-2-REVIEW.md). Analytics remains disabled: an account and confirmed provider/privacy details are required before enabling collection. This analytics switch is separate from the product launch switch.
