// https://doaj.org/docs/xml/

function createXmlWrapper() {
	const parser = new DOMParser();
	const xml  = parser.parseFromString(`<?xml version="1.0" encoding="utf-8"?>
		<records
			xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
			xsi:noNamespaceSchemaLocation="http://doaj.org/static/doaj/doajArticles.xsd" >
		</records>`, "application/xml");
	return xml;
}

export default function generateDoajXML(metas) {
	const xml = createXmlWrapper();
	const records = xml.getElementsByTagName('records')[0];
	const ns = records.namespaceURI; // most probably not required for this XML, but just in case
	for (const meta of metas) {
    const ameta = meta['article'];
    const jmeta = meta['journal'];
    const record = xml.createElementNS(ns, 'record');
    records.appendChild(record);
    let language = null;
    // the meaning is unclear - is it the language of the metadata?
    // language = xml.createElementNS(ns, 'language');
    // language.textContent = 'eng';
    // ...or the language of the article?
    // if (ameta.primaryLanguage) {
    //   language = xml.createElementNS(ns, 'language');
    //   switch(ameta.primaryLanguage) {
    //     case 'ru':
    //       language.textContent = 'rus';
    //       break;
    //     case 'en':
    //       language.textContent = 'eng';
    //       break;
    //     default:
    //       language = null;
    //       break;
    //   }
    // }
    let publisher = null;
    if (jmeta.publishers.en) {
      publisher = xml.createElementNS(ns, 'publisher');
      publisher.textContent = jmeta.publishers.en;
    }
    const journalTitle = xml.createElementNS(ns, 'journalTitle'); // *
    journalTitle.textContent = jmeta.titles.en;
    // *
    // either issn or eissn is required
    let issn = null;
    if (jmeta.issn) {
      issn = xml.createElementNS(ns, 'issn');
      issn.textContent = jmeta.issn;
    }
    let eissn = null;
    if (jmeta.eissn) {
      eissn = xml.createElementNS(ns, 'eissn');
      eissn.textContent = jmeta.eissn;
    }
    const publicationDate = xml.createElementNS(ns, 'publicationDate'); // *
    publicationDate.textContent = ameta.datePublished;
    let volume = null;
    if (ameta.volume) {
      volume = xml.createElementNS(ns, 'volume');
      volume.textContent = ameta.volume;
    }
    let issue = null;
    if (ameta.issue) {
      issue = xml.createElementNS(ns, 'issue');
      issue.textContent = ameta.issue;
    }
    let startPage = null;
    let endPage = null;
    if (ameta.pages) {
      if (!ameta.useElocationId) {
        const pageParts = ameta.pages.split('-');
        startPage = xml.createElementNS(ns, 'startPage');
        startPage.textContent = pageParts[0];
        if (pageParts.length > 1) {
          endPage = xml.createElementNS(ns, 'endPage');
          endPage.textContent = pageParts[1];
        }
      } else {
        startPage = xml.createElementNS(ns, 'startPage');
        startPage.textContent = ameta.pages;
      }
    }
    let doi = null;
    if (ameta.doi) {
      doi = xml.createElementNS(ns, 'doi');
      doi.textContent = ameta.doi;
    }
    let publisherRecordId = null;
    const documentType = xml.createElementNS(ns, 'documentType');
    documentType.textContent = 'article';
    const title = xml.createElementNS(ns, 'title'); // *
    title.textContent = ameta.titles.en;
    title.setAttribute('language', 'eng');
    // authors and affiliations - the hardest part
    const affiliationsForDoaj = [];
    let authors = null;
    if (ameta.authors.length) {
      authors = xml.createElementNS(ns, 'authors');
      for (const a of ameta.authors) {
        const author = xml.createElementNS(ns, 'author');
        const surname = a.val.surnames.en;
        const givennames = a.val.givennames.en;
        let fullname = '';
        if (surname && givennames) {
          fullname = `${givennames} ${surname}`;
        } else {
          fullname = surname ? surname : givennames;
        }
        const name = xml.createElementNS(ns, 'name');
        name.textContent = fullname;
        author.appendChild(name);
        // DOAJ asks to NOT deposit emails
        //if (a.val.email) {
        //  const email = xml.createElementNS(ns, 'email');
        //  email.textContent = a.val.email;
        //  author.appendChild(email);
        //}
        const affiliation = ameta.affiliations.filter((aff) => {
          return (a.val.affIds.includes(aff.id) && aff.val.en);
        }).map((aff) => aff.val.en).join('; ');
        if (affiliation) {
          if (affiliationsForDoaj.indexOf(affiliation) === -1) {
            affiliationsForDoaj.push(affiliation);
          }
          const affiliationId = xml.createElementNS(ns, 'affiliationId');
          affiliationId.textContent = affiliationsForDoaj.indexOf(affiliation).toString();
          author.appendChild(affiliationId);
        }
        if (a.val.orcid) {
          const orcid_id = xml.createElementNS(ns, 'orcid_id');
          orcid_id.textContent = a.val.orcid;
          author.appendChild(orcid_id);
        }
        authors.appendChild(author);
      }
    }
    let affiliationsList = null;
    if (affiliationsForDoaj.length) {
      affiliationsList = xml.createElementNS(ns, 'affiliationsList');
      for (const [index, name] of affiliationsForDoaj.entries()) {
        const affiliationName = xml.createElementNS(ns, 'affiliationName');
        affiliationName.setAttribute('affiliationId', index.toString());
        affiliationName.textContent = name;
        affiliationsList.appendChild(affiliationName);
      }
    }
    let abstract = null;
    if (ameta.abstracts.en) {
      abstract = xml.createElementNS(ns, 'abstract');
      abstract.textContent = ameta.abstracts.en;
      abstract.setAttribute('language', 'eng');
    }
    const fullTextUrl = xml.createElementNS(ns, 'fullTextUrl'); // *
    fullTextUrl.textContent = ameta.pageUrl;
    fullTextUrl.setAttribute('format', 'html');
    let keywords = null;
    if (ameta.keywords.en) {
      keywords = xml.createElementNS(ns, 'keywords');
      keywords.setAttribute('language', 'eng');
      const splitKeywords = ameta.keywords.en.split(/\s*;\s*/);
      for (const word of splitKeywords) {
        const keyword = xml.createElementNS(ns, 'keyword');
        keyword.textContent = word;
        keywords.appendChild(keyword);
      }
    }
    for (const child of [
                          language, 
                          publisher,
                          journalTitle,
                          issn,
                          eissn,
                          publicationDate,
                          volume,
                          issue,
                          startPage,
                          endPage,
                          doi,
                          publisherRecordId,
                          documentType,
                          title,
                          authors,
                          affiliationsList,
                          abstract,
                          fullTextUrl,
                          keywords
                        ]) {
      if (child) {
        record.appendChild(child);
      }
    }
	} //for (const meta of metas)
	return xml;
}