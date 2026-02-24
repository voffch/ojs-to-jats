<script setup>
import { ref, computed, watch } from 'vue';
import HighlightedXML from './HighlightedXML.vue';
import generateDoajXML from './generateDoajXML';
import parseJatsXML from './parseJatsXML';
import getTimestamp from './timestamp.js';

const xmlString = ref('');
const helpOpen = ref(false);
const issn = ref(''); // for the filename generation
const xmlPreviewOpen = ref(false);
const xmlPreviewIsBeingGenerated = ref(false);
const xmlIsBeingGenerated = ref(false);
const jatsFiles = ref([]);

watch(jatsFiles, () => {
  xmlString.value = '';
  xmlPreviewOpen.value = false;
});

const opened = defineModel({
  type : Boolean,
  required : true,
  default : false
});

function close() {
  opened.value = false;
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
      return parseJatsXML(text);
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
  const xml = generateDoajXML(metas);
  xmlString.value = new XMLSerializer().serializeToString(xml);
  xmlIsBeingGenerated.value = false;
}

const canGenerateXML = computed(() => {
  return jatsFiles.value?.length;
});

const generateXMLButtonText = computed(() => {
  if (!canGenerateXML.value) {
    return 'Выберите JATS XML файлы';
  } else {
    return 'Сгенерировать DOAJ XML';
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
  return `${xmlPreviewOpen.value ? 'Скрыть' : 'Показать'} DOAJ XML`;
});

async function handleDownloadXML() {
  const blob = new Blob([xmlString.value], { type: 'text/xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const filenamePrefix = issn.value || '';
  const timestamp = getTimestamp('YYYYMMDDHHMMSS');
  link.download = `DOAJ_${filenamePrefix}_${timestamp}.xml`; // .replaceAll(/[<>:"\/\\\|\?\*]/g, '')
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
          <h5>DOAJ XML</h5>
          <button @click="close">
            <i>close</i>
            <span>Закрыть</span>
          </button>
        </div>

        <article v-if="helpOpen">
          <p>Для генерации DOAJ XML необходимо загрузить ранее созданные файлы JATS XML, а затем нажать кнопку <strong>Сгенерировать DOAJ XML</strong>. Получившийся файл можно просмотреть, скачать и загрузить в DOAJ.</p>
          <p>Для конвертации в DOAJ XML можно выбирать JATS XML, принадлежащие к разным выпускам журнала.</p>
          <p>В DOAJ XML экспортируются только англоязычные метаданные.</p>
        </article>

        <div
          class="field label prefix suffix border extra jats-file-selector">
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
              Скачать DOAJ XML
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
    align-items: center;
  }

  .nav-wrapper h5 {
    margin-block-start: 0 !important;
  }

  .jats-file-selector {
    margin-block-start: 2rem !important;
  }

  .buttons-wrapper {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
    align-items: center;
  }
</style>