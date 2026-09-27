import { getLegalPages } from './legal.mjs';
import { responseTime } from './contact-copy.mjs';
import { refinePages } from './refinements.mjs';
import { getGermanPages } from './german.mjs';
import { getGermanInsights } from './insights-de.mjs';
export const company = 'Dr. Blackburn Digital GmbH i.G.';
export const origin = 'https://www.drblackburndigital.com';
export const email = 'info@drblackburndigital.com';
export const profiles = [
  ['https://www.linkedin.com/in/drgregblackburn/', 'LinkedIn', 'Professional background and connections'],
  ['https://scholar.google.com/citations?user=lkG7Ym0AAAAJ&hl=en', 'Google Scholar', 'Research and academic publications'],
  ['https://elearningindustry.com/elearning-authors/greg-blackburn', 'eLearning Industry', 'Writing on learning and technology']
];
export const arrow = '<span aria-hidden="true">↗</span>';
const link = (href, text, cls = 'text-link') => `<a class="${cls}" href="${href}">${text} ${/^https?:/.test(href) ? arrow : '<span aria-hidden="true">→</span>'}</a>`;
const sectionHead = (n, text) => `<div class="section-label"><span>${n}</span><p>${text}</p></div>`;
const intro = (label, title, lead) => `<section class="page-intro wrap"><p class="eyebrow">${label}</p><h1>${title}</h1><p class="lead">${lead}</p></section>`;
const contactBand = (title = 'Let’s start a conversation.', text = 'Partnerships, acquisition opportunities and professional enquiries.', label = 'Contact DBD', href = '/contact/') => `<section class="contact-band"><div class="wrap contact-inner"><div><p class="eyebrow">Contact DBD</p><h2>${title}</h2><p>${text}</p></div>${link(href, label, 'button button-light')}</div></section>`;

const principles = `<div class="principles">
  <article><span class="index">01</span><h3>Focus on a real need.</h3><p>Understand the people a product serves and the problem they need it to solve. Work in markets where that focus matters.</p></article>
  <article><span class="index">02</span><h3>Improve with evidence.</h3><p>Use customer insight and product evidence to guide decisions. Apply AI where it creates measurable value.</p></article>
  <article><span class="index">03</span><h3>Operate for the long term.</h3><p>Bring discipline to the everyday work of running a digital business. Make useful, sustained product improvements.</p></article>
</div>`;



const portfolioBefore = `<div class="portfolio-intro"><h2>Focused businesses.<br>Considered ownership.</h2><div><p>DBD is building a portfolio of focused digital businesses. We look for useful products with a clear audience and scope for sustained improvement.</p><p>Portfolio details will be shared as acquisitions are completed.</p>${link('/portfolio/', 'Our portfolio approach')}</div></div>`;

export function getPages() {
  const home = {
    path: '/', name: 'Home', title: 'Focused digital businesses | Dr. Blackburn Digital GmbH i.G.',
    description: 'Dr. Blackburn Digital GmbH i.G. acquires and grows focused digital businesses, combining technology, AI, learning expertise and disciplined operations.',
    body: `<section class="hero wrap"><div class="hero-main"><p class="eyebrow"><span class="status-dot"></span> Dr. Blackburn Digital GmbH i.G.</p><h1>We acquire and grow <em>focused digital businesses.</em></h1><p class="lead">Dr. Blackburn Digital GmbH i.G. (DBD) is a German company in formation, founded to acquire, operate and grow focused digital businesses. We bring technology, AI and learning expertise to long-term product improvement.</p><div class="actions">${link('/portfolio/', 'Explore our portfolio', 'button')}${link('/contact/?type=partnership', 'Discuss a partnership')}</div></div><aside class="hero-aside" aria-label="Our perspective"><div class="brand-panel"><img src="/assets/logo.png" width="1056" height="372" alt="" aria-hidden="true"><p>An operating company.<br>A long-term perspective.</p></div><div class="location-line"><span>Saarland, Germany</span><span>International outlook</span></div></aside></section>
    <div class="intro-strip"><div class="wrap"><span>Focused markets</span><span>Useful products</span><span>Evidence-led decisions</span><span>Disciplined operations</span></div></div>
    <section class="section wrap" id="portfolio">${sectionHead('01', 'Our portfolio')}${portfolioBefore}</section>
    <section class="section soft-section"><div class="wrap">${sectionHead('02', 'How we operate')}<div class="section-heading"><h2>Better products are built<br>through everyday decisions.</h2><p>Our work starts with understanding a business and continues through the practical work of improving it.</p></div>${principles}</div></section>
    <section class="section wrap split-section">${sectionHead('03', 'Partnerships')}<div class="split-content"><h2>Good partnerships<br>start with shared purpose.</h2><div><p>We welcome conversations with organisations whose expertise, audiences or services connect with our portfolio businesses.</p><p>${'Our role is to provide a clear corporate counterpart and an informed route into the right product conversation.'}</p>${link('/partnerships/', 'Working with DBD')}</div></div></section>
    <section class="section founder-section"><div class="wrap founder-grid"><div class="founder-summary"><p class="eyebrow">Meet the founder</p><h2>Dr. Greg Blackburn</h2><p class="role">Founder &amp; CEO<br>Dr. Blackburn Digital GmbH i.G.</p><p>More than 20 years across professional education, digital learning and technology. Now focused on acquiring, operating and improving specialist digital businesses.</p>${link('/greg-blackburn/', 'Greg’s background & approach')}</div><div class="founder-evidence"><p class="large-stat">20+<span>years in learning &amp; technology</span></p><div class="credential-line"><span>PhD</span><p>Professional Education<br><small>City, University of London</small></p></div><div class="credential-line"><span>MBA</span><p>Business administration<br><small>University of Queensland</small></p></div><p class="small-note">Professional experience across Europe and Australia.</p></div></div></section>
    ${contactBand()}`
  };

  const greg = {
    path: '/greg-blackburn/', name: 'Greg Blackburn', title: 'Dr. Greg Blackburn | Founder & CEO of DBD',
    description: 'Dr. Greg Blackburn is Founder & CEO of Dr. Blackburn Digital GmbH i.G., with more than 20 years in professional education, digital learning and technology.', profile: true,
    body: `<section class="profile-hero wrap"><div><p class="eyebrow">Founder &amp; CEO / Dr. Blackburn Digital GmbH i.G.</p><h1>Dr. Greg<br><em>Blackburn.</em></h1><p class="previous-role">Former Head of Knowledge Management &amp; Learning at Communardo</p><p class="lead">Learning expertise. Technology experience. A practical approach to ownership.</p><p>Dr. Greg Blackburn is Founder &amp; CEO of Dr. Blackburn Digital GmbH i.G. He holds a PhD in Professional Education and an MBA, with 20+ years spanning digital learning, technology-enabled learning, organisational capability and digital products.</p><div class="actions">${link('/contact/?type=professional', 'Connect with Greg', 'button')}${link('#background', 'Explore his background')}</div></div><aside class="profile-panel"><p class="eyebrow">Education &amp; perspective</p><div class="education-item"><span>PhD</span><p>Professional Education<small>City, University of London</small></p></div><div class="education-item"><span>MBA</span><p>Business Administration<small>University of Queensland</small></p></div><div class="education-item"><span>Hons</span><p>First-Class Honours<small>University of Tasmania</small></p></div><p class="panel-foot">Research-informed. Internationally experienced. Focused on useful products.</p></aside></section>
    <section class="section wrap narrative" id="background"><div>${sectionHead('01', 'Experience that informs ownership')}<h2>From learning strategy<br>to useful digital products.</h2></div><div class="prose"><p>Greg founded Dr. Blackburn Digital GmbH i.G. to acquire, operate and grow focused digital businesses. His PhD in Professional Education and MBA bring together research, product decisions and the practical demands of running a business.</p><p>As Head of Knowledge Management &amp; Learning at Communardo, he established and led the Knowledge &amp; Learning Centre, working across digital learning, AI-enabled knowledge systems and organisational capability.</p><p>At DBD, that experience informs how we assess a product’s audience, improve its learning and user experience, and make sustained operational improvements.</p></div></section>
    <section class="section wrap narrative"><div>${sectionHead('02', 'Areas of expertise')}<h2>Learning expertise.<br>Product perspective.</h2></div><div class="prose"><ul class="expertise-list"><li>Digital learning and professional education</li><li>Learning technology and digital product development</li><li>Product and business strategy</li><li>AI-enabled learning and operations</li><li>Organisational learning and capability</li></ul><div class="scope-note"><h3>A clear scope of expertise</h3><p>Greg’s doctorate is in Professional Education. His expertise is in learning, technology and business; he is not a medical doctor or clinical expert. Clinical and FSP content requires appropriately qualified subject experts and its own review processes.</p></div></div></section>
    <section class="section wrap roles-section">${''}</section>${contactBand('Connect with Greg', 'For partnerships, professional conversations, research enquiries or relevant business opportunities.', 'Connect with Greg', '/contact/?type=professional')}`
  };

  const portfolio = {
    path: '/portfolio/', name: 'Portfolio', title: 'Our portfolio | Dr. Blackburn Digital GmbH i.G.',
    description: 'DBD is building a portfolio of focused digital businesses with useful products, clear audiences and opportunities for long-term improvement.',
    body: `${intro('Our portfolio', 'Focused businesses.<br><em>Lasting commitment.</em>', 'Dr. Blackburn Digital GmbH i.G. is building its portfolio of focused digital businesses. Each business will be introduced here after its acquisition is complete.')}<section class="section wrap portfolio-list">${`<div class="portfolio-intro"><h2>A considered start.</h2><div><p>DBD is building its portfolio. We will introduce each business here once its acquisition is complete.</p><p>Our interest is in products that solve a specific problem for a defined audience, with opportunities to strengthen the experience and the way the business operates.</p>${link('/contact/?type=acquisition', 'Introduce a business')}</div></div>`}</section><section class="section soft-section"><div class="wrap">${sectionHead('01', 'Our role as an operator')}<div class="section-heading"><h2>Ownership is the<br>beginning of the work.</h2><p>We bring learning and product expertise, practical technology experience and operational focus to the businesses we own.</p></div>${principles}</div></section>${contactBand('A business worth discussing?', 'If you own, advise or represent a focused digital business that may fit DBD, a short introduction is enough to begin.', 'Introduce a business', '/contact/?type=acquisition')}`
  };



  const partnerships = {
    path: '/partnerships/', name: 'Partnerships', title: 'Partnerships | Dr. Blackburn Digital GmbH i.G.',
    description: 'Discuss partnerships around DBD’s portfolio businesses. A corporate counterpart for education, training, recruitment and institutional organisations.',
    body: `${intro('Partnerships', 'Shared purpose.<br><em>Practical collaboration.</em>', 'Dr. Blackburn Digital GmbH i.G. welcomes partnership conversations with education and training providers, recruitment and workforce organisations, institutions supporting internationally trained healthcare professionals, and specialist experts. The aim is to improve useful digital products and reach the people they serve.')}<section class="section wrap narrative"><div>${sectionHead('01', 'Working with DBD')}<h2>A direct conversation<br>with the operator.</h2></div><div class="prose"><p>DBD provides the corporate counterpart for partnership conversations around its portfolio businesses. We start by understanding your organisation, the people you serve and the outcome you want to support.</p><p>Product-specific discussions belong with the relevant business. Our role is to make that connection clear and to explore whether there is a useful basis for collaboration.</p><p class="cta-support">Tell us briefly about your organisation, the audience you serve and what you would like to explore.</p>${link('/contact/?type=partnership', 'Discuss a partnership', 'button')}</div></section>
    <section class="section soft-section"><div class="wrap">${sectionHead('02', 'Potential partners')}<h2>Where collaboration may make sense</h2><div class="partner-types"><article><span class="index">Education &amp; training</span><h3>Learning in context.</h3><p>Language schools, training organisations, universities and professional-education providers.</p></article><article><span class="index">Recruitment &amp; workforce</span><h3>Supporting professional transitions.</h3><p>Recruitment organisations, employers and institutions supporting international healthcare professionals moving into German employment.</p></article><article><span class="index">Specialist expertise</span><h3>Knowledge that adds value.</h3><p>Organisations and experts with relevant subject, regulatory, professional or market expertise where collaboration can improve a portfolio product.</p></article></div></div></section>
    <p class="wrap partner-context">DBD provides the corporate counterpart for these conversations and, where appropriate, connects the discussion directly with the relevant portfolio business. These are areas for potential collaboration, not a list of existing partnerships.</p>
    ${''}
    <section class="section wrap">${sectionHead('03', 'How a conversation begins')}<ol class="steps"><li><span>01</span><div><h3>Tell us about your organisation.</h3><p>Your audience, your work and the need you are trying to address.</p></div></li><li><span>02</span><div><h3>Find the relevant connection.</h3><p>We’ll review your introduction and consider where your objectives align with a portfolio product.</p></div></li><li><span>03</span><div><h3>Agree a useful next step.</h3><p>Where there is a useful fit, we’ll respond by email and suggest a conversation with the relevant person. A product discussion or exploration of a pilot may follow, where appropriate.</p></div></li></ol></section>${contactBand('Tell us what you have in mind.', 'Tell us briefly about your organisation, the audience you serve and what you would like to explore.', 'Discuss a partnership', '/contact/?type=partnership')}`
  };

  const contact = {
    path: '/contact/', name: 'Contact', title: 'Contact | Dr. Blackburn Digital GmbH i.G.',
    description: 'Contact Dr. Blackburn Digital GmbH i.G. for partnership enquiries, acquisition opportunities, media requests and professional conversations.',
    contactForm: true,
    body: `${intro('Contact', 'Let’s start<br><em>a conversation.</em>', 'Whether you are interested in a partnership, want to introduce a digital business, or have a professional enquiry, a short introduction is enough to get started.')}
    <section class="wrap enquiry-layout"><div class="enquiry-form-panel"><h2 id="form-title">Tell us what you have in mind.</h2><p class="form-intro">A few details are enough. We’ll review your message and, where there is a useful fit, suggest the most appropriate next step.</p>
    <p id="form-response-time" class="response-time">${responseTime.en}</p>
    <p id="delivery-note" class="delivery-note" role="status" hidden></p>
    <form id="enquiry-form" aria-labelledby="form-title" action="/api/contact/" method="post" aria-describedby="form-response-time form-privacy">
      <p class="small-note">All fields are required except Organisation.</p>
      <div class="form-grid"><div class="field"><label for="enquiry-name">Name</label><input id="enquiry-name" name="name" autocomplete="name" placeholder="Your name" maxlength="120" required></div>
      <div class="field"><label for="enquiry-organisation">Organisation <span>(optional)</span></label><input id="enquiry-organisation" name="organisation" autocomplete="organization" placeholder="Company, institution or organisation" maxlength="180"></div>
      <div class="field"><label for="enquiry-email">Email</label><input id="enquiry-email" name="email" type="email" autocomplete="email" placeholder="you@example.com" maxlength="254" required></div>
      <div class="field"><label for="enquiry-type">Type of enquiry</label><select id="enquiry-type" name="type" required><option value="partnership">Partnership</option><option value="acquisition">Acquisition opportunity</option><option value="professional">Media / professional enquiry</option><option value="general" selected>General enquiry</option></select></div></div>
      <div class="field"><label for="enquiry-message">Message</label><textarea id="enquiry-message" name="message" rows="6" maxlength="6000" placeholder="Tell us briefly about your organisation, what you have in mind, and what you would like to explore." required></textarea></div>
      <div class="form-trap" aria-hidden="true" inert><label for="enquiry-website">Leave this field empty</label><input id="enquiry-website" name="website" tabindex="-1" autocomplete="off"></div>
      <p id="form-privacy" class="form-privacy">We use these details to review and respond to your enquiry. Please include only information relevant to your introduction, without patient data or other sensitive personal information. Read our <a href="/privacy/">privacy notice</a>.</p>
      <button class="button" type="submit" disabled>Send enquiry <span aria-hidden="true">→</span></button>
      <noscript><p class="small-note">Enable JavaScript to send an enquiry online, or use the email address alongside the form.</p></noscript>
    </form>
    <div id="form-result" class="form-result" tabindex="-1" hidden></div></div>
    <aside class="enquiry-aside"><p class="eyebrow">A direct conversation</p><h2>A short introduction<br>is enough.</h2><p>We’ll read your message and consider the most useful next step. There is no need for a full proposal to start the conversation.</p><div class="email-alternative"><p class="eyebrow">Prefer email?</p><a href="mailto:${email}">info@<wbr>drblackburndigital.com</a></div><p class="small-note">Dr. Greg Blackburn<br>Founder &amp; CEO<br>${company}</p><p class="small-note">Püttlingen, Saarland, Germany<br><a href="/company/">Company information →</a></p></aside></section>`
  };

  const companyPage = {
    path: '/company/', name: 'Company', title: 'Company | Dr. Blackburn Digital GmbH i.G.',
    description: 'Company information for Dr. Blackburn Digital GmbH i.G., founded by Dr. Greg Blackburn and based in Püttlingen, Saarland, Germany.',
    body: `${intro('The company', 'Dr. Blackburn<br><em>Digital GmbH i.G.</em>', 'Dr. Blackburn Digital GmbH i.G. (DBD) is a German company in formation, founded by Dr. Greg Blackburn to acquire, operate and grow focused digital businesses. Its seat is Püttlingen, Germany.')}<section class="section wrap narrative"><div><h2>Technology.<br>Learning.<br>Operations.</h2></div><div class="prose"><p>DBD combines experience in professional education, digital learning, technology and product strategy with a practical approach to business operations.</p><p>Our focus is on useful digital products, clearly defined audiences and long-term improvement.</p><dl class="business-facts"><div><dt>Company</dt><dd>Dr. Blackburn Digital GmbH i.G.</dd></div><div><dt>Founder &amp; CEO</dt><dd><a href="/greg-blackburn/">Dr. Greg Blackburn</a></dd></div><div><dt>Location</dt><dd>Püttlingen, Saarland, Germany</dd></div><div><dt>Contact</dt><dd><a href="mailto:${email}">${email}</a></dd></div></dl>${''}<div class="actions">${link('/portfolio/', 'Explore our portfolio')}${link('/impressum/', 'Legal company information')}</div></div></section>${contactBand()}`
  };

  companyPage.body = companyPage.body.replace('<div><dt>Location</dt>', '<div><dt>Status</dt><dd>In formation (i.G.). Commercial register entry not yet confirmed.</dd></div><div><dt>Location</dt>');
  const { impressum, privacy, germanLegal } = getLegalPages(company, email);

  home.body = home.body.replace('<div class="founder-evidence">', '<div class="founder-evidence"><img class="founder-photo" src="/assets/greg-blackburn.jpg" width="720" height="771" alt="Dr. Greg Blackburn" loading="lazy">');
  const qualifications = greg.body.match(/<aside class="profile-panel">[\s\S]*?<\/aside>/)[0];
  greg.body = greg.body.replace(qualifications, '<figure class="profile-portrait"><img src="/assets/greg-blackburn.jpg" width="720" height="771" alt="Dr. Greg Blackburn" fetchpriority="high"><figcaption>Dr. Greg Blackburn <span>Founder &amp; CEO, DBD</span></figcaption></figure>');
  greg.body = greg.body.replace('<section class="section wrap narrative" id="background">', `<div class="wrap qualification-strip">${qualifications}</div><section class="section wrap narrative" id="background">`);
  greg.body = greg.body.replace('<section class="section wrap roles-section">', `<section class="section wrap published-work">${sectionHead('03', 'Research & professional writing')}<div class="section-heading"><h2>A public record<br>of ideas and experience.</h2><p>Explore Greg’s research, professional background and writing on learning and technology.</p></div><div class="profile-links">${profiles.map(([url, name, detail]) => `<a href="${url.replaceAll('&', '&amp;')}"><h3>${name} ${arrow}</h3><p>${detail}</p></a>`).join('')}</div></section><section class="section wrap roles-section">`);
  greg.body = greg.body.replace(sectionHead('04', 'Current role'), sectionHead('05', 'Current role'));
  for (const page of [home, portfolio]) page.body = page.body.replaceAll('width="720" height="1280"', 'width="711" height="909"');
  const insights = refinePages({ home, greg, portfolio, partnerships, contact });
  const german = getGermanPages(contact);
  const pages = [home, greg, portfolio, partnerships, contact, companyPage, impressum, privacy, ...insights, ...german, ...germanLegal, ...getGermanInsights()];
  for (const page of pages) {
    page.body = page.body.replace(/<a([^>]*href="https?:[^>]+)>([\s\S]*?)<\/a>/g, (_, attrs, content) => {
      const icon = content.includes('aria-hidden="true">↗') ? '' : ` ${arrow}`;
      return `<a${attrs} target="_blank" rel="noopener noreferrer">${content}${icon}<span class="sr-only"> (${page.lang === 'de' ? 'öffnet in einem neuen Tab' : 'opens in a new tab'})</span></a>`;
    });
  }
  return pages;
}
