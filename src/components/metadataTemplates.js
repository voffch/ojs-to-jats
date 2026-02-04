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
    affiliations : {
      en : '',
      ru : ''
    },
    affNumbers : [] // 1-indexed
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
    authors : [],
    affiliations : {
      en : [],
      ru : []
    },
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