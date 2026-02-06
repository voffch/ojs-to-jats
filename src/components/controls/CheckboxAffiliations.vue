<script setup>
import { useId } from 'vue';

const emit = defineEmits(['change']);

const props = defineProps({
  showOptions : {
    type : Object,
    default : {
      ru : true,
      en : true,
      sideBySide : true
    }
  },
  checked : {
    type: Boolean,
    required: true,
    default: false
  },
  number : {
    type: Number,
    required: true,
    default: 1
  },
  captions : {
    type : Object,
    required : true,
    default : {
      en: '',
      ru: ''
    }
  },
});

function handleChange(e) {
  emit('change', e.target.checked);
}

const unique_key = useId();
</script>

<template>
  <label class="checkbox" :for="unique_key">
    <input type="checkbox" :id="unique_key" :checked="checked" @change="handleChange">
    <span>{{ number }}</span>
  </label>
  <div class="caption-wrapper">
    <div v-if="showOptions.ru" class="caption ru">{{ captions.ru }}</div>
    <div v-if="showOptions.en" class="caption en">{{ captions.en }}</div>
  </div>
</template>

<style scoped>
  .caption-wrapper {
    flex-grow: 1;
    display: flex;
    gap: 1rem;
  }
  .caption {
    white-space: normal;
    flex: 1 1 0;
  }
</style>