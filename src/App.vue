<script setup>
import { ref, computed, onMounted, watch } from "vue";
import GlobalSettings from './components/Settings.vue';
import OJSFetcher from "./components/OJSFetcher.vue";
import ArticleWrapper from "./components/ArticleWrapper.vue";
import Help from "./components/Help.vue";
import Crossref from "./components/Crossref.vue";
import Doaj from "./components/Doaj.vue";
import { environment } from './components/store.js';
import { genJournalMeta, genArticleMeta } from "./components/metadataTemplates.js";
import parseJatsXML from './components/parseJatsXML.js';
import generateJatsXML from "./components/generateJatsXML.js";

const journalMeta = ref(genJournalMeta());
const articleMeta = ref(genArticleMeta());

const xml = computed(() => {
  return generateJatsXML(journalMeta.value, articleMeta.value);
});

const xmlString = computed(() => {
  if (xml.value) {
    return new XMLSerializer().serializeToString(xml.value);
  } else {
    return null;
  }
});

const callingUrl = ref('');
const baseUrl = ref('');
const submissionId = ref('');

const helpOpened = ref(false);
const crossrefOpened = ref(false);
const doajOpened = ref(false);

onMounted(() => {
  environment.update();
  if (environment.extension) {
    const stored = localStorage.getItem('jats-maker-ojs-base-url');
    if (stored) {
      baseUrl.value = stored;
    }

    chrome.runtime.sendMessage({ request : 'url' }).then((response) => {
      callingUrl.value = response.url;
      const viewString = 'article/view/';
      if (callingUrl.value.includes(viewString)) {
        const url = new URL(callingUrl.value);
        const segments = url.pathname.split('/');
        submissionId.value = segments.pop() || segments.pop(); // Handles potential trailing slashes
        baseUrl.value = callingUrl.value.split(viewString)[0];
      }
    });
  }
});

watch(baseUrl, (newUrl, oldUrl) => {
  if (newUrl !== oldUrl) {
    localStorage.setItem('jats-maker-ojs-base-url', newUrl);
  }
});

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

function scrollToBottom() {
  window.scrollTo({
    top: document.documentElement.scrollHeight,
    behavior: 'smooth'
  });
}

function openHelp() {
  helpOpened.value = true;
}

function openCrossref() {
  crossrefOpened.value = true;
}

function openDoaj() {
  doajOpened.value = true;
}

const xmlFileInput = ref(null);

const uploadXml = () => {
  xmlFileInput.value.click();
}

const onXmlFileSelected = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const { journal, article } = parseJatsXML(e.target.result);
      Object.assign(journalMeta.value, {...genJournalMeta(), ...journal});
      Object.assign(articleMeta.value, {...genArticleMeta(), ...article});
    } catch (error) {
      console.error("Кривой XML:", error);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function makeXmlFilename() {
  const parts = [
    'JATS',
    (journalMeta.value.eissn ? journalMeta.value.eissn : journalMeta.value.issn),
    articleMeta.value.volume,
    articleMeta.value.issue,
    articleMeta.value.pages,
    articleMeta.value.datePublished,
  ];
  return parts.filter(Boolean).join('_').replaceAll(/[<>:"\/\\\|\?\*]/g, '');
}

async function downloadXml() {
  const blob = new Blob([xmlString.value], { type: 'text/xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = makeXmlFilename();
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
</script>

<template>
  <OJSFetcher v-if="environment.extension" 
    v-model:baseUrl="baseUrl"
    v-model:submissionId="submissionId"
    v-model:journalMeta="journalMeta" 
    v-model:articleMeta="articleMeta" />
  <GlobalSettings />
  <ArticleWrapper 
    v-model:journalMeta="journalMeta" 
    v-model:articleMeta="articleMeta"
    :xml="xml"
    :xmlString="xmlString" />

  <div class="nav-menu">
    <button class="small circle">
      <i>menu</i>
    </button>
    <menu class="bottom transparent no-wrap left right-align">
      <li>
        <button class="fill" @click="scrollToTop">
          <i>arrow_upward</i>
          <span>Наверх</span>
        </button>
      </li>
      <li>
        <button class="fill" @click="scrollToBottom">
          <i>arrow_downward</i>
          <span>Вниз</span>
        </button>
      </li>
      <li class="top-margin">
        <button class="fill" @click="uploadXml">
          <i>upload</i>
          <span>Из JATS XML</span>
        </button>
        <input 
          type="file" 
          accept=".xml" 
          ref="xmlFileInput" 
          style="display: none" 
          @change="onXmlFileSelected" 
        />
      </li>
      <li>
        <button class="fill" @click="downloadXml">
          <i>download</i>
          <span>В JATS XML</span>
        </button>
      </li>
      <li class="top-margin">
        <button class="fill" @click="openCrossref">
          <i>attach_file</i>
          <span>Crossref</span>
        </button>
      </li>
      <li>
        <button class="fill" @click="openDoaj">
          <i>library_books</i>
          <span>DOAJ</span>
        </button>
      </li>
      <li class="top-margin">
        <button class="fill" @click="openHelp">
          <i>help</i>
          <span>Справка</span>
        </button>
      </li>
    </menu>
  </div>
  <Crossref v-model="crossrefOpened" />
  <Doaj v-model="doajOpened" />
  <Help v-model="helpOpened" />
</template>

<style scoped>
  .nav-menu {
    position: fixed;
    top: 1rem;
    right: 1rem;
    opacity: 0.75;
    z-index: 99;
  }
</style>
