<script setup>
import { useId, computed, watch, ref } from 'vue';

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

watch(model, () => {
  for (const lang in model.value) {
    model.value[lang] = model.value[lang].trim();
  }
  // dirty hack for dirty chromium
  if (textarea_ru.value) {
    textarea_ru.value.dispatchEvent(new Event('focus'));
  }
  if (textarea_en.value) {
    textarea_en.value.dispatchEvent(new Event('focus'));
  }
});

const unique_key = useId();

function countLines(text) {
  const lines = text.split(/\r?\n|\r/);
  const numLinesInTotal = lines.length;
  const numLinesNotEmpty = lines.map(x => x.trim()).reduce((len, line) => line.length > 0 ? len + 1 : len, 0);
  return `Не пустых строк: ${numLinesNotEmpty} (всего строк ${numLinesInTotal})`;
}

const linesMessageRu = computed(() => countLines(model.value.ru));
const linesMessageEn = computed(() => countLines(model.value.en));

const textarea_ru = ref(null);
const textarea_en = ref(null);

const handleDrop = (lang, e) => {
  // a hack to return the drop-into-textarea
  // functionality for textareas and inputs styled with beer.css
  setTimeout(() => {
    model.value[lang] = e.target.value;
  }, 0);
};
</script>

<template>
  <div class="input-group" :class="{ 'show-ru' : showOptions.ru, 'show-en' : showOptions.en, 'grid' : showOptions.sideBySide }">
    <div class="ru-wrapper field label small border" :class="{ 's6' : (showOptions.sideBySide && showOptions.en), 's12' : !showOptions.en }">
      <textarea v-if="textarea" :id="`ru-${unique_key}`" v-model.lazy.trim="model.ru" ref="textarea_ru" @drop="(e) => handleDrop('ru', e)"></textarea>
      <input v-else type="text" :id="`ru-${unique_key}`" v-model.lazy.trim="model.ru" @drop="(e) => handleDrop('ru', e)" />
      <label :for="`ru-${unique_key}`">{{ `${caption} (РУС)` }}</label>
      <output v-if="textarea" class="lines-message">{{ linesMessageRu }}</output>
      <output v-if="hint">{{ hint }}</output>
    </div>
    <div class="en-wrapper field label small border" :class="{ 's6' : (showOptions.sideBySide && showOptions.ru), 's12' : !showOptions.ru }">
      <textarea v-if="textarea" :id="`en-${unique_key}`" v-model.lazy.trim="model.en" ref="textarea_en" @drop="(e) => handleDrop('en', e)"></textarea>
      <input v-else type="text" :id="`en-${unique_key}`" v-model.lazy.trim="model.en" @drop="(e) => handleDrop('en', e)" />
      <label :for="`en-${unique_key}`">{{ `${caption} (ENG)` }}</label>
      <output v-if="textarea" class="lines-message">{{ linesMessageEn }}</output>
      <output v-if="hint">{{ hint }}</output>
    </div>
  </div>
</template>

<style scoped>
  .input-group:not(.show-ru) .ru-wrapper,
  .input-group:not(.show-en) .en-wrapper {
    display: none;
  }
  .input-group .field textarea {
    resize: vertical;
    min-height: 7em;
    block-size: 7em;
    max-block-size: 50em;
  }
  .field output {
    padding-top: 0;
    padding-bottom: 0;
  }
  .input-group {
    margin-block-start: 1rem;
  }
</style>