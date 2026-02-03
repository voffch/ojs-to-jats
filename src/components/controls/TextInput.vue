<script setup>
import { useId, computed, nextTick, ref } from 'vue';

const model = defineModel({
  type: [String, Number],
  required: true,
  default: '',
  get: (val) => {
    if (textareaRef.value) {
      textareaRef.value.dispatchEvent(new Event('focus'));
    }
    return process(val);
  },
  set: (val) => process(val)
});

const props = defineProps({
  showOptions : {
    type : Object,
    default : {
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
  pattern : {
    type : String,
    default : null
  },
  textarea : {
    type : Boolean,
    default : false
  },
  url : {
    type : String,
    default : ''
  }
});

const textareaRef = ref(null);

const process = (val) => {
  if (val === null || val === undefined) return '';
  let result = String(val).trim();
  if (!props.textarea) {
    result = result.replace(/\r?\n|\r/g, ' ');
  }
  return result;
};

const handleChange = (e) => {
  model.value = e.target.value;
  nextTick(() => {
    e.target.value = model.value;
  });
};

const handleDrop = (e) => {
  // a hack to return the drop-into-textarea
  // functionality for textareas and inputs styled with beer.css
  setTimeout(() => {
    handleChange(e);
  }, 0);
};

function countLines(text) {
  const lines = text.split(/\r?\n|\r/);
  const numLinesInTotal = lines.length;
  const numLinesNotEmpty = lines.map(x => x.trim()).reduce((len, line) => line.length > 0 ? len + 1 : len, 0);
  return `Не пустых строк: ${numLinesNotEmpty} (всего строк ${numLinesInTotal})`;
}

const linesMessage = computed(() => countLines(model.value));

const unique_key = useId();
</script>

<template>
  <div class="field label small border">
    <textarea v-if="textarea" :id="unique_key" ref="textareaRef" :value="model" @change="handleChange" @drop="handleDrop"></textarea>
    <input v-else type="text" :pattern="pattern" :id="unique_key" :value="model" @change="handleChange" @drop="handleDrop" />
    <label :for="unique_key">{{ caption }}</label>
    <output v-if="textarea" class="lines-message">{{ linesMessage }}</output>
    <output v-if="hint">{{ hint }}</output>
    <output v-if="url && model"><a class="link underline" target="_blank" :href="url">{{ url }}</a></output>
  </div>
</template>

<style scoped>
  .field textarea {
    resize: vertical;
    min-height: 7em;
    block-size: 7em;
    max-block-size: 50em;
  }
  .field output {
    padding-top: 0;
    padding-bottom: 0;
  }
</style>