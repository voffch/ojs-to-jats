import { genJournalMeta, genArticleMeta, genAuthorMeta } from "./metadataTemplates";

export default function parseXML(xmlString) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlString, "application/xml");
  const getText = (selector, root=xml) => root.querySelector(selector)?.textContent.trim() ?? '';
  const getBilingualText = (selector, root=xml) => {
    return {
      en: getText(`${selector}:lang(en)`, root),
      ru: getText(`${selector}:lang(ru)`, root)
    }
  };
  const getAttr = (selector, attribute) => xml.querySelector(selector)?.getAttribute(attribute) ?? '';
  const getMultipleTexts = (selector, delimiter) => {
    const texts = Array.from(xml.querySelectorAll(selector)).map(e => e.textContent.trim());
    return texts.join(delimiter);
  };
  const getMultipleBilingualTexts = (selector, delimiter) => {
    return {
      en: getMultipleTexts(`${selector}:lang(en)`, delimiter),
      ru: getMultipleTexts(`${selector}:lang(ru)`, delimiter)
    }
  };
  const jmeta = {
    ...genJournalMeta(),
    titles : getBilingualText('journal-title'),
    issn : getText('issn[publication-format="print"]'),
    eissn : getText('issn[publication-format="electronic"]'),
    publishers : getBilingualText('publisher-name')
  }
  const ameta = {
    ...genArticleMeta(),
    primaryLanguage : getAttr('article', 'xml:lang'),
    articleType : getAttr('article', 'article-type'),
    doi : getText('article-id[pub-id-type="doi"]'),
    edn : getText('article-id[pub-id-type="edn"]'),
    pageUrl : getAttr('self-uri[content-type="html"]', 'xlink:href'),
    pdfUrl : getAttr('self-uri[content-type="pdf"]', 'xlink:href'),
    titles : getBilingualText('article-title'),
    abstracts : getBilingualText('abstract'),
    keywords : getMultipleBilingualTexts('kwd', '; '),
    // authors : [],
    // affiliations : [],
    copyrightHolders : getBilingualText('copyright-holder'),
    licenseUrl : getAttr('license', 'xlink:href'),
    copyrightYear : getText('copyright-year'),
    dateSubmitted : getAttr('date[date-type="received"]', 'iso-8601-date'),
    dateAccepted : getAttr('date[date-type="accepted"]', 'iso-8601-date'),
    datePublished : getAttr('pub-date', 'iso-8601-date'),
    volume : getText('volume'),
    issue : getText('issue'),
    // useElocationId : false,
    // pages : '',
    acknowledgments : getBilingualText('ack'),
    fundings : getBilingualText('funding-statement'),
    citations : getMultipleBilingualTexts('mixed-citation', '\n')
  }
  // elocation-id and pages
  const elocationId = getText('elocation-id');
  ameta.useElocationId = elocationId !== '';
  if (elocationId) {
    ameta.pages = elocationId;
  } else {
    const fpage = getText('fpage');
    const lpage = getText('lpage');
    if (fpage === lpage) {
      ameta.pages = fpage;
    } else {
      ameta.pages = `${fpage}-${lpage}`;
    }
  }
  // authors and affs
  const affiliations = { en: [], ru: []};
  Array.from(xml.querySelectorAll('aff-alternatives')).forEach((aa) => {
    for (const lang of ['en', 'ru']) {
      affiliations[lang].push(aa.querySelector(`institution:lang(${lang})`)?.textContent.trim() ?? '');
    }
  });
  ameta.affiliations = affiliations;
  const authors = Array.from(xml.querySelectorAll('contrib')).map((contrib) => {
    const affNumbers = Array.from(contrib.querySelectorAll(`xref[ref-type="aff"]`)).map((xref) => {
      const rid = xref.getAttribute('rid');
      return parseInt(rid?.match(/\d+/));
    }).filter(x => !isNaN(x));
    function assignAffiliations(affNumbers, affiliations) {
      return {
        en: affNumbers.map(i => affiliations.en[i - 1]).filter(Boolean).join('; '),
        ru: affNumbers.map(i => affiliations.ru[i - 1]).filter(Boolean).join('; '),
      };
    }
    const author = {
      ...genAuthorMeta(),
      surnames : getBilingualText('surname', contrib),
      givennames : getBilingualText('given-names', contrib),
      email : getText('email', contrib),
      orcid : getText('contrib-id[contrib-id-type="orcid"]', contrib),
      affiliations : assignAffiliations(affNumbers, affiliations),
      affNumbers : affNumbers
    }
    return author;
  });
  ameta.authors = authors;
  return {
    journal: jmeta,
    article: ameta
  }
}