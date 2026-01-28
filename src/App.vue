<script setup>
import { ref, onMounted } from "vue";
import AppSingleArticle from "./components/AppSingleArticle.vue";
import GlobalSettings from './components/Settings.vue';
import genSettings from "./components/settingsTemplate";

const gs = ref(genSettings());

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
</script>

<template>
  <GlobalSettings v-model="gs" />
  <AppSingleArticle :gs="gs" :submissionId="submissionId" />
  <div id="scroll-overlay">
    <button @click="scrollToTop()">▲</button>
    <button @click="scrollToBottom()">▼</button>
  </div>
</template>

<style scoped>
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
