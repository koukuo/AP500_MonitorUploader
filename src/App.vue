<template>
  <div id="app">
    <FileList></FileList>
  </div>
</template>

<script>

import FileList from '@/components/FileList.vue'

export default {
  components:{FileList},
}


</script>


<style lang="less">


body{
  margin: 0;
  background-color: #f5f7fa;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  font-size: 14px;
}
.left {
  text-align: left;
}
.right {
  text-align: right;
}
.fr {
  float: right;
}

</style>
