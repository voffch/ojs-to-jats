<script setup>
import { ref, onMounted, watch } from "vue";
import GlobalSettings from './components/Settings.vue';
import OJSFetcher from "./components/OJSFetcher.vue";
import ArticleWrapper from "./components/ArticleWrapper.vue";
import Help from "./components/Help.vue";
import { environment } from './components/store.js';
import { genJournalMeta, genArticleMeta } from "./components/metadataTemplates.js";
import parseXML from './components/parseXML.js';

const journalMeta = ref(genJournalMeta());
const articleMeta = ref(genArticleMeta());

const callingUrl = ref('');
const baseUrl = ref('');
const submissionId = ref('');

const helpOpened = ref(false);

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

async function downloadJson() {
  const json = {
    journal: journalMeta.value,
    article: articleMeta.value
  };
  const dataStr = JSON.stringify(json, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'journalArticle.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const jsonFileInput = ref(null);

const uploadJson = () => {
  jsonFileInput.value.click();
}

const onJsonFileSelected = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const json = JSON.parse(e.target.result);
      Object.assign(journalMeta.value, {...genJournalMeta(), ...json.journal});
      Object.assign(articleMeta.value, {...genArticleMeta(), ...json.article});
    } catch (error) {
      console.error("Кривой JSON:", error);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
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
      const { journal, article } = parseXML(e.target.result);
      Object.assign(journalMeta.value, {...genJournalMeta(), ...journal});
      Object.assign(articleMeta.value, {...genArticleMeta(), ...article});
    } catch (error) {
      console.error("Кривой XML:", error);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
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
    v-model:articleMeta="articleMeta" />

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
      <li class="top-margin">
        <button class="fill" @click="downloadJson">
          <i>download</i>
          <span>В *.json</span>
        </button>
      </li>
      <li>
        <button class="fill" @click="uploadJson">
          <i>upload</i>
          <span>Из *.json</span>
        </button>
        <input 
          type="file" 
          accept=".json" 
          ref="jsonFileInput" 
          style="display: none" 
          @change="onJsonFileSelected" 
        />
      </li>
      <li class="top-margin">
        <button class="fill" @click="openHelp">
          <i>help</i>
          <span>Справка</span>
        </button>
      </li>
    </menu>
  </div>
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
