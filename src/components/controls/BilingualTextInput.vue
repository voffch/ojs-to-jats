<script setup>
import { useId, computed, watch } from 'vue';

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
</script>

<template>
  <div class="input-group" :class="{ 'show-ru' : showOptions.ru, 'show-en' : showOptions.en, 'side-by-side' : showOptions.sideBySide }">
    <span class="input-group-caption">{{ caption }}</span>
    <div class="ru-wrapper">
      <label :for="`ru-${unique_key}`">РУС</label>
      <template v-if="textarea">
        <textarea :id="`ru-${unique_key}`" v-model.lazy.trim="model.ru"></textarea>
        <span class="lines-message">{{ linesMessageRu }}</span>
      </template>
      <input v-else type="text" :id="`ru-${unique_key}`" v-model.lazy.trim="model.ru" />
      <span v-if="hint" class="hint">{{ hint }}</span>
    </div>
    <div class="en-wrapper">
      <label :for="`en-${unique_key}`">ENG</label>
      <template v-if="textarea">
        <textarea :id="`en-${unique_key}`" v-model.lazy.trim="model.en"></textarea>
        <span class="lines-message">{{ linesMessageEn }}</span>
      </template>
      <input v-else type="text" :id="`en-${unique_key}`" v-model.lazy.trim="model.en" />
      <span v-if="hint" class="hint">{{ hint }}</span>
    </div>
  </div>
</template>

<style scoped>
  @import "./input-style.css";
  .lines-message {
    font-size: 0.9rem;
  }
</style>