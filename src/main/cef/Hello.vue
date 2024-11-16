<template>
    <base-cef name="mainMenu" custom-class="menu-container">
      <div class="menu">
        <h2>Main Menu</h2>
        <div class="menu-content">
          <input type="text" v-model="inputText" placeholder="Type something...">
          <button @click="test(inputText)">Test</button>
        </div>
      </div>
    </base-cef>
  </template>
  
  <script lang="ts">
  import BaseCef from '../../../vue/BaseCef.vue'
  import { test } from './test'
  
  export default {
    name: 'ExampleMenu',
    components: {
      BaseCef
    },
    data() {
      return {
        inputText: '',
        count: 0
      }
    },
    methods: {
      test
    }
  }
  </script>