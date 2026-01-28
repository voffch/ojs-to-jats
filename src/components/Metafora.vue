<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import Prism from "prismjs";
import "prismjs/themes/prism.css";
import 'prismjs/plugins/line-numbers/prism-line-numbers.css';

const genMetaforaStatus = () => {
  return {
    searched: false,
    file_uid: null,
    article_uid: null,
    signed_at: null
  };
}

const props = defineProps({
  xmlString : {
    type : String,
    required : true,
  },
  doi: {
    type : String,
    required : true
  }
});

onMounted(() => {
  const storedAccessParameterString = localStorage.getItem('jats-maker-metafora-api-key');
  if (storedAccessParameterString) {
    metaforaApiKey.value = storedAccessParameterString;
  }
});

function storeValues(e) {
  localStorage.setItem('jats-maker-metafora-api-key', metaforaApiKey.value);
}

const metaforaApiKey = ref('');
const metaforaApiKeyShown = ref(false);

const metaforaApiKeyType = computed(() => {
  return metaforaApiKeyShown.value ? 'text' : 'password';
});

const metaforaStatus = ref(genMetaforaStatus());

const loading = ref(false);
const responseText = ref('Здесь будет результат последнего запроса к ИС Метафора');
const responseExplained = ref('Здесь будет объяснение результата последнего запроса к ИС Метафора');
const responseStatusCode = ref(0);

function explainResponse(msg) {
  responseExplained.value = `${msg} (HTTP ${responseStatusCode.value}) [${props.doi}]`;
}

const metaforaHostPattern = 'https://metafora.rcsi.science/*';

async function requestMetaforaHostPermissions() {
  // because this in manifest.json
  // "host_permissions": [
  //   "https://metafora.rcsi.science/*"
  // ],
  // is not enabled by default in any case
  let granted = false;
  try {
    granted = await chrome.permissions.request({
      origins: [metaforaHostPattern]
    });
  } catch(e) {
    console.error(e.message);
    throw new Error(`Ошибка при запросе разрешения на доступ к ${metaforaHostPattern}`);
  }
  return granted;
}

async function queryAPI(httpMethod, urlObject, body=null) {
  loading.value = true;
  let json = null;
  try {
    const granted = await requestMetaforaHostPermissions();
    if (!granted) {
      throw new Error(`Вы не разрешили плагину доступ к ${metaforaHostPattern}`);
    }
    const params = {
      method: httpMethod,
      headers: {
        'Accept': 'application/json',
        'Api-Key': metaforaApiKey.value
      }
    };
    if (body) {
      params.body = body;
    }
    const response = await fetch(urlObject, params);
    responseStatusCode.value = response.status;
    const contentType = response.headers.get('Content-Type');
    if (contentType && contentType.includes('application/json')) {
      json = await response.json();
    } else {
      json = {
        HTTP: response.status,
        message: 'В ответе сервера нет полезной нагрузки'
      };
    }
    responseText.value = JSON.stringify(json, null, 2);
  } catch(e) {
    responseText.value = `${e.message}`;
    metaforaStatus.value = genMetaforaStatus();
  } finally {
    loading.value = false;
  }
  return json;
}

async function checkDoi() {
  const url = new URL(`https://metafora.rcsi.science/api/v2/publications/doi/${props.doi}`);
  url.searchParams.append('public', 'false');
  const payload = await queryAPI('GET', url);
  if (payload) {
    switch (responseStatusCode.value) {
      case 200:
        metaforaStatus.value = {
          searched: true,
          file_uid: payload.data.file_uid,
          article_uid: payload.data.article_uid,
          signed_at: payload.data.signed_at,
        };
        break;
      case 404:
        metaforaStatus.value = genMetaforaStatus();
        metaforaStatus.value.searched = true;
        break;
      default:
        metaforaStatus.value = genMetaforaStatus();
        break;
    }
  }
  const statuses = {
    200: 'Публикация успешно найдена',
    400: 'Ошибка запроса',
    401: 'Неавторизован',
    403: 'Нет доступа',
    404: 'Публикация не найдена',
    422: 'Ошибка валидации - кривой запрос'
  }
  explainResponse(`Результат поиска по DOI: ${statuses[responseStatusCode.value] || ''}`);
}

async function sign() {
  const url = new URL(`https://metafora.rcsi.science/api/v2/publications/${metaforaStatus.value.article_uid}/sign`);
  const payload = await queryAPI('PUT', url);
  if (payload) {
    switch (responseStatusCode.value) {
      case 200:
      case 409: // signed already
        metaforaStatus.value.signed_at = payload.data.signed_at;
        break;
      default:
        metaforaStatus.value = genMetaforaStatus();
        break;
    }
  }
  const statuses = {
    200: 'Публикация успешно подписана',
    400: 'Ошибка запроса',
    401: 'Неавторизован',
    403: 'Нет доступа',
    404: 'Публикация не найдена',
    409: 'Публикация уже подписана'
  }
  explainResponse(`Результат подписания: ${statuses[responseStatusCode.value] || ''}`);
}

async function unsign() {
  const url = new URL(`https://metafora.rcsi.science/api/v2/publications/${metaforaStatus.value.article_uid}/unsign`);
  const payload = await queryAPI('PUT', url);
  if (payload) {
    switch (responseStatusCode.value) {
      case 200:
      case 409: // unsigned already
        metaforaStatus.value.signed_at = null;
        break;
      default:
        metaforaStatus.value = genMetaforaStatus();
        break;
    }
  }
  const statuses = {
    200: 'Подпись успешно отозвана',
    400: 'Ошибка запроса',
    401: 'Неавторизован',
    403: 'Нет доступа',
    404: 'Публикация не найдена',
    409: 'Публикация не подписана'
  }
  explainResponse(`Результат отписания: ${statuses[responseStatusCode.value] || ''}`);
}

async function remove() {
  const url = new URL(`https://metafora.rcsi.science/api/v2/files/${metaforaStatus.value.file_uid}`);
  const payload = await queryAPI('DELETE', url);
  if (payload) {
    switch (responseStatusCode.value) {
      case 204: // deleted successfully
        metaforaStatus.value = genMetaforaStatus();
        metaforaStatus.value.searched = true;
        break;
      default: // cannot delete - misc errors
        break;
    }
  }
  const statuses = {
    204: 'Публикация успешно удалена',
    403: 'Нет доступа',
    404: 'Файл не найден',
    409: 'Нельзя удалить подписанную публикацию',
    422: 'Файл с публикацией не обработан или обработан с ошибкой'
  }
  explainResponse(`Результат удаления: ${statuses[responseStatusCode.value] || ''}`);
}

async function postXML() {
  const url = new URL(`https://metafora.rcsi.science/api/v2/files/jats/xml/`);
  const body = new FormData();
  const xmlBlob = new Blob([props.xmlString], { type: 'text/xml' });
  body.append('xml', xmlBlob, 'jats.xml');
  const payload = await queryAPI('POST', url, body);
  if (payload) {
    switch (responseStatusCode.value) {
      case 200:
        metaforaStatus.value.file_uid = payload.data.file_uid;
        break;
      default:
        break;
    }
  }
  const statuses = {
    200: 'Файл успешно загружен и принят к обработке',
    403: 'Нет доступа',
    404: 'Журналы не найдены для организации',
    409: 'Конфликт - файл уже существует или проблемы с правами',
    422: 'Ошибка валидации'
  }
  explainResponse(`Результат загрузки XML: ${statuses[responseStatusCode.value] || ''}`);
}

async function postXMLandPDF() {
  const url = new URL(`https://metafora.rcsi.science/api/v2/files/jats/xml_pdf/`);
  console.log('a');
}

const metaforaStatusExplained = computed(() => {
  const ms = metaforaStatus.value;
  let status = `Cтатус статьи ${props.doi} в Метафоре неизвестен (поиск не производился или завершен с ошибкой)`;
  if (ms.searched) {
    if (ms.file_uid) {
      if (ms.article_uid) {
        status = `Статья ${props.doi} найдена, ${ms.signed_at ? '' : 'не '}подписана`;
      } else {
        status = `Файл со статьей ${props.doi} загружен. Повторите поиск по DOI, чтобы уточнить статус.`;
      }
    } else {
      status = `Статья ${props.doi} не найдена`;
    }
  }
  return status;
});

const checkButtonText = computed(() => {
  if (!props.doi) {
    return 'Для поиска по DOI введите DOI';
  } else {
    return loading.value ? `Ищу  ${props.doi}...` : `Поиск по DOI ${props.doi}`;
  }
});

watch(props.doi, (newDoi, oldDoi) => {
  if (newDoi !== oldDoi) {
    metaforaStatus.value = genMetaforaStatus();
  }
});

watch(responseText, () => {
  nextTick(() => {
    Prism.highlightAll();
  });
});
</script>

<template>
  <section class="metafora-wrapper">
    <h2>Метафора</h2>
    <div class="api-settings-wrapper">
      <label for="metafora-api-key">Ключ Metafora API (брать <a href="https://metafora.rcsi.science/api-keys" target="_blank">здесь</a>)</label>
      <input v-model.lazy.trim="metaforaApiKey" @change="storeValues" id="metafora-api-key" :type="metaforaApiKeyType" />
      <div class="checkbox-wrapper">
        <label for="show-metafora-api-key">Показать ключ Metafora API</label>
        <input type="checkbox" id="show-metafora-api-key" v-model="metaforaApiKeyShown" />
      </div>
    </div>
    <template v-if="metaforaApiKey">
      <div>
        <button :disabled="loading || !doi" @click="checkDoi">{{ checkButtonText }}</button>
      </div>
      <div class="status-wrapper">{{ metaforaStatusExplained }}</div>
      <div v-if="metaforaStatus.searched">
        <button :disabled="loading || !metaforaStatus.article_uid || metaforaStatus.signed_at" @click="sign">Подписать</button>
        <button :disabled="loading || !metaforaStatus.article_uid || !metaforaStatus.signed_at" @click="unsign">Отписать</button>
        <button :disabled="loading || !metaforaStatus.file_uid || metaforaStatus.signed_at" @click="remove">Удалить</button>
        <button :disabled="loading || metaforaStatus.file_uid" @click="postXML">Загрузить только XML</button>
        <button :disabled="loading || metaforaStatus.file_uid" @click="postXMLandPDF">Загрузить XML и PDF</button>
      </div>
      <h3>Результат запроса к ИС Метафора</h3>
      <div class="status-wrapper">{{ responseExplained }}</div>
      <pre><code 
        class="language-json" 
        data-prismjs-copy="Копировать"
        data-prismjs-copy-error="Ошибка копирования"
        data-prismjs-copy-success="Скопировано!">{{ responseText }}</code></pre>
    </template>
    <div v-else>
      <p>Для работы с ИС Метафора введите ключ API</p>
    </div>
  </section>
</template>

<style scoped>
  .wrapper {
    margin-top: 2rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .api-settings-wrapper {
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
  pre {
    margin: 0;
  }
</style>