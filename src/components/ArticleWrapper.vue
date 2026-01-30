<script setup>
import { computed } from "vue";
import JournalData from "./JournalData.vue";
import ArticleData from "./ArticleData.vue";
import HighlightedXML from './HighlightedXML.vue';
import Metafora from './Metafora.vue';
import { genJournalMeta, genArticleMeta } from "./metadataTemplates";
import generateXML from "./generateXML.js";
import { environment } from "./store.js";

const journalMeta = defineModel('journalMeta', {
  type : Object,
  required : true,
  default : genJournalMeta()
});

const articleMeta = defineModel('articleMeta', {
  type : Object,
  required : true,
  default : genArticleMeta()
});

const xmlString = computed(() => {
  const xml = generateXML(journalMeta.value, articleMeta.value);
  if (xml) {
    return new XMLSerializer().serializeToString(xml);
  } else {
    return null;
  }
});
</script>

<template>
  <JournalData v-model="journalMeta" />
  <ArticleData v-model="articleMeta" />
  <HighlightedXML :xmlString="xmlString" />
  <Metafora v-if="environment.extension" :xmlString="xmlString" :doi="articleMeta.doi" :pdfUrl="articleMeta.pdfUrl" />
</template>

<style scoped>

</style>
