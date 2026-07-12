(() => {
  let d = [],
    a = null,
    u = null,
    r = !0,
    g = !1;
  function s() {
    let t = 0,
      a = 0;
    (d.forEach(e => {
      e.hasEvaluation ? t++ : a++;
    }),
      (document.getElementById('evaluatedCount').textContent = t),
      (document.getElementById('notEvaluatedCount').textContent = a));
  }
  function b(t, e, a) {
    var n;
    g
      ? (n = d.find(e => e.student_id === t)) &&
        (n.evaluationData ||
          (n.evaluationData = {
            linesCount: 0,
            linesRating: 0,
            pagesCount: 0,
            pagesRating: 0,
            lessonsCount: 0,
            lessonsRating: 0,
            notes: ''
          }),
        (n.evaluationData[e] = a),
        (e =
          0 < n.evaluationData.linesCount ||
          0 < n.evaluationData.pagesCount ||
          0 < n.evaluationData.lessonsCount ||
          0 < n.evaluationData.linesRating ||
          0 < n.evaluationData.pagesRating ||
          0 < n.evaluationData.lessonsRating ||
          '' !== n.evaluationData.notes.trim()),
        (n.hasEvaluation = e),
        s())
      : Swal.fire({
          icon: 'warning',
          title: 'تنبيه',
          text: 'لا يمكن تعديل التقييم إلا لليوم الحالي أو يومين سابقين',
          confirmButtonText: 'حسناً'
        });
  }
  function v(l, e) {
    let i = document.createElement('div');
    i.className = 'evaluation-section';
    var t = document.createElement('div'),
      a = ((t.className = 'evaluation-section-header'), document.createElement('h6')),
      n = document.createElement('div'),
      s = ((n.className = 'evaluation-counter-wrapper'), document.createElement('span')),
      o = ((s.className = 'evaluation-label'), document.createElement('div')),
      c = ((o.className = 'counter-control'), document.createElement('button'));
    ((c.type = 'button'), (c.className = 'counter-btn'), (c.textContent = '−'));
    let d = document.createElement('input');
    ((d.type = 'number'), (d.className = 'counter-value'), (d.min = '0'), (d.max = '999'));
    var u = document.createElement('button'),
      r = ((u.type = 'button'), (u.className = 'counter-btn'), (u.textContent = '+'), document.createElement('div'));
    r.className = 'evaluation-section-content';
    let v = document.createElement('div');
    v.className = 'evaluation-buttons-grid';
    let m, p;
    return (
      'lines' === e
        ? ((a.textContent = 'الحفظ (أسطر)'),
          (s.textContent = 'عدد الأسطر'),
          (m = 'linesCount'),
          (p = 'linesRating'),
          (d.value = l.evaluationData?.linesCount || 0),
          [
            { value: 4, icon: 'tabler-star', label: 'ممتاز', class: 'excellent' },
            { value: 1, icon: 'tabler-book-off', label: 'لم يحفظ', class: 'not-memorized' },
            { value: 0, icon: 'tabler-ear-off', label: 'لم يسمع', class: 'not-listened' }
          ].forEach(({ value: e, icon: t, label, class: a }) => {
            let n = document.createElement('button');
            ((n.type = 'button'), (n.className = 'evaluation-btn'), (n.dataset.value = e));
            var s = document.createElement('i');
            s.className = 'ti ' + t;
            var labelSpan = document.createElement('span');
            labelSpan.textContent = label;
            n.appendChild(s);
            n.appendChild(labelSpan);
            (l.evaluationData?.linesRating === e && (n.classList.add('active-' + a), i.classList.add('eval-' + a)),
              n.addEventListener('click', function () {
                g &&
                  (v.querySelectorAll('.evaluation-btn').forEach(e => {
                    e.classList.remove('active-excellent', 'active-not-memorized', 'active-not-listened');
                  }),
                  (i.className = 'evaluation-section'),
                  n.classList.add('active-' + a),
                  i.classList.add('eval-' + a),
                  b(l.student_id, p, e));
              }),
              v.appendChild(n));
          }))
        : 'pages' === e
          ? ((a.textContent = 'المراجعة (صفحات)'),
            (s.textContent = 'عدد الصفحات'),
            (m = 'pagesCount'),
            (p = 'pagesRating'),
            (d.value = l.evaluationData?.pagesCount || 0),
            v.classList.add('evaluation-buttons-5'),
            [
              { value: 5, icon: 'tabler-star', label: 'ممتاز', class: 'excellent' },
              { value: 4, icon: 'tabler-thumb-up', label: 'جيد جداً', class: 'very-good' },
              { value: 3, icon: 'tabler-circle-dashed-check', label: 'مقبول', class: 'acceptable' },
              { value: 1, icon: 'tabler-book-off', label: 'لم يحفظ', class: 'not-memorized' },
              { value: 0, icon: 'tabler-ear-off', label: 'لم يسمع', class: 'not-listened' }
            ].forEach(({ value: e, icon: t, label, class: a }) => {
              let n = document.createElement('button');
              ((n.type = 'button'), (n.className = 'evaluation-btn'), (n.dataset.value = e));
              var s = document.createElement('i');
              s.className = 'ti ' + t;
              var labelSpan = document.createElement('span');
              labelSpan.textContent = label;
              n.appendChild(s);
              n.appendChild(labelSpan);
              (l.evaluationData?.pagesRating === e && (n.classList.add('active-' + a), i.classList.add('eval-' + a)),
                n.addEventListener('click', function () {
                  g &&
                    (v.querySelectorAll('.evaluation-btn').forEach(e => {
                      e.classList.remove(
                        'active-excellent',
                        'active-very-good',
                        'active-acceptable',
                        'active-not-memorized',
                        'active-not-listened'
                      );
                    }),
                    (i.className = 'evaluation-section'),
                    n.classList.add('active-' + a),
                    i.classList.add('eval-' + a),
                    b(l.student_id, p, e));
                }),
                v.appendChild(n));
            }))
          : 'lessons' === e &&
            ((a.textContent = 'جنب الدرس (دروس)'),
            (s.textContent = 'عدد الدروس'),
            (m = 'lessonsCount'),
            (p = 'lessonsRating'),
            (d.value = l.evaluationData?.lessonsCount || 0),
            [
              { value: 4, icon: 'tabler-star', label: 'ممتاز', class: 'excellent' },
              { value: 1, icon: 'tabler-book-off', label: 'لم يحفظ', class: 'not-memorized' },
              { value: 0, icon: 'tabler-ear-off', label: 'لم يسمع', class: 'not-listened' }
            ].forEach(({ value: e, icon: t, label, class: a }) => {
              let n = document.createElement('button');
              ((n.type = 'button'), (n.className = 'evaluation-btn'), (n.dataset.value = e));
              var s = document.createElement('i');
              s.className = 'ti ' + t;
              var labelSpan = document.createElement('span');
              labelSpan.textContent = label;
              n.appendChild(s);
              n.appendChild(labelSpan);
              (l.evaluationData?.lessonsRating === e && (n.classList.add('active-' + a), i.classList.add('eval-' + a)),
                n.addEventListener('click', function () {
                  g &&
                    (v.querySelectorAll('.evaluation-btn').forEach(e => {
                      e.classList.remove('active-excellent', 'active-not-memorized', 'active-not-listened');
                    }),
                    (i.className = 'evaluation-section'),
                    n.classList.add('active-' + a),
                    i.classList.add('eval-' + a),
                    b(l.student_id, p, e));
                }),
                v.appendChild(n));
            })),
      c.addEventListener('click', function () {
        var e;
        g && 0 < (e = parseInt(d.value) || 0) && ((d.value = e - 1), b(l.student_id, m, e - 1));
      }),
      u.addEventListener('click', function () {
        var e;
        g && ((e = parseInt(d.value) || 0), (d.value = e + 1), b(l.student_id, m, e + 1));
      }),
      d.addEventListener('change', function () {
        var e;
        g && ((e = parseInt(d.value) || 0), b(l.student_id, m, e));
      }),
      o.appendChild(c),
      o.appendChild(d),
      o.appendChild(u),
      n.appendChild(s),
      n.appendChild(o),
      t.appendChild(a),
      t.appendChild(n),
      r.appendChild(v),
      i.appendChild(t),
      i.appendChild(r),
      i
    );
  }
  function m(e) {
    switch (e) {
      case 1:
        return 4;
      case 2:
        return 1;
      default:
        return 0;
    }
  }
  function p(e) {
    switch (e) {
      case 1:
        return 5;
      case 2:
        return 4;
      case 3:
        return 3;
      case 4:
        return 1;
      default:
        return 0;
    }
  }
  function h() {
    let t = document.getElementById('evaluationStudentsList');
    var e, a;
    r
      ? 0 === d.length
        ? ((a = window.activitiesStats),
          (document.getElementById('evaluationStudentsList').innerHTML = `
      <div class="no-plans-message">
        <div class="icon-wrapper">
          <i class="ti tabler-clipboard-check"></i>
        </div>
        <h5>يجب تسجيل الحضور أولاً</h5>
        <p>لديك <strong>${a.studentsWithoutAttendance}</strong> طالب من أصل <strong>${a.studentsWithPlans}</strong> طالب لم يتم تسجيل حضورهم لهذا اليوم.</p>
        <p>يرجى الانتقال إلى تبويب <strong>"التحضير"</strong> لتسجيل الحضور قبل التقييم.</p>
        <button type="button" class="btn btn-primary" onclick="document.getElementById('attendance-tab').click();">
          <i class="ti tabler-clipboard-check me-1"></i>
          الانتقال إلى التحضير
        </button>
      </div>
    `))
        : ((t.innerHTML = ''),
          d.forEach(e => {
            e = (e => {
              (e.evaluationData ||
                ((t = e.existing_evaluation),
                (e.evaluationData = {
                  linesCount: t?.number_of_lines_for_lesson || 0,
                  linesRating: m(t?.lesson_evaluation_score_id),
                  pagesCount: t?.number_of_pages_for_revision || 0,
                  pagesRating: p(t?.revision_evaluation_score_id),
                  lessonsCount: t?.number_of_side_lessons || 0,
                  lessonsRating: m(t?.side_lessons_evaluation_score_id),
                  notes: t?.evaluation_notes || ''
                })),
                (e.hasEvaluation = null != e.existing_evaluation));
              var t = document.createElement('div'),
                a = ((t.className = 'attendance-student-card'), document.createElement('div')),
                n =
                  ((a.className = 'card-main-row'),
                  (a.dataset.studentId = e.student_id),
                  (a.dataset.bsToggle = 'collapse'),
                  (a.dataset.bsTarget = '#eval-student-' + e.student_id),
                  a.setAttribute('aria-expanded', 'false'),
                  a.setAttribute('role', 'button'),
                  document.createElement('i')),
                s = ((n.className = 'ti tabler-chevron-down toggle-chevron'), document.createElement('div')),
                l = ((s.className = 'flex-grow-1'), document.createElement('div')),
                i =
                  ((l.className = 'student-name'),
                  (l.textContent = e.full_Name_AR || 'غير محدد'),
                  s.appendChild(l),
                  a.appendChild(n),
                  a.appendChild(s),
                  ((l = document.createElement('div')).className = 'collapse'),
                  (l.id = 'eval-student-' + e.student_id),
                  ((n = document.createElement('div')).style.padding = '16px'),
                  (n.style.borderTop = '1px solid var(--bs-border-color)'),
                  ((s = document.createElement('div')).className = 'evaluation-sections-container'),
                  s.appendChild(v(e, 'lines')),
                  s.appendChild(v(e, 'pages')),
                  s.appendChild(v(e, 'lessons')),
                  document.createElement('div')),
                o = ((i.className = 'notes-section'), document.createElement('label'));
              ((o.className = 'evaluation-label mb-2'), (o.textContent = 'ملاحظات'));
              let c = document.createElement('textarea');
              return (
                (c.className = 'notes-textarea'),
                (c.placeholder = 'أضف ملاحظات...'),
                (c.value = e.evaluationData.notes),
                c.addEventListener('input', function () {
                  g && b(e.student_id, 'notes', c.value);
                }),
                i.appendChild(o),
                i.appendChild(c),
                n.appendChild(s),
                n.appendChild(i),
                l.appendChild(n),
                t.appendChild(a),
                t.appendChild(l),
                t
              );
            })(e);
            t.appendChild(e);
          }),
          s())
      : ((a = window.activitiesStats),
        (e = document.getElementById('evaluationStudentsList')),
        a && 0 < a.studentsWithoutPlans
          ? (e.innerHTML = `
        <div class="no-plans-message">
          <div class="icon-wrapper">
            <i class="ti tabler-clipboard-off"></i>
          </div>
          <h5>يجب إضافة خطط دراسية أولاً</h5>
          <p>لديك <strong>${a.studentsWithoutPlans}</strong> طالب من أصل <strong>${a.totalStudents}</strong> طالب بدون خطة دراسية.</p>
          <p>يرجى الانتقال إلى تبويب <strong>"الخطط"</strong> لإضافة خطط للطلاب.</p>
          <button type="button" class="btn btn-primary" onclick="document.getElementById('plans-tab').click();">
            <i class="ti tabler-clipboard-check me-1"></i>
            الانتقال إلى الخطط
          </button>
        </div>
      `)
          : (e.innerHTML = `
        <div class="no-plans-message">
          <div class="icon-wrapper">
            <i class="ti tabler-clipboard-off"></i>
          </div>
          <h5>لا توجد خطط دراسية</h5>
          <p>لم يتم تعيين أي خطط دراسية للطلاب في هذه الحلقة. يرجى إضافة خطط للطلاب أولاً من تبويب "الخطط".</p>
        </div>
      `));
  }
  async function n(e) {
    if (u) {
      var t,
        a,
        n,
        s,
        l,
        i = document.getElementById('evaluationStudentsList');
      i.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">جاري التحميل...</span>
        </div>
        <p class="text-muted mt-3">جاري تحميل قائمة الطلاب...</p>
      </div>
    `;
      try {
        var o = `/api/activities/students/halaqa/${u}?date=${e}&filter=with-attendance`,
          c = await (await fetch(o)).json();
        c.success
          ? ((r = !1 !== c.hasPlans),
            (d = c.data || []),
            (window.activitiesStats = {
              totalStudents: c.totalStudents || 0,
              studentsWithPlans: c.studentsWithPlans || 0,
              studentsWithoutPlans: c.studentsWithoutPlans || 0,
              studentsWithAttendance: c.studentsWithAttendance || 0,
              studentsWithoutAttendance: c.studentsWithoutAttendance || 0
            }),
            h(),
            (t = document.getElementById('submitEvaluationBtn')),
            (a = document.getElementById('resetEvaluationBtn')),
            (n = document.querySelectorAll('.counter-btn')),
            (s = document.querySelectorAll('.evaluation-btn')),
            (l = document.querySelectorAll('.notes-textarea')),
            g
              ? (t && ((t.disabled = !1), (t.style.opacity = '1'), (t.title = '')),
                a && ((a.disabled = !1), (a.style.opacity = '1')),
                n.forEach(e => {
                  ((e.disabled = !1), (e.style.cursor = 'pointer'), (e.style.opacity = '1'));
                }),
                s.forEach(e => {
                  ((e.disabled = !1), (e.style.cursor = 'pointer'), (e.style.opacity = '1'));
                }),
                l.forEach(e => {
                  ((e.disabled = !1), (e.style.cursor = 'text'), (e.style.opacity = '1'));
                }))
              : (t &&
                  ((t.disabled = !0),
                  (t.style.opacity = '0.5'),
                  (t.title = 'لا يمكن حفظ التقييم إلا لليوم الحالي أو يومين سابقين')),
                a && ((a.disabled = !0), (a.style.opacity = '0.5')),
                n.forEach(e => {
                  ((e.disabled = !0), (e.style.cursor = 'not-allowed'), (e.style.opacity = '0.6'));
                }),
                s.forEach(e => {
                  ((e.disabled = !0), (e.style.cursor = 'not-allowed'), (e.style.opacity = '0.6'));
                }),
                l.forEach(e => {
                  ((e.disabled = !0), (e.style.cursor = 'not-allowed'), (e.style.opacity = '0.6'));
                })))
          : (console.error('API Error:', c),
            (i.innerHTML = `
          <div class="text-center py-5">
            <i class="ti tabler-alert-circle text-danger" style="font-size: 3rem;"></i>
            <p class="text-danger mt-3">${c.message || 'حدث خطأ أثناء تحميل البيانات'}</p>
            ${c.error ? `<details class="mt-2"><summary>تفاصيل الخطأ</summary><pre class="text-start small">${c.error}</pre></details>` : ''}
          </div>
        `));
      } catch (e) {
        (console.error('Error loading students:', e),
          (i.innerHTML = `
        <div class="text-center py-5">
          <i class="ti tabler-alert-circle text-danger" style="font-size: 3rem;"></i>
          <p class="text-danger mt-3">حدث خطأ أثناء تحميل البيانات</p>
        </div>
      `));
      }
    }
  }
  function t() {
    var e = document.getElementById('toggleExpandCollapseEvalBtn'),
      t = e.classList.contains('active'),
      a = document.getElementById('toggleEvalBtnText');
    t
      ? (document.querySelectorAll('#evaluationStudentsList .collapse').forEach(e => {
          e = bootstrap.Collapse.getInstance(e);
          e && e.hide();
        }),
        e.classList.remove('active'),
        (a.textContent = 'إظهار الكل'))
      : (document.querySelectorAll('#evaluationStudentsList .collapse').forEach(e => {
          new bootstrap.Collapse(e, { toggle: !1 }).show();
        }),
        e.classList.add('active'),
        (a.textContent = 'إخفاء الكل'));
  }
  function l() {
    g
      ? (d.forEach(e => {
          var t = e.existing_evaluation;
          ((e.evaluationData = {
            linesCount: t?.number_of_lines_for_lesson || 0,
            linesRating: m(t?.lesson_evaluation_score_id),
            pagesCount: t?.number_of_pages_for_revision || 0,
            pagesRating: p(t?.revision_evaluation_score_id),
            lessonsCount: t?.number_of_side_lessons || 0,
            lessonsRating: m(t?.side_lessons_evaluation_score_id),
            notes: t?.evaluation_notes || ''
          }),
            (e.hasEvaluation = null != t));
        }),
        h())
      : Swal.fire({
          icon: 'warning',
          title: 'تنبيه',
          text: 'لا يمكن إعادة تعيين التقييم إلا لليوم الحالي أو يومين سابقين',
          confirmButtonText: 'حسناً'
        });
  }
  async function i() {
    if (g)
      if (u && a) {
        var e = d
          .filter(e => e.hasEvaluation)
          .map(e => ({
            plan_id: e.plan_id,
            student_id: e.student_id,
            lines_count: e.evaluationData.linesCount,
            lines_rating: e.evaluationData.linesRating,
            pages_count: e.evaluationData.pagesCount,
            pages_rating: e.evaluationData.pagesRating,
            lessons_count: e.evaluationData.lessonsCount,
            lessons_rating: e.evaluationData.lessonsRating,
            notes: e.evaluationData.notes
          }));
        if (0 === e.length)
          Swal.fire({ icon: 'warning', title: 'تنبيه', text: 'لم يتم تقييم أي طالب', confirmButtonText: 'حسناً' });
        else
          try {
            var t = await (
              await fetch(`/api/activities/evaluations/halaqa/${u}?date=` + a, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ students: e })
              })
            ).json();
            t.success
              ? (Swal.fire({
                  icon: 'success',
                  title: 'تم بنجاح',
                  html: '<p style="margin: 0;">تم حفظ التقييم بنجاح</p>',
                  confirmButtonText: 'حسناً',
                  customClass: {
                    popup: 'swal2-border-radius',
                    confirmButton: 'btn btn-success',
                    htmlContainer: 'swal2-html-container-custom'
                  },
                  buttonsStyling: false,
                  iconColor: '#28c76f'
                }),
                await n(a))
              : Swal.fire({
                  icon: 'error',
                  title: 'خطأ',
                  html: '<p style="margin: 0;">' + (t.message || 'فشل حفظ التقييم') + '</p>',
                  confirmButtonText: 'حسناً',
                  customClass: {
                    popup: 'swal2-border-radius',
                    confirmButton: 'btn btn-danger',
                    htmlContainer: 'swal2-html-container-custom'
                  },
                  buttonsStyling: false,
                  iconColor: '#ea5455'
                });
          } catch (e) {
            (console.error('Error submitting evaluation:', e),
              Swal.fire({
                icon: 'error',
                title: 'خطأ',
                html: '<p style="margin: 0;">حدث خطأ أثناء حفظ التقييم</p>',
                confirmButtonText: 'حسناً',
                customClass: {
                  popup: 'swal2-border-radius',
                  confirmButton: 'btn btn-danger',
                  htmlContainer: 'swal2-html-container-custom'
                },
                buttonsStyling: false,
                iconColor: '#ea5455'
              }));
          }
      } else
        Swal.fire({ icon: 'error', title: 'خطأ', text: 'لم يتم تحديد التاريخ أو الحلقة', confirmButtonText: 'حسناً' });
    else
      Swal.fire({
        icon: 'warning',
        title: 'تنبيه',
        text: 'لا يمكن حفظ التقييم إلا لليوم الحالي أو يومين سابقين',
        confirmButtonText: 'حسناً'
      });
  }
  function e() {
    ((u = (e = document.querySelector('[data-halaqa-id]')) ? parseInt(e.dataset.halaqaId, 10) : null),
      document.addEventListener('dateSelected', function (e) {
        ((a = e.detail.date),
          (g = e.detail.canEditEvaluation),
          console.log('Evaluation: Date selected', a, 'Can edit:', g));
        var e = document.getElementById('evaluation-tab'),
          t = document.getElementById('evaluation-content');
        ((e && e.classList.contains('active')) || (t && t.classList.contains('active'))) &&
          (console.log('Evaluation: Loading students for', a), n(a));
      }));
    var e = document.getElementById('evaluation-tab'),
      e =
        (e &&
          (e.addEventListener('shown.bs.tab', function () {
            ((document.getElementById('evaluationActions').style.display = 'flex'),
              (document.getElementById('attendanceActions').style.display = 'none'),
              a && n(a));
          }),
          e.addEventListener('hidden.bs.tab', function () {
            document.getElementById('evaluationActions').style.display = 'none';
          })),
        document.getElementById('toggleExpandCollapseEvalBtn')),
      e = (e && e.addEventListener('click', t), document.getElementById('resetEvaluationBtn')),
      e = (e && e.addEventListener('click', l), document.getElementById('submitEvaluationBtn'));
    e && e.addEventListener('click', i);
  }
  'loading' === document.readyState ? document.addEventListener('DOMContentLoaded', e) : e();
})();
