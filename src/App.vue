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
  <div class="nav-menu">
    <button class="small circle">
      <i>south_west</i>
    </button>
    <menu class="bottom transparent no-wrap left right-align">
      <li>
        <button class="fill" @click="scrollToTop()">
          <i>arrow_upward</i>
          <span>Наверх</span>
        </button>
      </li>
      <li>
        <button class="fill" @click="scrollToBottom()">
          <i>arrow_downward</i>
          <span>Вниз</span>
        </button>
      </li>
      <li>
        <button class="fill">
          <i>help</i>
          <span>Справка</span>
        </button>
      </li>
    </menu>
  </div>
</template>

<style scoped>
  .nav-menu {
    position: fixed;
    top: 1rem;
    right: 1rem;
    opacity: 0.7;
    z-index: 9999;
  }
</style>
