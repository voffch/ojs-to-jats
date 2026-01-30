<script setup>
import { useId } from 'vue';

const model = defineModel({
  type: Boolean,
  required: true,
  default: false
});

const props = defineProps({
  caption : {
    type : String,
    required : true
  },
});

const unique_key = useId();
</script>

<template>
  <div class="field">
    <label class="switch" :for="unique_key">
      <input type="checkbox" :id="unique_key" v-model="model" />
      <span>{{ caption }}</span>
    </label>
  </div>
</template>

<style scoped>
  .switch span {
    padding-left: 0.5rem;
  }
  .field {
    justify-content: center;
  }
</style>