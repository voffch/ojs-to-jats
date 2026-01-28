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
    <label for="base-url">Base URL журнала в OJS (должен заканчиваться на "/")</label>
    <input v-model.lazy.trim="model.baseUrl" @change="storeValues" id="base-url" type="text" pattern='https?:\/\/.+\/' />
    <div class="show-settings">
      <span>Параметры отображения:</span>
      <label :for="`article-show-ru`"><input type="checkbox" :id="`article-show-ru`" v-model="model.show.ru"  @change="storeValues" /> RUS</label>
      <label :for="`article-show-en`"><input type="checkbox" :id="`article-show-en`" v-model="model.show.en"  @change="storeValues" /> ENG</label>
      <label :for="`article-side-by-side`"><input type="checkbox" :id="`article-side-by-side`" v-model="model.show.sideBySide"  @change="storeValues" /> Горизонтально</label>
    </div>
  </section>
</template>

<style scoped>
  .global-settings-wrapper {
    display: flex;
    flex-direction: column;
    border: 1px solid gray;
    margin-bottom: 1rem;
    padding: 0.5rem;
  }
  .checkbox-wrapper {
    align-self: flex-end;
  }
  .checkbox-wrapper label {
    margin-right: 0.2rem;
  }
  input[type="text"] {
    width: 100%;
    border: 1px solid rgb(143, 143, 157);
  }
  input[type="text"]:invalid {
    border-left: 3px solid red;
  }
  input {
    margin-bottom: 0.5rem;
  }
  .show-settings {
    display: flex;
    gap: 1rem;
  }
</style>
