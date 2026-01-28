<script setup>
import { ref, computed, onMounted } from 'vue';
import genSettings from './settingsTemplate';

const model = defineModel({
  type: Object,
  required: true,
  default: genSettings()
});

onMounted(() => {
  const storedAccessParameterString = localStorage.getItem('jats-maker-settings');
  if (storedAccessParameterString) {
    Object.assign(model.value, JSON.parse(storedAccessParameterString));
  }
});

function storeValues(e) {
  localStorage.setItem('jats-maker-settings', JSON.stringify(model.value));
}
</script>

<template>
  <section class="global-settings-wrapper">
    <div class="field label border small">
      <input type="text" v-model.lazy.trim="model.baseUrl" @change="storeValues" id="base-url" pattern='https?:\/\/.+\/' />
      <label for="base-url">Base URL журнала в OJS (должен заканчиваться на "/")</label>
    </div>
    <fieldset>
      <legend>Параметры отображения текстовых полей:</legend>
      <nav>
        <label class="checkbox" :for="`article-show-ru`">
          <input type="checkbox" :id="`article-show-ru`" v-model="model.show.ru"  @change="storeValues" />
          <span>RUS</span>
        </label>
        <label class="checkbox" :for="`article-show-en`">
          <input type="checkbox" :id="`article-show-en`" v-model="model.show.en"  @change="storeValues" />
          <span>ENG</span>
        </label>
        <label class="checkbox" :for="`article-side-by-side`">
          <input type="checkbox" :id="`article-side-by-side`" v-model="model.show.sideBySide"  @change="storeValues" />
          <span>Горизонтально</span>
        </label>
      </nav>
    </fieldset>
  </section>
</template>

<style scoped>
  .global-settings-wrapper {
    display: flex;
    flex-direction: column;
    border: 1px solid gray;
    margin-bottom: 1rem;
    padding: 1rem 0.5rem;
  }
  .global-settings-wrapper fieldset {
    margin-block-start: 0.5rem !important;
  }
</style>
