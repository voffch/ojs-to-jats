<script setup>
import { ref, watch } from 'vue';
import SelectInput from './SelectInput.vue';
import TextInput from './TextInput.vue';
import { licenses } from '../metadataTemplates';

const model = defineModel({
  type: String,
  required: true,
  default: ''
});

const props = defineProps({
  showOptions : {
    type : Object,
    default : {
      sideBySide : true
    }
  },
  pattern : {
    type : String,
    default : 'https?\:\/\/.+'
  }
});

const selectedLicense = ref(model.value);

watch(model, () => {
  if (model.value in licenses) {
    selectedLicense.value = model.value;
  } else {
    selectedLicense.value = 'Иное';
  }
}, {immediate : true});

function handleSelect(e) {
  const selectedLicense = e.target.value;
  if (selectedLicense !== 'Иное') {
    model.value = selectedLicense;
  }
};
</script>

<template>
  <SelectInput 
    caption="Тип лицензии"
    :options="licenses"
    v-model="selectedLicense"
    @change="handleSelect" />
  <TextInput 
    caption="Ссылка на лицензию" 
    :pattern="pattern"
    :showOptions="showOptions" 
    v-model="model" 
    :url="model" />
</template>

<style scoped>

</style>