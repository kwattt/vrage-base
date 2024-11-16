<template>
    <div class="">
      Test Alpha
    </div>
  </template>
  
  <script>
  mp.events.add('test', () => {
    console.log('Test Alpha')
  })

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
  