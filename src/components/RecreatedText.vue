<script setup>
import { ref, computed } from 'vue';
import { parseXMLDOM } from './parseXML';

const orcidIcon = '/img/ORCID-iD_icon_unauth_vector.svg';

const props = defineProps({
  xml : {
    type : Object,
    required : true
  },
});

const meta = computed(() => parseXMLDOM(props.xml)?.article);

function getFullname(author, lang) {
  const givennames = author.givennames[lang];
  const surname = author.surnames[lang];
  let fullname = '';
  if (surname && givennames) {
    fullname = `${givennames} ${surname}`;
  } else {
    fullname = surname ? surname : givennames;
  }
  return fullname;
};

function getFullnameWithFallback(author, lang) {
  let fullname = getFullname(author, lang);
  if (!fullname) {
    fullname = getFullname(author, (lang === 'ru' ? 'en' : 'ru'));
  }
  if (!fullname) {
    fullname = lang === 'ru' ? 'АВТОР БЕЗ ИМЕНИ' : 'NAMELESS AUTHOR';
  }
  return fullname;
}

function getAffiliationWithFallback(index, lang) {
  const otherLang = lang === 'ru' ? 'en' : 'ru';
  return meta.value.affiliations[lang][index] || meta.value.affiliations[otherLang][index];
}

const tr = (lang, ru, en) => (lang === 'ru') ? ru : en;

const detailsOpen = ref({
  en: true,
  ru: true
});

const detailsCaptions = computed(() => {
  const suffixes = {
    en: ' References:',
    ru: ' Список литературы:'
  }
  return {
    en: (detailsOpen.value.en ? '▼' : '►') + suffixes.en,
    ru: (detailsOpen.value.ru ? '▼' : '►') + suffixes.ru
  }
});

const handleToggle = (lang, e) => {
  detailsOpen.value[lang] = e.target.open;
};
</script>

<template>
  <section class="recreated-text-wrapper">
    <article v-for="lang in ['ru', 'en']" :key="lang">
      <div v-if="meta.doi" class="url">
        <span class="description">DOI: </span>
        <a :href="`https://doi.org/${meta.doi}`" target="_blank" class="link underline">{{ meta.doi }}</a>
      </div>
      <div v-else class="warning">{{ tr(lang, 'нет DOI', 'no DOI') }}</div>
      <div v-if="meta.edn" class="edn"><span class="description">EDN: </span>{{ meta.edn }}</div>
      <div v-if="meta.pageUrl" class="url">
        <span class="description">{{ tr(lang, 'Страница статьи: ', 'Article webpage: ') }}</span>
        <a :href="meta.pageUrl" target="_blank" class="link underline">{{ meta.pageUrl }}</a>
      </div>
      <div v-else class="warning">{{ tr(lang, 'нет ссылки на страницу статьи', 'no article webpage URL') }}</div>
      <div v-if="meta.pdfUrl" class="url">
        <span class="description">PDF: </span>
        <a :href="meta.pdfUrl" target="_blank" class="link underline">{{ meta.pdfUrl }}</a>
      </div>
      <div v-else class="warning">{{ tr(lang, 'нет ссылки на PDF статьи', 'no article PDF URL') }}</div>
      <div v-if="meta.licenseUrl && meta.copyrightHolders[lang]" class="copyright">
        <div class="copyright-statement">
          {{ `Copyright © ${meta.copyrightYear ? (meta.copyrightYear + ' ') : ''}${meta.copyrightHolders[lang]}` }}
        </div>
        <div class="copyright-license">
          <span>{{ tr(lang, 'Распространяется по лицензии ', 'Licensed under ') }}</span>
          <a :href="meta.licenseUrl" target="_blank" class="link underline">{{ meta.licenseUrl }}</a>
        </div>
      </div>
      <div v-else class="warning">{{ tr(lang, 'нет ссылки на лицензию или правообладателей', 'no license URL or copyright holders') }}</div>
      <div v-if="meta.titles[lang]" class="title">{{ meta.titles[lang] }}</div>
      <div v-else class="warning">{{ tr(lang, 'нет заголовка', 'no title') }}</div>
      <div v-if="meta.authors.length" class="authors">
        <span v-for="(a, index) in meta.authors" :key="index" class="author">
          <span class="fullname">{{ getFullnameWithFallback(a, lang) }}</span>
          <sup v-if="a.affNumbers.length">{{ ' ' + a.affNumbers.join(', ') }}</sup>
          <a v-if="a.email" :href="`mailto:${a.email}`" target="_blank" class="email-logo">✉</a>
          <a v-if="a.orcid" :href="a.orcid" target="_blank" class="orcid-logo"><img :src="orcidIcon" alt="orcid logo" /></a>
          <span v-if="index + 1 < meta.authors.length">, </span>
        </span>
      </div>
      <div v-else class="warning">{{ tr(lang, 'нет авторов', 'no authors') }}</div>
      <div v-if="meta.affiliations[lang].length" class="affiliations">
        <ol>
          <li v-for="(aff, index) in meta.affiliations[lang]" :key="index">{{ getAffiliationWithFallback(index, lang) }}</li>
        </ol>
      </div>
      <div v-else class="warning">{{ tr(lang, 'нет аффилиация', 'no affiliations') }}</div>
      <div v-if="meta.abstracts[lang]" class="abstract">
        <span class="description">{{ tr(lang, 'Аннотация: ', 'Abstract: ') }}</span>
        {{ meta.abstracts[lang] }}
      </div>
      <div v-else class="warning">{{ tr(lang, 'нет аннотации', 'no abstract') }}</div>
      <div v-if="meta.keywords[lang]" class="keywords">
        <span class="description">{{ tr(lang, 'Ключевые слова: ', 'Keywords: ') }}</span>
        {{ meta.keywords[lang] }}
      </div>
      <div v-else class="warning">{{ tr(lang, 'нет ключевых слов', 'no keywords') }}</div>
      <div class="dates">
        <span v-if="meta.dateSubmitted">{{ tr(lang, 'Получена ', 'Received ') + `${meta.dateSubmitted}, ` }}</span>
        <span v-if="meta.dateAccepted">{{ tr(lang, 'Принята ', 'Accepted ') + `${meta.dateAccepted}, ` }}</span>
        <span v-if="meta.datePublished">{{ tr(lang, 'Опубликована ', 'Published ') + `${meta.datePublished}` }}</span>
        <span v-else class="warning">{{ tr(lang, 'нет даты опубликования', 'no "published" date') }}</span>
      </div>
      <div class="pub-data">
        <span v-if="meta.volume">{{ tr(lang, 'Том ', 'Vol. ') + meta.volume + ', ' }}</span>
        <span v-if="meta.issue">{{ tr(lang, 'Выпуск ', 'Issue ') + meta.issue + ', ' }}</span>
        <span v-if="meta.pages">{{ (meta.useElocationId ? '№ ' : tr(lang, 'c. ', 'p. ')) + meta.pages }}</span>
        <span v-else class="warning">{{ tr(lang, 'нет страниц', 'no pages') }}</span>
      </div>
      <div v-if="meta.acknowledgments[lang]" class="acknowledgments">
        <span class="description">{{ tr(lang, 'Благодарности: ', 'Acknowledgments: ') }}</span>
        {{ meta.acknowledgments[lang] }}
      </div>
      <div v-if="meta.fundings[lang]" class="funding">
        <span class="description">{{ tr(lang, 'Финансирование: ', 'Funding: ') }}</span>
        {{ meta.fundings[lang] }}
      </div>
      <details v-if="meta.citations[lang]" class="citations" :open="detailsOpen[lang]" @toggle="handleToggle(lang, $event)">
        <summary>{{ detailsCaptions[lang] }}</summary>
        <ol>
          <li v-for="(ref, index) in meta.citations[lang].split(/\r?\n|\r/)" :key="index">{{ ref }}</li>
        </ol>
      </details>
      <div v-else class="warning">{{ tr(lang, 'нет списка литературы', 'no references') }}</div>
    </article>
  </section>
</template>

<style scoped>
  .title {
    font-weight: bold;
    font-size: 1.1rem;
    margin-top: 0.5rem;
  }
  .description {
    font-weight: bold;
  }
  .warning {
    color: var(--error);
  }
  .citations > ol {
    font-size: 0.8rem;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
  }
  .email-logo {
    font-size: 1.25rem;
  }
  .orcid-logo,
  .email-logo {
    margin-left: 0.2rem;
  }
  .orcid-logo img {
    width: 20px;
  }
</style>