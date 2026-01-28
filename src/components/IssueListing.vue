<script setup>
import { ref, computed } from 'vue';
import ArticleWrapper from './ArticleWrapper.vue';

const props = defineProps({
  gs: Object,
  issue: Object
});

const loading = ref(false);
const payload = ref(null);
const error = ref(null);

async function loadIssue(params={}, useQueryAuth=false) {
  loading.value = true;
  try {
    let endpoint = `api/v1/issues/${props.issue.id}`;
    if (params || useQueryAuth) {
      const urlSearchParams = new URLSearchParams(params);
      if (useQueryAuth) {
        urlSearchParams.append('apiToken', props.gs.ojsApiKey);
      }
      endpoint += '?' + urlSearchParams.toString();
    }
    const fullUrl = new URL(endpoint, props.gs.baseUrl).href;
    const response = await fetch(fullUrl, {
      method: "GET",
      credentials: 'omit',
      //withCredentials: true,
      //credentials: 'include',
      headers: {
        'Authorization' : `Bearer ${props.gs.ojsApiKey}`
      }
    });
    const json = await response.json();
    if (json) {
      payload.value = json;
    }
  } catch(e) {
    error.value = e.message;
    console.log(e);
  } finally {
    loading.value = false;
  }
}

const loadButtonText = computed(() => {
  if (loading.value) {
    return 'Loading...';
  } else {
    return payload.value ? 'Reload' : 'Load';
  }
});
</script>

<template>
  <div class="issue-data-wrapper">
    <div class="header">
      <a :href="issue.publishedUrl" target="_blank">{{ issue.identification }}</a>
      <a v-if="issue.galleys.length" :href="issue.galleys[0].urlPublished" target="_blank">galley</a>
      <span>{{ (issue.datePublished) ? (issue.datePublished.split(' ')[0]) : 'unpublished' }}</span>
      <button @click="loadIssue" :disabled="loading">{{ loadButtonText }}</button>
    </div>
    <div class="data" v-if="payload">
      <article class="article-data" v-for="article in payload.articles" :key="article.id">
        <ArticleWrapper :gs="gs" :issue="issue" :article="article" />
      </article>
    </div>
  </div>
</template>

<style scoped>
  .header {
    display: flex;
    justify-content: start;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem 0;
    border-bottom: 2px dotted lightgray;
  }
  .article-data {
    padding: 0.25rem;
    margin: 0.25rem 0;
    border: 1px dotted black;
  }
</style>
