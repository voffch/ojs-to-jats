<script setup>
import { ref, computed, onMounted } from "vue";
import AppMultipleArticles from "./components/AppMultipleArticles.vue";
import AppSingleArticle from "./components/AppSingleArticle.vue";
import GlobalSettings from './components/Settings.vue';
import genSettings from "./components/settingsTemplate";

const gs = ref(genSettings());

const modes = {
  'Выпуски (через OJS API)': AppMultipleArticles,
  'Одна статья': AppSingleArticle
};
const selected = ref('Одна статья');

const mode = computed(() => {
  return modes[selected.value];
});

const callingUrl = ref('');
const submissionId = ref('');

onMounted(() => {
  chrome.runtime.sendMessage({ request : 'url' }).then((response) => {
    callingUrl.value = response.url;
    const viewString = 'article/view/';
    if (callingUrl.value.includes(viewString)) {
      const url = new URL(callingUrl.value);
      const segments = url.pathname.split('/');
      submissionId.value = segments.pop() || segments.pop(); // Handles potential trailing slashes
      gs.value.baseUrl = callingUrl.value.split(viewString)[0];
    }
  });
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

//<select class="main-selector" v-model="selected">
//  <option v-for="(value, key) in modes" :value="key">{{ key }}</option>
//</select>
//<div>
//  <p v-if="callingUrl">Плагин загружен из "{{ callingUrl }}"</p>
//  <p v-else>Плагин не загружен с сайта</p>
//</div>
</script>

<template>
  <GlobalSettings v-model="gs" />
  <component :is="mode" :gs="gs" :submissionId="submissionId" />
  <div id="scroll-overlay">
    <button @click="scrollToTop()">▲</button>
    <button @click="scrollToBottom()">▼</button>
  </div>
</template>

<style scoped>
  .main-selector {
    display: block;
    margin: 0 auto 1rem auto;
  }
  #scroll-overlay {
    position: fixed; 
    bottom: 1rem; 
    right: 0.5rem; 
    display: flex; 
    flex-direction: column; 
    gap: 10px; 
    z-index: 9999;
  }
  #scroll-overlay button {
    padding: 0;
    cursor: pointer;
    opacity: 0.5;
  }
</style>
