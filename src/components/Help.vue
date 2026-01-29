<script setup>
import { computed } from 'vue';
import markdownit from 'markdown-it';
const md = markdownit();
import HelpMarkdown from './Help.md?raw';

const renderedMarkdown = computed(() => {
  return md.render(HelpMarkdown);
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
    <div>
      <div class="content">
        <nav class="right-align">
          <button @click="close">
            <i>close</i>
            <span>Закрыть</span>
          </button>
        </nav>
        <div v-html="renderedMarkdown"></div>
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