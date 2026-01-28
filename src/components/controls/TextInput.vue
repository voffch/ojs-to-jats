<script setup>
import { useId, watch } from 'vue';

const emit =  defineEmits(['change']);

const model = defineModel({
  type: [String, Number],
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

watch(model, () => {
  emit('change');
});

const unique_key = useId();
</script>

<template>
  <div class="field label small border">
    <textarea v-if="textarea" :id="unique_key" v-model.lazy.trim="model"></textarea>
    <input v-else type="text" :pattern="pattern" :id="unique_key" v-model.lazy.trim="model" />
    <label :for="unique_key">{{ caption }}</label>
    <output v-if="hint">{{ hint }}</output>
    <output v-if="url && model"><a class="link underline" target="_blank" :href="url">{{ url }}</a></output>
  </div>
</template>

<style scoped>
  .field textarea {
    resize: vertical;
    min-height: 7em;
    max-block-size: none;
  }
  .field output {
    padding-top: 0;
    padding-bottom: 0;
  }
</style>