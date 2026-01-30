<script setup>
import { onMounted, watchEffect } from 'vue';
import BilingualTextInput from './controls/BilingualTextInput.vue';
import TextInput from './controls/TextInput.vue';
import { genJournalMeta } from './metadataTemplates.js'
import { gs } from './store.js';

const meta = defineModel({
  type : Object,
  required : true,
  default : genJournalMeta()
});

onMounted(() => {
  const storedMeta = localStorage.getItem('jats-maker-journal');
  if (storedMeta) {
    Object.assign(meta.value, JSON.parse(storedMeta));
  }
});

watchEffect(() => {
  if (JSON.stringify(genJournalMeta()) !== JSON.stringify(meta.value)) {
    localStorage.setItem('jats-maker-journal', JSON.stringify(meta.value));
  }
});

const issnRegex = '\\d{4}-\\d{3}[\\dX]';
</script>

<template>
  <section class="journal-data-wrapper">
    <h3 class="small">Журнал</h3>
    <BilingualTextInput caption="Журнал" :showOptions="gs.show" v-model="meta.titles" />
    <TextInput caption="ISSN" hint="в формате 1234-5678" :pattern="issnRegex" :showOptions="gs.show" v-model="meta.issn" />
    <TextInput caption="eISSN" hint="в формате 1234-5678" :pattern="issnRegex" :showOptions="gs.show" v-model="meta.eissn" />
    <BilingualTextInput caption="Издатель" :showOptions="gs.show" v-model="meta.publishers" />
  </section>
</template>

<style scoped>

</style>
