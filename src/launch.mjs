// Deliberately fail closed: only the exact value "true" enables launch content.
export const isMedicalGermanEnabled = value => value === 'true';

// Phase 1 review scaffolding. Full product copy is delivered in a later phase.
// All copy is original and based only on the acquisition brief.
export function getMedicalGermanPages(company, origin) {
  return [false, true].map(de => {
    const route = de ? '/de/medicalgerman/' : '/medicalgerman/';
    return {
      path: route,
      ...(de ? { lang: 'de', englishPath: '/medicalgerman/' } : {}),
      name: 'MedicalGerman',
      navigation: true,
      title: `${de ? 'MedicalGerman – Produktvorschau' : 'MedicalGerman – product preview'} | ${company}`,
      description: de
        ? 'Vorschau der geplanten MedicalGerman-Produktinformationen von Dr. Blackburn Digital. Die Angaben werden vor der Veröffentlichung bestätigt.'
        : 'Preview of the planned MedicalGerman product information from Dr. Blackburn Digital. Details will be confirmed before publication.',
      body: `<section class="page-intro wrap"><p class="eyebrow">${de ? 'ENTWURF · Produktvorschau' : 'DRAFT · Product preview'}</p><h1>MedicalGerman</h1><p class="lead">${de ? 'Dr. Blackburn Digital bereitet Informationen zur geplanten Übernahme von MedicalGerman vor.' : 'Dr. Blackburn Digital is preparing information about the planned acquisition of MedicalGerman.'}</p></section>
        <section class="section wrap prose"><h2>${de ? 'Vor der Veröffentlichung zu bestätigen' : 'To confirm before publication'}</h2><ul>
        <li>TODO-CONFIRM: ${de ? 'Abschluss der Übernahme und Freigabe zur Veröffentlichung.' : 'Acquisition closing and approval to publish.'}</li>
        <li>TODO-CONFIRM: ${de ? 'Zielgruppe, Produktfunktionen und Ablauf der Prüfungsvorbereitung.' : 'Audience, product features and exam preparation approach.'}</li>
        <li>TODO-CONFIRM: ${de ? 'Preise, Abrechnung und Support.' : 'Pricing, billing and support arrangements.'}</li>
        </ul><a class="text-link" href="${de ? '/de/kontakt/' : '/contact/'}">${de ? 'Kontakt zu DBD' : 'Contact DBD'} <span aria-hidden="true">→</span></a></section>`,
      structuredData: [{ '@type': 'Product', '@id': `${origin}/medicalgerman/#product`, name: 'MedicalGerman', url: `${origin}${route}` }]
    };
  });
}
