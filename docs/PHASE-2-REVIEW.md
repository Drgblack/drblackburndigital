# Phase 2: legal drafts, consent and analytics

Status: DRAFT for lawyer review. This is implementation and review material,
not legal clearance. No MedicalGerman source or repository was accessed.
The product launch flag is independent of these pages: the complete legal
set works with it off and contains no product names or links.

## Pages and facts

| English | German |
| --- | --- |
| `/impressum/` | `/de/impressum/` |
| `/privacy/` | `/de/datenschutz/` |
| `/terms/` | `/de/agb/` |
| `/refunds-withdrawal/` | `/de/erstattung-widerruf/` |

All eight pages are marked DRAFT, noindexed and linked in the footer; EN/DE
alternates are reciprocal. The Impressum retains the supplied registered
company, Püttlingen office, service address, managing director, email,
Amtsgericht Saarbrücken and HRB 112680. Its USt-IdNr field is TODO-CONFIRM;
there is no invented tax number. The existing hosting and Workspace account
arrangements are carried forward, not newly verified by this implementation.

Terms and refunds/withdrawal are review templates, not an active checkout
contract. No price, billing interval, trial, payment processor, cancellation
URL or refund promise is invented. They do not amend existing contracts.

### Lawyer and operator checklist

- Confirm the service address, named managing director and register details;
  insert the USt-IdNr from the official letter when available.
- Confirm whether hosting and Workspace ownership/billing have transferred
  to the company; update both privacy versions to the actual arrangements.
- Classify the subscription as digital content, digital services or a mix.
  Review contract formation, notices, required confirmations, any request
  for early performance and any legally effective loss of withdrawal rights.
- Confirm pricing, currency, tax, invoice handling, processor, term, renewal,
  cancellation, access, support, updates, remedies, liability and VSBG duties.
- Verify the actual contracting interface's cancellation function under
  section 312k BGB and separate withdrawal function under section 356a BGB,
  including accessible controls, confirmation steps and acknowledgements.
  This corporate site has no checkout and this phase does not implement
  those product-side functions. A general contact form is not a substitute.
- Approve the final withdrawal notice/model form and any goodwill refunds;
  preserve mandatory rights. Do not assume that opening a subscription or
  ticking a general terms checkbox waives withdrawal rights.
- Confirm product/payment data flows separately; this privacy notice covers
  the corporate website, consent, analytics and enquiries only.
- Resolve TODO-CONFIRM entries and approve final notices before presenting
  them as binding terms. Remove DRAFT labels only after that review.

## Consent behavior

`assets/consent.js` is essential first-party preference code. It stores nothing
until the visitor chooses. A preference in `dbd-consent-v1` contains only
version, analytics boolean, creation and expiry timestamps. It lasts 180 days;
expired/invalid preferences do not grant consent. Blocked storage falls back
to memory for the current page. There are no application cookies or visitor
IDs. Clearing storage or changing the version removes consent.

The footer's Cookie settings button opens an accessible native dialog in the
page language. Escape closes it without changing the choice. Necessary-only
and analytics buttons have equal visual treatment. The initial opt-in banner
appears only when analytics is configured and there is no valid preference;
when analytics is disabled, the footer still works and clearly says so, with
the analytics button disabled. No-JavaScript visitors can read the legal
pages and follow email links; analytics never loads.

The non-essential local `assets/analytics.js` is loaded only after consent.
Revocation stops future events, clears consented events still waiting for
script loading, aborts in-flight fetches where possible, and propagates to
other open tabs. An event already delivered to the provider cannot be undone.
The script checks consent again before every send, including if it finishes
loading after withdrawal. No pre-consent events are queued or replayed.

## Analytics setup — deliberately disabled

Greg confirmed there is no DBD analytics account. No account was created,
subscription purchased or data sent to Plausible as part of this work.
All browser tests intercept analytics requests locally. No analytics settings
have been enabled in Vercel. Preview and local builds are always disabled.

After the account and legal review are complete:

1. Add the DBD site to Plausible and confirm its domain identifier (either
   `drblackburndigital.com` or `www.drblackburndigital.com`). Review the DPA,
   current subprocessors, processing locations and retention/deletion terms;
   finish both privacy notices. Plausible receives IP address and User-Agent
   over the connection even though this implementation sends no form data.
2. In Plausible, configure custom-event goals named exactly
   `ContactSubmission` and `PartnerSubmission`.
3. In Vercel **Production**, set `PLAUSIBLE_DOMAIN` to that confirmed domain
   and `ANALYTICS_ENABLED=true`, then perform a fresh redeploy. No API key or
   other analytics secret belongs in client code or this repository. The
   Events API accepts events without an API key; the domain is a public site
   identifier. All other values of ANALYTICS_ENABLED leave collection off.
4. Verify no analytics script/event before consent or after refusal; verify
   one pageview after opt-in. Use synthetic, authorized enquiries to validate
   dashboard goals separately, if actual mail testing is requested.
5. To disable collection, set `ANALYTICS_ENABLED=false` and rebuild. Preview
   remains disabled even if that variable is accidentally set there.

The adapter calls Plausible's Events API directly from the browser with
credentials omitted and referrerPolicy `no-referrer`. Only `name`, `domain`
and a build-defined canonical `url` are sent; queries, fragments, referring
URLs, screen data, custom properties and all form values are excluded. There
are no outbound-link, download, scroll or engagement listeners. The 404 page
never collects, so arbitrary unknown paths cannot become event payloads.

Conversions count successful responses from the existing contact endpoint,
not final inbox delivery. A submission whose type is `partnership` counts
as `PartnerSubmission`; other valid enquiry types count as
`ContactSubmission`. Phase 4 should reuse this successful-send path for the
partner application. Validation errors, failed/disabled sends and duplicate
submissions do not count. Events after opt-in can wait in memory for the
analytics script; withdrawal clears that queue. Failures in analytics never
affect the contact result.

## Verification

Run the production/local preview builds and `npm test`, then:

```sh
npm run test:consent:browser
npm run test:launch:browser
```

These scripts build isolated fixtures and mock all analytics/mail delivery.
Coverage includes both launch states and languages, legal drafts and links,
axe checks, absence of pre-consent script requests, rejection, persistence,
withdrawal across tabs, malformed/expired preferences, blocked storage,
script-loading races, no-JavaScript behavior and successful-only conversion
payloads. `npm run test:browser` also runs the existing full browser review
with both local servers started as described in README.md.

## Sources checked on 22 October 2026

Drafting references, not evidence of legal approval:

- [Section 5 DDG: provider information](https://www.gesetze-im-internet.de/ddg/__5.html)
- [Section 25 TDDDG: terminal storage/access](https://www.gesetze-im-internet.de/ttdsg/__25.html)
- [GDPR, especially Articles 6, 7 and 13](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
- [Section 355 BGB: withdrawal](https://www.gesetze-im-internet.de/bgb/__355.html)
- [Section 356 BGB: withdrawal conditions](https://www.gesetze-im-internet.de/bgb/__356.html)
- [Section 356a BGB: online withdrawal function](https://www.gesetze-im-internet.de/bgb/__356a.html)
- [Section 357 BGB: effects of withdrawal](https://www.gesetze-im-internet.de/bgb/__357.html)
- [Section 357a BGB: compensation](https://www.gesetze-im-internet.de/bgb/__357a.html)
- [Section 312k BGB: online cancellation](https://www.gesetze-im-internet.de/bgb/__312k.html)
- [Section 309 no. 9 BGB: renewal clauses](https://www.gesetze-im-internet.de/bgb/__309.html)
- [Plausible Events API](https://plausible.io/docs/events-api)
- [Plausible data policy](https://plausible.io/data-policy) and [provider identity](https://plausible.io/imprint)
