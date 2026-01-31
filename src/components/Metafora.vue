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
  },
  pdfUrl: {
    type : String,
    required : true,
    default : ''
  }
});

onMounted(() => {
  const stored = localStorage.getItem('jats-maker-metafora-api-key');
  if (stored) {
    metaforaApiKey.value = stored;
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

// because this in manifest.json
// "host_permissions": [
//   "https://metafora.rcsi.science/*"
// ],
// is not enabled by default in any case
const metaforaHostPattern = 'https://metafora.rcsi.science/*';

async function requestHostPermissions(href=null) {
  let granted = false;
  try {
    const originArray = [metaforaHostPattern];
    if (href) {
      const url = new URL(href);
      const matchPattern = `${url.protocol}//${url.hostname}/*`;
      originArray.push(matchPattern);
    }
    granted = await chrome.permissions.request({
      origins: originArray
    });
  } catch(e) {
    console.error(e.message);
    throw new Error(`Ошибка при запросе разрешения на доступ к ${href}`);
  }
  return granted;
}

async function queryAPI(httpMethod, urlObject, body=null, takeForGranted=false) {
  loading.value = true;
  let json = null;
  try {
    const granted = takeForGranted || await requestHostPermissions();
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
    responseStatusCode.value = 0;
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
    explainResponse(e.message);
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
  loading.value = true;
  let pdfBlob = null;
  try {
    if (!props.pdfUrl) {
      throw new Error('Нет ссылки на PDF статьи');
    }
    const granted = await requestHostPermissions(props.pdfUrl);
    if (!granted) {
      throw new Error(`Вы не разрешили плагину доступ к ${metaforaHostPattern} или ${props.pdfUrl}`);
    }
    const response = await fetch(props.pdfUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/pdf'
      }
    });
    responseStatusCode.value = response.status;
    if (!response.ok) {
        throw new Error(`Ошибка ${response.status} при загрузке PDF`);
    }
    pdfBlob = await response.blob();
    pdfBlob = new Blob([pdfBlob], { type: 'application/pdf' });
    const url = new URL(`https://metafora.rcsi.science/api/v2/files/jats/xml_pdf/`);
    const body = new FormData();
    const xmlBlob = new Blob([props.xmlString], { type: 'text/xml' });
    body.append('xml', xmlBlob, 'jats.xml');
    body.append('pdf', pdfBlob, 'file.pdf');
    const payload = await queryAPI('POST', url, body, true);
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
      400: 'Ошибка загрузки или базы данных',
      403: 'Нет доступа',
      404: 'Журналы не найдены для организации',
      409: 'Конфликт - файл уже существует или проблемы с правами',
      422: 'Ошибка валидации'
    }
    explainResponse(`Результат загрузки XML и PDF: ${statuses[responseStatusCode.value] || ''}`);
  } catch (e) {
    explainResponse(`Результат загрузки XML и PDF: произошла ошибка`);
    responseText.value = `${e.message}`;
  } finally {
    loading.value = false;
  }
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

const doiLookupButtonText = computed(() => {
  if (!props.doi) {
    return 'Для поиска по DOI введите DOI';
  } else {
    return loading.value ? `Ищу  ${props.doi}...` : `Поиск по DOI ${props.doi}`;
  }
});

watch(() => props.doi, (newDoi, oldDoi) => {
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
    <h2 class="small">Метафора</h2>
    <div class="api-settings-wrapper">
      <div class="field label border small">
        <input :type="metaforaApiKeyType" v-model.lazy.trim="metaforaApiKey" @change="storeValues" id="metafora-api-key" />
        <label for="metafora-api-key">Ключ Metafora API</label>
        <output>брать здесь: <a class="link underline" href="https://metafora.rcsi.science/api-keys" target="_blank">https://metafora.rcsi.science/api-keys</a></output>
      </div>
      <div class="checkbox-wrapper">
        <label class="checkbox" for="show-metafora-api-key">
          <input type="checkbox" id="show-metafora-api-key" v-model="metaforaApiKeyShown" />
          <span>Показать ключ Metafora API</span>
        </label>
      </div>
    </div>
    <template v-if="metaforaApiKey">
      <button class="border small-round small-elevate small primary-border primary-text" :disabled="loading || !doi" @click="checkDoi">
        <i>search</i>
        <span>{{ doiLookupButtonText }}</span>
      </button>
      <div class="status-wrapper">{{ metaforaStatusExplained }}</div>
      <div v-if="metaforaStatus.searched" class="metafora-buttons-wrapper">
        <button class="border small-round small-elevate small primary-border primary-text" 
                :disabled="loading || !metaforaStatus.article_uid || metaforaStatus.signed_at"
                @click="sign">
          <i>edit</i>
          <span>Подписать</span>
        </button>
        <button class="border small-round small-elevate small primary-border primary-text" 
                :disabled="loading || !metaforaStatus.article_uid || !metaforaStatus.signed_at"
                @click="unsign">
          <i>edit_off</i>
          <span>Отписать</span>
        </button>
        <button class="border small-round small-elevate small primary-border primary-text" 
                :disabled="loading || !metaforaStatus.file_uid || metaforaStatus.signed_at"
                @click="remove">
          <i>delete</i>
          <span>Удалить</span>
        </button>
        <button class="border small-round small-elevate small primary-border primary-text" 
                :disabled="loading || metaforaStatus.file_uid"
                @click="postXML">
          <i>file_copy</i>
          <span>Загрузить только XML</span>
        </button>
        <button class="border small-round small-elevate small primary-border primary-text" 
                :disabled="loading || metaforaStatus.file_uid || !pdfUrl"
                @click="postXMLandPDF">
          <i>picture_as_pdf</i>
          <span>Загрузить XML и PDF</span>
        </button>
      </div>
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
  .api-settings-wrapper {
    display: flex;
    flex-direction: column;
    border: 1px solid gray;
    margin: 1rem 0;
    padding: 1rem 0.5rem;
  }
  .checkbox-wrapper {
    display: flex;
    align-items: center;
    margin-top: 0.5rem;
  }
  .field output {
    padding-top: 0;
    padding-bottom: 0;
  }
  pre {
    margin: 0;
  }
  .status-wrapper {
    margin: 1rem 0;
    padding: 0.5rem;
    border: 1px dotted black;
  }
  .metafora-buttons-wrapper {
    display: flex;
    gap: 0.25rem;
    flex-wrap: wrap;
  }
</style>