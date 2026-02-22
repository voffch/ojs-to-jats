<script setup>
import xmlFormat from 'xml-formatter';
import Prism from "prismjs";
import "prismjs/themes/prism.css";
import 'prismjs/plugins/line-numbers/prism-line-numbers.css';
import { onMounted, onUnmounted, computed, watch, nextTick } from "vue";

const emit = defineEmits(['ready']);

const props = defineProps({
  xmlString : {
    type : String,
    required : true,
    default : ''
  },
  validatorUrl : {
    type : String,
    required : false,
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
  // can take a long time for large xmls
  window.Prism = window.Prism || {};
  window.Prism.manual = true;
  Prism.highlightAll();
  emit('ready'); // for tracking whether it's mounted already
});

onUnmounted(() => {
  // can take a long time as well; here I don't differentiate emits
  // for checking whether the mounting/unmounting has been completed
  emit('ready');
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
    <div v-if="validatorUrl" class="link-wrapper">
      <a class="link underline" :href="validatorUrl" target="_blank">{{ validatorUrl }}</a>
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
  .link-wrapper {
    display: flex;
    justify-content: flex-end;
  }
</style>