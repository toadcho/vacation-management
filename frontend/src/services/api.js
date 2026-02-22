import axios from 'axios';
import { auth } from './firebase';

// ========================================
// axios 인스턴스 생성
// ========================================
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 요청 인터셉터: Firebase 토큰 자동 추가
apiClient.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터: 에러 처리
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ========================================
// API 메서드
// ========================================
export const api = {
  // ===== 인증 =====
  getMe: () => apiClient.get('/auth/me'),
  
  // ===== 휴가 신청 =====
  // 내 휴가 목록
  getMyVacations: (params) => apiClient.get('/vacations', { params }),
  
  // 특정 휴가 조회
  getVacation: (id) => apiClient.get(`/vacations/${id}`),
  
  // 휴가 신청
  createVacation: (data) => apiClient.post('/vacations', data),
  
  // 휴가 수정 (추가!)
  updateVacation: (id, data) => apiClient.put(`/vacations/${id}`, data),
  
  // 휴가 취소 (추가!)
  cancelVacation: (id) => apiClient.delete(`/vacations/${id}`),
  
  // ===== 관리자 - 휴가 관리 =====
  // 승인 대기 목록
  getPendingVacations: () => apiClient.get('/admin/vacations?status=pending'),
  
  // 전체 휴가 목록
  getAllVacations: (params) => apiClient.get('/admin/vacations', { params }),
  
  // 휴가 승인
  approveVacation: (id) => apiClient.post(`/admin/vacations/${id}/approve`),
  
  // 휴가 거부
  rejectVacation: (id, data) => apiClient.post(`/admin/vacations/${id}/reject`, data),
  
  // ===== 관리자 - 통계 =====
  getStatistics: () => apiClient.get('/admin/statistics'),
  getUserStatistics: () => apiClient.get('/admin/users/statistics')
};

// ========================================
// 직원 관리 API
// ========================================
export const userApi = {
  // 전체 직원 목록
  getAll: () => apiClient.get('/admin/users'),
  
  // 직원 정보 조회
  getOne: (userId) => apiClient.get(`/admin/users/${userId}`),
  
  // 직원 정보 수정
  update: (userId, data) => apiClient.put(`/admin/users/${userId}`, data),
  
  // Google Workspace 사용자 조회 (미리보기)
  getGoogleUsers: () => apiClient.get('/admin/google/users'),
  
  // Google Workspace 동기화 실행
  syncGoogleUsers: (updateExisting = false) => 
    apiClient.post('/admin/google/sync', { updateExisting })
};

export { apiClient };