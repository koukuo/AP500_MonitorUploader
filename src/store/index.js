import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    runState: 0, // 0, 1, 2, idle/sweep/jam
    jamParam:{}
  },
  mutations: {
    simpleSet(state, payload) {
      Object.assign(state, payload);
    },
  },
  actions: {
  },
  modules: {
  },
})

export function mapStateWithSetter(stateArray = []) {
  const computed = {};
  stateArray.forEach((stateKey) => {
    computed[stateKey] = {
      get() {
        return this.$store.state[stateKey];
      },
      set(value) {
        this.$store.commit('simpleSet', { [stateKey]: value });
      },
    };
  });
  return computed;
}
