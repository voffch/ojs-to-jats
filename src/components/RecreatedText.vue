<script setup>
import { computed } from 'vue';
const props = defineProps({
  xml : {
    type : Object,
    required : true
  },
});

const queryText = (selector) => props.xml.querySelector(selector)?.textContent;

const authors = computed(() => {
  const result = Array.from(props.xml.querySelectorAll('contrib')).map((contrib) => {
    const getFullname = (lang) => {
      const givennamesElement = contrib.querySelector(`given-names:lang(${lang})`);
      const surnameElement = contrib.querySelector(`surname:lang(${lang})`);
      const givennames = givennamesElement?.textContent ?? '';
      const surname = surnameElement?.textContent ?? '';
      let fullname = '';
      if (surname && givennames) {
        fullname = `${givennames} ${surname}`;
      } else {
        fullname = surname ? surname : givennames;
      }
      return fullname;
    };
    const affNumbers = Array.from(contrib.querySelectorAll(`xref[ref-type="aff"]`)).map((xref) => {
      const rid = xref.getAttribute('rid');
      return rid.match(/\d+/);
    });
    let fullname_en = getFullname('en');
    let fullname_ru = getFullname('ru');
    if (fullname_en && !fullname_ru) {
      fullname_ru = fullname_en;
    } else if (!fullname_en && fullname_ru) {
      fullname_en = fullname_ru;
    } else if (!fullname_en && !fullname_ru) {
      fullname_en = 'NAMELESS AUTHOR';
      fullname_ru = 'АВТОР БЕЗ ИМЕНИ';
    }
    return {
      fullnames: {
        en: fullname_en,
        ru: fullname_ru
      },
      affNumbers: affNumbers
    };
  });
  return result;
});

const affiliations = computed(() => {
  const getAffs = lang => Array.from(props.xml.querySelectorAll(`aff-alternatives aff institution:lang(${lang})`)).map(e => e.textContent);
  return {
    en: getAffs('en'),
    ru: getAffs('ru'),
  }
});
</script>

<template>
  <section class="recreated-text-wrapper">
    <article>
      <div>По-русски:</div>
      <div v-if="authors.length">
        <span v-for="(a, index) in authors" :key="index">
          <span>{{ a.fullnames.ru }}</span>
          <span v-if="a.affNumbers.length"> <sup>{{ a.affNumbers.join(', ') }}</sup></span>
          <span v-if="index + 1 < authors.length">, </span>
        </span>
      </div>
      <div v-else>Нет авторов</div>
      <div v-if="affiliations?.ru.length">
        <ol>
          <li v-for="(aff, index) in affiliations.ru" :key="index">{{ aff }}</li>
        </ol>
      </div>
      <div v-else>Нет аффилиаций</div>
    </article>
    <article>
      <div>In English:</div>
      <div v-if="authors.length">
        <span v-for="(a, index) in authors" :key="index">
          <span>{{ a.fullnames.en }}</span>
          <span v-if="a.affNumbers.length"> <sup>{{ a.affNumbers.join(', ') }}</sup></span>
          <span v-if="index + 1 < authors.length">, </span>
        </span>
      </div>
      <div v-else>No authors</div>
      <div v-if="affiliations?.en.length">
        <ol>
          <li v-for="(aff, index) in affiliations.en" :key="index">{{ aff }}</li>
        </ol>
      </div>
      <div v-else>No affiliations</div>
    </article>
  </section>
</template>

<style scoped>

</style>