<script setup>
import { useId } from 'vue';

const model = defineModel({
  type: Boolean,
  required: true,
  default: false
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
});

const unique_key = useId();
</script>

<template>
  <div class="input-group" :class="{ 'side-by-side' : showOptions.sideBySide }">
    <label class="input-group-caption" :for="unique_key">{{ caption }}</label>
    <input type="checkbox" :id="unique_key" v-model="model" />
  </div>
</template>

<style scoped>
  @import "./input-style.css";
</style>