<template>
  <div id="app">
    <nav v-if="isAuthenticated" class="navbar">
      <div class="nav-container">
        <div class="nav-brand">
          <router-link to="/">🏖️ Watch2 휴가관리</router-link>
        </div>
        <div class="nav-menu">
          <router-link to="/vacations/request" class="nav-link">
            휴가 신청
          </router-link>
          <router-link to="/vacations/history" class="nav-link">
            내 휴가 내역
          </router-link>
          <router-link v-if="isAdmin" to="/admin" class="nav-link">
            관리자
          </router-link>
          <button @click="handleLogout" class="btn-logout">로그아웃</button>
        </div>
      </div>
    </nav>

    <router-view />
  </div>
</template>

<script>
import { computed } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';

export default {
  name: 'App',
  setup() {
    const store = useStore();
    const router = useRouter();

    const isAuthenticated = computed(() => store.getters.isAuthenticated);
    const isAdmin = computed(() => store.getters.isAdmin);

    const handleLogout = async () => {
      if (confirm('로그아웃 하시겠습니까?')) {
        await store.dispatch('logout');
        router.push('/login');
      }
    };

    return {
      isAuthenticated,
      isAdmin,
      handleLogout
    };
  }
};
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR',
    sans-serif;
  background: #f5f7fa;
}

#app {
  min-height: 100vh;
}

.navbar {
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.nav-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-brand a {
  font-size: 20px;
  font-weight: 700;
  color: #667eea;
  text-decoration: none;
}

.nav-menu {
  display: flex;
  gap: 24px;
  align-items: center;
}

.nav-link {
  color: #4a5568;
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
  transition: color 0.2s;
}

.nav-link:hover,
.nav-link.router-link-active {
  color: #667eea;
}

.btn-logout {
  padding: 8px 16px;
  background: #e2e8f0;
  color: #4a5568;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-logout:hover {
  background: #cbd5e0;
}

@media (max-width: 768px) {
  .nav-container {
    flex-direction: column;
    gap: 16px;
  }

  .nav-menu {
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
  }
}
</style>