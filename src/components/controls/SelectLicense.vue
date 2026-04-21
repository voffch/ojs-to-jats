<script setup>
import { ref, watch } from 'vue';
import SelectInput from './SelectInput.vue';
import TextInput from './TextInput.vue';
import { ccLicenses, otherLicenses } from '../metadataTemplates';

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
  if (model.value in ccLicenses) {
    selectedLicense.value = model.value;
  } else if (model.value) {
    selectedLicense.value = 'Другая открытая лицензия';
  } else {
    selectedLicense.value = 'Закрытая лицензия';
  }
}, {immediate : true});

function handleSelect(e) {
  const selectedLicense = e.target.value;
  if (selectedLicense in ccLicenses) {
    model.value = selectedLicense;
  } else if (selectedLicense === 'Закрытая лицензия') {
    model.value = '';
  }
};
</script>

<template>
  <SelectInput 
    caption="Тип лицензии"
    :options="{ ...ccLicenses, ...otherLicenses }"
    v-model="selectedLicense"
    @change="handleSelect" />
  <TextInput 
    v-if="selectedLicense != 'Закрытая лицензия'"
    caption="Ссылка на лицензию" 
    :pattern="pattern"
    :showOptions="showOptions" 
    v-model="model" 
    :url="model" />
</template>

<style scoped>

</style>