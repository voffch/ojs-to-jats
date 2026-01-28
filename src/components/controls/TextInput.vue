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
  //model.value = model.value.trim();
  emit('change');
});

const unique_key = useId();
</script>

<template>
  <div class="input-group" :class="{ 'side-by-side' : showOptions.sideBySide }">
    <label class="input-group-caption" :for="unique_key">{{ caption }}</label>
    <div>
      <textarea v-if="textarea" :id="unique_key" v-model.lazy.trim="model"></textarea>
      <input v-else type="text" :pattern="pattern" :id="unique_key" v-model.lazy.trim="model" />
      <a v-if="url && model" class="text-input-goto-link" target="_blank" :href="url">{{ url }}</a>
      <span v-if="hint" class="hint">{{ hint }}</span>
    </div>
  </div>
</template>

<style scoped>
  @import "./input-style.css";
</style>