<script setup>
import { useId } from 'vue';

const model = defineModel({
  type: String,
  required: true,
  default: ''
});

const props = defineProps({
  showOptions : {
    type : Object,
    default : {
      sideBySide : true
    }
  },
  caption : {
    type : String,
    required : true
  },
  options : {
    type : Object,
    required : true
  },
});

const unique_key = useId();
</script>

<template>
  <div class="input-group" :class="{ 'side-by-side' : showOptions.sideBySide }">
    <label class="input-group-caption" :for="unique_key">{{ caption }}</label>
    <select :id="unique_key" v-model="model">
      <option v-for="(value, key) in options" :value="key">{{ value }}</option>
    </select>
  </div>
</template>

<style scoped>
  @import "./input-style.css";
</style>