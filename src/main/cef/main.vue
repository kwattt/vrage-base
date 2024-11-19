<template>
  <div
    class="absolute right-0"
  >
    Test Beta 
    <button @click="test('epic')">Test</button>
  </div>
  </template>
  
  <script lang="ts">
  import { test } from './test'
  import {CefRPC} from '@kwattt/vrage/cef/rpc'

  CefRPC.init()

  mp.events.add('test', () => {
    console.log('Test Beta')
  })

  export default {
    name: 'ExampleMenu',
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