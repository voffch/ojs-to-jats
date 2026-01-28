<script setup>
import { ref, watch, computed } from 'vue';
const props = defineProps({
  url : {
    type : String,
    default : ''
  }
});

const error = ref(false);
const errorMsg = 'Ошибка предпросмотра PDF-файла: некорректный или пустой URL';

watch(() => props.url, (newValue) => {
  if (newValue) {
    error.value = false;
  }
})

function handleError() {
  error.value = true;
}
</script>

<template>
  <div class="pdf-preview-wrapper">
    <span v-if="error">{{ errorMsg }}</span>
    <object v-else type="application/pdf" width="100%" height="300px" :data="url" @error="handleError">
      <p>{{ errorMsg }}</p>
    </object>
  </div>
</template>

<style scoped>
  .pdf-preview-wrapper {
    resize : vertical;
    overflow : auto;
    scrollbar-width: none;
  }
  .pdf-preview-wrapper object {
    height: 100%;
    min-height: 300px;
  }
</style>