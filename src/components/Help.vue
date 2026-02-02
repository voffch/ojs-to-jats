<script setup>
import { computed } from 'vue';
import { environment } from './store.js';
import markdownit from 'markdown-it';
const md = markdownit();
import HelpFetcher from './HelpFetcher.md?raw';
import HelpWebpage from './HelpWebpage.md?raw';
import HelpForm from './HelpForm.md?raw';
import HelpMetafora from './HelpMetafora.md?raw';

const appVersion = __APP_VERSION__;

const renderedHelpFetcher = computed(() => {
  return md.render(HelpFetcher);
});

const renderedHelpForm = computed(() => {
  return md.render(HelpForm);
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
        <div v-if="!environment.extension" v-html="renderedHelpFetcher"></div>
        <div v-else v-html="renderedHelpWebpage"></div>
        <div v-html="renderedHelpForm"></div>
        <div v-if="!environment.extension" v-html="renderedHelpMetafora"></div>
        <div class="tertiary-text">Версия приложения ({{ !environment.extension ? 'расширение браузера' : 'веб-страница' }}): {{ appVersion }}</div>
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

<style>
  .modal-wrapper .content img {
    width: auto;
    max-width: 100%;
  }
  .modal-wrapper .content a {
    text-decoration: underline;
    color: var(--primary);
  }
</style>