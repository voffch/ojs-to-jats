<script setup>
import TextInput from './TextInput.vue';

const model = defineModel({
  type: Object,
  required: true,
  default: {
    en : '',
    ru : ''
  }
});

const props = defineProps({
  showOptions : {
    type : Object,
    default : {
      ru : true,
      en : true,
      sideBySide : true
    }
  },
  caption : {
    type : String,
    required : true
  },
  hint : {
    type : String,
    default : ''
  },
  textarea : {
    type : Boolean,
    default : false
  }
});
</script>

<template>
  <div class="input-group" :class="{ 'show-ru' : showOptions.ru, 'show-en' : showOptions.en, 'grid' : showOptions.sideBySide }">
    <div class="ru-wrapper" :class="{ 's6' : (showOptions.sideBySide && showOptions.en), 's12' : !showOptions.en }">
      <TextInput :textarea="textarea" :caption="`${caption} (РУС)`" :hint="hint" v-model="model.ru" />
    </div>
    <div class="en-wrapper field label small border" :class="{ 's6' : (showOptions.sideBySide && showOptions.ru), 's12' : !showOptions.ru }">
      <TextInput :textarea="textarea" :caption="`${caption} (ENG)`" :hint="hint" v-model="model.en" />
    </div>
  </div>
</template>

<style scoped>
  .input-group:not(.show-ru) .ru-wrapper,
  .input-group:not(.show-en) .en-wrapper {
    display: none;
  }
  .input-group {
    margin-block-start: 1rem;
  }
</style>