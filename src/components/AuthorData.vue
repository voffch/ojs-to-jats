<script setup>
import { computed, watchEffect } from 'vue';
import BilingualTextInput from './controls/BilingualTextInput.vue';
import TextInput from './controls/TextInput.vue';
import { genAuthorMeta } from './metadataTemplates';

const author = defineModel({
  type : Object,
  required : true,
  default : genAuthorMeta()
});

const props = defineProps({
  gs: Object,
  required : true,
});

watchEffect(() => {
  const orcidRegexp = /(\d{4}-){3}\d{3}[0-9X]{1}/g;
  const match = author.value.orcid.match(orcidRegexp);
  if (match) {
    author.value.orcid = `https://orcid.org/${match[0]}`;
  }
});

const orcidUrl = computed(() => {
  return author.value.orcid.includes('https://orcid.org/') ? author.value.orcid : '';
})
</script>

<template>
  <BilingualTextInput caption="Фамилия *" :showOptions="gs.show" v-model="author.surnames" />
  <BilingualTextInput caption="Имя Отчество *" :showOptions="gs.show" v-model="author.givennames" />
  <TextInput caption="email" :showOptions="gs.show" v-model="author.email" pattern="[^\s]+@[^\s]+\.[^\s]+" />
  <TextInput caption="ORCID" hint="гиперссылка или номер" :showOptions="gs.show" v-model="author.orcid" :url="orcidUrl" pattern="https://orcid.org/(\d{4}-){3}\d{3}[0-9X]{1}" />
  <BilingualTextInput 
    caption="Аффилиации" 
    hint="перечислены через точку с запятой"
    :showOptions="gs.show" 
    v-model="author.affiliations" />
</template>

<style scoped>

</style>
