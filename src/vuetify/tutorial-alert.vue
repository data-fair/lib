<!-- eslint-disable vue/no-v-html -->
<template lang="html">
  <div
    v-if="show || showBtn"
    class="tutorial-alert pt-3 pb-2 pr-3"
  >
    <v-alert
      v-if="show"
      dark
      color="success"
      density="compact"
      border="start"
      class="ma-0"
      :variant="$vuetify.theme.current.dark ? 'outlined' : 'flat'"
    >
      <slot>
        <a
          v-if="href"
          :href="href"
          target="_blank"
        >{{ text || $t('readDoc') }}</a>
        <template v-else>
          <span
            v-if="text"
            v-text="text"
          />
          <div
            v-else-if="html"
            v-html="html"
          />
        </template>
      </slot>
    </v-alert>
    <v-btn
      v-if="showBtn"
      class="toggle"
      icon
      density="compact"
      color="success"
      :title="show ? $t('closeHelp') : $t('readHelp')"
      @click="show = !show"
    >
      <v-icon v-if="show">
        mdi-close-circle
      </v-icon>
      <v-icon v-else>
        mdi-information
      </v-icon>
    </v-btn>
  </div>
</template>

<i18n lang="yaml">
fr:
  readHelp: Ouvrez un message d'aide
  closeHelp: Fermez le message d'aide
  readDoc: Consultez la documentation
en:
  readHelp: Open a help message
  closeHelp: Close the help message
  readDoc: Read the documentation
</i18n>

<script>
export default {
  props: {
    id: { type: String, required: true },
    href: { type: String, required: false, default: null },
    text: { type: String, required: false, default: null },
    html: { type: String, required: false, default: null },
    initial: { type: Boolean, default: true },
    persistent: { type: Boolean, default: false }
  },
  data: () => ({
    show: false
  }),
  computed: {
    showBtn () {
      return this.show || (!this.show && this.persistent)
    }
  },
  watch: {
    show () {
      window.localStorage['closed-tutorial-' + this.id] = '' + !this.show
    }
  },
  mounted () {
    if (window.localStorage) {
      if (window.localStorage['closed-tutorial-' + this.id] !== 'true') {
        this.show = this.initial
      }
    }
  }
}
</script>

<style lang="css">
.tutorial-alert {
  /*background-color: rgba(10, 10, 10, 0.1);*/
  position: relative;
  overflow:visible;
  min-height:28px;
}
.tutorial-alert .v-alert--outlined {
  background: black !important
}
.tutorial-alert .v-alert .v-alert__content a {
  color: white !important;
  text-decoration: underline;
}
.tutorial-alert .toggle.v-btn {
  position: absolute;
  top: -1px;
  right: -1px;
}
.tutorial-alert .toggle.v-btn .v-icon {
  border-radius: 30px;
}
.tutorial-alert .toggle.v-btn .v-icon.theme--dark {
  background-color: black;
}
.tutorial-alert .toggle.v-btn .v-icon.theme--light {
  background-color: white;
}
</style>
