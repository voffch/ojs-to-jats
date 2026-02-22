<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import TextInput from './controls/TextInput.vue';
import HighlightedXML from './HighlightedXML.vue';
import generateCrossrefXML from './generateCrossrefXML';
import parseXML from './parseXML';

import markdownit from 'markdown-it';
const md = markdownit();
import HelpCrossref from './HelpCrossref.md?raw';
const renderedHelpCrossref = computed(() => {
  return md.render(HelpCrossref);
});

const xmlString = ref('');
const head = ref({
  timestamp: '',
  depositor_name: '',
  email_address: '',
  registrant: '',
  epublication_date: '',
  publication_date: ''
});
const helpOpen = ref(false);
const issn = ref(''); // for the filename generation
const xmlPreviewOpen = ref(false);
const xmlPreviewIsBeingGenerated = ref(false);
const xmlIsBeingGenerated = ref(false);
const jatsFiles = ref([]);

onMounted(() => {
  const stored = localStorage.getItem('jats-maker-crossref-settings');
  if (stored) {
    Object.assign(head.value, JSON.parse(stored));
  }
});

function storeCrossrefSettings() {
  const settings = {
    depositor_name: head.value.depositor_name,
    email_address: head.value.email_address,
    registrant: head.value.registrant,
  }
  localStorage.setItem('jats-maker-crossref-settings', JSON.stringify(settings));
}

watch(
  [head, jatsFiles],
  ([newHead, newJatsFiles], [oldHead, oldJatsFiles]) => {
    xmlString.value = '';
    xmlPreviewOpen.value = false;
    for (const prop of ['depositor_name', 'email_address', 'registrant']) {
      if (newHead[prop] !== oldHead['prop']) {
        storeCrossrefSettings();
        break;
      }
    }
}, { deep: true });

const opened = defineModel({
  type : Boolean,
  required : true,
  default : false
});

function close() {
  opened.value = false;
}

function getTimestamp(format) {
  let timestamp;
  const date = new Date();
  if (format === 'UNIX') {
    timestamp = Math.round(date.getTime() / 1000);
  } else {
    //YYYYMMDDHHMM or YYYYMMDDHHMMSS
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    const second = date.getSeconds().toString().padStart(2, '0');
    timestamp = `${year}${month}${day}${hour}${minute}`;
    if (format.includes('SS')) {
      timestamp += `${second}`;
    }
  }
  return timestamp;
}

function handleTimestamp(format) {
  head.value.timestamp = getTimestamp(format);
}

const jatsFilesHint = computed(() => {
  const numFiles = jatsFiles.value?.length;
  if (numFiles) {
    return `Загружено файлов: ${numFiles}`;
  } else {
    return 'JATS XML файлы не загружены';
  }
});

const handleSelectFiles = (e) => {
  jatsFiles.value = Array.from(e.target.files);
};

async function handleGenerateXML() {
  const promises = jatsFiles.value.map(async (file) => {
    try {
      const text = await file.text();
      return parseXML(text);
    } catch (error) {
      console.error(`Кривой XML ${file.name}:`, error);
      return null;
    }
  });
  xmlIsBeingGenerated.value = true;
  const metas = await Promise.all(promises);
  //console.log(metas);
  if (metas?.length) {
    const jmeta = metas[0]['journal'];
    issn.value = jmeta?.eissn || jmeta?.issn;
  }
  const xml = generateCrossrefXML(head.value, metas);
  xmlString.value = new XMLSerializer().serializeToString(xml);
  xmlIsBeingGenerated.value = false;
}

const canGenerateXML = computed(() => {
  return (
    head.value.timestamp && 
    head.value.depositor_name && 
    head.value.email_address && 
    head.value.registrant &&
    (head.value.epublication_date || head.value.publication_date) &&
    jatsFiles.value?.length
  );
});

const generateXMLButtonText = computed(() => {
  if (xmlIsBeingGenerated.value) {
    return 'Crossref XML генерируется...';
  } else if (!canGenerateXML.value) {
    return 'Введите обязательные значения, даты, и выберите JATS XML файлы';
  } else {
    return 'Сгенерировать Crossref XML';
  }
});

const handlePreviewXML = async () => {
  xmlPreviewIsBeingGenerated.value = true;
  // wait for the browser to paint the "disabled" state lifehack
  await new Promise(resolve => requestAnimationFrame(() => {
    requestAnimationFrame(resolve);
  }));
  xmlPreviewOpen.value = !xmlPreviewOpen.value;
};

const previewXMLButtonText = computed(() => {
  if (xmlPreviewIsBeingGenerated.value) {
    return `${xmlPreviewOpen.value ? 'Убираю' : 'Генерирую'} предпросмотр XML...`;
  } else {
    return `${xmlPreviewOpen.value ? 'Скрыть' : 'Показать'} Crossref XML`;
  }
});

async function handleDownloadXML() {
  const blob = new Blob([xmlString.value], { type: 'text/xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const filenamePrefix = issn.value || '';
  link.download = `Crossref_${filenamePrefix}_${head.value.timestamp}.xml`; // .replaceAll(/[<>:"\/\\\|\?\*]/g, '')
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
</script>

<template>
  <dialog class="max" :class="{ 'active' : opened }">
    <div class="modal-wrapper">
      <div class="content">
        <div class="nav-wrapper">
          <button @click="() => { helpOpen = !helpOpen }">
            <span>{{ helpOpen ? 'Скрыть' : 'Развернуть' }} пояснения</span>
            <i>{{ helpOpen ? 'remove' : 'add' }}</i>
          </button>
          <button @click="close">
            <i>close</i>
            <span>Закрыть</span>
          </button>
        </div>

        <article v-if="helpOpen" v-html="renderedHelpCrossref">
        </article>

        <div class="timestamp-wrapper">
          <TextInput caption="timestamp *" pattern="\d+" v-model="head.timestamp" />
          <button class="border small-round vertical small-elevate primary-border primary-text" @click="handleTimestamp('UNIX')">UNIX TIME</button>
          <button class="border small-round vertical small-elevate primary-border primary-text" @click="handleTimestamp('YYYYMMDDHHMM')">YYYYMMDDHHMM</button>
          <button class="border small-round vertical small-elevate primary-border primary-text" @click="handleTimestamp('YYYYMMDDHHMMSS')">YYYYMMDDHHMMSS</button>
        </div>
        <div class="two-inputs-wrapper">
          <TextInput caption="depositor_name *" v-model="head.depositor_name" />
          <TextInput caption="email_address *" pattern="[^\s]+@[^\s]+\.[^\s]+" v-model="head.email_address" />
        </div>
        <TextInput caption="registrant *" v-model="head.registrant" />
        <div class="two-inputs-wrapper">
          <TextInput 
            caption="Дата публикации выпуска (online)" 
            hint="YYYY-MM-DD, YYYY-MM или YYYY" 
            pattern="\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?" 
            v-model="head.epublication_date" />
          <TextInput 
            caption="Дата публикации выпуска (print)" 
            hint="YYYY-MM-DD, YYYY-MM или YYYY" 
            pattern="\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?" 
            v-model="head.publication_date" />
        </div>

        <div
          class="field label prefix suffix border extra top-margin">
          <i>attach_file</i>
          <input type="file" multiple accept="application/xml" @change="handleSelectFiles">
          <input type="text">
          <label>Выберите один или несколько JATS XML</label>
          <i>attach_file</i>
          <output>{{ jatsFilesHint }}</output>
        </div>

        <div class="buttons-wrapper">
          <template v-if="xmlString">
            <button class="border small-round vertical small-elevate primary-border primary-text" @click="handleDownloadXML">
              Скачать Crossref XML
            </button>
            <button class="border small-round vertical small-elevate primary-border primary-text" @click="handlePreviewXML" :disabled="xmlPreviewIsBeingGenerated">
              {{ previewXMLButtonText }}
            </button>
          </template>
          <template v-else>
            <button class="border small-round vertical small-elevate primary-border primary-text" @click="handleGenerateXML" :disabled="!canGenerateXML || xmlIsBeingGenerated">
              {{ generateXMLButtonText }}
            </button>
          </template>
        </div>

        <HighlightedXML v-if="xmlPreviewOpen" :xmlString="xmlString" validatorUrl="" @ready="() => {xmlPreviewIsBeingGenerated = false}" />

        <div class="top-margin">
          Валидатор Crossref: <a class="link underline" target="_blank" href="https://www.crossref.org/02publishers/parser.html">https://www.crossref.org/02publishers/parser.html</a>
        </div>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
  .content {
    max-width: 800px;
    min-width: 700px;
    margin: 0 auto;
  }

  .nav-wrapper {
    display: flex;
    justify-content: space-between;
  }

  .timestamp-wrapper, 
  .two-inputs-wrapper,
  .buttons-wrapper {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
    align-items: center;
  }

  .two-inputs-wrapper > * {
    margin-block-start: 0 !important;
    flex-grow: 1;
  }

  .timestamp-wrapper :first-child {
    flex-grow: 1;
  }
</style>