<script setup>
import { onMounted } from 'vue';
import { gs } from './store.js';

onMounted(() => {
  const stored = localStorage.getItem('jats-maker-settings');
  if (stored) {
    Object.assign(gs, JSON.parse(stored));
  }
});

function store() {
  localStorage.setItem('jats-maker-settings', JSON.stringify(gs));
}
</script>

<template>
  <section class="global-settings-wrapper">
    <fieldset>
      <legend>Параметры отображения текстовых полей:</legend>
      <nav>
        <label class="checkbox" for="article-show-ru">
          <input type="checkbox" id="article-show-ru" v-model="gs.show.ru"  @change="store()" />
          <span>RUS</span>
        </label>
        <label class="checkbox" for="article-show-en">
          <input type="checkbox" id="article-show-en" v-model="gs.show.en"  @change="store()" />
          <span>ENG</span>
        </label>
        <label class="checkbox" for="article-side-by-side">
          <input type="checkbox" id="article-side-by-side" v-model="gs.show.sideBySide"  @change="store()" />
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
    margin-bottom: 1rem;
    min-width: 400px;
  }
  .global-settings-wrapper fieldset {
    margin-block-start: 0.5rem !important;
  }
</style>
