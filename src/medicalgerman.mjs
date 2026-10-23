// Original copy from the acquisition brief only. These renderers are gated by pages.mjs.
const link = (href, label, cls = 'text-link') => `<a class="${cls}" href="${href}">${label} <span aria-hidden="true">${href.startsWith('https:') ? '↗' : '→'}</span></a>`;
const route = de => de ? '/de/medicalgerman/' : '/medicalgerman/';
const billingRoute = de => `${route(de)}${de ? 'abrechnung' : 'billing'}/`;
const portfolioRoute = de => de ? '/de/portfolio/' : '/portfolio/';
const intro = (label, title, text) => `<section class="page-intro wrap"><p class="eyebrow">${label}</p><h1>${title}</h1><p class="lead">${text}</p></section>`;
const todo = text => `<p class="small-note">TODO-CONFIRM: ${text}</p>`;
const operator = (de, company) => de ? `MedicalGerman wird von ${company} betrieben.` : `MedicalGerman is operated by ${company}.`;
const reviewNote = de => `<aside class="introduction-note" aria-label="${de ? 'Hinweis zum Entwurf' : 'Draft notice'}"><h2>${de ? 'ENTWURF · Vor Veröffentlichung prüfen' : 'DRAFT · Review before publication'}</h2><p>${de ? 'Diese Inhalte sind für die Zeit nach Abschluss der Übernahme vorbereitet. Die mit TODO-CONFIRM markierten Angaben müssen vor der Freigabe bestätigt werden.' : 'This content is prepared for publication after the acquisition closes. Details marked TODO-CONFIRM must be confirmed before release.'}</p>${todo(de ? 'Abschluss der Übernahme, Betreiberwechsel und Freigabe dieser Angaben.' : 'Acquisition closing, operator transition and approval of this copy.')}</aside>`;
const summary = de => de ? 'Digitale Vorbereitung auf medizinische Deutschprüfungen.' : 'Digital preparation for medical German language exams.';
const social = de => ({ socialImage: `/assets/medicalgerman-${de ? 'de' : 'en'}.png`, socialImageAlt: de ? 'MedicalGerman — medizinisches Deutsch. Ein Produkt im Portfolio von Dr. Blackburn Digital GmbH.' : 'MedicalGerman — medical German. A portfolio product of Dr. Blackburn Digital GmbH.' });

export function medicalGermanPortfolioEntry(de, home = false) {
  return `<div class="portfolio-intro"><h2>MedicalGerman</h2><div><p>${summary(de)}</p><p>${de ? 'Ein fokussiertes Lernprodukt im Portfolio von Dr. Blackburn Digital GmbH.' : 'A focused learning product in the Dr. Blackburn Digital GmbH portfolio.'}</p>${todo(de ? 'Prüfungsabdeckung, Zielgruppen und Produktumfang.' : 'Exam coverage, audiences and product scope.')}<div class="actions">${link(route(de), de ? 'MedicalGerman kennenlernen' : 'Explore MedicalGerman')}${home ? link(portfolioRoute(de), de ? 'Zum Portfolio' : 'Our portfolio') : ''}</div></div></div>`;
}

function faq(de, company) {
  return de ? [
    ['Was ist MedicalGerman?', `${summary(true)} TODO-CONFIRM: Verfügbare Lernformate, Inhalte und Zugangsvoraussetzungen.`],
    ['Für wen ist das Angebot gedacht?', 'Für Menschen, die sich auf eine medizinische Deutschprüfung vorbereiten. TODO-CONFIRM: Unterstützte Berufsgruppen, Prüfungen, Regionen und erforderliches Sprachniveau.'],
    ['Wie funktioniert die Prüfungsvorbereitung?', 'Der geplante Überblick gliedert die Vorbereitung in Prüfungsziel, Lernschwerpunkte und Übung mit Rückblick. TODO-CONFIRM: Den tatsächlichen Lernablauf und die verfügbaren Übungs- und Rückmeldungsformate bestätigen.'],
    ['Was kostet ein Abonnement?', 'TODO-CONFIRM: Tarife, Preise, Währung, Umsatzsteuer, Abrechnungszeiträume, Verlängerung und mögliche Testangebote. Hier ist noch kein Preis bestätigt.'],
    ['Wer betreibt MedicalGerman?', operator(true, company)],
    ['Wo finde ich Hilfe zur Abrechnung?', 'Die Seite „Hilfe zur Abrechnung“ bündelt Hinweise zu Rechnungen, Kündigung und Kontakt. TODO-CONFIRM: Den produktbezogenen Supportweg und den Zugang zur Aboverwaltung bestätigen.']
  ] : [
    ['What is MedicalGerman?', `${summary(false)} TODO-CONFIRM: Available learning formats, content and access requirements.`],
    ['Who is it for?', 'People preparing for a medical German language exam. TODO-CONFIRM: Supported professions, exams, regions and starting language level.'],
    ['How does exam preparation work?', 'The proposed overview groups preparation into an exam goal, study priorities and practice with review. TODO-CONFIRM: Verify the actual learning journey and available practice and feedback formats.'],
    ['What does a subscription cost?', 'TODO-CONFIRM: Plans, prices, currency, VAT, billing periods, renewal and any trial offers. No price is confirmed here yet.'],
    ['Who operates MedicalGerman?', operator(false, company)],
    ['Where can I get billing help?', 'The billing help page brings together guidance on invoices, cancellation and contact. TODO-CONFIRM: Verify the product support channel and subscription management route.']
  ];
}

function productPage(de, company, origin) {
  const path = route(de);
  const questions = faq(de, company);
  const steps = de ? [
    ['Prüfungsziel klären', 'Welche Prüfung möchten Sie ablegen und welches Sprachniveau wird vorausgesetzt?', 'Unterstützte Prüfungen, Berufsgruppen und Einstiegsvoraussetzungen.'],
    ['Lernschwerpunkte setzen', 'Welche sprachlichen Situationen sind für Ihre Vorbereitung relevant?', 'Verfügbare Themen, Lernmaterialien und Reihenfolge im Produkt.'],
    ['Üben und zurückblicken', 'Planen Sie Zeit für Übungen und die Wiederholung schwieriger Themen ein.', 'Übungsformate, Rückmeldungen und Möglichkeiten zur Fortschrittsübersicht.']
  ] : [
    ['Clarify your exam goal', 'Which exam are you preparing for, and what language level does it require?', 'Supported exams, professions and entry requirements.'],
    ['Choose study priorities', 'Which language situations matter for your preparation?', 'Available topics, learning materials and sequence within the product.'],
    ['Practise and review', 'Allow time for practice and revisiting difficult topics.', 'Practice formats, feedback and any progress review features.']
  ];
  return {
    path, ...(de ? { lang: 'de', englishPath: route(false) } : {}), name: 'MedicalGerman', navigation: true, launchContent: true,
    title: `MedicalGerman | ${company}`, description: `${summary(de)} ${operator(de, company)}`, ...social(de), mainEntity: `${origin}${path}#product`,
    body: `${intro(de ? 'Unser Portfolio / Lernen' : 'Our portfolio / Learning', 'MedicalGerman', summary(de))}
      <section class="section wrap"><p class="role">${operator(de, company)}</p><div class="actions">${link('https://medicalgerman.app', de ? 'MedicalGerman besuchen' : 'Visit MedicalGerman', 'button')}${link(billingRoute(de), de ? 'Hilfe zur Abrechnung' : 'Billing help')}</div>${reviewNote(de)}</section>
      <section class="section soft-section"><div class="wrap"><h2>${de ? 'Ein klares Lernziel.' : 'A focused learning goal.'}</h2><div class="editorial-grid"><article><h3>${de ? 'Was es ist' : 'What it is'}</h3><p>${de ? 'MedicalGerman ist ein digitales Lernprodukt für die Vorbereitung auf medizinische Deutschprüfungen.' : 'MedicalGerman is a digital learning product for medical German exam preparation.'}</p>${todo(de ? 'Produktfunktionen, Inhalte, unterstützte Geräte und Zugangsmodell.' : 'Product features, content, supported devices and access model.')}</article><article><h3>${de ? 'Für wen es gedacht ist' : 'Who it is for'}</h3><p>${de ? 'Für Menschen, die medizinisches Deutsch für eine Prüfung vorbereiten möchten. Prüfen Sie vor dem Abschluss eines Abonnements, ob das Angebot zu Ihrem Prüfungsziel passt.' : 'For people preparing to use medical German in an exam. Before subscribing, check that the offering fits your exam goal.'}</p>${todo(de ? 'Berufsgruppen, Prüfungen, Regionen und erforderliches Sprachniveau.' : 'Professions, exams, regions and required starting language level.')}</article></div></div></section>
      <section class="section wrap" id="preparation"><p class="eyebrow">${de ? 'Die Vorbereitung planen' : 'Planning your preparation'}</p><h2>${de ? 'Vom Prüfungsziel<br>zur Übung.' : 'From an exam goal<br>to practice.'}</h2><p>${de ? 'Ein Orientierungsrahmen für die Vorbereitung. Die Umsetzung im Produkt wird noch bestätigt.' : 'A framework for thinking about preparation. The journey within the product still needs confirmation.'}</p><ol class="steps">${steps.map(([title, text, pending], i) => `<li><span>0${i + 1}</span><div><h3>${title}</h3><p>${text}</p>${todo(pending)}</div></li>`).join('')}</ol></section>
      <section class="section soft-section" id="pricing"><div class="wrap"><h2>${de ? 'Tarife und Abonnements' : 'Plans and subscriptions'}</h2><p>${de ? 'Die Preisübersicht wird vor der Veröffentlichung mit den bestätigten Tarifen ergänzt.' : 'This pricing summary will be completed with confirmed plans before publication.'}</p><dl class="business-facts"><div><dt>${de ? 'Tarife und Preise' : 'Plans and prices'}</dt><dd>TODO-CONFIRM: ${de ? 'Tarifnamen, Leistungsumfang, Preise, Währung und Umsatzsteuer.' : 'Plan names, inclusions, amounts, currency and VAT.'}</dd></div><div><dt>${de ? 'Laufzeit' : 'Billing term'}</dt><dd>TODO-CONFIRM: ${de ? 'Abrechnungszeiträume, Verlängerung und Testangebote.' : 'Billing periods, renewal and trial offers.'}</dd></div><div><dt>${de ? 'Kündigung' : 'Cancellation'}</dt><dd>TODO-CONFIRM: ${de ? 'Kündigungsweg, Fristen und Ende des Zugangs.' : 'Cancellation route, notice periods and when access ends.'}</dd></div></dl><div class="actions">${link('https://medicalgerman.app', de ? 'Zur Produktwebsite' : 'Go to the product website')}${link(billingRoute(de), de ? 'Fragen zur Abrechnung' : 'Billing questions')}</div></div></section>
      <section class="section wrap" id="faq"><h2>${de ? 'Häufige Fragen' : 'Frequently asked questions'}</h2><div class="editorial-grid">${questions.map(([q, a]) => `<article><h3>${q}</h3><p>${a}</p></article>`).join('')}</div>${link(billingRoute(de), de ? 'Zur Hilfe für Rechnungen und Kündigung' : 'Help with invoices and cancellation')}</section>`,
    structuredData: [
      { '@type': 'Product', '@id': `${origin}${path}#product`, name: 'MedicalGerman', url: `${origin}${path}`, description: `${summary(de)} ${operator(de, company)}`, image: `${origin}${social(de).socialImage}` },
      { '@type': 'FAQPage', '@id': `${origin}${path}#faq`, url: `${origin}${path}#faq`, inLanguage: de ? 'de' : 'en', mainEntity: questions.map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } })) }
    ]
  };
}

function billingPage(de, company, email) {
  return {
    path: billingRoute(de), ...(de ? { lang: 'de', englishPath: billingRoute(false) } : {}), name: de ? 'Hilfe zur Abrechnung' : 'Billing help', parent: [route(de), 'MedicalGerman'], launchContent: true,
    title: `${de ? 'MedicalGerman: Hilfe zur Abrechnung' : 'MedicalGerman billing help'} | ${company}`,
    description: de ? 'Hinweise zu MedicalGerman-Rechnungen, Kündigung und Kontakt zum Betreiber Dr. Blackburn Digital GmbH.' : 'Guidance on MedicalGerman invoices, cancellation and contacting the operator, Dr. Blackburn Digital GmbH.', ...social(de),
    body: `${intro('MedicalGerman', de ? 'Hilfe zur Abrechnung' : 'Billing help', de ? 'Rechnungen, Abonnements und ein Kontakt für Ihre Fragen.' : 'Invoices, subscriptions and a contact for your questions.')}
      <section class="section wrap"><p>${operator(de, company)}</p>${reviewNote(de)}<div class="editorial-grid"><article><h2>${de ? 'Rechnungen' : 'Invoices'}</h2><p>${de ? 'Nennen Sie bei Fragen zu einer Rechnung bitte deren Nummer und das Rechnungsdatum, sofern vorhanden. Beschreiben Sie kurz, welche Angabe Sie benötigen oder prüfen lassen möchten.' : 'For an invoice enquiry, include the invoice number and date if available. Briefly describe the information you need or would like checked.'}</p>${todo(de ? 'Rechnungsversand, Zugang zu Rechnungen, Rechnungsaussteller und Ablauf für Korrekturen.' : 'Invoice delivery, invoice access, issuing entity and correction process.')}</article><article><h2>${de ? 'Abonnement kündigen' : 'Cancel a subscription'}</h2><p>${de ? 'Der genaue Kündigungsweg wird hier vor der Veröffentlichung ergänzt. Halten Sie für Rückfragen die mit dem Abonnement verbundene E-Mail-Adresse bereit.' : 'The exact cancellation route will be added here before publication. Have the email address associated with your subscription ready for any enquiry.'}</p>${todo(de ? 'Direktlink zur Aboverwaltung und Kündigung, Fristen, Bestätigung, Verlängerung und Ende des Zugangs.' : 'Direct subscription management and cancellation link, notice periods, confirmation, renewal and end of access.')}</article></div>
      <div class="source-note"><h2>${de ? 'Erstattung und Widerruf' : 'Refunds and withdrawal'}</h2><p>${de ? 'Die Entwürfe der Vertragsbedingungen sowie der Erstattungs- und Widerrufshinweise werden vor dem Start rechtlich geprüft.' : 'The draft terms and refund and withdrawal information will receive legal review before launch.'}</p><div class="actions">${link(de ? '/de/erstattung-widerruf/' : '/refunds-withdrawal/', de ? 'Erstattung und Widerruf (Entwurf)' : 'Refunds and withdrawal (draft)')}${link(de ? '/de/agb/' : '/terms/', de ? 'Vertragsbedingungen (Entwurf)' : 'Terms (draft)')}</div></div>
      <h2>${de ? 'Kontakt zum Betreiber' : 'Contact the operator'}</h2><p>${de ? 'Für Rückfragen erreichen Sie Dr. Blackburn Digital GmbH per E-Mail oder über das Kontaktformular. Geben Sie nur die für Ihre Anfrage nötigen Informationen an; senden Sie keine Passwörter, vollständigen Zahlungsdaten oder Patientendaten.' : 'You can reach Dr. Blackburn Digital GmbH by email or the contact form. Include only the information needed for your enquiry; do not send passwords, full payment details or patient data.'}</p>${todo(de ? 'Produktbezogenen Supportkanal, Zuständigkeit und Antwortzeiten bestätigen.' : 'Confirm the product support channel, responsibility and response times.')}<div class="actions"><a class="text-link" href="mailto:${email}">${email.replace('@', '@<wbr>')}</a>${link(de ? '/de/kontakt/?type=general' : '/contact/?type=general', de ? 'Kontaktformular' : 'Contact form')}</div><p class="small-note">${de ? 'Diese Informationsseite ändert Ihr Abonnement nicht. Der verbindliche Ablauf für Kündigungen wird vor dem Start ergänzt.' : 'This information page does not change your subscription. The confirmed cancellation process will be added before launch.'}</p></section>`
  };
}

export function getMedicalGermanPortfolioPages(company) {
  return [false, true].map(de => ({
    path: portfolioRoute(de), ...(de ? { lang: 'de', englishPath: portfolioRoute(false) } : {}), name: 'Portfolio', launchContent: true,
    title: `${de ? 'Unser Portfolio' : 'Our portfolio'} | ${company}`,
    description: de ? 'MedicalGerman im Portfolio von Dr. Blackburn Digital GmbH: fokussierte digitale Produkte langfristig betreiben und weiterentwickeln.' : 'MedicalGerman in the Dr. Blackburn Digital GmbH portfolio: operating and developing focused digital products for the long term.', ...social(de),
    body: `${intro(de ? 'Unser Portfolio' : 'Our portfolio', de ? 'Fokussierte Produkte.<br><em>Langfristige Verantwortung.</em>' : 'Focused products.<br><em>Long-term commitment.</em>', de ? 'Wir verbinden Erfahrung in Lernen, Technologie und Unternehmensführung mit der täglichen Arbeit an nützlichen digitalen Produkten.' : 'We bring learning, technology and business experience to the everyday work of running useful digital products.')}
      <section class="section wrap portfolio-list">${medicalGermanPortfolioEntry(de)}${reviewNote(de)}</section>
      <section class="section soft-section"><div class="wrap"><h2>${de ? 'Unsere Rolle als Betreiber' : 'Our role as an operator'}</h2><p>${operator(de, company)}</p><div class="editorial-grid"><article><h3>${de ? 'Die Zielgruppe verstehen' : 'Understand the audience'}</h3><p>${de ? 'Wir beginnen mit den Menschen, die ein Produkt nutzen, und der Aufgabe, die es für sie erfüllt.' : 'We start with the people using a product and the job it does for them.'}</p></article><article><h3>${de ? 'Mit Bedacht verbessern' : 'Improve with care'}</h3><p>${de ? 'Lerndesign, Technik und verlässliche Abläufe bilden die Grundlage für die Weiterentwicklung.' : 'Learning design, technology and dependable operations provide the basis for development.'}</p></article></div></div></section>
      <section class="section wrap" id="acquisition-fit"><h2>${de ? 'Ein passendes Unternehmen vorstellen' : 'Introduce a business that fits'}</h2><p>${de ? 'Wir interessieren uns für nützliche Produkte mit klarer Zielgruppe und einem nachvollziehbaren Geschäftsmodell. Für eine erste Vorstellung genügen ein Link, Ihre Rolle und ein kurzer Überblick über das Unternehmen und den Anlass für einen möglichen Verkauf.' : 'We are interested in useful products with a clear audience and an understandable business model. A link, your role and a brief outline of the business and reason for a possible sale are enough for an initial introduction.'}</p>${link(de ? '/de/kontakt/?type=acquisition' : '/contact/?type=acquisition', de ? 'Ein Unternehmen vorstellen' : 'Introduce a business', 'button')}</section>`
  }));
}

export function getMedicalGermanPages(company, origin, email) {
  return [false, true].flatMap(de => [productPage(de, company, origin), billingPage(de, company, email)]);
}
