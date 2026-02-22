<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-card">
        <h1>🏖️ Watch2 휴가관리</h1>
        <p>Google 계정으로 로그인하세요</p>
        
        <button 
          @click="handleLogin" 
          class="btn-google"
          :disabled="loading"
        >
          <img 
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
            alt="Google"
          />
          <span>{{ loading ? '로그인 중...' : 'Google로 로그인' }}</span>
        </button>

        <div class="notice">
          <p>⚠️ watch2.co.kr 도메인 계정만 사용 가능합니다</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';

export default {
  name: 'Login',
  setup() {
    const store = useStore();
    const router = useRouter();
    const loading = ref(false);

    const handleLogin = async () => {
      loading.value = true;
      try {
        await store.dispatch('login');
        router.push('/');
      } catch (error) {
        alert(error.message || '로그인에 실패했습니다.');
      } finally {
        loading.value = false;
      }
    };

    return {
      loading,
      handleLogin
    };
  }
};
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-container {
  width: 100%;
  max-width: 400px;
  padding: 20px;
}

.login-card {
  background: white;
  padding: 48px 40px;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  text-align: center;
}

.login-card h1 {
  font-size: 32px;
  color: #2d3748;
  margin-bottom: 8px;
}

.login-card p {
  color: #718096;
  margin-bottom: 32px;
}

.btn-google {
  width: 100%;
  padding: 14px 24px;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.btn-google:hover:not(:disabled) {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
}

.btn-google:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-google img {
  width: 24px;
  height: 24px;
}

.notice {
  margin-top: 24px;
  padding: 12px;
  background: #fff5f5;
  border-radius: 8px;
}

.notice p {
  margin: 0;
  font-size: 13px;
  color: #c53030;
}
</style>