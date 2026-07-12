(() => {
  let l = [],
    n = null,
    o = null,
    r = !0,
    u = !1;
  function a() {
    let e = { present: 0, absent: 0, late: 0, excused: 0, notMarked: 0 };
    (l.forEach(t => {
      t = t.currentStatus || 'not-marked';
      e.hasOwnProperty(t) ? e[t]++ : e.notMarked++;
    }),
      (document.getElementById('presentCount').textContent = e.present),
      (document.getElementById('absentCount').textContent = e.absent),
      (document.getElementById('lateCount').textContent = e.late),
      (document.getElementById('excusedCount').textContent = e.excused),
      (document.getElementById('notMarkedCount').textContent = e.notMarked));
  }
  function m(e, n) {
    var t;
    u
      ? ((t = l.find(t => t.student_id === e)) && (t.currentStatus = n),
        (t = document.querySelector(`[data-student-id="${e}"]`)?.closest('.attendance-student-card')) &&
          ((t.className = 'attendance-student-card'),
          'not-marked' !== n && t.classList.add('status-' + n),
          t.querySelectorAll('.status-btn').forEach(t => {
            (t.classList.remove('active-present', 'active-absent', 'active-late', 'active-excused'),
              t.dataset.status === n && t.classList.add('active-' + n));
          }),
          updateBadge(e, n),
          collapseCard(e)),
        a())
      : Swal.fire({
          icon: 'warning',
          title: 'تنبيه',
          text: 'لا يمكن تعديل الحضور إلا لليوم الحالي فقط',
          confirmButtonText: 'حسناً'
        });
  }
  function updateBadge(e, n) {
    var badge = document.querySelector(`.student-status-badge[data-student-id="${e}"]`);
    if (badge) {
      var badgeText = 'لم يحضر',
        badgeClass = 'bg-secondary';
      if (n === 'present') {
        badgeText = 'حاضر';
        badgeClass = 'bg-success';
      } else if (n === 'absent') {
        badgeText = 'غائب';
        badgeClass = 'bg-danger';
      } else if (n === 'late') {
        badgeText = 'متأخر';
        badgeClass = 'bg-warning';
      } else if (n === 'excused') {
        badgeText = 'مستأذن';
        badgeClass = 'bg-info';
      }
      badge.textContent = badgeText;
      badge.className = 'student-status-badge badge text-white me-2 ' + badgeClass;
    }
  }
  function collapseCard(e) {
    var card = document.querySelector(`[data-student-id="${e}"]`)?.closest('.attendance-student-card');
    if (card) {
      var collapse = card.querySelector('.collapse');
      if (collapse) {
        var bsCollapse = bootstrap.Collapse.getInstance(collapse);
        if (bsCollapse) {
          bsCollapse.hide();
        } else {
          new bootstrap.Collapse(collapse, { toggle: false }).hide();
        }
      }
    }
  }
  function p() {
    let e = document.getElementById('attendanceStudentsList');
    var t, n;
    r && 0 !== l.length
      ? ((e.innerHTML = ''),
        l.forEach(t => {
          t = (d => {
            let c = d.existing_attendance?.status || 'not-marked';
            d.currentStatus = c;
            var t = document.createElement('div'),
              e =
                ((t.className = 'attendance-student-card'),
                'not-marked' !== c && t.classList.add('status-' + c),
                document.createElement('div')),
              n =
                ((e.className = 'card-main-row'),
                (e.dataset.studentId = d.student_id),
                (e.dataset.bsToggle = 'collapse'),
                (e.dataset.bsTarget = '#student-' + d.student_id),
                e.setAttribute('aria-expanded', 'false'),
                e.setAttribute('role', 'button'),
                document.createElement('i')),
              a = ((n.className = 'ti tabler-chevron-down toggle-chevron'), document.createElement('div')),
              s = ((a.className = 'flex-grow-1'), document.createElement('div'));
            var badge = document.createElement('span');
            badge.className = 'student-status-badge badge text-white me-2';
            badge.dataset.studentId = d.student_id;
            var badgeText = 'لم يحضر',
              badgeClass = 'bg-secondary';
            if (c === 'present') {
              badgeText = 'حاضر';
              badgeClass = 'bg-success';
            } else if (c === 'absent') {
              badgeText = 'غائب';
              badgeClass = 'bg-danger';
            } else if (c === 'late') {
              badgeText = 'متأخر';
              badgeClass = 'bg-warning';
            } else if (c === 'excused') {
              badgeText = 'مستأذن';
              badgeClass = 'bg-info';
            }
            badge.textContent = badgeText;
            badge.className = 'student-status-badge badge text-white me-2 ' + badgeClass;
            var nameContainer = document.createElement('div');
            nameContainer.className = 'd-flex align-items-center flex-wrap gap-2';
            nameContainer.appendChild(badge);
            ((s.className = 'student-name'),
              (s.textContent = d.full_Name_AR || 'غير محدد'),
              nameContainer.appendChild(s),
              a.appendChild(nameContainer),
              e.appendChild(n),
              e.appendChild(a),
              ((s = document.createElement('div')).className = 'collapse'),
              (s.id = 'student-' + d.student_id));
            let i = document.createElement('div');
            return (
              (i.className = 'status-buttons-grid'),
              [
                { status: 'present', icon: 'tabler-check', label: 'حاضر' },
                { status: 'absent', icon: 'tabler-x', label: 'غائب' },
                { status: 'late', icon: 'tabler-clock', label: 'متأخر' },
                { status: 'excused', icon: 'tabler-calendar-x', label: 'مستأذن' }
              ].forEach(({ status: e, icon: t, label: n }) => {
                var a = document.createElement('button'),
                  s =
                    ((a.type = 'button'),
                    (a.className = 'status-btn'),
                    (a.dataset.status = e),
                    c === e && a.classList.add('active-' + e),
                    document.createElement('i')),
                  t = ((s.className = 'ti ' + t), document.createElement('span'));
                ((t.textContent = n),
                  a.appendChild(s),
                  a.appendChild(t),
                  a.addEventListener('click', function (t) {
                    (t.stopPropagation(), m(d.student_id, e));
                  }),
                  i.appendChild(a));
              }),
              s.appendChild(i),
              t.appendChild(e),
              t.appendChild(s),
              t
            );
          })(t);
          e.appendChild(t);
        }),
        a())
      : ((t = window.activitiesStats),
        (n = document.getElementById('attendanceStudentsList')),
        t && 0 < t.studentsWithoutPlans
          ? (n.innerHTML = `
        <div class="no-plans-message">
          <div class="icon-wrapper">
            <i class="ti tabler-clipboard-off"></i>
          </div>
          <h5>يجب إضافة خطط دراسية أولاً</h5>
          <p>لديك <strong>${t.studentsWithoutPlans}</strong> طالب من أصل <strong>${t.totalStudents}</strong> طالب بدون خطة دراسية.</p>
          <p>يرجى الانتقال إلى تبويب <strong>"الخطط"</strong> لإضافة خطط للطلاب قبل تسجيل الحضور.</p>
          <button type="button" class="btn btn-primary" onclick="document.getElementById('plans-tab').click();">
            <i class="ti tabler-clipboard-check me-1"></i>
            الانتقال إلى الخطط
          </button>
        </div>
      `)
          : (n.innerHTML = `
        <div class="no-plans-message">
          <div class="icon-wrapper">
            <i class="ti tabler-clipboard-off"></i>
          </div>
          <h5>لا توجد خطط دراسية</h5>
          <p>لم يتم تعيين أي خطط دراسية للطلاب في هذه الحلقة. يرجى إضافة خطط للطلاب أولاً من تبويب "الخطط".</p>
        </div>
      `));
  }
  async function s(t) {
    if (o) {
      var e,
        n,
        a,
        s,
        d = document.getElementById('attendanceStudentsList');
      d.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">جاري التحميل...</span>
        </div>
        <p class="text-muted mt-3">جاري تحميل قائمة الطلاب...</p>
      </div>
    `;
      try {
        var c = `/api/activities/students/halaqa/${o}?date=` + t,
          i = await (await fetch(c)).json();
        i.success
          ? ((r = !1 !== i.hasPlans),
            (l = i.data || []),
            (window.activitiesStats = {
              totalStudents: i.totalStudents || 0,
              studentsWithPlans: i.studentsWithPlans || 0,
              studentsWithoutPlans: i.studentsWithoutPlans || 0,
              studentsWithAttendance: i.studentsWithAttendance || 0,
              studentsWithoutAttendance: i.studentsWithoutAttendance || 0
            }),
            p(),
            (e = document.getElementById('submitAttendanceBtn')),
            (n = document.getElementById('resetAttendanceBtn')),
            (a = document.getElementById('markAllPresentBtn')),
            (s = document.querySelectorAll('.status-btn')),
            u
              ? (e && ((e.disabled = !1), (e.style.opacity = '1'), (e.title = '')),
                n && ((n.disabled = !1), (n.style.opacity = '1')),
                a && ((a.disabled = !1), (a.style.opacity = '1')),
                s.forEach(t => {
                  ((t.disabled = !1), (t.style.cursor = 'pointer'), (t.style.opacity = '1'));
                }))
              : (e && ((e.disabled = !0), (e.style.opacity = '0.5'), (e.title = 'لا يمكن حفظ الحضور إلا لليوم الحالي')),
                n && ((n.disabled = !0), (n.style.opacity = '0.5')),
                a && ((a.disabled = !0), (a.style.opacity = '0.5')),
                s.forEach(t => {
                  ((t.disabled = !0), (t.style.cursor = 'not-allowed'), (t.style.opacity = '0.6'));
                })))
          : (console.error('API Error:', i),
            (d.innerHTML = `
          <div class="text-center py-5">
            <i class="ti tabler-alert-circle text-danger" style="font-size: 3rem;"></i>
            <p class="text-danger mt-3">${i.message || 'حدث خطأ أثناء تحميل البيانات'}</p>
            ${i.error ? `<details class="mt-2"><summary>تفاصيل الخطأ</summary><pre class="text-start small">${i.error}</pre></details>` : ''}
          </div>
        `));
      } catch (t) {
        (console.error('Error loading students:', t),
          (d.innerHTML = `
        <div class="text-center py-5">
          <i class="ti tabler-alert-circle text-danger" style="font-size: 3rem;"></i>
          <p class="text-danger mt-3">حدث خطأ أثناء تحميل البيانات</p>
        </div>
      `));
      }
    }
  }
  function e() {
    var t = document.getElementById('toggleExpandCollapseBtn'),
      e = t.classList.contains('active'),
      n = document.getElementById('toggleBtnText');
    e
      ? (document.querySelectorAll('#attendanceStudentsList .collapse').forEach(t => {
          t = bootstrap.Collapse.getInstance(t);
          t && t.hide();
        }),
        t.classList.remove('active'),
        (n.textContent = 'إظهار الكل'))
      : (document.querySelectorAll('#attendanceStudentsList .collapse').forEach(t => {
          new bootstrap.Collapse(t, { toggle: !1 }).show();
        }),
        t.classList.add('active'),
        (n.textContent = 'إخفاء الكل'));
  }
  function d() {
    u
      ? l.forEach(t => {
          m(t.student_id, 'present');
        })
      : Swal.fire({
          icon: 'warning',
          title: 'تنبيه',
          text: 'لا يمكن تعديل الحضور إلا لليوم الحالي فقط',
          confirmButtonText: 'حسناً'
        });
  }
  function c() {
    u
      ? l.forEach(t => {
          var e = t.existing_attendance?.status || 'not-marked';
          m(t.student_id, e);
        })
      : Swal.fire({
          icon: 'warning',
          title: 'تنبيه',
          text: 'لا يمكن إعادة تعيين الحضور إلا لليوم الحالي',
          confirmButtonText: 'حسناً'
        });
  }
  async function i() {
    if (u)
      if (o && n) {
        var t = l
          .filter(t => t.currentStatus && 'not-marked' !== t.currentStatus)
          .map(t => ({ plan_id: t.plan_id, student_id: t.student_id, status: t.currentStatus }));
        if (0 === t.length)
          Swal.fire({ icon: 'warning', title: 'تنبيه', text: 'لم يتم تحديد حضور أي طالب', confirmButtonText: 'حسناً' });
        else
          try {
            var e = await (
              await fetch(`/api/activities/attendance/halaqa/${o}?date=` + n, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ students: t })
              })
            ).json();
            e.success
              ? (Swal.fire({
                  icon: 'success',
                  title: 'تم بنجاح',
                  html: '<p style="margin: 0;">تم حفظ الحضور بنجاح</p>',
                  confirmButtonText: 'حسناً',
                  customClass: {
                    popup: 'swal2-border-radius',
                    confirmButton: 'btn btn-success',
                    htmlContainer: 'swal2-html-container-custom'
                  },
                  buttonsStyling: false,
                  iconColor: '#28c76f'
                }),
                await s(n))
              : Swal.fire({
                  icon: 'error',
                  title: 'خطأ',
                  html: '<p style="margin: 0;">' + (e.message || 'فشل حفظ الحضور') + '</p>',
                  confirmButtonText: 'حسناً',
                  customClass: {
                    popup: 'swal2-border-radius',
                    confirmButton: 'btn btn-danger',
                    htmlContainer: 'swal2-html-container-custom'
                  },
                  buttonsStyling: false,
                  iconColor: '#ea5455'
                });
          } catch (t) {
            (console.error('Error submitting attendance:', t),
              Swal.fire({
                icon: 'error',
                title: 'خطأ',
                html: '<p style="margin: 0;">حدث خطأ أثناء حفظ الحضور</p>',
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
        text: 'لا يمكن حفظ الحضور إلا لليوم الحالي فقط',
        confirmButtonText: 'حسناً'
      });
  }
  function y() {
    ((document.getElementById('attendanceActions').style.display = 'flex'),
      (document.getElementById('evaluationActions').style.display = 'none'));
  }
  function t() {
    ((o = (t = document.querySelector('[data-halaqa-id]')) ? parseInt(t.dataset.halaqaId, 10) : null),
      document.addEventListener('dateSelected', function (t) {
        ((n = t.detail.date),
          (u = t.detail.canEditAttendance),
          console.log('Attendance: Date selected', n, 'Can edit:', u));
        var t = document.getElementById('attendance-tab'),
          e = document.getElementById('attendance-content');
        ((t && t.classList.contains('active')) || (e && e.classList.contains('active'))) &&
          (console.log('Attendance: Loading students for', n), s(n));
      }));
    var t = document.getElementById('attendance-tab'),
      t =
        (t &&
          (t.addEventListener('shown.bs.tab', function () {
            (console.log('Attendance tab shown, currentDate:', n), y(), n && s(n));
          }),
          t.addEventListener('hidden.bs.tab', function () {
            document.getElementById('attendanceActions').style.display = 'none';
          })),
        document.getElementById('toggleExpandCollapseBtn')),
      t = (t && t.addEventListener('click', e), document.getElementById('markAllPresentBtn')),
      t = (t && t.addEventListener('click', d), document.getElementById('resetAttendanceBtn')),
      t = (t && t.addEventListener('click', c), document.getElementById('submitAttendanceBtn'));
    (t && t.addEventListener('click', i), y());
  }
  'loading' === document.readyState ? document.addEventListener('DOMContentLoaded', t) : t();
})();
