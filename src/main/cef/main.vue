<template>
  <div
    class="absolute right-0"
  >
    <img
      :src="requireImage('step3.jpg')"
      class="w-16 h-16"
    />
    <button @click="test('epic')">Test</button>
  </div>
  </template>
  
  <script lang="ts">
  import { test } from './test'
  import {CefRPC} from '@kwattt/vrage/cef/rpc'
  CefRPC.init()

  //const requireImage = (path: string) => CEF.getStaticPath('main', path)

  export default {
    name: 'ExampleMenu',
    data() {
      return {
        inputText: '',
        count: 0
      }
    },
    methods: {
      test,
      requireImage(path: string) {
        return CEF.getStaticPath('vragechat', path)
      }
    }
  }
  </script>