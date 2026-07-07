// Combined Attendance & Evaluation Tab
(() => {
  let studentsData = [];
  let selectedDate = null;
  let halaqaId = null;
  let canEdit = false;

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', function () {
    console.log('Combined Attendance & Evaluation tab initialized');

    // Get halaqa ID from tab content
    const tabContent = document.querySelector('.tab-content');
    if (tabContent) {
      halaqaId = parseInt(tabContent.dataset.halaqaId);
      console.log('Halaqa ID:', halaqaId);
    }

    // Listen for tab activation
    const attnEvalTab = document.getElementById('attn-eval-tab');
    if (attnEvalTab) {
      attnEvalTab.addEventListener('shown.bs.tab', function () {
        console.log('Combined tab activated');
        // Load demo data immediately for UI testing
        loadStudents();
      });
    }

    // Listen for date changes from calendar
    window.addEventListener('dateChanged', function (e) {
      console.log('Date changed event received:', e.detail);
      selectedDate = e.detail.date;
      canEdit = e.detail.canEditAttendance || e.detail.canEditEvaluation;

      // Only load if this tab is active
      const activeTab = document.querySelector('#attn-eval-tab');
      if (activeTab && activeTab.classList.contains('active')) {
        loadStudents();
      }
    });

    // Toggle expand/collapse all
    const toggleBtn = document.getElementById('toggleExpandCollapseAttnEvalBtn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', toggleExpandCollapseAll);
    }
  });

  async function loadStudents() {
    const container = document.getElementById('attnEvalStudentsList');
    if (!container) return;

    // Show loading
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px;">
        <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
          <span class="visually-hidden">جاري التحميل...</span>
        </div>
        <p class="text-muted mt-3">جاري تحميل بيانات الطلاب...</p>
      </div>
    `;

    // TODO: Replace with actual API call when backend is ready
    // For now, use demo data for UI testing
    canEdit = true; // Enable editing for demo mode
    setTimeout(() => {
      studentsData = [
        {
          student_id: 'S001',
          Student_ID: 'S001',
          full_name_official_ar: 'عبدالرحمن عبدالمجيد امين الرقعي',
          Full_Name_Official_AR: 'عبدالرحمن عبدالمجيد امين الرقعي',
          attendance_status: 1,
          evaluationData: {
            linesCount: 5,
            linesRating: 4,
            pagesCount: 2,
            pagesRating: 5,
            lessonsCount: 1,
            lessonsRating: 4,
            notes: ''
          }
        },
        {
          student_id: 'S002',
          Student_ID: 'S002',
          full_name_official_ar: 'محمد أحمد عبدالله',
          Full_Name_Official_AR: 'محمد أحمد عبدالله',
          attendance_status: 0,
          evaluationData: {
            linesCount: 0,
            linesRating: null,
            pagesCount: 0,
            pagesRating: null,
            lessonsCount: 0,
            lessonsRating: null,
            notes: ''
          }
        },
        {
          student_id: 'S003',
          Student_ID: 'S003',
          full_name_official_ar: 'خالد سعيد محمود',
          Full_Name_Official_AR: 'خالد سعيد محمود',
          attendance_status: 2,
          evaluationData: {
            linesCount: 0,
            linesRating: 0,
            pagesCount: 0,
            pagesRating: 0,
            lessonsCount: 0,
            lessonsRating: 0,
            notes: ''
          }
        }
      ];

      console.log('Combined tab - Demo data loaded:', studentsData.length);
      renderStudents();
    }, 500);

    /*
    // ACTUAL API CALL - Uncomment when backend is ready
    try {
      const response = await fetch(`/api/activities/students/halaqa/${halaqaId}?date=${selectedDate}&filter=with-attendance-evaluation`);

      if (!response.ok) {
        throw new Error('Failed to load students');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to load students');
      }

      studentsData = result.data || [];

      console.log('Combined tab - Students loaded:', studentsData.length);
      renderStudents();
    } catch (error) {
      console.error('Error loading students:', error);
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
          <i class="ti tabler-alert-circle" style="font-size: 2rem; color: var(--bs-danger);"></i>
          <p class="text-danger mt-3">حدث خطأ أثناء تحميل بيانات الطلاب</p>
          <button class="btn btn-sm btn-outline-primary mt-3" onclick="location.reload()" style="border-radius: 8px;">
            <i class="ti tabler-refresh me-1"></i>
            إعادة المحاولة
          </button>
        </div>
      `;
    }
    */
  }

  function renderStudents() {
    const container = document.getElementById('attnEvalStudentsList');
    if (!container) return;

    if (studentsData.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px;">
          <i class="ti tabler-users" style="font-size: 4rem; color: var(--bs-secondary-color); opacity: 0.5;"></i>
          <p class="text-muted mt-3">لا يوجد طلاب في هذه الحلقة</p>
        </div>
      `;
      updateSummaryCounts();
      return;
    }

    // Clear container
    container.innerHTML = '';

    // Append each student card
    studentsData.forEach(student => {
      const card = createStudentCard(student);
      container.appendChild(card);
    });

    updateSummaryCounts();
  }

  function updateSummaryCounts() {
    // Calculate attendance counts
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;
    let notMarkedCount = 0;

    // Calculate evaluation counts
    let evaluatedCount = 0;
    let notEvaluatedCount = 0;

    studentsData.forEach(student => {
      // Attendance counts
      const status = student.attendance_status || 0;
      if (status === 1) presentCount++;
      else if (status === 2) absentCount++;
      else if (status === 3) lateCount++;
      else if (status === 4) excusedCount++;
      else notMarkedCount++;

      // Evaluation counts
      const hasEvaluation =
        student.evaluationData &&
        (student.evaluationData.linesCount > 0 ||
          student.evaluationData.pagesCount > 0 ||
          student.evaluationData.lessonsCount > 0 ||
          student.evaluationData.linesRating !== null ||
          student.evaluationData.pagesRating !== null ||
          student.evaluationData.lessonsRating !== null);

      if (hasEvaluation) evaluatedCount++;
      else notEvaluatedCount++;
    });

    // Update DOM - use setTimeout to ensure DOM is ready
    setTimeout(() => {
      const presentEl = document.getElementById('attneval-present-count');
      const absentEl = document.getElementById('attneval-absent-count');
      const lateEl = document.getElementById('attneval-late-count');
      const excusedEl = document.getElementById('attneval-excused-count');
      const notMarkedEl = document.getElementById('attneval-not-marked-count');
      const evaluatedEl = document.getElementById('attneval-evaluated-count');
      const notEvaluatedEl = document.getElementById('attneval-not-evaluated-count');

      if (presentEl) presentEl.textContent = String(presentCount);
      if (absentEl) absentEl.textContent = String(absentCount);
      if (lateEl) lateEl.textContent = String(lateCount);
      if (excusedEl) excusedEl.textContent = String(excusedCount);
      if (notMarkedEl) notMarkedEl.textContent = String(notMarkedCount);
      if (evaluatedEl) evaluatedEl.textContent = String(evaluatedCount);
      if (notEvaluatedEl) notEvaluatedEl.textContent = String(notEvaluatedCount);
    }, 0);
  }

  function createStudentCard(student, index) {
    const card = document.createElement('div');
    card.className = 'attendance-student-card mb-3';
    card.style.cssText = 'border: 1px solid var(--bs-border-color); border-radius: 12px; overflow: hidden;';

    const studentId = student.student_id || student.Student_ID;
    const studentName = student.full_name_official_ar || student.Full_Name_Official_AR || 'طالب';
    const attendanceStatus = student.attendance_status || 0;

    card.innerHTML = `
      <div class="card-main-row" data-bs-toggle="collapse" data-bs-target="#attneval-${studentId}" aria-expanded="false" aria-controls="attneval-${studentId}">
        <i class="ti tabler-chevron-down toggle-chevron"></i>
        <div class="student-info-wrapper" style="flex: 1;">
          <span class="student-name">${studentName}</span>
        </div>
      </div>

      <div class="collapse" id="attneval-${studentId}">
        <div style="padding: 0;">

          <!-- Evaluation Sections Container -->
          <div class="evaluation-sections-container">
            ${createEvaluationSection(studentId, 'lines', student)}
            ${createEvaluationSection(studentId, 'pages', student)}
            ${createEvaluationSection(studentId, 'lessons', student)}
          </div>

          <!-- Attendance Buttons Wrapper -->
          <div style="padding: 16px 12px; display: flex; gap: 12px;">
            <!-- Group 1: حاضر + متأخر -->
            <div class="attendance-btn-group">
              <button type="button" class="attendance-btn ${attendanceStatus === 1 ? 'active-present' : ''}" data-status="present" ${!canEdit ? 'disabled' : ''}>
                <i class="ti tabler-check"></i>
                <span>حاضر</span>
              </button>
              <button type="button" class="attendance-btn ${attendanceStatus === 3 ? 'active-late' : ''}" data-status="late" ${!canEdit ? 'disabled' : ''}>
                <i class="ti tabler-clock"></i>
                <span>متأخر</span>
              </button>
            </div>

            <!-- Group 2: غائب + مستأذن -->
            <div class="attendance-btn-group">
              <button type="button" class="attendance-btn ${attendanceStatus === 2 ? 'active-absent' : ''}" data-status="absent" ${!canEdit ? 'disabled' : ''}>
                <i class="ti tabler-x"></i>
                <span>غائب</span>
              </button>
              <button type="button" class="attendance-btn ${attendanceStatus === 4 ? 'active-excused' : ''}" data-status="excused" ${!canEdit ? 'disabled' : ''}>
                <i class="ti tabler-calendar-x"></i>
                <span>مستأذن</span>
              </button>
            </div>
          </div>

          <!-- Notes Section -->
          <div class="notes-section">
            <textarea class="notes-textarea" placeholder="أضف ملاحظاتك (اختياري)" data-student-id="${studentId}" ${!canEdit ? 'disabled' : ''}>${student.evaluationData?.notes || ''}</textarea>
          </div>

        </div>
      </div>
    `;

    // Add event listeners for attendance buttons
    const statusBtns = card.querySelectorAll('.attendance-btn');
    statusBtns.forEach(btn => {
      btn.addEventListener('click', function () {
        if (!canEdit) return;

        const status = this.dataset.status;
        let statusNum = 0;

        // Map status to number
        if (status === 'present') statusNum = 1;
        else if (status === 'absent') statusNum = 2;
        else if (status === 'late') statusNum = 3;
        else if (status === 'excused') statusNum = 4;

        // Update UI - remove all active classes
        statusBtns.forEach(b => {
          b.classList.remove('active-present', 'active-absent', 'active-late', 'active-excused');
        });

        // Add active class to clicked button
        this.classList.add('active-' + status);

        // Update data
        const studentIndex = studentsData.findIndex(s => (s.student_id || s.Student_ID) === studentId);
        if (studentIndex !== -1) {
          studentsData[studentIndex].attendance_status = statusNum;
        }

        console.log('Attendance updated:', studentId, status, statusNum);
      });
    });

    // Add event listener for notes textarea
    const notesTextarea = card.querySelector('.notes-textarea');
    if (notesTextarea) {
      notesTextarea.addEventListener('input', function () {
        if (!canEdit) return;
        updateStudentEvaluation(studentId, 'notes', 'notes', this.value);
      });
    }

    // Add event listeners for evaluation sections
    const evalSections = card.querySelectorAll('.evaluation-section');
    evalSections.forEach(section => {
      const sectionStudentId = section.dataset.studentId;
      const sectionType = section.dataset.type;

      // Counter buttons
      const counterBtns = section.querySelectorAll('.counter-btn');
      const counterInput = section.querySelector('.counter-value');

      counterBtns.forEach(btn => {
        btn.addEventListener('click', function () {
          if (!canEdit) return;

          const action = this.dataset.action;
          let currentValue = parseInt(counterInput.value) || 0;

          if (action === 'increment') {
            currentValue = Math.min(currentValue + 1, 999);
          } else if (action === 'decrement') {
            currentValue = Math.max(currentValue - 1, 0);
          }

          counterInput.value = currentValue;
          updateStudentEvaluation(sectionStudentId, sectionType, 'count', currentValue);
        });
      });

      // Counter input
      if (counterInput) {
        counterInput.addEventListener('change', function () {
          if (!canEdit) return;

          let value = parseInt(this.value) || 0;
          value = Math.max(0, Math.min(value, 999));
          this.value = value;

          updateStudentEvaluation(sectionStudentId, sectionType, 'count', value);
        });
      }

      // Rating buttons
      const ratingBtns = section.querySelectorAll('.evaluation-btn');
      ratingBtns.forEach(btn => {
        btn.addEventListener('click', function () {
          if (!canEdit) return;

          const value = parseInt(this.dataset.value);
          const btnClass = this.dataset.class;

          // Remove all active classes
          ratingBtns.forEach(b => {
            b.classList.remove(
              'active-excellent',
              'active-very-good',
              'active-acceptable',
              'active-not-memorized',
              'active-not-listened'
            );
          });

          // Add active class to clicked button
          this.classList.add('active-' + btnClass);

          // Update section background
          section.className = 'evaluation-section eval-' + btnClass;

          updateStudentEvaluation(sectionStudentId, sectionType, 'rating', value);
        });
      });
    });

    return card;
  }

  function updateStudentEvaluation(studentId, type, field, value) {
    const studentIndex = studentsData.findIndex(s => (s.student_id || s.Student_ID) === studentId);
    if (studentIndex === -1) return;

    if (!studentsData[studentIndex].evaluationData) {
      studentsData[studentIndex].evaluationData = {};
    }

    if (type === 'notes') {
      studentsData[studentIndex].evaluationData.notes = value;
    } else {
      const fieldName = field === 'count' ? `${type}Count` : `${type}Rating`;
      studentsData[studentIndex].evaluationData[fieldName] = value;
    }

    console.log('Updated evaluation:', studentId, type, field, value);
  }

  function createEvaluationSection(studentId, type, student) {
    let title, counterLabel, countField, ratingField, buttons;
    const countValue = student.evaluationData?.[`${type}Count`] || 0;
    const ratingValue = student.evaluationData?.[`${type}Rating`] || null;

    if (type === 'lines') {
      title = 'الحفظ (أسطر)';
      counterLabel = 'عدد الأسطر';
      countField = 'linesCount';
      ratingField = 'linesRating';
      buttons = [
        { value: 4, icon: 'tabler-star', label: 'ممتاز', class: 'excellent' },
        { value: 1, icon: 'tabler-book-off', label: 'لم يحفظ', class: 'not-memorized' },
        { value: 0, icon: 'tabler-ear-off', label: 'لم يسمع', class: 'not-listened' }
      ];
    } else if (type === 'pages') {
      title = 'المراجعة (صفحات)';
      counterLabel = 'عدد الصفحات';
      countField = 'pagesCount';
      ratingField = 'pagesRating';
      buttons = [
        { value: 5, icon: 'tabler-star', label: 'ممتاز', class: 'excellent' },
        { value: 4, icon: 'tabler-thumb-up', label: 'جيد جداً', class: 'very-good' },
        { value: 3, icon: 'tabler-circle-dashed-check', label: 'مقبول', class: 'acceptable' },
        { value: 1, icon: 'tabler-book-off', label: 'لم يحفظ', class: 'not-memorized' },
        { value: 0, icon: 'tabler-ear-off', label: 'لم يسمع', class: 'not-listened' }
      ];
    } else {
      title = 'جنب الدرس (دروس)';
      counterLabel = 'عدد الدروس';
      countField = 'lessonsCount';
      ratingField = 'lessonsRating';
      buttons = [
        { value: 4, icon: 'tabler-star', label: 'ممتاز', class: 'excellent' },
        { value: 1, icon: 'tabler-book-off', label: 'لم يحفظ', class: 'not-memorized' },
        { value: 0, icon: 'tabler-ear-off', label: 'لم يسمع', class: 'not-listened' }
      ];
    }

    const activeClass = ratingValue !== null ? buttons.find(b => b.value === ratingValue)?.class || '' : '';
    const sectionClass = activeClass ? `evaluation-section eval-${activeClass}` : 'evaluation-section';

    return `
      <div class="${sectionClass}" data-student-id="${studentId}" data-type="${type}">
        <div class="evaluation-section-header">
          <div class="evaluation-section-title">
            <h6>${title}</h6>
          </div>
          <div class="evaluation-counter-wrapper">
            <div class="counter-control">
              <button type="button" class="counter-btn" data-action="decrement" ${!canEdit ? 'disabled' : ''}>−</button>
              <input type="number" class="counter-value" value="${countValue}" min="0" max="999" ${!canEdit ? 'disabled' : ''} />
              <button type="button" class="counter-btn" data-action="increment" ${!canEdit ? 'disabled' : ''}>+</button>
            </div>
          </div>
        </div>
        <div class="evaluation-section-content">
          <div class="evaluation-buttons-grid ${type === 'pages' ? 'evaluation-buttons-5' : ''}">
            ${buttons
              .map(
                btn => `
              <button type="button" class="evaluation-btn ${ratingValue === btn.value ? 'active-' + btn.class : ''}"
                      data-value="${btn.value}" data-class="${btn.class}" ${!canEdit ? 'disabled' : ''}>
                <i class="ti ${btn.icon}"></i>
                <span>${btn.label}</span>
              </button>
            `
              )
              .join('')}
          </div>
        </div>
      </div>
    `;
  }

  function toggleExpandCollapseAll() {
    const allCollapses = document.querySelectorAll('#attnEvalStudentsList .collapse');
    const toggleBtn = document.getElementById('toggleExpandCollapseAttnEvalBtn');
    const toggleText = document.getElementById('toggleAttnEvalBtnText');
    const isExpanded = toggleText.textContent.trim() === 'إخفاء الكل';

    allCollapses.forEach(collapse => {
      const bsCollapse = new bootstrap.Collapse(collapse, { toggle: false });
      if (isExpanded) {
        bsCollapse.hide();
      } else {
        bsCollapse.show();
      }
    });

    // Update text and toggle active class for switch animation
    toggleText.textContent = isExpanded ? 'إظهار الكل' : 'إخفاء الكل';
    if (isExpanded) {
      toggleBtn.classList.remove('active');
    } else {
      toggleBtn.classList.add('active');
    }
  }
})();
