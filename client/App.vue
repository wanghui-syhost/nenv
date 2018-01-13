<template>
    <div id="nenv_root">
        <router-view />
    </div>
</template>
<script>
import { mapState } from 'vuex'
export default {
  data () {
    return {
      styleEl: null,
      titleEl: document.getElementsByTagName('title')[0]
    }
  },
  created () {
    const head = document.getElementsByTagName('head')[0]
    const styleEl = document.createElement('style')
    styleEl.type = 'text/css'
    styleEl.className += 'nevn-theme'
    head.appendChild(styleEl)
    this.styleEl = styleEl
  },
  computed: {
    ...mapState('platform', {
      title: state => state.title,
      themePalette: state => state.theme.palette
    })
  },
  watch: {
    title (val) {
      this.titleEl.innerHTML = val
    }
  }
}
</script>
<style lang="scss" scoped>
    #nenv_root {
        width: 100%;
        height: 100%;
    }
</style>


