<script setup>
import { ref, watch } from 'vue';
import SelectInput from './SelectInput.vue';
import TextInput from './TextInput.vue';

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

const licenses = {
  'https://creativecommons.org/licenses/by/3.0/'       : 'CC BY 3.0',
  'https://creativecommons.org/licenses/by/4.0/'       : 'CC BY 4.0',
  'https://creativecommons.org/licenses/by-nc/3.0/'    : 'CC BY-NC 3.0',
  'https://creativecommons.org/licenses/by-nc/4.0/'    : 'CC BY-NC 4.0',
  'https://creativecommons.org/licenses/by-nc-nd/3.0/' : 'CC BY-NC-ND 3.0',
  'https://creativecommons.org/licenses/by-nc-nd/4.0/' : 'CC BY-NC-ND 4.0',
  'https://creativecommons.org/licenses/by-nc-sa/3.0/' : 'CC BY-NC-SA 3.0',
  'https://creativecommons.org/licenses/by-nc-sa/4.0/' : 'CC BY-NC-SA 4.0',
  'https://creativecommons.org/licenses/by-nd/3.0/'    : 'CC BY-ND 3.0',
  'https://creativecommons.org/licenses/by-nd/4.0/'    : 'CC BY-ND 4.0',
  'https://creativecommons.org/licenses/by-sa/3.0/'    : 'CC BY-SA 3.0',
  'https://creativecommons.org/licenses/by-sa/4.0/'    : 'CC BY-SA 4.0',
  'Иное'                                               : 'Иное',
};

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
    :showOptions="showOptions"
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
  @import "./input-style.css";
</style>