// https://jats4r.niso.org/
// https://jats4r-validator.niso.org/
// https://jats.nlm.nih.gov/archiving/tag-library/1.4/
// https://jats.nlm.nih.gov/archiving/tag-library/1.4/chapter/tag-multi-lang-articles.html
// ? @lang-variant @lang-source @lang-focus

import { genAuthorMeta, licenses } from "./metadataTemplates";

function createXmlWrapper(articleType, lang) {
	const parser = new DOMParser();
  const langAttribute = lang ? `xml:lang="${lang}"` : '';
	const xml  = parser.parseFromString(`<?xml version="1.0" encoding="UTF-8"?>
  <!DOCTYPE article PUBLIC "-//NLM//DTD JATS (Z39.96) Journal Archiving and Interchange DTD v1.4 20241031//EN" 
  "https://jats.nlm.nih.gov/archiving/1.4/JATS-archive-oasis-article1-4-mathml3.dtd">
  <article xmlns:ali="http://www.niso.org/schemas/ali/1.0/" 
  xmlns:mml="http://www.w3.org/1998/Math/MathML" 
  xmlns:xlink="http://www.w3.org/1999/xlink" 
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
  article-type="${articleType}" 
  ${langAttribute}><front><journal-meta/><article-meta/></front><body/><back/></article>`, "application/xml");
	return xml;
}

export default function generateJatsXML(jmeta, ameta) {
	const xml = createXmlWrapper(ameta.articleType, ameta.primaryLanguage);
  const a = xml.getElementsByTagName('article')[0];
	const ns = a.namespaceURI;
  const xmlns = 'http://www.w3.org/XML/1998/namespace'; // for xml:lang
  const xlinkns = 'http://www.w3.org/1999/xlink';
  // journal-meta
  const journalMeta = xml.getElementsByTagNameNS(ns, 'journal-meta')[0];
  for (const lang in jmeta.titles) {
    if (jmeta.titles[lang]) {
      const journalTitleGroup = xml.createElementNS(ns, 'journal-title-group');
      journalTitleGroup.setAttributeNS(xmlns, 'lang', lang);
      const journalTitle = xml.createElementNS(ns, 'journal-title');
      journalTitle.textContent = jmeta.titles[lang];
      journalTitleGroup.appendChild(journalTitle);
      journalMeta.appendChild(journalTitleGroup);
    }
  }
  if (jmeta.issn) {
    const issn = xml.createElementNS(ns, 'issn');
    issn.setAttribute('publication-format', 'print');
    issn.textContent = jmeta.issn;
    journalMeta.appendChild(issn);
  }
  if (jmeta.eissn) {
    const eissn = xml.createElementNS(ns, 'issn');
    eissn.setAttribute('publication-format', 'electronic');
    eissn.textContent = jmeta.eissn;
    journalMeta.appendChild(eissn);
  }
  if (jmeta.publishers.en || jmeta.publishers.ru) {
    const publisher = xml.createElementNS(ns, 'publisher');
    for (const lang in jmeta.publishers) {
      if (jmeta.publishers[lang]) {
        const publisherName = xml.createElementNS(ns, 'publisher-name');
        publisherName.setAttributeNS(xmlns, 'lang', lang);
        publisherName.textContent = jmeta.publishers[lang];
        publisher.appendChild(publisherName);
      }
    }
    journalMeta.appendChild(publisher);
  }
  // article-meta
  const articleMeta = xml.getElementsByTagNameNS(ns, 'article-meta')[0];
  if (ameta.doi) {
    const articleId = xml.createElementNS(ns, 'article-id');
    articleId.setAttribute('pub-id-type', 'doi');
    articleId.textContent = ameta.doi;
    articleMeta.appendChild(articleId);
  }
  if (ameta.edn) {
    const articleId = xml.createElementNS(ns, 'article-id');
    articleId.setAttribute('pub-id-type', 'edn');
    articleId.textContent = ameta.edn;
    articleMeta.appendChild(articleId);
  }
  for (const lang in ameta.titles) {
    if (ameta.titles[lang]) {
      const titleGroup = xml.createElementNS(ns, 'title-group');
      titleGroup.setAttributeNS(xmlns, 'lang', lang);
      const articleTitle = xml.createElementNS(ns, 'article-title');
      // TODO html tags in title
      articleTitle.textContent = ameta.titles[lang];
      titleGroup.appendChild(articleTitle);
      articleMeta.appendChild(titleGroup);
    }
  }
  const isEmptyAuthor = author => (JSON.stringify(author.val) === JSON.stringify(genAuthorMeta()));
  const atLeastOneAuthor = () => {
    for (const author of ameta.authors) {
      if (!isEmptyAuthor(author)) {
        return true;
      }
    }
    return false;
  }
  const nonemptyAffiliations = ameta.affiliations.filter(a => (a.val.en || a.val.ru));
  if (atLeastOneAuthor()) {
    const contribGroup = xml.createElementNS(ns, 'contrib-group');
    for (const author of ameta.authors) {
      if (!isEmptyAuthor(author)) {
        const contrib = xml.createElementNS(ns, 'contrib');
        contrib.setAttribute('contrib-type', 'author');
        if (author.val.orcid) {
          const contribId = xml.createElementNS(ns, 'contrib-id');
          contribId.setAttribute('contrib-id-type', 'orcid');
          contribId.textContent = author.val.orcid;
          contrib.appendChild(contribId);
        }
        if (author.val.surnames.en || author.val.surnames.ru || author.val.givennames.en || author.val.givennames.ru) {
          const nameAlternatives = xml.createElementNS(ns, 'name-alternatives');
          for (const lang in author.val.surnames) {
            if (author.val.surnames[lang] || author.val.givennames[lang]) {
              const name = xml.createElementNS(ns, 'name');
              name.setAttributeNS(xmlns, 'lang', lang);
              if (author.val.surnames[lang]) {
                const surname = xml.createElementNS(ns, 'surname');
                surname.textContent = author.val.surnames[lang];
                name.appendChild(surname)
              }
              if (author.val.givennames[lang]) {
                const givenNames = xml.createElementNS(ns, 'given-names');
                givenNames.textContent = author.val.givennames[lang];
                name.appendChild(givenNames);
              }
              nameAlternatives.appendChild(name);
            }
          }
          contrib.appendChild(nameAlternatives);
        }
        if (author.val.email) {
          const email = xml.createElementNS(ns, 'email');
          email.textContent = author.val.email;
          contrib.appendChild(email);
        }
        if (author.val.affIds.length) {
          for (const [index, affiliation] of nonemptyAffiliations.entries()) {
            if (author.val.affIds.includes(affiliation.id)) {
              const xref = xml.createElementNS(ns, 'xref');
              xref.setAttribute('ref-type', 'aff');
              xref.setAttribute('rid', `aff${index + 1}`);
              contrib.appendChild(xref);
            }
          }
        }
        contribGroup.appendChild(contrib);
      }
    }
    articleMeta.appendChild(contribGroup);
    for (const [index, affiliation] of nonemptyAffiliations.entries()) {
      const affAlternatives = xml.createElementNS(ns, 'aff-alternatives');
      affAlternatives.setAttribute('id', `aff${index + 1}`);
      for (const lang in affiliation.val) {
        if (affiliation.val[lang]) {
          const aff = xml.createElementNS(ns, 'aff');
          const institution = xml.createElementNS(ns, 'institution');
          institution.setAttributeNS(xmlns, 'lang', lang);
          institution.textContent = affiliation.val[lang];
          aff.appendChild(institution);
          affAlternatives.appendChild(aff);
        }
      }
      articleMeta.appendChild(affAlternatives);
    }
  }
  if (ameta.datePublished) {
    const pubDate = xml.createElementNS(ns, 'pub-date');
    pubDate.setAttribute('date-type', 'pub');
    pubDate.setAttribute('iso-8601-date', ameta.datePublished);
    pubDate.setAttribute('publication-format', 'electronic');
    articleMeta.appendChild(pubDate);
  } else {
    articleMeta.appendChild(xml.createElementNS(ns, 'pub-date-not-available'));
  }
  if (ameta.volume) {
    const volume = xml.createElementNS(ns, 'volume');
    volume.textContent = ameta.volume;
    articleMeta.appendChild(volume);
  }
  if (ameta.issue) {
    const issue = xml.createElementNS(ns, 'issue');
    issue.textContent = ameta.issue;
    articleMeta.appendChild(issue);
  }
  if (ameta.useElocationId && ameta.pages) {
    const elocationId = xml.createElementNS(ns, 'elocation-id');
    elocationId.textContent = ameta.pages;
    articleMeta.appendChild(elocationId);
  } else if (ameta.pages) {
    const splitPages = ameta.pages.split(/\s*-\s*/)//.map(x => x.trim());
    const fpage = xml.createElementNS(ns, 'fpage');
    fpage.textContent = splitPages[0];
    const lpage = xml.createElementNS(ns, 'lpage');
    if (splitPages.length > 1) {
      lpage.textContent = splitPages[1];
    } else {
      lpage.textContent = splitPages[0];
    }
    articleMeta.appendChild(fpage);
    articleMeta.appendChild(lpage);
  }
  //history is deprecated, but metafora doesn't parse pub-history
  if (ameta.dateSubmitted || ameta.dateAccepted) {
    const history = xml.createElementNS(ns, 'history');
    if (ameta.dateSubmitted) {
      const date = xml.createElementNS(ns, 'date');
      date.setAttribute('date-type', 'received');
      date.setAttribute('iso-8601-date', ameta.dateSubmitted);
      history.appendChild(date);
    }
    if (ameta.dateAccepted) {
      const date = xml.createElementNS(ns, 'date');
      date.setAttribute('date-type', 'accepted');
      date.setAttribute('iso-8601-date', ameta.dateAccepted);
      history.appendChild(date);
    }
    articleMeta.appendChild(history);
  }
  // one permissions element
  if (ameta.licenseUrl || ameta.copyrightHolders.en || ameta.copyrightHolders.ru) {
    const permissions = xml.createElementNS(ns, 'permissions');
    for (const lang in ameta.copyrightHolders) {
      if (ameta.copyrightHolders[lang]) {
        const copyrightStatement = xml.createElementNS(ns, 'copyright-statement');
        copyrightStatement.setAttributeNS(xmlns, 'lang', lang);
        copyrightStatement.textContent = `Copyright © ${ameta.copyrightYear ? (ameta.copyrightYear + ' ') : ''}${ameta.copyrightHolders[lang]}`;
        permissions.appendChild(copyrightStatement);
      }
    }
    if (ameta.copyrightYear) {
      const copyrightYear = xml.createElementNS(ns, 'copyright-year');
      copyrightYear.textContent = ameta.copyrightYear;
      permissions.appendChild(copyrightYear);
    }
    for (const lang in ameta.copyrightHolders) {
      if (ameta.copyrightHolders[lang]) {
        const copyrightHolder = xml.createElementNS(ns, 'copyright-holder');
        copyrightHolder.setAttributeNS(xmlns, 'lang', lang);
        copyrightHolder.textContent = ameta.copyrightHolders[lang];
        permissions.appendChild(copyrightHolder);
      }
    }
    if (ameta.licenseUrl.includes('creativecommons')) {
      const freeToRead = xml.createElementNS('http://www.niso.org/schemas/ali/1.0/', 'free_to_read');
      permissions.appendChild(freeToRead);
    }
    if (ameta.licenseUrl) {
      const license = xml.createElementNS(ns, 'license');
      if (ameta.licenseUrl.includes('creativecommons')) {
        license.setAttribute('license-type', 'open-access');
      }
      license.setAttributeNS(xlinkns, 'href', ameta.licenseUrl);
      const licenseParagraphText = licenses[ameta.licenseUrl];
      if (licenseParagraphText && licenseParagraphText !== 'Иное') { // wtf is Иное anyway?
        const licenseP = xml.createElementNS(ns, 'license-p');
        licenseP.textContent = licenseParagraphText;
        license.appendChild(licenseP);
      }
      permissions.appendChild(license);
    }
    articleMeta.appendChild(permissions);
  }
  if (ameta.pageUrl) {
    const selfUri = xml.createElementNS(ns, 'self-uri');
    selfUri.setAttribute('content-type', 'html');
    selfUri.setAttribute('mimetype', 'text/html');
    selfUri.setAttributeNS(xlinkns, 'title', 'article webpage');
    selfUri.setAttributeNS(xlinkns, 'href', ameta.pageUrl);
    selfUri.textContent = ameta.pageUrl;
    articleMeta.appendChild(selfUri);
  }
  if (ameta.pdfUrl) {
    const selfUri = xml.createElementNS(ns, 'self-uri');
    selfUri.setAttribute('content-type', 'pdf');
    selfUri.setAttribute('mimetype', 'application/pdf');
    selfUri.setAttributeNS(xlinkns, 'title', 'article pdf');
    selfUri.setAttributeNS(xlinkns, 'href', ameta.pdfUrl);
    selfUri.textContent = ameta.pdfUrl;
    articleMeta.appendChild(selfUri);
  }
  for (const lang in ameta.abstracts) {
    if (ameta.abstracts[lang]) {
      const abstract = xml.createElementNS(ns, 'abstract');
      abstract.setAttributeNS(xmlns, 'lang', lang);
      // ? how to work better with both html and non-html code
      // TODO html tags in abstract
      const p = xml.createElementNS(ns, 'p');
      p.textContent = ameta.abstracts[lang];
      abstract.appendChild(p);
      articleMeta.appendChild(abstract);
    }
  }
  for (const lang in ameta.keywords) {
    if (ameta.keywords[lang]) {
      const kwdGroup = xml.createElementNS(ns, 'kwd-group');
      kwdGroup.setAttributeNS(xmlns, 'lang', lang);
      const splitKeywords = ameta.keywords[lang].split(/\s*;\s*/);
      for (const word of splitKeywords) {
        const kwd = xml.createElementNS(ns, 'kwd');
        kwd.textContent = word;
        kwdGroup.appendChild(kwd);
      }
      articleMeta.appendChild(kwdGroup);
    }
  }
  if (ameta.fundings.en || ameta.fundings.ru) {
    const fundingGroup = xml.createElementNS(ns, 'funding-group');
    for (const lang in ameta.fundings) {
      if (ameta.fundings[lang]) {
        const fundingStatement = xml.createElementNS(ns, 'funding-statement');
        fundingStatement.setAttributeNS(xmlns, 'lang', lang);
        fundingStatement.textContent = ameta.fundings[lang];
        fundingGroup.appendChild(fundingStatement);
      }
    }
    articleMeta.appendChild(fundingGroup);
  }
  // back
  const back = xml.getElementsByTagNameNS(ns, 'back')[0];
  for (const lang in ameta.acknowledgments) {
    if (ameta.acknowledgments[lang]) {
      const ack = xml.createElementNS(ns, 'ack');
      ack.setAttributeNS(xmlns, 'lang', lang);
      const p = xml.createElementNS(ns, 'p');
      p.textContent = ameta.acknowledgments[lang];
      ack.appendChild(p);
      back.appendChild(ack);
    }
  }
  if (ameta.citations.en || ameta.citations.ru) {
    const refList = xml.createElementNS(ns, 'ref-list');
    const lines = Object.fromEntries(
      Object.entries(ameta.citations).map(([lang, str]) => [lang, str.split(/\r?\n|\r/).filter(line => line.trim() !== "")])
    );
    const mostLinesLang = Object.keys(lines).reduce((prev, curr) => 
      lines[prev].length > lines[curr].length ? prev : curr
    );
    const otherLang = mostLinesLang === 'en' ? 'ru' : 'en';
    lines[mostLinesLang].forEach((line, index) => {
      const ref = xml.createElementNS(ns, 'ref');
      ref.setAttribute('id', `ref${index + 1}`);
      const label = xml.createElementNS(ns, 'label');
      label.textContent = `${index + 1}`;
      ref.appendChild(label);
      const citationAlternatives = xml.createElementNS(ns, 'citation-alternatives');
      const mixedCitation = xml.createElementNS(ns, 'mixed-citation');
      mixedCitation.setAttributeNS(xmlns, 'lang', mostLinesLang);
      mixedCitation.textContent = line.replace(/(^\[?\d+[\.\)\:\]]?\s*)/i, ''); // removing numeration here
      citationAlternatives.appendChild(mixedCitation);
      if (index < lines[otherLang].length) {
        const mixedCitation = xml.createElementNS(ns, 'mixed-citation');
        mixedCitation.setAttributeNS(xmlns, 'lang', otherLang);
        mixedCitation.textContent = lines[otherLang][index];
        citationAlternatives.appendChild(mixedCitation);
      }
      ref.appendChild(citationAlternatives);
      refList.appendChild(ref);
    });
    back.appendChild(refList);
  }
  return xml;
}