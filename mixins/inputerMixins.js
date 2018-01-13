export default {
  props: {
    nvCode: {
      type: String,
      required: true
    }
  },
  created () {
    this.fetchOptions()
  },
  computed: {
    currentValue: {
      get () {
        return this.value
      },
      set (val) {
        this.$emit('input', val)
      }
    }
  },
  methods: {
    fetchOptions () {
      const self = this
      window.unfetch({
        url: '/dictionary/code',
        methods: 'get',
        params: {
          CODE: self.nvCode
        }
      }).then(({data}) => {
        self.nvOptions = data
      })
    }
  }
}
