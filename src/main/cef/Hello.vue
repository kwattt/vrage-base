// src/main/cef/Hello.vue
<template>
  <div class="hello">
    <h1>{{ message }}</h1>
    <button @click="count++">Clicked: {{ count }}</button>
  </div>
</template>

<script>
export default {
  name: 'Hello',
  data() {
    return {
      message: 'Hello World!',
      count: 0
    }
  }
}
</script>

<style lang="scss" scoped>
.hello {
  text-align: center;
  padding: 20px;
  background: #f0f0f0;
  border-radius: 8px;
  margin: 20px;

  h1 {
    color: #42b883;
  }

  button {
    padding: 8px 16px;
    margin-top: 10px;
    border: none;
    background: #42b883;
    color: white;
    border-radius: 4px;
    cursor: pointer;

    &:hover {
      background: #3aa876;
    }
  }
}
</style>