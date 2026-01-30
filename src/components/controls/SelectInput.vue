<script setup>
import { useId } from 'vue';

const model = defineModel({
  type: String,
  required: true,
  default: ''
});

const props = defineProps({
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
  <div class="field border label">
    <select :id="unique_key" v-model="model">
      <option v-for="(value, key) in options" :value="key">{{ value }}</option>
    </select>
    <label :for="unique_key">{{ caption }}</label>
  </div>
</template>

<style scoped>

</style>