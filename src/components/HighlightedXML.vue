<script setup>
import xmlFormat from 'xml-formatter';
import Prism from "prismjs";
import "prismjs/themes/prism.css";
import 'prismjs/plugins/line-numbers/prism-line-numbers.css';
import { onMounted, computed, watch, nextTick } from "vue";

const props = defineProps({
  xmlString : {
    type : String,
    required : true,
    default : ''
  },
});

const xmlPretty = computed(() => {
  if (props.xmlString) {
		return xmlFormat(props.xmlString, { indentation: ' ' });
  } else {
    return null;
  }
});

onMounted(() => {
  window.Prism = window.Prism || {};
  window.Prism.manual = true;
  Prism.highlightAll();
});

watch(xmlPretty, () => {
  nextTick(() => {
    Prism.highlightAll();
  });
});
</script>

<template>
  <section class="xml-wrapper">
    <pre><code 
      class="language-xml" 
      data-prismjs-copy="Копировать"
      data-prismjs-copy-error="Ошибка копирования"
      data-prismjs-copy-success="Скопировано!">{{ xmlPretty }}</code></pre>
    <div class="links-wrapper">
      <a class="link underline" href="https://jats4r-validator.niso.org/" target="_blank">https://jats4r-validator.niso.org/</a>
    </div>
  </section>
</template>

<style scoped>
  pre, pre code {
    white-space: pre-wrap;
  }
  pre {
    max-height: 800px;
  }
  .links-wrapper {
    display: flex;
    justify-content: flex-end;
  }
</style>