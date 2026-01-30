import { reactive } from 'vue';

export const environment = reactive({
  extension: false,
  update() {
    this.extension = window.location.protocol.includes('-extension:');
  }
});

// gs stands for global settings (or global store?..)
export const gs = reactive({
  show: {
    ru : true,
    en : true,
    sideBySide : true
  },
});