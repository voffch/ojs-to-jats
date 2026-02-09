// metadata templates (generators)

export function genJournalMeta() {
  return {
    titles : {
      en : '',
      ru : '',
    },
    issn : '',
    eissn : '',
    publishers : {
      en : '',
      ru : ''
    }
  };
}

export function genArticleMeta() {
  return {
    primaryLanguage : '',
    articleType : 'research-article',
    doi : '',
    edn : '',
    pageUrl : '',
    pdfUrl : '',
    titles : {
      en : '',
      ru : ''
    },
    abstracts : {
      en : '',
      ru : ''
    },
    keywords : {
      en : '',
      ru : ''
    },
    nextAuthorId : 1,
    authors : [], // wrapped for correct tracking in v-for [{ id : 1, val : ... }]
    nextAffiliationId : 1,
    affiliations : [], // wrapped for correct tracking in v-for [{ id : 1, val : { en: '', ru: '' } }]
    copyrightHolders : {
      en : '',
      ru : ''
    },
    licenseUrl : 'https://creativecommons.org/licenses/by/4.0/',
    copyrightYear : '',
    dateSubmitted : '',
    dateAccepted : '',
    datePublished : '',
    volume : '',
    issue : '',
    useElocationId : false,
    pages : '',
    acknowledgments : {
      en : '',
      ru : ''
    },
    fundings : {
      en : '',
      ru : ''
    },
    citations : {
      en : '',
      ru : ''
    }
  }
}

export function genAuthorMeta() {
  return {
    surnames : {
      en : '',
      ru : ''
    },
    givennames : {
      en : '',
      ru : ''
    },
    email : '',
    orcid : '',
    affiliations : { // for intermediate computation, NOT to be relied upon for exporting
      en : '',
      ru : ''
    },
    affIds : [] // to be relied upon for exporting
  };
}

export function addAuthor(articleMeta, authorMeta, index=null) {
  const position = (index !== null) ? index : articleMeta.authors.length;
  const id = articleMeta.nextAuthorId++;
  articleMeta.authors.splice(position, 0, {
    id: id,
    val: authorMeta
  });
}

// helper functions

export function addEmptyAuthor(articleMeta, index=null) {
  addAuthor(articleMeta, genAuthorMeta(), index);
}

export function deleteAuthor(articleMeta, id) {
  const index = articleMeta.authors.findIndex(a => a.id === id);
  if (index !== -1) {
    articleMeta.authors.splice(index, 1);
  }
}

export function addAffiliation(articleMeta, aff, index=null) {
  const position = (index !== null) ? index : articleMeta.affiliations.length;
  const id = articleMeta.nextAffiliationId++;
  articleMeta.affiliations.splice(position, 0, {
    id: id,
    val: aff
  });
}

export function addEmptyAffiliation(articleMeta, index=null) {
  addAffiliation(articleMeta, { en: '', ru: '' }, index);
}

export function deleteAffiliation(articleMeta, affId) {
  const index = articleMeta.affiliations.findIndex(a => a.id === affId);
  if (index !== -1) {
    articleMeta.affiliations.splice(index, 1);
    // author cleanup is desirable to quickly find out if the author is affiliated
    for (const author of articleMeta.authors) {
      deaffiliateAuthorVal(author.val, affId);
    }
  }
}

export function processAffiliations(articleMeta) {
  articleMeta.nextAffiliationId = 1;
  articleMeta.affiliations = [];
  for (const authorObj of articleMeta.authors) {
    const author = authorObj.val;
    if (author.affiliations.en || author.affiliations.ru) {
      const splitAffs = (aff) => aff.trim().split(/\s*;\s*/).filter(line => line.trim() !== "");
      const authorAffsEn = splitAffs(author.affiliations.en);
      const authorAffsRu = splitAffs(author.affiliations.ru);
      const numberOfAffiliations = Math.max(authorAffsEn.length, authorAffsRu.length);
      for (let index = 0; index < numberOfAffiliations; index++) {
        const authorAff = {
          en : authorAffsEn[index] ?? '',
          ru : authorAffsRu[index] ?? ''
        }
        const affIndex = articleMeta.affiliations.findIndex(a => 
          (a.val.en === authorAff.en && a.val.ru === authorAff.ru)
        );
        if (affIndex < 0) {
          const affId = articleMeta.nextAffiliationId;
          addAffiliation(articleMeta, authorAff);
          affiliateAuthorVal(author, affId);
        } else {
          affiliateAuthorVal(author, articleMeta.affiliations[affIndex].id);
        }
      }
    }
  }
}

export function affiliateAuthorVal(authorVal, affId) {
  authorVal.affIds.push(affId);
}

export function deaffiliateAuthorVal(authorVal, affId) {
  const affIndex = authorVal.affIds.findIndex(id => id === affId);
  if (affIndex !== -1) {
    authorVal.affIds.splice(affIndex, 1);
  }
}

function removeHtmlFromText(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return doc.body.textContent || "";
}

export function removeHtmlFromTitlesAbstracts(articleMeta) {
  for (const obj of [articleMeta.titles, articleMeta.abstracts]) {
    Object.keys(obj).forEach(key => {
      obj[key] = removeHtmlFromText(obj[key]);
    });
  }
}

export function removeHtmlFromCitations(articleMeta) {
  const obj = articleMeta.citations;
  Object.keys(obj).forEach(key => {
    obj[key] = removeHtmlFromText(obj[key]);
  });
}