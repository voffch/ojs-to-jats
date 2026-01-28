<script setup>
import { ref, computed } from 'vue';
import IssueListing from './IssueListing.vue';

const props = defineProps({
  gs: Object,
  required : true,
});

const loading = ref(false);
const payload = ref(null);
const error = ref(null);

async function loadIssueList(params={}, useQueryAuth=false) {
  loading.value = true;
  try {
    let endpoint = 'api/v1/issues';
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
    if (response.status !== 200) {
      throw new Error(`Fetch status code ${response.status}`);
    }
    const json = await response.json();
    if (json) {
      if (payload.value) {
        payload.value.items.push(...json.items);
      } else {
        payload.value = json;
      }
      error.value = null;
    }
  } catch(e) {
    error.value = e.message;
    console.log(e);
  } finally {
    loading.value = false;
  }
}

const count = 20;
let offset = 0;

function loadIssues() {
  loadIssueList({'offset' : offset});
  if (payload.value) {
    offset += count;
  }
}

const loadButtonText = computed(() => {
  if (loading.value) {
    return 'Loading...';
  } else {
    return payload.value ? `Load ${count} More Issues` : 'Load Issues';
  }
});

const loadButtonDisplayed = computed(() =>{
  return !(payload.value) || (payload.value.items.length < payload.value.itemsMax);
});
</script>

<template>
  <div class="issue-list-wrapper">
    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="payload" class="content">
      <p>Displaying {{ `${payload.items.length} / ${payload.itemsMax}` }} issues</p>
      <div v-for="issue in payload.items" :key="issue.id">
        <IssueListing :gs="gs" :issue="issue" />
      </div>
    </div>

    <button :class="{'load-more-after-smth' : (payload || error)}" v-if="loadButtonDisplayed" @click="loadIssues" :disabled="loading">{{ loadButtonText }}</button>
  </div>
</template>

<style scoped>
  .issue-list-wrapper {
    border: 1px solid gray;
    padding: 0.5rem;
  }
  .load-more-after-smth {
    margin-top: 0.5rem;
  }
</style>
