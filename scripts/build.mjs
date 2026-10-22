import { mkdir, readFile, writeFile, cp, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPages, company, origin, email, profiles } from '../src/pages.mjs';
import { isMedicalGermanEnabled } from '../src/launch.mjs';
import { assertLaunchOutputAbsent } from './assert-launch-output.mjs';
import { getAnalyticsConfig, consentMarkup } from '../src/consent.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const preview = process.argv.includes('--preview');
// Every Vercel preview build is non-indexable, even with the normal build command.
const staging = process.env.VERCEL_ENV === 'preview';
const privateBuild = preview || staging;
const showMedicalGerman = isMedicalGermanEnabled(process.env.SHOW_MEDICALGERMAN);
const analytics = getAnalyticsConfig(process.env, privateBuild);
const pages = getPages({ showMedicalGerman, analyticsEnabled: analytics.enabled });
const output = path.join(root, preview ? 'preview-dist' : 'dist');
// Only these two generated directories can ever be replaced by the build.
if (![path.join(root, 'dist'), path.join(root, 'preview-dist')].includes(output)) throw new Error('Unexpected output directory');
await rm(output, { recursive: true, force: true });
await mkdir(path.join(output, 'assets'), { recursive: true });
const esc = text => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const orgId = `${origin}/#organization`;
const personId = `${origin}/greg-blackburn/#person`;

function schema(page) {
  const contentPath = page.englishPath || page.path;
  const org = { '@type': 'Organization', '@id': orgId, name: company, legalName: company, url: `${origin}/`, email };
  const personVisible = ['/', '/greg-blackburn/', '/company/', '/contact/', '/impressum/', '/privacy/'].includes(contentPath);
  const person = { '@type': 'Person', '@id': personId, name: 'Dr. Greg Blackburn', alternateName: 'Greg Blackburn', url: `${origin}/greg-blackburn/`, jobTitle: 'Founder & CEO', worksFor: { '@id': orgId } };
  if (['/', '/company/', '/greg-blackburn/'].includes(contentPath)) {
    org.alternateName = 'DBD';
    org.founder = { '@id': personId };
    org.description = 'A registered German company, founded to acquire, operate and grow focused digital businesses.';
    org.logo = { '@type': 'ImageObject', '@id': `${origin}/#logo`, url: `${origin}/assets/logo.png`, width: 1056, height: 372 };
    // Seat supplied by Greg; do not encode the unconfirmed service street address.
    org.address = { '@type': 'PostalAddress', addressLocality: 'Püttlingen', addressRegion: 'Saarland', addressCountry: 'DE' };
    org.contactPoint = { '@type': 'ContactPoint', contactType: 'Business enquiries', email, url: `${origin}/contact/` };
  }
  if (contentPath === '/' || page.profile) person.image = `${origin}/assets/greg-blackburn.jpg`;
  if (page.profile) {
    person.sameAs = profiles.map(([url]) => url);
    person.description = 'Founder & CEO of Dr. Blackburn Digital GmbH, with a PhD in Professional Education, an MBA and 20+ years across digital learning, organisational capability and digital products.';
    person.alumniOf = [{ '@type': 'CollegeOrUniversity', name: 'City, University of London' }, { '@type': 'CollegeOrUniversity', name: 'University of Queensland' }, { '@type': 'CollegeOrUniversity', name: 'University of Tasmania' }];
    person.hasCredential = [{ '@type': 'EducationalOccupationalCredential', name: 'PhD in Professional Education', credentialCategory: 'PhD' }, { '@type': 'EducationalOccupationalCredential', name: 'Master of Business Administration', credentialCategory: 'MBA' }, { '@type': 'EducationalOccupationalCredential', name: 'First-Class Honours degree', credentialCategory: 'Honours degree' }];
    person.knowsAbout = ['Digital learning', 'Professional education', 'Learning technology', 'Product strategy', 'AI-enabled operations', 'Organisational learning'];
  }
  const graph = [org, ...(personVisible ? [person] : []), { '@type': 'WebSite', '@id': `${origin}/#website`, url: `${origin}/`, name: company, publisher: { '@id': orgId }, inLanguage: ['en', 'de'] }, { '@type': page.profile ? 'ProfilePage' : 'WebPage', '@id': `${origin}${page.path}#webpage`, url: `${origin}${page.path}`, name: page.title, description: page.description, inLanguage: page.lang || 'en', isPartOf: { '@id': `${origin}/#website` }, ...(page.profile ? { mainEntity: { '@id': personId } } : { about: { '@id': orgId } }) }];
  if (contentPath !== '/') {
    const trail = [[page.lang === 'de' ? '/de/' : '/', page.lang === 'de' ? 'Startseite' : 'Home'], ...(page.parent ? [page.parent] : []), [page.path, page.name]];
    graph.push({ '@type': 'BreadcrumbList', '@id': `${origin}${page.path}#breadcrumb`, itemListElement: trail.map(([url, name], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `${origin}${url}` })) });
  }
  graph.push(...(page.structuredData || []));
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replaceAll('<', '\\u003c');
}

const navLinks = [['/portfolio/', 'Portfolio'], ['/partnerships/', 'Partnerships'], ['/greg-blackburn/', 'Greg Blackburn'], ['/insights/', 'Insights'], ['/contact/', 'Contact']];
navLinks.splice(1, 0, ...pages.filter(page => page.navigation && page.lang !== 'de').map(page => [page.path, page.name]));
// Only published translations can create a language switch or hreflang alternate.
const pairs = pages.filter(page => page.lang === 'de' && page.englishPath).map(page => [page.englishPath, page.path]);
function localizedLink(href, label, de) {
  if (!de) return [href, label];
  const translated = { '/': ['/de/', 'Startseite'], '/partnerships/': ['/de/partnerschaften/', 'Partnerschaften'], '/contact/': ['/de/kontakt/', 'Kontakt'], '/privacy/': ['/de/datenschutz/', 'Datenschutz'], '/impressum/': ['/de/impressum/', 'Impressum'], '/insights/': ['/de/perspektiven/', 'Perspektiven'] };
  const counterpart = pages.find(page => page.lang === 'de' && page.englishPath === href);
  return translated[href] || (counterpart ? [counterpart.path, counterpart.name] : [href, `${label === 'Company' ? 'Unternehmen' : label === 'Insights' ? 'Perspektiven' : label} (EN)`]);
}
function navigation(page) { return navLinks.map(([href, label]) => localizedLink(href, label, page.lang === 'de')).map(([href, label]) => `<a href="${href}"${page.path === href || page.parent?.[0] === href ? ' aria-current="page"' : ''}${href.endsWith('/contact/') || href.endsWith('/kontakt/') ? ' class="nav-contact"' : ''}>${label}</a>`).join(''); }
function languageLinks(page) {
  const pair = pairs.find(pair => pair.includes(page.path));
  if (!pair) return '';
  return `<nav class="language-switch" aria-label="${page.lang === 'de' ? 'Sprache' : 'Language'}"><a lang="en" hreflang="en" href="${pair[0]}"${page.lang !== 'de' ? ' aria-current="true"' : ''}>EN</a><span aria-hidden="true">/</span><a lang="de" hreflang="de" href="${pair[1]}"${page.lang === 'de' ? ' aria-current="true"' : ''}>DE</a></nav>`;
}
function alternateTags(page) {
  const pair = pairs.find(pair => pair.includes(page.path));
  return pair ? `<link rel="alternate" hreflang="en" href="${origin}${pair[0]}"><link rel="alternate" hreflang="de" href="${origin}${pair[1]}"><link rel="alternate" hreflang="x-default" href="${origin}${pair[0]}">` : '';
}
function breadcrumb(page) {
  if (page.path === '/' || page.path === '/de/') return '';
  const de = page.lang === 'de';
  return `<nav class="breadcrumbs wrap" aria-label="${de ? 'Brotkrumennavigation' : 'Breadcrumb'}"><ol><li><a href="${de ? '/de/' : '/'}">${de ? 'Startseite' : 'Home'}</a></li>${page.parent ? `<li><a href="${page.parent[0]}">${page.parent[1]}</a></li>` : ''}<li aria-current="page">${page.name}</li></ol></nav>`;
}

function render(page) {
  const de = page.lang === 'de';
  const footerLinks = [['/company/', 'Company'], ...navLinks, ['/impressum/', 'Impressum'], ['/privacy/', 'Privacy'], ['/terms/', 'Terms'], ['/refunds-withdrawal/', 'Refunds & withdrawal']].map(([href, label]) => localizedLink(href, label, de)).map(([href, label]) => `<a href="${href}">${label}</a>`).join('');
  const analyticsConfig = JSON.stringify(analytics.enabled && page.path !== '/404.html' ? { ...analytics, url: `${origin}${page.path}` } : { enabled: false }).replaceAll('<', '\\u003c');
  return `<!doctype html>
<html lang="${de ? 'de' : 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}"><link rel="canonical" href="${origin}${page.path}">${alternateTags(page)}
${privateBuild || page.noindex ? '<meta name="robots" content="noindex, nofollow">' : '<meta name="robots" content="index, follow">'}
<meta property="og:type" content="${page.profile ? 'profile' : 'website'}"><meta property="og:title" content="${esc(page.title)}"><meta property="og:description" content="${esc(page.description)}"><meta property="og:url" content="${origin}${page.path}"><meta property="og:site_name" content="${company}"><meta property="og:locale" content="${de ? 'de_DE' : 'en_GB'}"><meta property="og:image" content="${origin}/assets/social-preview.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Dr. Blackburn Digital GmbH — focused digital businesses"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(page.title)}"><meta name="twitter:description" content="${esc(page.description)}"><meta name="twitter:image" content="${origin}/assets/social-preview.png">
<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48"><link rel="icon" type="image/png" href="/assets/favicon-96.png" sizes="96x96"><link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180"><meta name="theme-color" content="#172b3a">
<link rel="stylesheet" href="/assets/site.css"><link rel="stylesheet" href="/assets/consent.css"><script type="application/json" id="analytics-config">${analyticsConfig}</script><script src="/assets/consent.js" defer></script><script type="application/ld+json">${schema(page)}</script>${page.contactForm ? '<script src="/assets/contact.js" defer></script>' : ''}</head><body>
<a class="skip-link" href="#main">${de ? 'Zum Inhalt springen' : 'Skip to content'}</a>${preview ? `<div class="preview-banner" lang="en"><strong>LOCAL PREVIEW — NOT FOR PUBLICATION.</strong> Review this version locally.</div>` : ''}
<header class="site-header"><div class="wrap header-inner"><a class="brand" href="${de ? '/de/' : '/'}" aria-label="Dr. Blackburn Digital ${de ? 'Startseite' : 'home'}"><img src="/assets/favicon-96.png" width="48" height="48" alt=""><span>Dr. Blackburn Digital<small>GmbH · ${de ? 'Deutschland' : 'Germany'}</small></span></a><nav class="desktop-nav" aria-label="${de ? 'Hauptnavigation' : 'Main'}">${navigation(page)}</nav>${languageLinks(page)}<details class="mobile-nav"><summary>${de ? 'Menü' : 'Menu'}</summary><nav aria-label="${de ? 'Mobile Navigation' : 'Mobile'}">${navigation(page)}</nav></details></div></header>
${consentMarkup(de, analytics.enabled && page.path !== '/404.html')}${breadcrumb(page)}<main id="main" tabindex="-1">${page.body}</main>
<footer class="site-footer wrap"><div class="footer-top"><div><p class="footer-brand">Dr. Blackburn Digital GmbH</p><p class="footer-tagline">${de ? 'Digitale Unternehmen erwerben,<br>betreiben und weiterentwickeln.' : 'Acquiring, operating and growing<br>focused digital businesses.'}</p><a class="text-link" href="mailto:${email}">${email}</a></div><nav class="footer-links" aria-label="${de ? 'Fußnavigation' : 'Footer'}">${footerLinks}<button class="consent-link" type="button" data-consent-open hidden>${de ? 'Cookie-Einstellungen' : 'Cookie settings'}</button></nav></div><div class="footer-bottom"><span>© ${new Date().getUTCFullYear()} Dr. Blackburn Digital GmbH</span><span>Püttlingen, Saarland · ${de ? 'Deutschland' : 'Germany'}</span></div></footer></body></html>`;
}

const assets = ['logo.png', 'favicon-96.png', 'site.css', 'consent.css', 'consent.js', 'analytics.js', 'contact.js', 'social-preview.png', 'greg-blackburn.jpg'];
for (const asset of assets) await cp(path.join(root, 'assets', asset), path.join(output, 'assets', asset));
for (const icon of ['favicon.ico', 'apple-touch-icon.png']) await cp(path.join(root, icon), path.join(output, icon));

for (const page of pages) {
  const target = path.join(output, page.path, 'index.html');
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, render(page));
}
const notFound = { path: '/404.html', name: 'Page not found', title: 'Page not found | Dr. Blackburn Digital GmbH', description: 'Find your way back to Dr. Blackburn Digital.', noindex: true, body: '<section class="not-found wrap"><p class="eyebrow">404 / Page not found</p><h1>A different direction.</h1><p class="lead">This page isn’t here. You can explore the company from the homepage or contact us directly.</p><div class="actions"><a class="button" href="/">Back to home</a><a class="text-link" href="/contact/">Contact DBD</a></div></section>' };
await writeFile(path.join(output, '404.html'), render(notFound));
await writeFile(path.join(output, 'robots.txt'), privateBuild ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);
await writeFile(path.join(output, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${privateBuild ? '' : pages.filter(p => !p.noindex).map(p => `\n  <url><loc>${origin}${p.path}</loc></url>`).join('')}\n</urlset>\n`);
await writeFile(path.join(output, 'build-info.json'), JSON.stringify({ mode: preview ? 'local-preview' : 'pre-acquisition', generatedAt: new Date().toISOString() }, null, 2));
if (!showMedicalGerman) {
  try {
    await assertLaunchOutputAbsent(output);
  } catch (error) {
    // output was resolved and restricted to dist/preview-dist above.
    await rm(output, { recursive: true, force: true });
    throw error;
  }
}
// The root entry is a generated convenience copy of the safe default homepage.
// Never persist gated content into the tracked convenience copy.
if (!privateBuild && !showMedicalGerman) await writeFile(path.join(root, 'index.html'), render(pages[0]));
console.log(`Built ${pages.length} pages in ${path.basename(output)} (${preview ? 'LOCAL PREVIEW — DO NOT DEPLOY' : 'pre-acquisition'}).`);
