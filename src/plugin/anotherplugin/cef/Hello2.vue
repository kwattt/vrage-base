<template>
    <div class="flex min-h-screen items-center justify-center bg-gray-100">
      <div class="rounded-lg bg-white p-8 shadow-lg">
        <h1 class="mb-4 text-3xl font-bold text-gray-900">{{ message }}</h1>
        <button 
          @click="count++" 
          class="rounded bg-red-500 px-4 py-2 font-bold text-white hover:bg-red-700"
        >
          Clicked: {{ count }}
        </button>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    name: 'Hello',
    data() {
      return {
        message: 'Hello 0101!',
        count: 0
      }
    }
  }
  </script>
  