<template>
  <div class="admin-dashboard">
    <!-- 헤더 -->
    <div class="header">
      <div class="header-content">
        <h1>
          🛡️ 관리자 대시보드
          <span class="admin-badge">ADMIN</span>
        </h1>
        <div class="admin-info">관리자: {{ user.email }}</div>
      </div>
    </div>

    <div class="container">
      <!-- ✅ 탭 메뉴 (직원 관리 추가) -->
      <div class="tabs">
        <button
          class="tab"
          :class="{ active: activeTab === 'pending' }"
          @click="activeTab = 'pending'"
        >
          📋 대기 중인 신청 ({{ pendingRequests.length }})
        </button>
        <button
          class="tab"
          :class="{ active: activeTab === 'statistics' }"
          @click="activeTab = 'statistics'"
        >
          📊 직원별 통계
        </button>
        <button
          class="tab"
          :class="{ active: activeTab === 'history' }"
          @click="activeTab = 'history'"
        >
          📚 전체 내역
        </button>
        <button
          class="tab"
          :class="{ active: activeTab === 'users' }"
          @click="activeTab = 'users'"
        >
          👥 직원 관리
        </button>
      </div>

      <!-- 통계 카드 (휴가 관리 탭에서만 표시) -->
      <div v-if="activeTab !== 'users'" class="stats-grid">
        <div class="stat-card">
          <div class="icon">📋</div>
          <div class="label">대기 중인 신청</div>
          <div class="value">{{ statistics.pending }}</div>
          <div class="subtext">승인 필요</div>
        </div>
        <div class="stat-card">
          <div class="icon">✅</div>
          <div class="label">이번 달 승인</div>
          <div class="value">{{ statistics.approvedThisMonth }}</div>
          <div class="subtext">
            전월 대비 
            <span :style="{ 
              color: statistics.monthOverMonthChange >= 0 ? '#48bb78' : '#f56565',
              fontWeight: 'bold'
            }">
              {{ statistics.monthOverMonthChange >= 0 ? '+' : '' }}{{ statistics.monthOverMonthChange }}%
            </span>
          </div>
        </div>
        <div class="stat-card">
          <div class="icon">👥</div>
          <div class="label">전체 직원</div>
          <div class="value">{{ statistics.totalUsers }}</div>
          <div class="subtext">활성 사용자</div>
        </div>
        <div class="stat-card">
          <div class="icon">📊</div>
          <div class="label">평균 연차 사용률</div>
          <div class="value">{{ statistics.averageUsageRate }}%</div>
          <div class="subtext">전년 대비 +5%</div>
        </div>
      </div>

      <!-- 대기 중인 신청 탭 -->
      <div v-show="activeTab === 'pending'" class="tab-content">
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">승인 대기 중</h2>
            <div class="filter-group">
              <select v-model="filters.type" class="filter-select">
                <option value="">전체 종류</option>
                <option value="연차">연차</option>
                <option value="공가">공가</option>
              </select>
              <select v-model="filters.sort" class="filter-select">
                <option value="latest">최신순</option>
                <option value="oldest">오래된 순</option>
                <option value="longest">기간 긴 순</option>
              </select>
            </div>
          </div>

          <!-- 로딩 -->
          <div v-if="loading" class="loading">로딩 중...</div>

          <!-- 휴가 신청 목록 -->
          <div v-else-if="filteredPendingRequests.length > 0">
            <div
              v-for="request in filteredPendingRequests"
              :key="request.id"
              class="vacation-request"
            >
              <div class="request-header">
                <div class="request-user">
                  <div class="user-avatar">{{ request.userName[0] }}</div>
                  <div class="user-details">
                    <h3>{{ request.userName }}</h3>
                    <p>{{ request.userEmail }} · {{ request.department }}</p>
                  </div>
                </div>
                <span class="request-status status-pending">승인 대기</span>
              </div>

              <div class="request-details">
                <div class="detail-item">
                  <span class="icon">📅</span>
                  <span class="label">종류:</span>
                  <span class="value">
                    <span
                      class="badge"
                      :class="
                        request.type === '연차' ? 'badge-annual' : 'badge-official'
                      "
                    >
                      {{ request.type }}
                    </span>
                  </span>
                </div>
                <div class="detail-item">
                  <span class="icon">📆</span>
                  <span class="label">기간:</span>
                  <span class="value">{{ formatDateRange(request) }}</span>
                </div>
                <div class="detail-item">
                  <span class="icon">⏰</span>
                  <span class="label">시간:</span>
                  <span class="value">{{ request.timeSlot }} ({{ request.days }}일)</span>
                </div>
                <div class="detail-item">
                  <span class="icon">📝</span>
                  <span class="label">신청일:</span>
                  <span class="value">{{ formatDate(request.createdAt) }}</span>
                </div>
              </div>

              <div class="request-reason">
                <strong>사유:</strong> {{ request.reason }}
              </div>

              <div class="request-actions">
                <button
                  class="btn btn-reject"
                  @click="rejectRequest(request)"
                  :disabled="processing"
                >
                  거부
                </button>
                <button
                  class="btn btn-approve"
                  @click="approveRequest(request)"
                  :disabled="processing"
                >
                  승인
                </button>
              </div>
            </div>
          </div>

          <!-- 빈 상태 -->
          <div v-else class="empty-state">
            <div class="icon">📭</div>
            <h3>대기 중인 신청이 없습니다</h3>
            <p>모든 휴가 신청이 처리되었습니다.</p>
          </div>
        </div>
      </div>

      <!-- 직원별 통계 탭 -->
      <div v-show="activeTab === 'statistics'" class="tab-content">
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">직원별 연차 사용 현황</h2>
            <div class="filter-group">
              <select v-model="filters.department" class="filter-select">
                <option value="">전체 부서</option>
                <option value="개발팀">개발팀</option>
                <option value="디자인팀">디자인팀</option>
                <option value="기획팀">기획팀</option>
                <option value="경영지원팀">경영지원팀</option>
              </select>
            </div>
          </div>

          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="이름 또는 이메일로 검색..."
            />
          </div>

          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>직원명</th>
                  <th>이메일</th>
                  <th>부서</th>
                  <th>총 연차</th>
                  <th>사용</th>
                  <th>잔여</th>
                  <th>사용률</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="stat in filteredUserStats" :key="stat.userId">
                  <td><strong>{{ stat.name }}</strong></td>
                  <td>{{ stat.email }}</td>
                  <td>{{ stat.department }}</td>
                  <td>{{ stat.totalLeave }}일</td>
                  <td>{{ stat.usedLeave }}일</td>
                  <td>{{ stat.remainingLeave }}일</td>
                  <td>
                    {{ stat.usageRate }}%
                    <div class="progress-bar">
                      <div
                        class="progress-fill"
                        :style="{ width: stat.usageRate + '%' }"
                      ></div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- 전체 내역 탭 -->
      <div v-show="activeTab === 'history'" class="tab-content">
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">휴가 신청 전체 내역</h2>
            <div class="filter-group">
              <select v-model="filters.historyStatus" class="filter-select">
                <option value="">전체 상태</option>
                <option value="approved">승인</option>
                <option value="rejected">거부</option>
                <option value="pending">대기</option>
                <option value="cancelled">취소</option>
              </select>
              <select v-model="filters.period" class="filter-select">
                <option value="this-month">이번 달</option>
                <option value="last-month">지난 달</option>
                <option value="recent-3">최근 3개월</option>
                <option value="all">전체</option>
              </select>
            </div>
          </div>

          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input
              v-model="historySearchQuery"
              type="text"
              placeholder="직원명으로 검색..."
            />
          </div>

          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>신청일</th>
                  <th>직원명</th>
                  <th>종류</th>
                  <th>기간</th>
                  <th>일수</th>
                  <th>상태</th>
                  <th>처리일</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="history in filteredHistory" :key="history.id">
                  <td>{{ formatDate(history.createdAt) }}</td>
                  <td>{{ history.userName }}</td>
                  <td>
                    <span
                      class="badge"
                      :class="
                        history.type === '연차' ? 'badge-annual' : 'badge-official'
                      "
                    >
                      {{ history.type }}
                    </span>
                  </td>
                  <td>{{ formatDateRange(history) }}</td>
                  <td>{{ history.days }}일</td>
                  <td>
                    <span
                      class="request-status"
                      :class="`status-${history.status}`"
                    >
                      {{ getStatusText(history.status) }}
                    </span>
                  </td>
                  <td>
                    {{ history.approvedAt ? formatDate(history.approvedAt) : '-' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ✅ 직원 관리 탭 -->
      <div v-show="activeTab === 'users'" class="tab-content">
        <UserManagement />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { api } from '@/services/api';
import UserManagement from './UserManagement.vue';

export default {
  name: 'AdminDashboard',
  components: {
    UserManagement
  },
  setup() {
    const store = useStore();
    const user = computed(() => store.state.user);

    const activeTab = ref('pending');
    const loading = ref(true);
    const processing = ref(false);
    const searchQuery = ref('');
    const historySearchQuery = ref('');

    const statistics = reactive({
      pending: 0,
      approvedThisMonth: 0,
      totalUsers: 0,
      averageUsageRate: 0,
      monthOverMonthChange: 0
    });

    const filters = reactive({
      type: '',
      sort: 'latest',
      department: '',
      historyStatus: '',
      period: 'this-month'
    });

    const pendingRequests = ref([]);
    const userStats = ref([]);
    const allHistory = ref([]);

    // 필터링된 대기 중 신청
    const filteredPendingRequests = computed(() => {
      let result = [...pendingRequests.value];

      if (filters.type) {
        result = result.filter((r) => r.type === filters.type);
      }

      if (filters.sort === 'oldest') {
        result.sort((a, b) => a.createdAt - b.createdAt);
      } else if (filters.sort === 'longest') {
        result.sort((a, b) => b.days - a.days);
      }

      return result;
    });

    // 필터링된 직원 통계
    const filteredUserStats = computed(() => {
      let result = [...userStats.value];

      if (filters.department) {
        result = result.filter((s) => s.department === filters.department);
      }

      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        result = result.filter(
          (s) =>
            s.name.toLowerCase().includes(query) ||
            s.email.toLowerCase().includes(query)
        );
      }

      return result;
    });

    // 필터링된 전체 내역
    const filteredHistory = computed(() => {
      let result = [...allHistory.value];

      if (filters.historyStatus) {
        result = result.filter((h) => h.status === filters.historyStatus);
      }

      if (historySearchQuery.value) {
        const query = historySearchQuery.value.toLowerCase();
        result = result.filter((h) => h.userName.toLowerCase().includes(query));
      }

      return result;
    });

    // 날짜 포맷팅
    const formatDate = (date) => {
      if (!date) return '-';

      let d;

      if (date?._seconds) {
        d = new Date(date._seconds * 1000);
      } else if (date?.toDate) {
        d = date.toDate();
      } else {
        d = new Date(date);
      }

      if (isNaN(d.getTime())) return '-';

      return d.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    // 날짜 범위 포맷팅
    const formatDateRange = (request) => {
      const start = formatDate(request.startDate);
      const end = formatDate(request.endDate);

      if (start === end) {
        return `${start} (${request.timeSlot})`;
      }
      return `${start} ~ ${end}`;
    };

    // 상태 텍스트
    const getStatusText = (status) => {
      const statusMap = {
        pending: '⏳ 승인 대기',
        approved: '✅ 승인 완료',
        rejected: '❌ 거부됨',
        cancelled: '🗑️ 취소됨' 
      };
      return statusMap[status] || status;
    };

    // 데이터 로드
    const loadData = async () => {
      loading.value = true;
      try {
        // 대기 중인 신청
        const pendingResponse = await api.getPendingVacations();
        pendingRequests.value = pendingResponse.vacations || [];
        statistics.pending = pendingRequests.value.length;

        // 직원별 통계
        const statsResponse = await api.getUserStatistics();
        userStats.value = statsResponse.statistics || [];
        
        
        // 전체 내역
        const historyResponse = await api.getAllVacations();
        allHistory.value = historyResponse.vacations || [];

        // ✅ 통계 API 호출 (추가!)
        const statisticsResponse = await api.getStatistics();
        if (statisticsResponse.statistics) {
          const apiStats = statisticsResponse.statistics;
          
          statistics.approvedThisMonth = apiStats.approvedThisMonth || 0;
          statistics.totalUsers = apiStats.totalUsers || 0;
          statistics.averageUsageRate = apiStats.averageUsageRate || 0;
          statistics.monthOverMonthChange = apiStats.monthOverMonthChange || 0;
          
          console.log('📊 통계 로드 완료:', {
            이번달승인: statistics.approvedThisMonth,
            전체직원: statistics.totalUsers,
            평균사용률: statistics.averageUsageRate + '%',
            전월대비: statistics.monthOverMonthChange + '%'
          });
        }

      } catch (error) {
        console.error('데이터 로드 실패:', error);
        alert('데이터를 불러오는데 실패했습니다.');
      } finally {
        loading.value = false;
      }
    };

    // 휴가 승인
    const approveRequest = async (request) => {
      if (
        !confirm(
          `${request.userName}님의 휴가 신청을 승인하시겠습니까?\n\n승인 시 다음 작업이 수행됩니다:\n• Google 캘린더에 일정 등록\n• 승인 완료 이메일 발송\n• 연차 일수 차감`
        )
      ) {
        return;
      }

      processing.value = true;
      try {
        await api.approveVacation(request.id);
        alert(
          `${request.userName}님의 휴가가 승인되었습니다.\n\n✓ Google 캘린더 등록 완료\n✓ 승인 메일 발송 완료`
        );
        await loadData();
      } catch (error) {
        console.error('승인 실패:', error);
        alert('승인 처리에 실패했습니다. 다시 시도해주세요.');
      } finally {
        processing.value = false;
      }
    };

    // 휴가 거부
    const rejectRequest = async (request) => {
      const reason = prompt(
        `${request.userName}님의 휴가 신청을 거부하시겠습니까?\n\n거부 사유를 입력해주세요 (선택사항):`
      );

      if (reason === null) return;

      processing.value = true;
      try {
        await api.rejectVacation(request.id, {
          reason: reason || '승인 불가'
        });
        alert(`${request.userName}님의 휴가 신청이 거부되었습니다.\n거부 메일이 발송됩니다.`);
        await loadData();
      } catch (error) {
        console.error('거부 실패:', error);
        alert('거부 처리에 실패했습니다. 다시 시도해주세요.');
      } finally {
        processing.value = false;
      }
    };

    onMounted(() => {
      loadData();
    });

    return {
      user,
      activeTab,
      loading,
      processing,
      searchQuery,
      historySearchQuery,
      statistics,
      filters,
      pendingRequests,
      userStats,
      allHistory,
      filteredPendingRequests,
      filteredUserStats,
      filteredHistory,
      formatDate,
      formatDateRange,
      getStatusText,
      approveRequest,
      rejectRequest
    };
  }
};
</script>

<style scoped>
/* 기존 스타일 유지 */
* {
  box-sizing: border-box;
}

.admin-dashboard {
  min-height: 100vh;
  background: #f5f7fa;
}

.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 24px 40px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h1 {
  font-size: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.admin-badge {
  background: rgba(255, 255, 255, 0.25);
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.admin-info {
  font-size: 14px;
  opacity: 0.9;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.stat-card .icon {
  font-size: 32px;
  margin-bottom: 12px;
}

.stat-card .label {
  font-size: 13px;
  color: #718096;
  margin-bottom: 8px;
}

.stat-card .value {
  font-size: 28px;
  font-weight: 700;
  color: #2d3748;
}

.stat-card .subtext {
  font-size: 12px;
  color: #a0aec0;
  margin-top: 8px;
}

.tabs {
  background: white;
  border-radius: 12px;
  padding: 8px;
  margin-bottom: 24px;
  display: flex;
  gap: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.tab {
  flex: 1;
  padding: 12px 24px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: #718096;
  transition: all 0.2s;
}

.tab.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.tab:hover:not(.active) {
  background: #f7fafc;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f7fafc;
}

.card-title {
  font-size: 18px;
  font-weight: 700;
  color: #2d3748;
}

.filter-group {
  display: flex;
  gap: 12px;
  align-items: center;
}

.filter-select {
  padding: 8px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
}

.filter-select:focus {
  outline: none;
  border-color: #667eea;
}

.search-box {
  position: relative;
  margin-bottom: 20px;
}

.search-box input {
  width: 100%;
  padding: 12px 16px 12px 44px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
}

.search-box input:focus {
  outline: none;
  border-color: #667eea;
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 18px;
  color: #a0aec0;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #718096;
}

.vacation-request {
  padding: 20px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  margin-bottom: 16px;
  transition: all 0.2s;
}

.vacation-request:hover {
  border-color: #667eea;
  background: #f7fafc;
}

.request-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.request-user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 18px;
}

.user-details h3 {
  font-size: 16px;
  color: #2d3748;
  margin-bottom: 4px;
}

.user-details p {
  font-size: 13px;
  color: #718096;
}

.request-status {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.status-pending {
  background: #fef5e7;
  color: #d68910;
}

.status-approved {
  background: #d4edda;
  color: #155724;
}

.status-rejected {
  background: #f8d7da;
  color: #721c24;
}

.status-cancelled {
  background: #f3f4f6;
  color: #4b5563;
}

.request-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.detail-item .icon {
  font-size: 16px;
}

.detail-item .label {
  color: #718096;
  margin-right: 4px;
}

.detail-item .value {
  color: #2d3748;
  font-weight: 600;
}

.request-reason {
  background: #f7fafc;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  color: #4a5568;
  margin-bottom: 16px;
}

.request-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-approve {
  background: #48bb78;
  color: white;
}

.btn-approve:hover:not(:disabled) {
  background: #38a169;
  transform: translateY(-2px);
}

.btn-reject {
  background: #f56565;
  color: white;
}

.btn-reject:hover:not(:disabled) {
  background: #e53e3e;
  transform: translateY(-2px);
}

.badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

.badge-annual {
  background: #bee3f8;
  color: #2c5282;
}

.badge-official {
  background: #feebc8;
  color: #7c2d12;
}

.table-container {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  background: #f7fafc;
  padding: 14px 16px;
  text-align: left;
  font-size: 13px;
  font-weight: 700;
  color: #4a5568;
  border-bottom: 2px solid #e2e8f0;
}

td {
  padding: 16px;
  border-bottom: 1px solid #e2e8f0;
  font-size: 13px;
  color: #2d3748;
}

tr:hover {
  background: #f7fafc;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #a0aec0;
}

.empty-state .icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-state h3 {
  font-size: 18px;
  color: #718096;
  margin-bottom: 8px;
}

.empty-state p {
  font-size: 14px;
}

@media (max-width: 768px) {
  .container {
    padding: 16px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .tabs {
    flex-direction: column;
  }

  .request-details {
    grid-template-columns: 1fr;
  }

  .filter-group {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>