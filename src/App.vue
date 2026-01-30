<script setup>
import { ref, onMounted, watch } from "vue";
import GlobalSettings from './components/Settings.vue';
import OJSFetcher from "./components/OJSFetcher.vue";
import ArticleWrapper from "./components/ArticleWrapper.vue";
import Help from "./components/Help.vue";
import { environment } from './components/store.js';
import { genJournalMeta, genArticleMeta } from "./components/metadataTemplates.js";

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
</script>

<template>
  <GlobalSettings />
  <OJSFetcher v-if="environment.extension" 
    v-model:baseUrl="baseUrl"
    v-model:submissionId="submissionId"
    v-model:journalMeta="journalMeta" 
    v-model:articleMeta="articleMeta" />
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
      <li>
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
    opacity: 0.7;
    z-index: 99;
  }
</style>
