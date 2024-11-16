<template>
    <div v-show="isVisible" class="cef-component" :class="customClass">
      <slot></slot>
    </div>
  </template>
  
  <script>
  export default {
    name: 'BaseCef',
    props: {
      name: {
        type: String,
        required: true
      },
      customClass: {
        type: String,
        default: ''
      }
    },
    data() {
      return {
        isVisible: false
      }
    },
    mounted() {
      window.addEventListener('message', this.handleVisibility);
    },
    unmounted() {
      window.removeEventListener('message', this.handleVisibility);
    },
    methods: {
      handleVisibility(event) {
        try {
          const data = JSON.parse(event.data);
          if (data.component === this.name) {
            this.isVisible = data.visible;
          }
        } catch (e) {
          console.error('Failed to parse message:', e);
        }
      }
    }
  }
  </script>