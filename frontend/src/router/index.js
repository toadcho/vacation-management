import { createRouter, createWebHistory } from 'vue-router';
import store from '@/store';

import Login from '@/components/Login.vue';
import VacationRequest from '@/components/VacationRequest.vue';
import VacationEdit from '@/components/VacationEdit.vue';  // ← 추가!
import VacationHistory from '@/components/VacationHistory.vue';
import AdminDashboard from '@/components/AdminDashboard.vue';
import UserManagement from '@/components/UserManagement.vue';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    redirect: '/vacations/history'
  },
  {
    path: '/vacations/request',
    name: 'VacationRequest',
    component: VacationRequest,
    meta: { requiresAuth: true }
  },
  {
    path: '/vacations/history',
    name: 'VacationHistory',
    component: VacationHistory,
    meta: { requiresAuth: true }
  },
  {
    path: '/vacations/edit/:id',
    name: 'VacationEdit',
    component: VacationEdit,  // ← 변경!
    meta: { requiresAuth: true }
  },
  {
    path: '/admin',
    name: 'AdminDashboard',
    component: AdminDashboard,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/admin/users',
    name: 'UserManagement',
    component: UserManagement,
    meta: { requiresAuth: true, requiresAdmin: true }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const requiresAdmin = to.matched.some((record) => record.meta.requiresAdmin);

  if (store.state.authReady === false) {
    await store.dispatch('waitForAuth');
  }

  const isAuthenticated = store.getters.isAuthenticated;
  const isAdmin = store.getters.isAdmin;

  if (requiresAuth && !isAuthenticated) {
    next('/login');
  } else if (requiresAdmin && !isAdmin) {
    next('/');
  } else {
    next();
  }
});

export default router;