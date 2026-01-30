<script setup>
import { computed } from 'vue';
import { environment } from './store.js';
import markdownit from 'markdown-it';
const md = markdownit();
import HelpFetcher from './HelpFetcher.md?raw';
import HelpWebpage from './HelpWebpage.md?raw';
import HelpMetafora from './HelpMetafora.md?raw';

const appVersion = __APP_VERSION__;

const renderedHelpFetcher = computed(() => {
  return md.render(HelpFetcher);
});

const renderedHelpWebpage = computed(() => {
  return md.render(HelpWebpage);
});

const renderedHelpMetafora = computed(() => {
  return md.render(HelpMetafora);
});

const opened = defineModel({
  type : Boolean,
  required : true,
  default : false
});

function close() {
  opened.value = false;
}
</script>

<template>
  <dialog class="max" :class="{ 'active' : opened }">
    <div class="modal-wrapper">
      <div class="content">
        <nav class="right-align">
          <button @click="close">
            <i>close</i>
            <span>Закрыть</span>
          </button>
        </nav>
        <div v-if="environment.extension" v-html="renderedHelpFetcher"></div>
        <div v-else>Вы используете это приложение в режиме веб-страницы. Расширенные возможности (загрузка информации из OJS и отправка в ИС Метафора по API) доступны только в режиме расширения браузера.</div>
        <div v-html="renderedHelpWebpage"></div>
        <div v-if="environment.extension" v-html="renderedHelpMetafora"></div>
        <div>Версия приложения ({{ environment.extension ? 'расширение браузера' : 'веб-страница' }}): {{ appVersion }}</div>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
  .content {
    max-width: 800px;
    margin: 0 auto;
  }
</style>