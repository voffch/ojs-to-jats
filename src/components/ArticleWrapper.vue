<script setup>
import { ref, computed } from "vue";
import JournalData from "./JournalData.vue";
import ArticleData from "./ArticleData.vue";
import HighlightedXML from './HighlightedXML.vue';
import RecreatedText from "./RecreatedText.vue";
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

const xml = computed(() => {
  return generateXML(journalMeta.value, articleMeta.value);
});

const xmlString = computed(() => {
  if (xml.value) {
    return new XMLSerializer().serializeToString(xml.value);
  } else {
    return null;
  }
});

const xmlTabActive = ref(true);
</script>

<template>
  <JournalData v-model="journalMeta" />
  <ArticleData v-model="articleMeta" />
  <div class="xml-or-text-wrapper">
    <div class="tabs">
      <a :class="{ 'active' : xmlTabActive }" @click="() => {xmlTabActive = true}">
        <i>code_blocks</i>
        <span>JATS XML</span>
      </a>
      <a :class="{ 'active' : !xmlTabActive }" @click="() => {xmlTabActive = false}">
        <i>article</i>
        <span>Авторы и аффилиации</span>
      </a>
    </div>
    <div class="page padding" :class="{ 'active' : xmlTabActive }">
      <HighlightedXML :xmlString="xmlString" />
    </div>
    <div class="page padding" :class="{ 'active' : !xmlTabActive }">
      <RecreatedText :xml="xml" />
    </div>
  </div>
  <Metafora v-if="environment.extension" :xmlString="xmlString" :doi="articleMeta.doi" :pdfUrl="articleMeta.pdfUrl" />
</template>

<style scoped>
  .xml-or-text-wrapper {
    margin-top: 2rem;
  }
</style>
