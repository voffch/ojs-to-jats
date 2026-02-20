<script setup>
import BilingualTextInput from './controls/BilingualTextInput.vue';
import TextInput from './controls/TextInput.vue';
import SelectInput from './controls/SelectInput.vue';
import SelectLicense from './controls/SelectLicense.vue';
import SwitchInput from './controls/SwitchInput.vue';
import { 
  genArticleMeta, 
  addEmptyAffiliation, 
  deleteAffiliation, 
  addEmptyAuthor, 
  deleteAuthor, 
  removeHtmlFromTitlesAbstracts, 
  removeHtmlFromCitations } from './metadataTemplates';
import AuthorData from './AuthorData.vue';
import { gs } from './store.js';

const meta = defineModel({
  type : Object,
  required : true,
  default : genArticleMeta()
});

function changeKeywordSeparators() {
  for (const lang in meta.value.keywords) {
    meta.value.keywords[lang] = meta.value.keywords[lang].replaceAll(',', ';');
  }
}

function generateCopyrightHolders() {
  const hasNameInLang = (author, lang) => (author.val.surnames[lang] || author.val.givennames[lang]);
  const someRussian = meta.value.authors.some(a => hasNameInLang(a, 'ru'));
  const someEnglish = meta.value.authors.some(a => hasNameInLang(a, 'en'));
  const bilingualAuthors = someRussian && someEnglish;
  for (const lang in meta.value.copyrightHolders) {
    const otherLang = (lang === 'en') ? 'ru' : 'en';
    const fullnames = meta.value.authors.map(a => {
      const usedLang = (bilingualAuthors && !hasNameInLang(a, lang)) ? otherLang : lang;
      return `${a.val.givennames[usedLang]} ${a.val.surnames[usedLang]}`.trim();
    }).filter(Boolean);
    meta.value.copyrightHolders[lang] = fullnames.join(', ').trim();
  }
}

function correctDates() {
  function tryCorrectingDate(date) {
    const match = date?.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (match) {
      return match.slice(1).map(x => x.length === 1 ? `0${x}` : x).reverse().join('-'); 
    } else {
      return date;
    }
  }
  meta.value.dateSubmitted = tryCorrectingDate(meta.value.dateSubmitted);
  meta.value.dateAccepted = tryCorrectingDate(meta.value.dateAccepted);
  meta.value.datePublished = tryCorrectingDate(meta.value.datePublished);
}

function removeNames(lang) {
  for (const author of meta.value.authors) {
    author.val.surnames[lang] = '';
    author.val.givennames[lang] = '';
  }
}

function removeEmails() {
  for (const author of meta.value.authors) {
    author.val.email = '';
  }
}

const urlPattern = 'https?\:\/\/.+';
const datePattern = '\\d{4}-[01]\\d-[0-3]\\d';
const doiPattern = '10\\.\\d{4,9}\\/.+'; // oversimplified to avoid errors
</script>

<template>
  <section class="article-data-wrapper">

    <h3 class="small">Статья</h3>
    <SelectInput 
      caption="Основной язык"
      :options="{
        '' : '-- не задан --',
        'en' : 'English',
        'ru' : 'Русский',
      }"
      v-model="meta.primaryLanguage" />
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
      v-model="meta.articleType" />
    <TextInput 
      caption="DOI" 
      hint="в поле вводится не гиперссылка, а просто номер DOI"
      :pattern="doiPattern" 
      :showOptions="gs.show" 
      v-model="meta.doi" 
      :url="`https://doi.org/${meta.doi}`" />
    <TextInput 
      caption="EDN" 
      hint="6 заглавных латинских букв" 
      pattern="[A-Z]{6}" 
      :showOptions="gs.show" 
      v-model="meta.edn" 
      :url="`https://elibrary.ru/${meta.edn}`" />
    <TextInput 
      caption="URL страницы публикации на сайте журнала"
      :pattern="urlPattern"
      :showOptions="gs.show" 
      v-model="meta.pageUrl"
      :url="meta.pageUrl" />
    <TextInput 
      caption="URL PDF статьи"
      hint="ссылка на скачивание PDF-файла"
      :pattern="urlPattern"
      :showOptions="gs.show" 
      v-model="meta.pdfUrl"
      :url="meta.pdfUrl" />
    <BilingualTextInput caption="Название публикации *" :showOptions="gs.show" v-model="meta.titles" />
    <BilingualTextInput caption="Аннотация" textarea :showOptions="gs.show" v-model="meta.abstracts" />
    <div class="modify-content-buttons">
      <button class="border small-round vertical small-elevate primary-border primary-text" @click="removeHtmlFromTitlesAbstracts(meta)">Убрать &lt;тэги&gt; из названия и аннотации</button>
    </div>
    <BilingualTextInput caption="Ключевые слова" hint="перечислены через точку с запятой" :showOptions="gs.show" v-model="meta.keywords" />
    <div class="modify-content-buttons">
      <button class="border small-round vertical small-elevate primary-border primary-text" @click="() => changeKeywordSeparators()">Поменять "," на ";"</button>
    </div>

    <h4 class="small">Аффилиации</h4>
    <div class="management-buttons">
      <button class="border small-round small-elevate small primary-border primary-text" @click="addEmptyAffiliation(meta, 0)">
        <i>add</i>
        <span>Добавить аффилиацию</span>
      </button>
    </div>
    <template v-for="(aff, affIndex) in meta.affiliations" :key="aff.id">
        <h5 class="small">{{ `Аффилиация ${affIndex + 1}` }}</h5>
        <BilingualTextInput class="affiliation" caption="Организация" :showOptions="gs.show" v-model="aff.val" />
        <div class="management-buttons">
          <button class="border small-round small-elevate small primary-border primary-text" @click="addEmptyAffiliation(meta, affIndex + 1)">
            <i>add</i>
            <span>Добавить аффилиацию</span>
          </button>
          <button class="border small-round small-elevate small primary-border primary-text" @click="deleteAffiliation(meta, aff.id)">
            <i>remove</i>
            <span>Удалить аффилиацию</span>
          </button>
        </div>
    </template>

    <h4 class="small">Авторы</h4>
    <div class="management-buttons">
      <button class="border small-round small-elevate small primary-border primary-text" @click="addEmptyAuthor(meta, 0)">
        <i>add</i>
        <span>Добавить автора</span>
      </button>
    </div>
    <template v-for="(author, authorIndex) in meta.authors" :key="author.id">
      <h5 class="small">{{ `Автор ${authorIndex + 1}` }}</h5>
      <AuthorData v-model="author.val" :affiliations="meta.affiliations" />
      <div class="management-buttons">
        <button class="border small-round small-elevate small primary-border primary-text" @click="addEmptyAuthor(meta, authorIndex + 1)">
          <i>add</i>
          <span>Добавить автора</span>
        </button>
        <button class="border small-round small-elevate small primary-border primary-text" @click="deleteAuthor(meta, author.id)">
          <i>remove</i>
          <span>Удалить автора</span>
        </button>
      </div>
    </template>
    <div class="modify-content-buttons">
      <button class="border small-round vertical small-elevate primary-border primary-text" @click="removeNames('ru')">Убрать ФИО (РУС)</button>
      <button class="border small-round vertical small-elevate primary-border primary-text" @click="removeNames('en')">Убрать ФИО (ENG)</button>
      <button class="border small-round vertical small-elevate primary-border primary-text" @click="removeEmails">Убрать email</button>
    </div>

    <h4 class="small">Публикационные данные</h4>
    <TextInput caption="Дата получения публикации" hint="в формате YYYY-MM-DD" :pattern="datePattern" :showOptions="gs.show" v-model="meta.dateSubmitted" />
    <TextInput caption="Дата принятия публикации" hint="в формате YYYY-MM-DD" :pattern="datePattern" :showOptions="gs.show" v-model="meta.dateAccepted" />
    <TextInput caption="Дата публикации *" hint="в формате YYYY-MM-DD" :pattern="datePattern" :showOptions="gs.show" v-model="meta.datePublished" />
    <div class="modify-content-buttons">
      <button class="border small-round vertical small-elevate primary-border primary-text" @click="correctDates">Переписать даты DD.MM.YYYY как YYYY-MM-DD</button>
    </div>
    <TextInput caption="Том" :showOptions="gs.show" v-model="meta.volume" />
    <TextInput caption="Номер" :showOptions="gs.show" v-model="meta.issue" />
    <SwitchInput caption="Использовать Elocation ID *" v-model="meta.useElocationId" />
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
    <SelectLicense :showOptions="gs.show" v-model="meta.licenseUrl" :pattern="urlPattern" />
    <TextInput caption="Год фиксации" hint="в формате YYYY" pattern="\d{4}" :showOptions="gs.show" v-model="meta.copyrightYear" />

    <h4 class="small">Библиография</h4>
    <BilingualTextInput caption="Список литературы" hint="одна строчка - один источник" textarea :showOptions="gs.show" v-model="meta.citations" />
    <div class="modify-content-buttons">
      <button class="border small-round vertical small-elevate primary-border primary-text" @click="removeHtmlFromCitations(meta)">Убрать &lt;тэги&gt; из библиографии</button>
    </div>

  </section>
</template>

<style scoped>
  .management-buttons {
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
  h3, h4, h5 {
    margin-top: 1.5rem !important;
  }
</style>
