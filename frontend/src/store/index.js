import { createStore } from 'vuex';
import { authService } from '@/services/firebase';
import { api } from '@/services/api';

// store 인스턴스를 밖에서 선언
let store;

store = createStore({
  state: {
    user: null,
    isAuthenticated: false,
    loading: false,
    authReady: false,
  },

  mutations: {
    SET_USER(state, user) {
      state.user = user;
      state.isAuthenticated = !!user;
    },
    SET_LOADING(state, loading) {
      state.loading = loading;
    },
    SET_AUTH_READY(state) {
      state.authReady = true;
    },
    UPDATE_USER_LEAVE(state, { used, remaining }) {
      if (state.user) {
        state.user.usedLeave = used;
        state.user.remainingLeave = remaining;
      }
    }
  },

  actions: {
    async login({ commit }) {
      commit('SET_LOADING', true);
      try {
        const firebaseUser = await authService.loginWithGoogle();
        const userData = await api.getMe();

        // ✅ 동일하게 수정
        const userInfo = userData.user || userData;
        
        commit('SET_USER', {
          id: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName,
          ...userInfo
        });
        return true;
      } catch (error) {
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },

    async logout({ commit }) {
      try {
        await authService.logout();
        commit('SET_USER', null);
      } catch (error) {
        throw error;
      }
    },

    async refreshUser({ commit, state }) {
      if (!state.isAuthenticated) return;
      try {
        const userData = await api.getMe();
        commit('SET_USER', { ...state.user, ...userData });
      } catch (error) {
        console.error('Refresh user failed:', error);
      }
    },

    initAuth({ commit, state }) {
      if (state.authReady) return Promise.resolve();

      return new Promise((resolve) => {
        authService.onAuthChange(async (firebaseUser) => {
          if (firebaseUser && firebaseUser.email?.endsWith('@watch2.co.kr')) {
            try {
              const userData = await api.getMe();
              
              // ✅ userData.user가 있으면 펼치고, 없으면 userData 직접 사용
              const userInfo = userData.user || userData;

              commit('SET_USER', {
                id: firebaseUser.uid,
                email: firebaseUser.email,
                name: firebaseUser.displayName,
                ...userInfo               // ← 수정!
              });
            } catch (error) {
              console.error('getMe 실패:', error);
              commit('SET_USER', null);
            }
          } else {
            commit('SET_USER', null);
          }
          commit('SET_AUTH_READY');
          resolve();
        });
      });
    },

    // ✅ store 참조 버그 수정
    waitForAuth({ state }) {
      if (state.authReady) return Promise.resolve();
      return new Promise((resolve) => {
        const unwatch = store.watch(   // ← 이제 store 정상 참조
          (s) => s.authReady,
          (ready) => {
            if (ready) {
              unwatch();
              resolve();
            }
          }
        );
      });
    }
  },

  getters: {
    isAuthenticated: (state) => state.isAuthenticated,
    user: (state) => state.user,
    isAdmin: (state) => state.user?.role === 'admin',
    loading: (state) => state.loading,
    authReady: (state) => state.authReady
  }
});

export default store;