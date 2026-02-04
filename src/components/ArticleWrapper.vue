<script setup>
import { ref } from "vue";
import JournalData from "./JournalData.vue";
import ArticleData from "./ArticleData.vue";
import HighlightedXML from './HighlightedXML.vue';
import RecreatedText from "./RecreatedText.vue";
import Metafora from './Metafora.vue';
import { genJournalMeta, genArticleMeta } from "./metadataTemplates";
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

const props = defineProps({
  xml: {
    type: Object,
    required: true
  },
  xmlString: {
    type: String,
    required: true
  }
});

const xmlTabActive = ref(false);
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
        <span>Метаданные</span>
      </a>
    </div>
    <div v-if="xmlTabActive" class="page padding" :class="{ 'active' : xmlTabActive }">
      <HighlightedXML :xmlString="xmlString" />
    </div>
    <div v-else class="page padding" :class="{ 'active' : !xmlTabActive }">
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
