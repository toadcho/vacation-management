<template>
  <div class="vacation-edit-page">
    <!-- 헤더 -->
    <div class="header">
      <div class="header-content">
        <h1>✏️ 휴가 수정</h1>
        <p>휴가 신청 내용을 수정해주세요</p>
        <div class="user-info">
          <div>
            <div class="name">{{ user.name }} ({{ user.email }})</div>
          </div>
          <div class="remaining">
            💼 잔여 연차: <strong>{{ user.remainingLeave }}일</strong>
          </div>
        </div>
      </div>
    </div>

    <!-- 로딩 -->
    <div v-if="isLoading" class="loading-container">
      <div class="spinner"></div>
      <p>휴가 정보를 불러오는 중...</p>
    </div>

    <!-- 폼 컨테이너 -->
    <div v-else class="container">
      <div class="form-container">
        <form @submit.prevent="submitEdit">
          <!-- 휴가 제목 -->
          <div class="form-group">
            <label for="title">
              휴가 제목 <span class="required">*</span>
            </label>
            <input
              type="text"
              id="title"
              v-model="formData.title"
              placeholder="예: 여름휴가, 개인 사유"
              required
            />
          </div>

          <!-- 휴가 종류 -->
          <div class="form-group">
            <label>휴가 종류 <span class="required">*</span></label>
            <div class="radio-group">
              <div class="radio-option">
                <input
                  type="radio"
                  id="annual"
                  value="연차"
                  v-model="formData.type"
                />
                <label for="annual">📅 연차</label>
              </div>
              <div class="radio-option">
                <input
                  type="radio"
                  id="official"
                  value="공가"
                  v-model="formData.type"
                />
                <label for="official">🏛️ 공가</label>
              </div>
            </div>
          </div>

          <!-- 휴가 기간 -->
          <div class="form-group">
            <label>휴가 기간 <span class="required">*</span></label>
            <div class="date-range">
              <div>
                <input
                  type="date"
                  id="startDate"
                  v-model="formData.startDate"
                  :min="today"
                  @change="onDateChange"
                  required
                />
                <small>시작일</small>
              </div>
              <div>
                <input
                  type="date"
                  id="endDate"
                  v-model="formData.endDate"
                  :min="formData.startDate"
                  @change="onDateChange"
                  required
                />
                <small>종료일</small>
              </div>
            </div>
          </div>

          <!-- 시간 구분 -->
          <div class="form-group">
            <label>시간 구분 <span class="required">*</span></label>
            <div class="time-slots">
              <div class="time-slot">
                <input
                  type="radio"
                  id="morning"
                  value="오전"
                  v-model="formData.timeSlot"
                  @change="calculateDays"
                />
                <label for="morning">
                  🌅 오전<br />
                  <small>09:00-13:00</small>
                </label>
              </div>
              <div class="time-slot">
                <input
                  type="radio"
                  id="afternoon"
                  value="오후"
                  v-model="formData.timeSlot"
                  @change="calculateDays"
                />
                <label for="afternoon">
                  🌆 오후<br />
                  <small>14:00-18:00</small>
                </label>
              </div>
              <div class="time-slot">
                <input
                  type="radio"
                  id="allday"
                  value="종일"
                  v-model="formData.timeSlot"
                  @change="calculateDays"
                />
                <label for="allday">
                  ☀️ 종일<br />
                  <small>09:00-18:00</small>
                </label>
              </div>
            </div>

            <!-- 사용 일수 미리보기 -->
            <div v-if="usagePreview.show" class="usage-preview active">
              <div class="usage-item">
                <span>신청 일수:</span>
                <span>{{ usagePreview.requestedDays }}일</span>
              </div>
              <div class="usage-item">
                <span>신청 후 잔여:</span>
                <span :style="{ color: usagePreview.color }">
                  {{ usagePreview.remainingDays }}일
                </span>
              </div>
            </div>
          </div>

          <!-- 휴가 사유 -->
          <div class="form-group">
            <label for="reason">휴가 사유 <span class="required">*</span></label>
            <textarea
              id="reason"
              v-model="formData.reason"
              placeholder="휴가 사유를 입력해주세요"
              maxlength="500"
              required
            ></textarea>
            <div class="char-count">{{ formData.reason.length }} / 500</div>
          </div>

          <!-- 안내사항 -->
          <div class="info-box">
            ℹ️ <strong>안내사항</strong><br />
            • 대기 중인 휴가만 수정할 수 있습니다.<br />
            • 수정 후 다시 관리자 승인이 필요합니다.<br />
            • 승인된 휴가는 수정할 수 없습니다.
          </div>

          <!-- 버튼 그룹 -->
          <div class="button-group">
            <button type="button" class="btn-cancel" @click="handleCancel">
              취소
            </button>
            <button type="submit" class="btn-submit" :disabled="isSubmitting">
              {{ isSubmitting ? '수정 중...' : '휴가 수정하기' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useStore } from 'vuex';
import { api } from '@/services/api';

export default {
  name: 'VacationEdit',
  setup() {
    const router = useRouter();
    const route = useRoute();
    const store = useStore();

    const user = computed(() => store.state.user);
    const isLoading = ref(true);
    const isSubmitting = ref(false);

    const today = new Date().toISOString().split('T')[0];

    const formData = reactive({
      title: '',
      type: '연차',
      startDate: '',
      endDate: '',
      timeSlot: '종일',
      reason: ''
    });

    const originalVacation = ref(null);

    const usagePreview = reactive({
      show: false,
      requestedDays: 0,
      remainingDays: 0,
      color: '#38a169'
    });

    // 휴가 정보 로드
    const loadVacation = async () => {
      try {
        const vacationId = route.params.id;
        const response = await api.getVacation(vacationId);
        
        if (!response.success) {
          throw new Error('휴가 정보를 불러올 수 없습니다.');
        }

        const vacation = response.vacation;
        originalVacation.value = vacation;

        // 대기 중 상태 확인
        if (vacation.status !== 'pending') {
          alert('대기 중인 휴가만 수정할 수 있습니다.');
          router.push('/vacations/history');
          return;
        }

        // 폼 데이터 설정
        formData.title = vacation.title;
        formData.type = vacation.type;
        formData.startDate = vacation.startDate;
        formData.endDate = vacation.endDate;
        formData.timeSlot = vacation.timeSlot;
        formData.reason = vacation.reason;

        calculateDays();
        
      } catch (error) {
        console.error('휴가 정보 로드 실패:', error);
        alert('휴가 정보를 불러오는데 실패했습니다.');
        router.push('/vacations/history');
      } finally {
        isLoading.value = false;
      }
    };

    // 날짜 변경 핸들러
    const onDateChange = () => {
      if (formData.endDate < formData.startDate) {
        formData.endDate = formData.startDate;
      }
      calculateDays();
    };

    // 사용 일수 계산
    const calculateDays = () => {
      if (!formData.startDate || !formData.endDate) return;

      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const daysDiff = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;

      let usedDays = daysDiff;

      if (daysDiff === 1 && formData.timeSlot !== '종일') {
        usedDays = 0.5;
      }

      const afterRemaining = user.value.remainingLeave - usedDays;

      usagePreview.show = true;
      usagePreview.requestedDays = usedDays;
      usagePreview.remainingDays = afterRemaining;
      usagePreview.color = afterRemaining < 0 ? '#e53e3e' : '#38a169';
    };

    // 폼 제출
    const submitEdit = async () => {
      // 잔여 연차 확인
      if (
        formData.type === '연차' &&
        user.value.remainingLeave < usagePreview.requestedDays
      ) {
        alert(
          `잔여 연차가 부족합니다.\n필요: ${usagePreview.requestedDays}일\n잔여: ${user.value.remainingLeave}일`
        );
        return;
      }

      if (!confirm('휴가 신청 내용을 수정하시겠습니까?')) {
        return;
      }

      isSubmitting.value = true;

      try {
        const vacationId = route.params.id;
        
        await api.updateVacation(vacationId, {
          title: formData.title,
          type: formData.type,
          startDate: formData.startDate,
          endDate: formData.endDate,
          timeSlot: formData.timeSlot,
          reason: formData.reason
        });

        alert('휴가 신청이 수정되었습니다!');
        router.push('/vacations/history');
        
      } catch (error) {
        console.error('휴가 수정 실패:', error);
        
        const errorMsg = error.response?.data?.error;
        if (errorMsg === 'Only pending requests can be updated') {
          alert('대기 중인 휴가만 수정할 수 있습니다.');
        } else if (errorMsg === 'Insufficient leave balance') {
          alert('잔여 연차가 부족합니다.');
        } else {
          alert('휴가 수정에 실패했습니다. 다시 시도해주세요.');
        }
      } finally {
        isSubmitting.value = false;
      }
    };

    // 취소
    const handleCancel = () => {
      if (confirm('수정을 취소하시겠습니까?')) {
        router.push('/vacations/history');
      }
    };

    onMounted(() => {
      loadVacation();
    });

    return {
      user,
      today,
      formData,
      usagePreview,
      isLoading,
      isSubmitting,
      onDateChange,
      calculateDays,
      submitEdit,
      handleCancel
    };
  }
};
</script>

<style scoped>
/* VacationRequest.vue와 동일한 스타일 사용 */
* {
  box-sizing: border-box;
}

.vacation-edit-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: #4a5568;
}

.spinner {
  border: 4px solid #e2e8f0;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.header {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  padding: 30px;
}

.header-content {
  max-width: 800px;
  margin: 0 auto;
}

.header h1 {
  font-size: 28px;
  margin-bottom: 8px;
}

.header p {
  opacity: 0.9;
  font-size: 14px;
}

.user-info {
  background: rgba(255, 255, 255, 0.15);
  padding: 12px 16px;
  border-radius: 8px;
  margin-top: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.user-info .name {
  font-weight: 600;
}

.user-info .remaining {
  background: rgba(255, 255, 255, 0.25);
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 20px;
}

.form-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 40px;
  margin-top: -20px;
}

.form-group {
  margin-bottom: 28px;
}

label {
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
  color: #2d3748;
  font-size: 14px;
}

.required {
  color: #e53e3e;
  margin-left: 4px;
}

input[type='text'],
input[type='date'],
textarea {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
  font-family: inherit;
}

input[type='text']:focus,
input[type='date']:focus,
textarea:focus {
  outline: none;
  border-color: #f093fb;
  box-shadow: 0 0 0 3px rgba(240, 147, 251, 0.1);
}

textarea {
  resize: vertical;
  min-height: 100px;
}

.date-range {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.date-range small {
  color: #718096;
  font-size: 12px;
  margin-top: 4px;
  display: block;
}

.radio-group {
  display: flex;
  gap: 16px;
  margin-top: 8px;
}

.radio-option {
  flex: 1;
}

.radio-option input[type='radio'] {
  display: none;
}

.radio-option label {
  display: block;
  padding: 14px 20px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
  margin: 0;
}

.radio-option input[type='radio']:checked + label {
  background: #f093fb;
  border-color: #f093fb;
  color: white;
}

.radio-option label:hover {
  border-color: #f093fb;
}

.time-slots {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 8px;
}

.time-slot input[type='radio'] {
  display: none;
}

.time-slot label {
  display: block;
  padding: 12px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  margin: 0;
}

.time-slot input[type='radio']:checked + label {
  background: #f093fb;
  border-color: #f093fb;
  color: white;
}

.time-slot label:hover {
  border-color: #f093fb;
}

.time-slot label small {
  font-size: 11px;
}

.usage-preview {
  background: #f7fafc;
  padding: 16px;
  border-radius: 8px;
  margin-top: 12px;
  display: none;
}

.usage-preview.active {
  display: block;
}

.usage-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.usage-item:last-child {
  margin-bottom: 0;
  padding-top: 8px;
  border-top: 1px solid #e2e8f0;
  font-weight: 600;
}

.char-count {
  text-align: right;
  font-size: 12px;
  color: #718096;
  margin-top: 4px;
}

.info-box {
  background: #fff5f5;
  border-left: 4px solid #f093fb;
  padding: 16px;
  border-radius: 6px;
  margin-top: 12px;
  font-size: 13px;
  color: #4a5568;
}

.info-box strong {
  color: #f093fb;
}

.button-group {
  display: flex;
  gap: 12px;
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid #e2e8f0;
}

button {
  flex: 1;
  padding: 16px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-submit {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(240, 147, 251, 0.4);
}

.btn-cancel {
  background: white;
  color: #4a5568;
  border: 2px solid #e2e8f0;
}

.btn-cancel:hover {
  background: #f7fafc;
}

@media (max-width: 768px) {
  .date-range {
    grid-template-columns: 1fr;
  }

  .time-slots {
    grid-template-columns: 1fr;
  }

  .form-container {
    padding: 24px;
  }

  .button-group {
    flex-direction: column;
  }
}
</style>