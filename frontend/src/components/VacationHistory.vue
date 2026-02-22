<template>
  <div class="vacation-history-page">
    <!-- 헤더 -->
    <div class="header">
      <div class="header-content">
        <h1>📅 내 휴가 내역</h1>
        <p>{{ user.name }} ({{ user.email }})</p>
        <div class="user-summary">
          <div class="summary-item">
            <div class="summary-label">총 연차</div>
            <div class="summary-value">
              {{ user.totalLeave }}<small>일</small>
            </div>
            <div class="summary-subtext">2026년 기준</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">사용 연차</div>
            <div class="summary-value">
              {{ user.usedLeave }}<small>일</small>
            </div>
            <div class="summary-subtext">
              {{ Math.round((user.usedLeave / user.totalLeave) * 100) }}% 사용
            </div>
          </div>
          <div class="summary-item">
            <div class="summary-label">잔여 연차</div>
            <div class="summary-value">
              {{ user.remainingLeave }}<small>일</small>
            </div>
            <div class="summary-subtext">
              {{ Math.round((user.remainingLeave / user.totalLeave) * 100) }}% 남음
            </div>
          </div>
          <div class="summary-item">
            <div class="summary-label">대기중</div>
            <div class="summary-value">
              {{ pendingCount }}<small>건</small>
            </div>
            <div class="summary-subtext">승인 대기</div>
          </div>
        </div>
      </div>
    </div>

    <div class="container">
      <!-- 액션 바 -->
      <div class="action-bar">
        <div class="filter-group">
          <select v-model="filters.status" class="filter-select">
            <option value="">전체 상태</option>
            <option value="pending">승인 대기</option>
            <option value="approved">승인 완료</option>
            <option value="rejected">거부됨</option>
            <option value="cancelled">취소됨</option>
          </select>
          <select v-model="filters.type" class="filter-select">
            <option value="">전체 종류</option>
            <option value="연차">연차</option>
            <option value="공가">공가</option>
          </select>
          <select v-model="filters.period" class="filter-select">
            <option value="all">전체 기간</option>
            <option value="this-month">이번 달</option>
            <option value="last-month">지난 달</option>
            <option value="this-year">올해</option>
          </select>
        </div>
        <button class="btn-new" @click="$router.push('/vacations/request')">
          <span>➕</span>
          <span>새 휴가 신청</span>
        </button>
      </div>

      <!-- 미니 통계 -->
      <div class="card">
        <div class="stats-mini">
          <div class="stat-mini">
            <div class="icon">📊</div>
            <div class="label">총 신청</div>
            <div class="value">{{ statistics.total }}</div>
          </div>
          <div class="stat-mini">
            <div class="icon">✅</div>
            <div class="label">승인</div>
            <div class="value">{{ statistics.approved }}</div>
          </div>
          <div class="stat-mini">
            <div class="icon">⏳</div>
            <div class="label">대기</div>
            <div class="value">{{ statistics.pending }}</div>
          </div>
          <div class="stat-mini">
            <div class="icon">❌</div>
            <div class="label">거부</div>
            <div class="value">{{ statistics.rejected }}</div>
          </div>
           <div class="stat-mini">
            <div class="icon">🗑️</div>
            <div class="label">취소</div>
            <div class="value">{{ statistics.cancelled }}</div>
          </div>
        </div>
      </div>

      <!-- 휴가 내역 -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">휴가 신청 내역</h2>
        </div>

        <!-- 로딩 -->
        <div v-if="loading" class="loading">로딩 중...</div>

        <!-- 타임라인 -->
        <div v-else-if="groupedVacations.length > 0" class="timeline">
          <template v-for="group in groupedVacations" :key="group.month">
            <div class="month-divider">📅 {{ group.month }}</div>

            <div
              v-for="vacation in group.items"
              :key="vacation.id"
              class="timeline-item"
              :class="`status-${vacation.status}`"
            >
              <!-- 신청 헤더 -->
              <div class="item-header">
                <div>
                  <div class="item-title">{{ vacation.title }}</div>
                  <div class="item-date">
                    신청일: {{ formatDate(vacation.createdAt) }}
                    <span v-if="vacation.approvedAt">
                      · {{ getApprovalText(vacation.status) }}:
                      {{ formatDate(vacation.approvedAt) }}
                    </span>
                  </div>
                </div>
                <span class="status-badge" :class="`status-${vacation.status}`">
                  {{ getStatusText(vacation.status) }}
                </span>
              </div>

              <!-- 상세 정보 -->
              <div class="item-details">
                <div class="detail-item">
                  <span class="icon">📅</span>
                  <span class="label">종류:</span>
                  <span class="value">
                    <span
                      class="badge"
                      :class="
                        vacation.type === '연차' ? 'badge-annual' : 'badge-official'
                      "
                    >
                      {{ vacation.type }}
                    </span>
                  </span>
                </div>
                <div class="detail-item">
                  <span class="icon">📆</span>
                  <span class="label">기간:</span>
                  <span class="value">{{ formatDateRange(vacation) }}</span>
                </div>
                <div class="detail-item">
                  <span class="icon">⏰</span>
                  <span class="label">시간:</span>
                  <span class="value">
                    {{ vacation.timeSlot }} ({{ vacation.days }}일)
                  </span>
                </div>
              </div>

              <!-- 사유 -->
              <div class="item-reason">
                <strong>사유:</strong> {{ vacation.reason }}
              </div>

              <!-- 승인/거부 정보 -->
              <div
                v-if="vacation.status === 'pending'"
                class="approval-info"
              >
                <span class="icon">ℹ️</span>
                <span>관리자 승인 대기 중입니다.</span>
              </div>
              <div
                v-else-if="vacation.status === 'approved'"
                class="approval-info"
              >
                <span class="icon">👤</span>
                <span>{{ vacation.approvedByName || vacation.approvedBy || '관리자' }}님이 승인하였습니다.</span>
              </div>
              <div
                v-else-if="vacation.status === 'rejected'"
                class="approval-info"
                style="background: #fee; color: #c53030"
              >
                <span class="icon">⚠️</span>
                <span>
                  <strong>거부 사유:</strong> {{ vacation.rejectedReason }}
                </span>
              </div>
              <div v-else-if="vacation.status === 'cancelled'" 
                class="approval-info" 
                style="background: #f3f4f6; color: #4b5563"
              >
                <span class="icon">🗑️</span>
                <span>취소된 휴가 신청입니다.</span>
              </div>

              <!-- 액션 버튼 -->
              <div class="item-actions">
                <template v-if="vacation.status === 'pending'">
                  <button
                    class="btn btn-edit"
                    @click="editVacation(vacation)"
                    :disabled="processing"
                  >
                    수정
                  </button>
                  <button
                    class="btn btn-cancel"
                    @click="cancelVacation(vacation)"
                    :disabled="processing"
                  >
                    취소
                  </button>
                </template>
                <template v-else-if="vacation.status === 'approved'">
                  <a
                    href="#"
                    class="calendar-link"
                    @click.prevent="openCalendar(vacation)"
                  >
                    📅 캘린더에서 보기
                  </a>
                  <button class="btn btn-disabled" disabled>승인 완료</button>
                </template>
                 <template v-else-if="vacation.status === 'cancelled'">
                  <button class="btn btn-disabled" disabled>취소됨</button>
                </template>
                <template v-else>
                  <button class="btn btn-disabled" disabled>거부됨</button>
                </template>
              </div>
            </div>
          </template>
        </div>

        <!-- 빈 상태 -->
        <div v-else class="empty-state">
          <div class="icon">📭</div>
          <h3>휴가 신청 내역이 없습니다</h3>
          <p>첫 휴가를 신청해보세요!</p>
          <button class="btn-new" @click="$router.push('/vacations/request')">
            <span>➕</span>
            <span>휴가 신청하기</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { api } from '@/services/api';

export default {
  name: 'VacationHistory',
  setup() {
    const router = useRouter();
    const store = useStore();
    const user = computed(() => store.state.user);

    const loading = ref(true);
    const processing = ref(false);
    const vacations = ref([]);

    const filters = reactive({
      status: '',
      type: '',
      period: 'all'
    });

    const statistics = reactive({
      total: 0,
      approved: 0,
      pending: 0,
      rejected: 0,
      cancelled: 0
    });

    // 대기 중인 신청 수
    const pendingCount = computed(() => {
      return vacations.value.filter((v) => v.status === 'pending').length;
    });

    // 필터링된 휴가
    const filteredVacations = computed(() => {
      let result = [...vacations.value];

      if (filters.status) {
        result = result.filter((v) => v.status === filters.status);
      }

      if (filters.type) {
        result = result.filter((v) => v.type === filters.type);
      }

      if (filters.period !== 'all') {
        const now = new Date();
        result = result.filter((v) => {
          const startDate = v.startDate.toDate
            ? v.startDate.toDate()
            : new Date(v.startDate);

          if (filters.period === 'this-month') {
            return (
              startDate.getMonth() === now.getMonth() &&
              startDate.getFullYear() === now.getFullYear()
            );
          } else if (filters.period === 'last-month') {
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
            return (
              startDate.getMonth() === lastMonth.getMonth() &&
              startDate.getFullYear() === lastMonth.getFullYear()
            );
          } else if (filters.period === 'this-year') {
            return startDate.getFullYear() === now.getFullYear();
          }
          return true;
        });
      }

      return result;
    });

    // 월별로 그룹화
    const groupedVacations = computed(() => {
      const groups = {};

      filteredVacations.value.forEach((vacation) => {
        const date = vacation.startDate.toDate
          ? vacation.startDate.toDate()
          : new Date(vacation.startDate);
        const monthKey = `${date.getFullYear()}년 ${date.getMonth() + 1}월`;

        if (!groups[monthKey]) {
          groups[monthKey] = [];
        }
        groups[monthKey].push(vacation);
      });

      return Object.keys(groups)
        .sort((a, b) => {
          const [yearA, monthA] = a.match(/\d+/g).map(Number);
          const [yearB, monthB] = b.match(/\d+/g).map(Number);
          return yearB * 12 + monthB - (yearA * 12 + monthA);
        })
        .map((month) => ({
          month,
          items: groups[month].sort((a, b) => {
            const dateA = a.startDate.toDate
              ? a.startDate.toDate()
              : new Date(a.startDate);
            const dateB = b.startDate.toDate
              ? b.startDate.toDate()
              : new Date(b.startDate);
            return dateB - dateA;
          })
        }));
    });

    // 날짜 포맷팅
    const formatDate = (date) => {
      if (!date) return '-';

      let d;

      // Firestore Timestamp 객체인 경우 (_seconds 필드 존재)
      if (date?._seconds) {
        d = new Date(date._seconds * 1000);

      // Firestore Timestamp toDate() 메서드가 있는 경우
      } else if (date?.toDate) {
        d = date.toDate();

      // 일반 문자열/숫자인 경우
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
    const formatDateRange = (vacation) => {
      const start = formatDate(vacation.startDate);
      const end = formatDate(vacation.endDate);

      if (start === end) {
        return `${start} (${vacation.timeSlot})`;
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

    // 승인/거부 텍스트
    const getApprovalText = (status) => {
      return status === 'approved' ? '승인일' : '거부일';
    };

    // 데이터 로드
    const loadVacations = async () => {
      loading.value = true;
      try {
        const response = await api.getMyVacations();
        vacations.value = response.vacations || [];

        // 통계 계산
        statistics.total = vacations.value.length;
        statistics.approved = vacations.value.filter(
          (v) => v.status === 'approved'
        ).length;
        statistics.pending = vacations.value.filter(
          (v) => v.status === 'pending'
        ).length;
        statistics.rejected = vacations.value.filter(
          (v) => v.status === 'rejected'
        ).length;
        statistics.cancelled = vacations.value.filter( 
          (v) => v.status === 'cancelled'
    ).length;
      } catch (error) {
        console.error('휴가 내역 로드 실패:', error);
        alert('휴가 내역을 불러오는데 실패했습니다.');
      } finally {
        loading.value = false;
      }
    };

    // 휴가 취소
   const cancelVacation = async (vacation) => {
      if (
        !confirm(
          `"${vacation.title}" 휴가 신청을 취소하시겠습니까?\n\n취소 후에는 복구할 수 없습니다.`
        )
      ) {
        return;
      }

      processing.value = true;
      try {
        // ✅ 수정: cancelVacation 사용
        await api.cancelVacation(vacation.id);
        alert(`"${vacation.title}" 휴가 신청이 취소되었습니다.`);
        await loadVacations();
      } catch (error) {
        console.error('휴가 취소 실패:', error);
        
        const errorMsg = error.response?.data?.error;
        if (errorMsg === 'Only pending requests can be cancelled') {
          alert('대기 중인 휴가만 취소할 수 있습니다.');
        } else {
          alert('휴가 취소에 실패했습니다. 다시 시도해주세요.');
        }
      } finally {
        processing.value = false;
      }
    };

    // 휴가 수정
    const editVacation = (vacation) => {
      router.push({
        name: 'VacationEdit',
        params: { id: vacation.id }
      });
    };

    // 캘린더 열기
    const openCalendar = (vacation) => {
      if (vacation.googleCalendarEventId) {

        // ✅ store에서 로그인한 사용자 이메일 가져오기
        const userEmail = store.getters.user?.email;

        if (!userEmail) {
          alert('사용자 정보를 찾을 수 없습니다.');
          return;
        }

        const eid = btoa(`${vacation.googleCalendarEventId} ${userEmail}`)
          .replace(/=/g, '');

        window.open(
          `https://calendar.google.com/calendar/event?eid=${eid}`,
          '_blank'
        );

      } else {
        alert('캘린더 이벤트 정보를 찾을 수 없습니다.');
      }
    };

    onMounted(() => {
      loadVacations();
    });

    return {
      user,
      loading,
      processing,
      vacations,
      filters,
      statistics,
      pendingCount,
      groupedVacations,
      formatDate,
      formatDateRange,
      getStatusText,
      getApprovalText,
      cancelVacation,
      editVacation,
      openCalendar
    };
  }
};
</script>

<style scoped>
/* 여기에 vacation_history.html의 <style> 내용을 복사하세요 */

* {
  box-sizing: border-box;
}

.vacation-history-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 40px;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
}

.header h1 {
  font-size: 28px;
  margin-bottom: 8px;
}

.header p {
  opacity: 0.9;
  font-size: 14px;
  margin-bottom: 24px;
}

.user-summary {
  background: rgba(255, 255, 255, 0.15);
  padding: 20px;
  border-radius: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.summary-item {
  text-align: center;
}

.summary-label {
  font-size: 13px;
  opacity: 0.9;
  margin-bottom: 8px;
}

.summary-value {
  font-size: 32px;
  font-weight: 700;
}

.summary-value small {
  font-size: 18px;
}

.summary-subtext {
  font-size: 12px;
  opacity: 0.8;
  margin-top: 4px;
}

.container {
  max-width: 1200px;
  margin: -40px auto 40px;
  padding: 0 20px;
}

.action-bar {
  background: white;
  padding: 20px 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.filter-group {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.filter-select {
  padding: 10px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  background: white;
}

.filter-select:focus {
  outline: none;
  border-color: #667eea;
}

.btn-new {
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-new:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
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
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f7fafc;
}

.card-title {
  font-size: 20px;
  font-weight: 700;
  color: #2d3748;
}

.stats-mini {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-mini {
  background: white;
  padding: 16px;
  border-radius: 8px;
  border: 2px solid #e2e8f0;
  text-align: center;
}

.stat-mini .icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.stat-mini .label {
  font-size: 12px;
  color: #718096;
  margin-bottom: 4px;
}

.stat-mini .value {
  font-size: 20px;
  font-weight: 700;
  color: #2d3748;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #718096;
}

.timeline {
  position: relative;
  padding-left: 40px;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 11px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
}

.month-divider {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 40px 0 24px;
  color: #4a5568;
  font-weight: 700;
}

.month-divider::before,
.month-divider::after {
  content: '';
  flex: 1;
  height: 2px;
  background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
}

.timeline-item {
  position: relative;
  margin-bottom: 32px;
  padding: 20px;
  background: #f7fafc;
  border-radius: 12px;
  border-left: 4px solid #e2e8f0;
  transition: all 0.2s;
}

.timeline-item:hover {
  border-left-color: #667eea;
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateX(4px);
}

.timeline-item::before {
  content: '';
  position: absolute;
  left: -44px;
  top: 24px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: white;
  border: 4px solid #667eea;
  z-index: 1;
}

.timeline-item.status-pending::before {
  border-color: #f59e0b;
}

.timeline-item.status-approved::before {
  border-color: #10b981;
  background: #10b981;
}

.timeline-item.status-rejected::before {
  border-color: #ef4444;
  background: #ef4444;
}

.timeline-item.status-cancelled::before {
  border-color: #9ca3af;
  background: #9ca3af;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.item-title {
  font-size: 18px;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 8px;
}

.item-date {
  font-size: 13px;
  color: #718096;
}

.status-badge {
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

.item-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
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

.item-reason {
  background: white;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  color: #4a5568;
  margin-bottom: 16px;
  border-left: 3px solid #667eea;
}

.approval-info {
  background: #f7fafc;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.approval-info .icon {
  font-size: 16px;
}

.item-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 16px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-cancel {
  background: #fee;
  color: #c53030;
}

.btn-cancel:hover:not(:disabled) {
  background: #fc8181;
  color: white;
}

.btn-edit {
  background: #e6f2ff;
  color: #2563eb;
}

.btn-edit:hover:not(:disabled) {
  background: #3b82f6;
  color: white;
}

.btn-disabled {
  background: #e2e8f0;
  color: #a0aec0;
  cursor: not-allowed;
}

.calendar-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #e6f2ff;
  color: #2563eb;
  border-radius: 6px;
  text-decoration: none;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s;
}

.calendar-link:hover {
  background: #3b82f6;
  color: white;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: #a0aec0;
}

.empty-state .icon {
  font-size: 80px;
  margin-bottom: 20px;
}

.empty-state h3 {
  font-size: 20px;
  color: #718096;
  margin-bottom: 12px;
}

.empty-state p {
  font-size: 14px;
  margin-bottom: 24px;
}

@media (max-width: 768px) {
  .container {
    margin-top: 0;
    padding: 0 16px;
  }

  .header {
    padding: 24px 16px;
  }

  .user-summary {
    grid-template-columns: 1fr 1fr;
  }

  .action-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-group {
    flex-direction: column;
  }

  .timeline {
    padding-left: 30px;
  }

  .timeline::before {
    left: 6px;
  }

  .timeline-item::before {
    left: -34px;
    width: 16px;
    height: 16px;
    border-width: 3px;
  }

  .item-details {
    grid-template-columns: 1fr;
  }
}
</style>
