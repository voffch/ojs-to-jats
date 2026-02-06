<script setup>
import { computed, watchEffect } from 'vue';
import BilingualTextInput from './controls/BilingualTextInput.vue';
import TextInput from './controls/TextInput.vue';
import CheckboxAffiliations from './controls/CheckboxAffiliations.vue';
import { genAuthorMeta, affiliateAuthorVal, deaffiliateAuthorVal } from './metadataTemplates';
import { gs } from './store.js';

const author = defineModel({
  type : Object,
  required : true,
  default : genAuthorMeta()
});

const props = defineProps({
  affiliations : {
    type : Array,
    required : true
  }
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
});

function handleAffiliationChange(affId, checked) {
  if (checked) {
    affiliateAuthorVal(author.value, affId);
  } else {
    deaffiliateAuthorVal(author.value, affId);
  }
}
</script>

<template>
  <BilingualTextInput caption="Фамилия *" :showOptions="gs.show" v-model="author.surnames" />
  <BilingualTextInput caption="Имя Отчество *" :showOptions="gs.show" v-model="author.givennames" />
  <TextInput caption="email" :showOptions="gs.show" v-model="author.email" pattern="[^\s]+@[^\s]+\.[^\s]+" />
  <TextInput caption="ORCID" hint="гиперссылка или номер" :showOptions="gs.show" v-model="author.orcid" :url="orcidUrl" pattern="https://orcid.org/(\d{4}-){3}\d{3}[0-9X]{1}" />
  <h6 class="small" v-if="!affiliations.length">Аффилиации не добавлены</h6>
  <ul class="list border affiliations tiny-line">
    <li v-for="(aff, index) in affiliations">
      <CheckboxAffiliations 
        :showOptions="gs.show"
        :number="index + 1"
        :captions="aff.val" 
        :checked="author.affIds.includes(aff.id)"
        @change="(checked) => handleAffiliationChange(aff.id, checked)" />
    </li>
  </ul>
</template>

<style scoped>
  .affiliations {
    margin-block-start: 0 !important;
  }
  .affiliations > li {
    cursor: unset;
  }
</style>
