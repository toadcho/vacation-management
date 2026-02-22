<template>
  <div class="vacation-request-page">
    <!-- 헤더 -->
    <div class="header">
      <div class="header-content">
        <h1>🏖️ 휴가 신청</h1>
        <p>휴가 신청서를 작성해주세요</p>
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

    <!-- 폼 컨테이너 -->
    <div class="container">
      <div class="form-container">
        <form @submit.prevent="submitVacation">
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
            • 휴가 신청 후 관리자 승인이 필요합니다.<br />
            • 승인 완료 시 이메일로 알림을 받으실 수 있습니다.<br />
            • 승인된 휴가는 자동으로 Google 캘린더에 등록됩니다.
          </div>

          <!-- 버튼 그룹 -->
          <div class="button-group">
            <button type="button" class="btn-cancel" @click="handleCancel">
              취소
            </button>
            <button type="submit" class="btn-submit" :disabled="isSubmitting">
              {{ isSubmitting ? '신청 중...' : '휴가 신청하기' }}
            </button>
          </div>
        </form>
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
  name: 'VacationRequest',
  setup() {
    const router = useRouter();
    const store = useStore();

    const user = computed(() => store.state.user);
    const isSubmitting = ref(false);

    const today = new Date().toISOString().split('T')[0];

    const formData = reactive({
      title: '',
      type: '연차',
      startDate: today,
      endDate: today,
      timeSlot: '종일',
      reason: ''
    });

    const usagePreview = reactive({
      show: false,
      requestedDays: 0,
      remainingDays: 0,
      color: '#38a169'
    });

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
    const submitVacation = async () => {
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

      isSubmitting.value = true;

      try {
        await api.createVacation({
          title: formData.title,
          type: formData.type,
          startDate: formData.startDate,
          endDate: formData.endDate,
          timeSlot: formData.timeSlot,
          reason: formData.reason
        });

        alert('휴가 신청이 완료되었습니다!\n관리자 승인 후 이메일로 알림을 받으실 수 있습니다.');
        router.push('/vacations/history');
      } catch (error) {
        console.error('휴가 신청 실패:', error);
        alert('휴가 신청에 실패했습니다. 다시 시도해주세요.');
      } finally {
        isSubmitting.value = false;
      }
    };

    // 취소
    const handleCancel = () => {
      if (confirm('작성 중인 내용이 사라집니다. 취소하시겠습니까?')) {
        router.push('/');
      }
    };

    onMounted(() => {
      calculateDays();
    });

    return {
      user,
      today,
      formData,
      usagePreview,
      isSubmitting,
      onDateChange,
      calculateDays,
      submitVacation,
      handleCancel
    };
  }
};
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.vacation-request-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
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
  background: #667eea;
  border-color: #667eea;
  color: white;
}

.radio-option label:hover {
  border-color: #667eea;
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
  background: #667eea;
  border-color: #667eea;
  color: white;
}

.time-slot label:hover {
  border-color: #667eea;
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
  background: #edf2f7;
  border-left: 4px solid #667eea;
  padding: 16px;
  border-radius: 6px;
  margin-top: 12px;
  font-size: 13px;
  color: #4a5568;
}

.info-box strong {
  color: #667eea;
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
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
