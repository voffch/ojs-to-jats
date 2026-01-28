<script setup>
import { ref } from 'vue';
import BilingualTextInput from './controls/BilingualTextInput.vue';
import TextInput from './controls/TextInput.vue';
import SelectInput from './controls/SelectInput.vue';
import SelectLicense from './controls/SelectLicense.vue';
import CheckboxInput from './controls/CheckboxInput.vue';
import { genAuthorMeta, genArticleMeta } from './metadataTemplates';
import AuthorData from './AuthorData.vue';
import PdfPreview from './controls/PdfPreview.vue';

const props = defineProps({
  gs: Object,
  required : true,
});

const meta = defineModel({
  type : Object,
  required : true,
  default : genArticleMeta()
});

const addAuthor = (index) => {
  meta.value.authors.splice(index + 1, 0, genAuthorMeta());
};

const deleteAuthor = (index) => {
  meta.value.authors.splice(index, 1);
};

function removeHtmlFromText(html) {
  let tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  return tempDiv.textContent;
}

function cleanHtmlTags() {
  for (const obj of [meta.value.titles, meta.value.abstracts]) {
    Object.keys(obj).forEach(key => {
      obj[key] = removeHtmlFromText(obj[key]);
    });
  }
}

function changeKeywordSeparators() {
  for (const lang in meta.value.keywords) {
    meta.value.keywords[lang] = meta.value.keywords[lang].replaceAll(',', ';');
  }
}

function generateCopyrightHolders() {
  for (const lang in meta.value.copyrightHolders) {
    const fullnames = meta.value.authors.map(a => {
      return `${a.givennames[lang]} ${a.surnames[lang]}`.trim();
    }).filter(Boolean);
    meta.value.copyrightHolders[lang] = fullnames.join(', ').trim();
  }
}

function correctDates() {
  function tryCorrectingDate(date) {
    if (date.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
      return date.split('.').reverse().join('-');
    } else {
      return date;
    }
  }
  meta.value.dateSubmitted = tryCorrectingDate(meta.value.dateSubmitted);
  meta.value.dateAccepted = tryCorrectingDate(meta.value.dateAccepted);
  meta.value.datePublished = tryCorrectingDate(meta.value.datePublished);
}

const urlRegexp = 'https?\:\/\/.+';
const dateRegexp = '\\d{4}-[01]\\d-[0-3]\\d';
</script>

<template>
  <section class="article-data-wrapper">

    <h3 class="small">Статья</h3>
    <SelectInput 
      caption="Тип публикации *"
      :options="{
        'research-article' : 'Научная статья',
        'review-article'   : 'Обзорная статья',
        'editorial'        : 'От редакции',
        'brief-report'     : 'Краткое сообщение',
        'correction'       : 'Сообщение о коррекции',
        'retraction'       : 'Сообщение о ретракции',
      }"
      :showOptions="gs.show"
      v-model="meta.articleType" />
    <TextInput 
      caption="DOI" 
      hint="в поле вводится не гиперссылка, а просто номер DOI"
      pattern="10\.\d{4,9}\/[\-\._;\(\)\/\:a-zA-Z0-9]+" 
      :showOptions="gs.show" 
      v-model="meta.doi" 
      :url="`https://doi.org/${meta.doi}`" />
    <TextInput caption="EDN" hint="6 заглавных латинских букв" pattern="[A-Z]{6}" :showOptions="gs.show" v-model="meta.edn" />
    <TextInput 
      caption="URL страницы публикации на сайте журнала"
      :pattern="urlRegexp"
      :showOptions="gs.show" 
      v-model="meta.pageUrl"
      :url="meta.pageUrl" />
    <TextInput 
      caption="URL PDF статьи"
      hint="ссылка на скачивание PDF-файла"
      :pattern="urlRegexp"
      :showOptions="gs.show" 
      v-model="meta.pdfUrl"
      :url="meta.pdfUrl" />
    <PdfPreview v-if="meta.pdfUrl" :url="meta.pdfUrl" />
    <BilingualTextInput caption="Название публикации *" :showOptions="gs.show" v-model="meta.titles" />
    <BilingualTextInput caption="Аннотация" textarea :showOptions="gs.show" v-model="meta.abstracts" />
    <div class="modify-content-buttons">
      <button class="border small-round vertical small-elevate primary-border primary-text" @click="() => cleanHtmlTags()">Убрать &lt;тэги&gt; из названия и аннотации</button>
    </div>
    <BilingualTextInput caption="Ключевые слова" hint="перечислены через точку с запятой" :showOptions="gs.show" v-model="meta.keywords" />
    <div class="modify-content-buttons">
      <button class="border small-round vertical small-elevate primary-border primary-text" @click="() => changeKeywordSeparators()">Поменять "," на ";"</button>
    </div>

    <h4 class="small">Авторы и аффилиации</h4>
    <template v-for="(author, authorIndex) in meta.authors" :key="authorIndex">
      <h5 class="small">{{ `Автор ${authorIndex + 1}` }}</h5>
      <AuthorData :gs="gs" v-model="meta.authors[authorIndex]" />
      <div class="author-management-buttons">
        <button class="border small-round small-elevate small primary-border primary-text" @click="() => addAuthor(authorIndex)">
          <i>add</i>
          <span>Добавить автора</span>
        </button>
        <button v-if="meta.authors.length > 1" class="border small-round small-elevate small primary-border primary-text" @click="() => deleteAuthor(authorIndex)">
          <i>remove</i>
          <span>Удалить автора</span>
        </button>
      </div>
    </template>
    <div v-if="meta.authors.length === 0" class="author-management-buttons">
      <button class="border small-round small-elevate small primary-border primary-text" @click="() => addAuthor(0)">
        <i>add</i>
        <span>Добавить автора</span>
      </button>
    </div>

    <h4 class="small">Публикационные данные</h4>
    <TextInput caption="Дата получения публикации" hint="в формате YYYY-MM-DD" :pattern="dateRegexp" :showOptions="gs.show" v-model="meta.dateSubmitted" />
    <TextInput caption="Дата принятия публикации" hint="в формате YYYY-MM-DD" :pattern="dateRegexp" :showOptions="gs.show" v-model="meta.dateAccepted" />
    <TextInput caption="Дата публикации *" hint="в формате YYYY-MM-DD" :pattern="dateRegexp" :showOptions="gs.show" v-model="meta.datePublished" />
    <div class="modify-content-buttons">
      <button class="border small-round vertical small-elevate primary-border primary-text" @click="correctDates">Переписать даты DD.MM.YYYY как YYYY-MM-DD</button>
    </div>
    <TextInput caption="Том" :showOptions="gs.show" v-model="meta.volume" />
    <TextInput caption="Номер" :showOptions="gs.show" v-model="meta.issue" />
    <CheckboxInput caption="Использовать Elocation ID *" :showOptions="gs.show" v-model="meta.useElocationId" />
    <TextInput 
      :caption="meta.useElocationId ? 'Elocation ID *' : 'Страницы *'" 
      :hint="meta.useElocationId ? '' : 'только номера страниц через дефис'" 
      :showOptions="gs.show"
      v-model="meta.pages" />
    <BilingualTextInput caption="Благодарности" :showOptions="gs.show" v-model="meta.acknowledgments" />
    <BilingualTextInput caption="Сведения о финансировании" :showOptions="gs.show" v-model="meta.fundings" />

    <h4 class="small">Авторские права</h4>
    <BilingualTextInput caption="Правообладатель" :showOptions="gs.show" v-model="meta.copyrightHolders" />
    <div class="modify-content-buttons">
      <button class="border small-round vertical small-elevate primary-border primary-text" @click="generateCopyrightHolders">Заполнить авторами</button>
    </div>
    <SelectLicense :showOptions="gs.show" v-model="meta.licenseUrl" :pattern="urlRegexp" />
    <TextInput caption="Год фиксации" hint="в формате YYYY" pattern="\d{4}" :showOptions="gs.show" v-model="meta.copyrightYear" />

    <h4 class="small">Библиография</h4>
    <BilingualTextInput caption="Список литературы" hint="одна строчка - один источник" textarea :showOptions="gs.show" v-model="meta.citations" />

  </section>
</template>

<style scoped>
  .author-management-buttons {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
  }
  .modify-content-buttons {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    margin-top: 0.5rem;
  }
</style>
