<script setup>
import { ref, computed, watch } from 'vue';
import { genAuthorMeta, genJournalMeta, genArticleMeta } from "./metadataTemplates";

const journalMeta = defineModel('journalMeta', {
  type : Object,
  required : true,
  default : genJournalMeta()
});

const articleMeta = defineModel('articleMeta', {
  type : Object,
  required : true,
  default : genArticleMeta()
});

const baseUrl = defineModel('baseUrl', {
  type : String,
  required : true
});

const submissionId = defineModel('submissionId', {
  type : String,
  required : true
});

const updateJournalMeta = ref(false);

watch(() => submissionId.value, (newNumber, oldNumber) => {
  if (newNumber !== oldNumber) {
    loadedOnce.value = false;
    editUrl.value = '';
    document.title = newNumber || 'OJS to JATS';
  }
});

const loading = ref(false);
const loadedOnce = ref(false);
const loadLog = ref([]); // { type: 'info', text: '' }

function log(type, text) {
  loadLog.value.push({
    'type' : type,
    'text' : text
  });
}

const logInfo = text => log('info', text);
const logWarning = text => log('warning', text);
const logError = text => log('error', text);

function clearLog() {
  loadLog.value = [];
}

const articleUrl = computed(() => {
  return `${baseUrl.value}article/view/${submissionId.value}`;
});

const editUrl = ref('');

async function requestHostPermissions(href) {
  let granted = false;
  try {
    const url = new URL(href);
    const matchPattern = `${url.protocol}//${url.hostname}/*`;
    granted = await chrome.permissions.request({
      origins: [matchPattern]
    });
  } catch(e) {
    logError('Ошибка: некорректный Base URL');
  }
  return granted;
}

function createUrlForLocaleChange(newLocale) {
  const locale = newLocale.includes('ru') ? 'ru_RU' : 'en_US';
  const articleUrlObject = new URL(articleUrl.value);
  const url = new URL(`user/setLocale/${locale}`, baseUrl.value);
  url.searchParams.append('source', articleUrlObject.pathname);
  return url.href;
}

async function loadPublication() {
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  loading.value = true;
  clearLog();  
  if (baseUrl.value.match(/^https?:\/\/.+$/) && submissionId.value.match(/^\d+$/)) {
    const granted = await requestHostPermissions(baseUrl.value);
    if (granted) {
      loadedOnce.value = true;
      editUrl.value = '';
      articleMeta.value = {
        ...genArticleMeta(),
        pageUrl: articleUrl.value
      };
      try {
        const firstStatus = await loadOjsWebpage();
        let apiAccessed = false;
        if (firstStatus.ojsVersion >= 3.1) {
          try {
            await loadByApi();
            apiAccessed = true;
          } catch(e) {
            logError('Ошибка доступа по API, попробую получить данные с веб-страницы');
          }
        }
        if (!apiAccessed) {
          const newLang = firstStatus.lang === 'en' ? 'ru' : 'en';
          await sleep(250);
          const secondStatus = await loadOjsWebpage(newLang);
          if (secondStatus.lang && (secondStatus.lang !== firstStatus.lang)) {
            await sleep(250);
            switchLanguageOnly(firstStatus.lang);
          }
        }
      } catch(e) {
        logError(e.message);
      } finally {
        logInfo('Загрузка и обработка данных завершены');
      }
    } else {
      logError(`Вы не разрешили плагину доступ к ${baseUrl.value}`);
    }
  } else {
    logError('Недопустимое значение Base URL или Submission ID')
  }
  loading.value = false;
}

// WEBPAGES

async function switchLanguageOnly(lang) {
  const url = createUrlForLocaleChange(lang);
  logInfo(`Переключаю язык на ${lang} запросом к ${url}`);
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Accept': 'text/html'
    }
  });
}

async function loadOjsWebpage(newLang=null) {
  function checkResponse(response) {
    if (!response.ok) {
      let statusText = '';
      switch (response.status) {
        case 404:
          statusText = ' не найдено';
          break;
        case 403:
          statusText = ' доступ запрещен';
          break;
        default:
          break;
      }
      throw new Error(`Ошибка HTTP ${response.status}${statusText}`);
    }
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("text/html")) {
      throw new Error(`Ошибка - ответ в формате "${contentType}", а не text/html`);
    }
  }
  const result = {
    ojsVersion: null,
    lang: null
  }
  // the errors are not caught intentionally, I let them propagate to the upper-level function
  if (newLang) {
    logInfo(`Переключаю язык на ${newLang}`);
  }
  const url = newLang ? createUrlForLocaleChange(newLang) : articleUrl.value;
  logInfo(`Загрузка веб-страницы ${url}`);
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Accept': 'text/html'
    }
  });
  checkResponse(response);
  const text = await response.text();
  if (text) {
    const parser = new DOMParser();
    const html = parser.parseFromString(text, 'text/html');
    const htmlLanguage = getHtmlLang(html);
    result.lang = htmlLanguage;
    if ((newLang === null) || (htmlLanguage === newLang)) {
      const generator = html.querySelector('meta[name="generator"]');
      if (generator && generator.content && generator.content.includes('Open Journal Systems 3')) {
        const versionMatch = parseFloat(generator.content.match(/\d\.\d/));
        if (versionMatch) {
          result.ojsVersion = parseFloat(versionMatch);
        }
        logInfo(`Страница на OJS ${result.ojsVersion.toFixed(1)}: ${generator.content}`);
      } else {
        logWarning('Либо это OJS 2.x, либо это не страница со статьей на OJS');
        editUrl.value = `${baseUrl.value}editor/submission/${submissionId.value}`;
        result.ojsVersion = 2;
      }
      await parseOjsWebpage(html, result.ojsVersion);
    } else if (newLang && (htmlLanguage !== newLang)) {
      logWarning('Не удалось переключить язык, возможно сайт одноязычный');
    }
  } else {
    throw new Error('Ошибка - пустая веб-страница');
  }
  return result;
}

async function parseOjsWebpage(html, ojsVersion=2, updateExisting=false) {
  // the update sequence (written with reliability of different metadata fields in mind):
  // the API will overwrite everything in any case
  // parseOpenUrl should go first as it doesn't have updateExisting parameter
  // and it contains better titles than DC and Highwire
  // the rest of the functions behave as expected
  // EXCEPT parseOjsXBody ignores updateExisting for the titles and the abstracts
  const htmlLanguage = getHtmlLang(html);
  logInfo(`Язык страницы ${htmlLanguage}`);
  logInfo('Обрабатываю OpenUrl...');
  try {
    parseOpenUrl(html);
  } catch(e) {
    logWarning(e.message);
    logWarning('Ошибка обработки OpenUrl');
  }
  logInfo('Обрабатываю Dublin Core...');
  try {
    parseDublinCore(html, updateExisting);
  } catch(e) {
    logWarning(e.message);
    logWarning('Ошибка обработки Dublin Core');
  }
  logInfo('Обрабатываю Highwire Press...');
  try {
    parseHighwirePress(html, updateExisting);
  } catch(e) {
    logWarning(e.message);
    logWarning('Ошибка обработки Highwire Press');
  }
  logInfo(`Обрабатываю тело страницы как OJS ${ojsVersion}...`);
  try {
    if (ojsVersion < 3) {
      parseOjs2Body(html, updateExisting);
    } else {
      parseOjs3Body(html, updateExisting);
    }
  } catch(e) {
    logWarning(e.message);
    logWarning('Ошибка обработки страницы');
  }
}

function getHtmlLang(html) {
  let htmlLanguage = html.getElementsByTagName('html')[0].lang;
  if (htmlLanguage) {
    htmlLanguage = htmlLanguage.includes('ru') ? 'ru' : 'en';
  } else {
    htmlLanguage = 'en';
  }
  return htmlLanguage;
}

function parseOpenUrl(html) {
  const coins = html.querySelector('span.Z3988');
  if (!coins) {
    throw new Error('Не найден элемент COinS OpenURL, возможно выключен плагин COinS');
  }
  const openUrlParams = new URLSearchParams(coins.title);
  const lang = getHtmlLang(html);
  if (updateJournalMeta.value) {
    if (openUrlParams.has('rft.issn')) {
      journalMeta.value.issn = openUrlParams.get('rft.issn');
    }
    if (openUrlParams.has('rft.eissn')) {
      journalMeta.value.eissn = openUrlParams.get('rft.eissn');
    }
    if (openUrlParams.has('rft.jtitle')) {
      journalMeta.value.titles[lang] = openUrlParams.get('rft.jtitle');
    }
  }
  if (openUrlParams.has('rft.volume')) {
    articleMeta.value.volume = openUrlParams.get('rft.volume');
  }
  if (openUrlParams.has('rft.issue')) {
    articleMeta.value.issue = openUrlParams.get('rft.issue');
  }
  if (openUrlParams.has('rft.pages')) {
    articleMeta.value.pages = openUrlParams.get('rft.pages');
    articleMeta.value.useElocationId = !articleMeta.value.pages.includes('-');
  }
  if (openUrlParams.has('rft_id')) {
    for (const rft_id of openUrlParams.getAll('rft_id')) {
      const doiMatch = rft_id.match(/^info:doi\/(.+)$/);
      if (doiMatch) {
        articleMeta.value.doi = doiMatch[1];
        break;
      }
    }
  }
  if (openUrlParams.has('rft.atitle')) {
    articleMeta.value.titles[lang] = openUrlParams.get('rft.atitle');
  }
}

function splitCopyrightStatement(statement) {
  const match = statement.match(/^.+(?<year>\d{4})\s*(?<holders>.+)$/);
  if (match) {
    return {
      holders : match.groups.holders,
      year : match.groups.year
    };
  } else {
    return {
      holders : '',
      year : ''
    };
  }
}

function splitFullName(fullname, firstNameFirst=true) {
  const nameParts = fullname.split(/\s+/).filter(part => part !== '');
  const surname = firstNameFirst ? nameParts.pop() : nameParts.shift();
  const givenname = nameParts.join(' ');
  return {
    'surname': surname,
    'givenname': givenname
  };
}

function initializeAuthorsIfEmpty(number) {
  let nonemptyAuthorsLength = 0;
  for (const author of articleMeta.value.authors) {
    if (JSON.stringify(author) !== JSON.stringify(genAuthorMeta())) {
      nonemptyAuthorsLength += 1;
    }
  }
  if (nonemptyAuthorsLength === 0) {
    articleMeta.value.authors = new Array(number);
    for (let i = 0; i < number; i++) {
      articleMeta.value.authors[i] = genAuthorMeta();
    }
  }
}

function parseDublinCore(html, updateExisting=true) {
  if (!html.querySelectorAll('meta[name^="DC\."]').length) {
    throw new Error('Не найдены мета-тэги Dublin Core, возможно выключен плагин Dublin Core Indexing');
  }
  // helper functions
  const htmlLanguage = getHtmlLang(html);
  function getElementLang(element) {
    return element.getAttribute('xml:lang') ?? htmlLanguage;
  }
  const queryMeta = (what) => html.querySelector(`meta[name="${what}"]`);
  const queryMetaAll = (what) => html.querySelectorAll(`meta[name="${what}"]`);
  function setMetaByElement(obj, path, element) {
    if (element && element.content) {
      const keys = path.split('.');
      const lastKey = keys.pop();
      const target = keys.reduce((current, key) => {
        return current[key];
      }, obj);
      if (updateExisting || !target[lastKey]) {
        target[lastKey] = element.content;
      }
    }    
  }
  function setMeta(obj, path, name) {
    const element = queryMeta(name);
    setMetaByElement(obj, path, element);
  }
  function setBilingualMeta(obj, path, name) {
    const elements = queryMetaAll(name);
    for (const element of elements) {
      const lang = getElementLang(element);
      setMetaByElement(obj, path + '.' + lang, element);
    }
  }
  const setArticleMeta = (path, name) => setMeta(articleMeta.value, path, name);
  const setBilingualArticleMeta = (path, name) => setBilingualMeta(articleMeta.value, path, name);
  const setJournalMeta = (path, name) => setMeta(journalMeta.value, path, name);
  const setBilingualJournalMeta = (path, name) => setBilingualMeta(journalMeta.value, path, name);
  if (updateJournalMeta.value) {
    setBilingualJournalMeta('titles', 'DC.Source');
    setJournalMeta('eissn', 'DC.Source.ISSN');
  }
  const universalArticleMeta = {
    'doi' : 'DC.Identifier.DOI',
    //'pageUrl' : 'DC.Identifier.URI',
    'issue' : 'DC.Source.Issue',
    'volume' : 'DC.Source.Volume',
    'pages' : 'DC.Identifier.pageNumber',
    'dateSubmitted' : 'DC.Date.dateSubmitted',
  }
  Object.entries(universalArticleMeta).forEach(([key, value]) => {
    setArticleMeta(key, value);
  });
  if (queryMeta('DC.Date.created')) {
    setArticleMeta('datePublished', 'DC.Date.created');
  } else {
    setArticleMeta('datePublished', 'DC.Date.issued');
  }
  articleMeta.value.useElocationId = articleMeta.value.pages && !articleMeta.value.pages.includes('-');
  setBilingualArticleMeta('fundings', 'DC.Contributor.Sponsor'); // there may be several of them in OJS 3.5
  setBilingualArticleMeta('titles', 'DC.Title');
  setBilingualArticleMeta('titles', 'DC.Title.Alternative');
  setBilingualArticleMeta('abstracts', 'DC.Description');
  const keywordElements = queryMetaAll('DC.Subject');
  const tempKeywords = {
    en : '',
    ru : ''
  }
  for (const element of keywordElements) {
    const lang = getElementLang(element);
    if (tempKeywords[lang]) {
      tempKeywords[lang] += `; ${element.content}`;
    } else {
      tempKeywords[lang] = `${element.content}`;
    }
  }
  Object.entries(tempKeywords).forEach(([key, value]) => {
    if (updateExisting || !articleMeta.value.keywords[key]) {
      articleMeta.value.keywords[key] = value;
    }
  });
  const copyrightMetas = queryMetaAll('DC.Rights');
  for (const x of copyrightMetas) {
    if (x.content.includes('Copyright (c)')) {
      const copyrightObject = splitCopyrightStatement(x.content);
      const lang = getElementLang(x);
      if (copyrightObject.holders && (updateExisting || !articleMeta.value.copyrightHolders[lang])) {
        articleMeta.value.copyrightHolders[lang] = copyrightObject.holders;
      }
      if (copyrightObject.year && (updateExisting || !articleMeta.value.copyrightYear)) {
        articleMeta.value.copyrightYear = copyrightObject.year;
      }
    } else if (x.content.match(/^https?:\/\/.+/)) {
      if (updateExisting || !articleMeta.value.licenseUrl) {
        const url = new URL(x.content);
        let href = 'https://' + url.host + url.pathname;
        if (!href.endsWith('/')) {
          href += '/';
        }
        articleMeta.value.licenseUrl = href;
      }
    }
  }
  const citationAuthors = queryMetaAll('DC.Creator.PersonalName');
  if (citationAuthors) {
    const authorElements = Array.from(citationAuthors);
    initializeAuthorsIfEmpty(authorElements.length);
    for (const [index, author] of Object.entries(authorElements)) {
      const lang = getElementLang(author);
      const nameObj = splitFullName(author.content);
      if (nameObj.surname && (updateExisting || !articleMeta.value.authors[index].surnames[lang])) {
        articleMeta.value.authors[index].surnames[lang] = nameObj.surname;
      }
      if (nameObj.givenname && (updateExisting || !articleMeta.value.authors[index].givennames[lang])) {
        articleMeta.value.authors[index].givennames[lang] = nameObj.givenname;
      }
    }
  }
}

function parseHighwirePress(html, updateExisting=true) {
  if (!html.querySelectorAll('meta[name^="citation_"]').length) {
    throw new Error('Не найдены мета-тэги Highwire Press, возможно выключен плагин Google Scholar Indexing');
  }
  // helper functions
  const htmlLanguage = getHtmlLang(html);
  function getElementLang(element) {
    return element.getAttribute('xml:lang') ?? htmlLanguage;
  }
  const queryMeta = (what) => html.querySelector(`meta[name="${what}"]`);
  const queryMetaAll = (what) => html.querySelectorAll(`meta[name="${what}"]`);
  function setMetaByElement(obj, path, element) {
    if (element && element.content) {
      const keys = path.split('.');
      const lastKey = keys.pop();
      const target = keys.reduce((current, key) => {
        return current[key];
      }, obj);
      if (updateExisting || !target[lastKey]) {
        target[lastKey] = element.content;
      }
    }    
  }
  function setMeta(obj, path, name) {
    const element = queryMeta(name);
    setMetaByElement(obj, path, element);
  }
  function setBilingualMeta(obj, path, name) {
    const elements = queryMetaAll(name);
    for (const element of elements) {
      const lang = getElementLang(element);
      setMetaByElement(obj, path + '.' + lang, element);
    }
  }
  const setArticleMeta = (path, name) => setMeta(articleMeta.value, path, name);
  const setBilingualArticleMeta = (path, name) => setBilingualMeta(articleMeta.value, path, name);
  const setJournalMeta = (path, name) => setMeta(journalMeta.value, path, name);
  const setBilingualJournalMeta = (path, name) => setBilingualMeta(journalMeta.value, path, name);
  if (updateJournalMeta.value) {
    setBilingualJournalMeta('titles', 'citation_journal_title');
    setJournalMeta('eissn', 'citation_issn');
  }
  const universalArticleMeta = {
    'doi' : 'citation_doi',
    //'pageUrl' : 'citation_abstract_html_url',
    'pdfUrl' : 'citation_pdf_url',
    'issue' : 'citation_issue',
    'volume' : 'citation_volume',
  }
  Object.entries(universalArticleMeta).forEach(([key, value]) => {
    setArticleMeta(key, value);
  });
  if (updateExisting || !articleMeta.value.pages) {
    const fpage = queryMeta('citation_firstpage');
    const lpage = queryMeta('citation_lastpage');
    if (fpage && lpage && fpage.content && lpage.content) {
      articleMeta.value.pages = (fpage.content === lpage.content) ? fpage.content : `${fpage.content}-${lpage.content}`;
    }
  }
  articleMeta.value.useElocationId = articleMeta.value.pages && !articleMeta.value.pages.includes('-');
  setBilingualArticleMeta('titles', 'citation_title');
  setBilingualArticleMeta('abstracts', 'citation_abstract');
  const keywordElements = queryMetaAll('citation_keywords');
  const tempKeywords = {
    en : '',
    ru : ''
  }
  for (const element of keywordElements) {
    const lang = getElementLang(element);
    if (tempKeywords[lang]) {
      tempKeywords[lang] += `; ${element.content}`;
    } else {
      tempKeywords[lang] = `${element.content}`;
    }
  }
  Object.entries(tempKeywords).forEach(([key, value]) => {
    if (updateExisting || !articleMeta.value.keywords[key]) {
      articleMeta.value.keywords[key] = value;
    }
  });
  const referenceElements = queryMetaAll('citation_reference');
  if (referenceElements && (updateExisting || !articleMeta.value.citations.en)) {
    articleMeta.value.citations.en = Array.from(referenceElements).map(e => e.content).join('\n');
  }
  const citationAuthors = queryMetaAll('citation_author');
  const citationAuthorInstitutions = queryMetaAll('citation_author_institution');
  if (citationAuthors && 
      citationAuthorInstitutions && 
      (citationAuthors.length === citationAuthorInstitutions.length)) {
    const authorElements = Array.from(citationAuthors);
    const institutionElements = Array.from(citationAuthorInstitutions);
    initializeAuthorsIfEmpty(authorElements.length);
    for (const [index, author] of Object.entries(authorElements)) {
      const lang = getElementLang(author);
      const nameObj = splitFullName(author.content);
      const aff = institutionElements[index].content;
      if (nameObj.surname && (updateExisting || !articleMeta.value.authors[index].surnames[lang])) {
        articleMeta.value.authors[index].surnames[lang] = nameObj.surname;
      }
      if (nameObj.givenname && (updateExisting || !articleMeta.value.authors[index].givennames[lang])) {
        articleMeta.value.authors[index].givennames[lang] = nameObj.givenname;
      }
      if (aff && (updateExisting || !articleMeta.value.authors[index].affiliations[lang])) {
        articleMeta.value.authors[index].affiliations[lang] = aff;
      }
    }
  }
}

function parseOjs2Body(html, updateExisting=true) {
  //title abstract kwds doi refs copyright license (authors affs orcids)
  const lang = getHtmlLang(html);
  const title = html.querySelector('#articleTitle h3');
  if (title && (updateExisting || !articleMeta.value.titles[lang])) {
    articleMeta.value.titles[lang] = title.innerHTML;
  }
  const abstract = html.querySelector('#articleAbstract > div');
  if (abstract && (updateExisting || !articleMeta.value.abstracts[lang])) {
    articleMeta.value.abstracts[lang] = abstract.innerHTML;
  }
  const keywords = html.querySelector('#articleSubject > div');
  if (keywords && (updateExisting || !articleMeta.value.keywords[lang])) {
    articleMeta.value.keywords[lang] = keywords.textContent;
  }
  const pdfLink = html.querySelector('#articleFullText > a:first-of-type');
  if (pdfLink && (updateExisting || !articleMeta.value.pdfUrl)) {
    articleMeta.value.pdfUrl = pdfLink.href.replace('/view/', '/download/');
  }
  const doi = html.getElementById('pub-id::doi');
  if (doi && (updateExisting || !articleMeta.value.doi)) {
    articleMeta.value.doi = doi.href.replace(/^https?:\/\/doi\.org\//, '');
  }
  const license = html.querySelector('a[rel="license"]');
  if (license && (updateExisting || !articleMeta.value.licenseUrl)) {
    articleMeta.value.licenseUrl = license.href;
  }
  const citations = html.querySelectorAll('#articleCitations p');
  if (citations && (updateExisting || !articleMeta.value.citations.en)) {
    articleMeta.value.citations.en = Array.from(citations, (c) => c.textContent).join('\n');
  }
  const authorBios = Array.from(html.querySelectorAll('.authorBio'));
  if (authorBios.length) {
    initializeAuthorsIfEmpty(authorBios.length);
    for (const [index, bio] of authorBios.entries()) {
      const textLines = bio.textContent.split(/[\r\n\t]/).filter(Boolean);
      const nameObj = splitFullName(textLines[0]);
      const aff = textLines[1] ?? null;
      const orcid = bio.querySelector('a.orcid');
      if (updateExisting || !articleMeta.value.authors[index].surnames[lang]) {
        articleMeta.value.authors[index].surnames[lang] = nameObj.surname;
      }
      if (updateExisting || !articleMeta.value.authors[index].givennames[lang]) {
        articleMeta.value.authors[index].givennames[lang] = nameObj.givenname;
      }
      if (aff && (updateExisting || !articleMeta.value.authors[index].affiliations[lang])) {
        articleMeta.value.authors[index].affiliations[lang] = aff;
      }
      if (orcid && (updateExisting || !articleMeta.value.authors[index].orcid)) {
        articleMeta.value.authors[index].orcid = orcid.href.replace('http:', 'https:');
      }
    }
  } else {
    const authorString = html.getElementById('authorString');
    if (authorString) {
      const authorNames = authorString.textContent.split(/\s?,\s?/).map(fn => splitFullName(fn));
      initializeAuthorsIfEmpty(authorNames.length);
      for (const [index, nameObj] of authorNames.entries()) {
        if (updateExisting || !articleMeta.value.authors[index].surnames[lang]) {
          articleMeta.value.authors[index].surnames[lang] = nameObj.surname;
        }
        if (updateExisting || !articleMeta.value.authors[index].givennames[lang]) {
          articleMeta.value.authors[index].givennames[lang] = nameObj.givenname;
        }
      }
    }
  }
}

function parseOjs3Body(html, updateExisting=true) {
  //title abstract kwds doi refs copyright license (authors affs orcids)
  //all inside page_article
  const lang = getHtmlLang(html);
  const title = html.querySelector('.page_title');
  if (title && (updateExisting || !articleMeta.value.titles[lang])) {
    articleMeta.value.titles[lang] = title.innerHTML.trim();
  }
  const abstract = html.querySelector('.item.abstract');
  if (abstract && (updateExisting || !articleMeta.value.abstracts[lang])) {
    const abstractClone = abstract.cloneNode(true);
    const label = abstractClone.querySelector('.label');
    if (label) {
      abstractClone.removeChild(label);
    }
    articleMeta.value.abstracts[lang] = abstractClone.innerHTML.trim();
  }
  const keywords = html.querySelector('.item.keywords .value');
  if (keywords && (updateExisting || !articleMeta.value.keywords[lang])) {
    articleMeta.value.keywords[lang] = keywords.textContent.replaceAll(/[\n\t]/g, '');
  }
  const pdfLink = html.querySelector('.obj_galley_link.pdf');
  if (pdfLink && (updateExisting || !articleMeta.value.pdfUrl)) {
    articleMeta.value.pdfUrl = pdfLink.href.replace('/view/', '/download/');
  }
  const doi = html.querySelector('.item.doi .value a');
  if (doi && (updateExisting || !articleMeta.value.doi)) {
    articleMeta.value.doi = doi.href.replace(/^https?:\/\/doi\.org\//, '');
  }
  const license = html.querySelector('a[rel="license"]');
  if (license && (updateExisting || !articleMeta.value.licenseUrl)) {
    articleMeta.value.licenseUrl = license.href;
  }
  const copyrightStatement = html.querySelector('.item.copyright p');
  if (copyrightStatement) {
    const copyrightObject = splitCopyrightStatement(copyrightStatement.textContent);
    if (copyrightObject.holders && (updateExisting || !articleMeta.value.copyrightHolders[lang])) {
      articleMeta.value.copyrightHolders[lang] = copyrightObject.holders;
    }
    if (copyrightObject.year && (updateExisting || !articleMeta.value.copyrightYear)) {
      articleMeta.value.copyrightYear = copyrightObject.year;
    }
  }
  const citations = html.querySelectorAll('.item.references .value p');
  if (citations && (updateExisting || !articleMeta.value.citations.en)) {
    articleMeta.value.citations.en = Array.from(citations, (c) => c.textContent).join('\n');
  }
  const authors = Array.from(html.querySelectorAll('.item.authors li'));
  if (authors.length) {
    initializeAuthorsIfEmpty(authors.length);
    for (const [index, author] of authors.entries()) {
      const fullName = author.querySelector('.name')?.textContent ?? '';
      const nameObj = splitFullName(fullName, (lang === 'en'));
      const aff = author.querySelector('.affiliation')?.textContent.trim() ?? '';
      const orcid = author.querySelector('.orcid a');
      if (updateExisting || !articleMeta.value.authors[index].surnames[lang]) {
        articleMeta.value.authors[index].surnames[lang] = nameObj.surname;
      }
      if (updateExisting || !articleMeta.value.authors[index].givennames[lang]) {
        articleMeta.value.authors[index].givennames[lang] = nameObj.givenname;
      }
      if (aff && (updateExisting || !articleMeta.value.authors[index].affiliations[lang])) {
        articleMeta.value.authors[index].affiliations[lang] = aff;
      }
      if (orcid && (updateExisting || !articleMeta.value.authors[index].orcid)) {
        articleMeta.value.authors[index].orcid = orcid.href.replace('http:', 'https:');
      }
    }
  }
}

// API

async function loadByApi() {
  function checkResponse(response) {
    if (!response.ok) {
      let statusText = '';
      switch (response.status) {
        case 404:
          statusText = ' не найдено';
          break;
        case 403:
          statusText = ' доступ запрещен, нужно залогиниться в OJS и проверить права';
          break;
        default:
          break;
      }
      throw new Error(`Ошибка HTTP ${response.status}${statusText}`);
    }
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error(`Ошибка - ответ в формате "${contentType}", а не application/json`);
    }
  }
  logInfo('Загрузка данных через OJS API...');
  try {
    const subEndpoint = `api/v1/submissions/${submissionId.value}`;
    const subURL = new URL(subEndpoint, baseUrl.value);
    logInfo(`Запрос submission ${subURL.href}`);
    const subResponse = await fetch(subURL.href, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });
    checkResponse(subResponse);
    const sub = await subResponse.json();
    editUrl.value = sub.urlWorkflow;
    const pubEndpoint = `${subEndpoint}/publications/${sub.currentPublicationId}`;
    const pubURL = new URL(pubEndpoint, baseUrl.value);
    logInfo(`Запрос publication ${pubURL.href}`);
    const pubResponse = await fetch(pubURL.href, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });
    checkResponse(pubResponse);
    const pub = await pubResponse.json();
    let doi = pub['pub-id::doi'];
    if (!doi) {
      doi = pub?.doiObject?.doi ?? ''; // OJS 3.5
    }
    articleMeta.value.doi = doi;
    articleMeta.value.pageUrl = pub.urlPublished.replace(/\/version\/\d+/, '');
    if (pub?.galleys.length) {
      const galleyId = pub.galleys[0].id;
      const guessedPdfUrl = new URL(`article/download/${sub.id}/${galleyId}`, baseUrl.value);
      articleMeta.value.pdfUrl = guessedPdfUrl.href;
    }
    const rukey = Object.keys(pub.abstract).find(key => key.includes('ru'));
    const enkey = Object.keys(pub.abstract).find(key => key.includes('en'));
    articleMeta.value.titles = {
      en : pub.fullTitle[enkey] ? pub.fullTitle[enkey] : '',
      ru : pub.fullTitle[rukey] ? pub.fullTitle[rukey] : ''
    };
    articleMeta.value.abstracts = {
      en : pub.abstract[enkey] ? pub.abstract[enkey] : '',
      ru : pub.abstract[rukey] ? pub.abstract[rukey] : ''
    };
    articleMeta.value.keywords = {
      en : pub.keywords[enkey] ? pub.keywords[enkey].join('; ') : '',
      ru : pub.keywords[rukey] ? pub.keywords[rukey].join('; ') : '',
    };
    articleMeta.value.authors = pub.authors.map((a) => {
      const tempAuthor = {
        surnames : {
          en : a.familyName[enkey] ? a.familyName[enkey] : '',
          ru : a.familyName[rukey] ? a.familyName[rukey] : ''
        },
        givennames : {
          en : a.givenName[enkey] ? a.givenName[enkey] : '',
          ru : a.givenName[rukey] ? a.givenName[rukey] : ''
        },
        email : a.email,
        orcid : a.orcid,
        affiliations : {
          en : '',
          ru : ''
        }
      }
      if (a.affiliation) {
        tempAuthor.affiliations = {
          en : a.affiliation[enkey] ? a.affiliation[enkey] : '',
          ru : a.affiliation[rukey] ? a.affiliation[rukey] : ''
        }
      } else if (a.affiliations) { // OJS 3.5
        tempAuthor.affiliations = {
          en : a.affiliations.map(aff => aff.name[enkey]).join('; '),
          ru : a.affiliations.map(aff => aff.name[rukey]).join('; ')
        }
      }
      return tempAuthor;
    });
    articleMeta.value.copyrightHolder = {
      en : pub.copyrightHolder[enkey] ? pub.copyrightHolder[enkey] : '',
      ru : pub.copyrightHolder[rukey] ? pub.copyrightHolder[rukey] : ''
    };
    articleMeta.value.licenseUrl = pub.licenseUrl;
    articleMeta.value.copyrightYear = pub.copyrightYear;//.toString();
    articleMeta.value.datePublished = pub.datePublished;
    articleMeta.value.pages = pub.pages;
    articleMeta.value.useElocationId = articleMeta.value.pages && !articleMeta.value.pages.includes('-');
    articleMeta.value.fundings = {
      en : pub.supportingAgencies[enkey] ? pub.supportingAgencies[enkey].join('; ') : '',
      ru : pub.supportingAgencies[rukey] ? pub.supportingAgencies[rukey].join('; ') : '',
    };
    articleMeta.value.citations = {
      en : pub.citationsRaw, // pub.citations.join('\n'),
      ru : ''
    };
  } catch(e) {
    logError(e.message);
    throw e;
  } finally {
    logInfo('Загрузка и обработка данных через OJS API завершены');
  }
}

const loadButtonText = computed(() => {
  if (loading.value) {
    return 'Загружаю...';
  } else {
    return loadedOnce.value ? 'Перезагрузить' : 'Загрузить';
  }
});
</script>

<template>
  <section class="load-controls-with-log-wrapper">
    <div class="base-url field label border small">
      <input type="text" v-model.lazy.trim="baseUrl" id="base-url" pattern='https?:\/\/.+\/' />
      <label for="base-url">Base URL журнала в OJS (должен заканчиваться на "/")</label>
    </div>
    <div class="load-controls-wrapper">
      <div class="submission-id field label border small">
        <input type="text" id="article-number" placeholder="" pattern="\d+" v-model.trim="submissionId" />
        <label for="article-number">Статья № (Submission ID)</label>
      </div>
      <button class="border small-round small-elevate primary-border primary-text" :disabled="loading" @click="loadPublication">
        <i>arrow_circle_down</i>
        <span>{{ loadButtonText }}</span>
      </button>
      <div class="switch-wrapper">
        <label class="switch-label" for="update-journal-meta">При загрузке обновлять метаданные <strong>журнала</strong></label>
        <label class="switch">
          <input type="checkbox" id="update-journal-meta" v-model="updateJournalMeta" />
          <span></span>
        </label>
      </div>
    </div>
    <div>
      Страница статьи на сайте журнала: <a class="article-url link underline" :href="articleUrl" target="_blank">{{ articleUrl }}</a>
    </div>
    <div v-if="editUrl">
      <a class="article-url link underline" :href="editUrl" target="_blank">Редактировать статью на сайте OJS</a>
    </div>
    <div class="load-log">
      <p v-if="loadLog.length === 0" class="log-info">Здесь будет лог загрузки</p>
      <p v-for="(msg, msgIndex) in loadLog" :key="msgIndex" :class="`log-${msg.type}`">&gt; {{ msg.text }}</p>
    </div>
  </section>
</template>

<style scoped>
  .base-url {
    margin-bottom: 1rem;
  }
  .submission-id {
    width: fit-content;
  }
  .load-controls-wrapper {
    display: flex;
    gap: 1rem;
  }
  .switch-wrapper {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    text-align: right;
    gap: 0.5rem;
    margin: 0.5rem 0 0.5rem auto;
  }
  .load-log {
    font-size: 0.8rem;
    margin: 1rem 0;
    padding: 0.5rem;
    border: 1px dotted black;
  }
  .load-log p {
    margin: 0 !important;
    line-height: 1.25;
  }
  .load-log .log-warning {
    color: darksalmon;
  }
  .log-error {
    color: darkred;
  }
  .switch-label {
    font-size: 1rem;
    cursor: pointer;
  }
</style>
