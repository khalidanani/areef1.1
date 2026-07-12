(() => {
  const grid = document.getElementById('attendanceDaysGrid');
  const monthLabel = document.getElementById('attendanceMonthLabel');
  const hiddenInput = document.getElementById('attendanceSelectedDate');
  const prevBtn = document.getElementById('attendanceWeekPrev');
  const nextBtn = document.getElementById('attendanceWeekNext');
  const todayBtn = document.getElementById('attendanceTodayBtn');

  if (!grid || !monthLabel || !hiddenInput || !prevBtn || !nextBtn || !todayBtn) return;

  const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const monthNames = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  // Hijri (Umm al-Qura — Saudi Arabia's official Islamic calendar) formatters.
  // Used to show the Hijri date alongside the Gregorian date on each pill,
  // and to enrich the month-range label above the strip.
  // `nu-latn` forces Latin (English) numerals so the Hijri day & year match
  // the Gregorian numeral style; only the month name stays in Arabic.
  // `formatToParts` is used so we can read the day/month/year separately
  // without locale-specific punctuation getting in the way.
  const hijriParts = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', {
    day:   'numeric',
    month: 'short',
    year:  'numeric'
  });

  // Server-configured Hijri offset (-1, 0, +1). Applied to the Gregorian
  // date BEFORE formatting so the displayed Hijri matches the Saudi
  // Supreme Court's official announcement when it diverges from the
  // Umm al-Qura calculation. Default 0 until /api/hijri-offset returns.
  let hijriOffsetDays = 0;

  function getHijriParts(d) {
    const adjusted = new Date(d);
    if (hijriOffsetDays) adjusted.setDate(adjusted.getDate() + hijriOffsetDays);
    const parts = hijriParts.formatToParts(adjusted);
    const pick  = (t) => (parts.find(p => p.type === t) || {}).value || '';
    return { day: pick('day'), month: pick('month'), year: pick('year') };
  }

  // Fetch the configured offset on load. Cheap, non-blocking — defaults
  // are good until the response arrives.
  fetch('/api/hijri-offset')
    .then(r => r.ok ? r.json() : null)
    .then(j => {
      if (j && j.success && j.data && typeof j.data.offset_days === 'number') {
        hijriOffsetDays = j.data.offset_days;
        // Re-render whatever's already on screen with the corrected offset.
        if (weekStartDate) renderWeek(weekStartDate, getDaysToShow());
      }
    })
    .catch(() => { /* fall back to offset 0 */ });

  let weekStartDate = null;
  let selectedDate = null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Settings from API (defaults until fetched)
  let settings = {
    attendance_insert_offset_days: 1,  // default: today only
    attendance_update_offset_days: 0,
    evaluation_insert_offset_days: 1,  // default: today only
    evaluation_update_offset_days: 0
  };

  // Fetch settings from API on load
  fetchSettings();

  async function fetchSettings() {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && result.data.settings) {
          for (const s of result.data.settings) {
            if (s.is_active && settings.hasOwnProperty(s.setting_key)) {
              settings[s.setting_key] = parseInt(s.setting_value) || 0;
            }
          }
          console.log('Calendar settings loaded:', settings);
          // Re-render with updated settings if already initialized
          if (selectedDate) {
            selectDate(selectedDate);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load settings, using defaults:', e);
    }
  }

  const isMobile = () => window.matchMedia('(max-width: 576px)').matches;
  // Tablet range upper bound = 1365.98px so ALL common tablet landscapes
  // stay on the 5-day stacked layout, not just portrait:
  //   iPad / iPad Air landscape ≈ 1080-1180
  //   iPad Pro 11" landscape    ≈ 1194-1210
  //   iPad Pro 12.9" landscape  ≈ 1366  (caught by the .98 wiggle)
  // The 7-day side-by-side desktop layout assumes ≥190px per cell to fit
  // the 86px Hijri aside + month name without squeezing; tablets even in
  // landscape don't quite hit that. Real desktops/laptops kick in at ≥1366.
  const isTablet = () => window.matchMedia('(min-width: 577px) and (max-width: 1365.98px)').matches;
  // Responsive day count: 3 on phone, 5 on tablet (incl. landscape), 7 on desktop.
  const getDaysToShow = () => isMobile() ? 3 : (isTablet() ? 5 : 7);

  function formatDate(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function isToday(d) {
    return isSameDay(d, today);
  }

  function daysBetween(d1, d2) {
    const ms = d2.getTime() - d1.getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  }

  // Determine if attendance can be edited for a given date
  // Uses max of insert and update offset days (server enforces exact rules)
  function canEditAttendance(d) {
    if (d > today) return false;
    const daysAgo = daysBetween(d, today);
    const maxDays = Math.max(settings.attendance_insert_offset_days, settings.attendance_update_offset_days);
    return daysAgo <= maxDays;
  }

  // Determine if evaluation can be edited for a given date
  function canEditEvaluation(d) {
    //console.log(settings.evaluation_insert_offset_days);
    if (d > today) return false;
    const daysAgo = daysBetween(d, today);
    const maxDays = Math.max(settings.evaluation_insert_offset_days, settings.evaluation_update_offset_days);
    return daysAgo <= maxDays;
  }

  function getWeekStart(centerDate, daysToShow) {
    const start = new Date(centerDate);
    start.setHours(0, 0, 0, 0);
    if (daysToShow === 3) {
      start.setDate(centerDate.getDate() - 1);
    } else {
      const half = Math.floor(daysToShow / 2);
      start.setDate(centerDate.getDate() - half);
    }
    return start;
  }

  function renderWeek(startDate, daysToShow) {
    grid.innerHTML = '';

    for (let i = 0; i < daysToShow; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);

      const isSelected = selectedDate && isSameDay(day, selectedDate);
      const isTodayDate = isToday(day);
      const canEditAttn = canEditAttendance(day);
      const canEditEval = canEditEvaluation(day);
      const canEdit = canEditAttn || canEditEval;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'attendance-day-btn';
      btn.dataset.date = formatDate(day);

      if (isSelected) btn.classList.add('is-selected');

      // Future dates: disabled
      if (day > today) {
        btn.classList.add('is-disabled');
        btn.disabled = true;
        btn.style.opacity = '0.4';
        btn.style.cursor = 'not-allowed';
      }

      // Past date that's editable but not today: evaluation-only style
      if (!isTodayDate && canEdit) {
        btn.classList.add('is-evaluation-only');
        btn.style.borderColor = 'var(--bs-warning)';
        btn.style.borderWidth = '2px';
      }

      // Today: primary border
      if (isTodayDate) {
        btn.style.borderColor = 'var(--bs-primary)';
        btn.style.borderWidth = '2px';
      }

      // Two-column day cell: main side (Gregorian) + aside (Hijri).
      // RTL grid auto-flips so main sits visually on the right.
      const hijri = getHijriParts(day);

      const main = document.createElement('div');
      main.className = 'day-main';
      const dow = document.createElement('div');
      dow.className = 'dow';
      dow.textContent = dayNames[day.getDay()];
      const dom = document.createElement('div');
      dom.className = 'dom';
      dom.textContent = day.getDate();
      const domMonth = document.createElement('div');
      domMonth.className = 'dom-month';
      domMonth.textContent = monthNames[day.getMonth()];
      main.appendChild(dow);
      main.appendChild(dom);
      main.appendChild(domMonth);

      const aside = document.createElement('div');
      aside.className = 'day-aside';
      const hDay = document.createElement('div');
      hDay.className = 'day-hijri-num';
      hDay.textContent = hijri.day;
      const hMonth = document.createElement('div');
      hMonth.className = 'day-hijri-month';
      hMonth.textContent = hijri.month;
      aside.appendChild(hDay);
      aside.appendChild(hMonth);

      btn.appendChild(main);
      btn.appendChild(aside);

      btn.addEventListener('click', function () {
        if (day <= today) selectDate(day);
      });

      grid.appendChild(btn);
    }

    // Month-range label — Gregorian leads (bold, primary text color),
    // Hijri stacked underneath in muted gray (smaller). Matches the
    // two-row header style of the new design.
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + (daysToShow - 1));
    const startMonth = monthNames[startDate.getMonth()];
    const endMonth = monthNames[endDate.getMonth()];
    const year = startDate.getFullYear();
    const gregLabel = startMonth === endMonth
      ? startMonth + ' ' + year
      : startMonth + ' - ' + endMonth + ' ' + year;

    const hStart = getHijriParts(startDate);
    const hEnd   = getHijriParts(endDate);
    const hijriLabel = hStart.month === hEnd.month
      ? `${hStart.month} ${hStart.year} هـ`
      : `${hStart.month} - ${hEnd.month} ${hEnd.year} هـ`;

    monthLabel.innerHTML = `<span class="month-label-greg">${gregLabel}</span><span class="month-label-hijri">${hijriLabel}</span>`;
  }

  function selectDate(d) {
    selectedDate = new Date(d);
    selectedDate.setHours(0, 0, 0, 0);
    hiddenInput.value = formatDate(selectedDate);

    // Update URL
    const url = new URL(window.location.href);
    url.searchParams.set('date', hiddenInput.value);
    window.history.replaceState({}, '', url);

    renderWeek(weekStartDate, getDaysToShow());

    const isTodayDate = isToday(selectedDate);
    const canEditAttn = canEditAttendance(selectedDate);
    const canEditEval = canEditEvaluation(selectedDate);

    console.log('Calendar: Dispatching dateSelected event', {
      date: formatDate(selectedDate),
      isToday: isTodayDate,
      canEditAttendance: canEditAttn,
      canEditEvaluation: canEditEval
    });

    const event = new CustomEvent('dateSelected', {
      detail: {
        date: formatDate(selectedDate),
        isToday: isTodayDate,
        canEditAttendance: canEditAttn,
        canEditEvaluation: canEditEval
      }
    });
    document.dispatchEvent(event);
  }

  function goToToday() {
    const daysToShow = getDaysToShow();
    weekStartDate = getWeekStart(today, daysToShow);
    selectDate(today);
  }

  function goToPrev() {
    const daysToShow = getDaysToShow();
    weekStartDate.setDate(weekStartDate.getDate() - daysToShow);
    renderWeek(weekStartDate, daysToShow);
  }

  function goToNext() {
    const daysToShow = getDaysToShow();
    weekStartDate.setDate(weekStartDate.getDate() + daysToShow);
    renderWeek(weekStartDate, daysToShow);
  }

  function init() {
    prevBtn.addEventListener('click', goToPrev);
    nextBtn.addEventListener('click', goToNext);
    todayBtn.addEventListener('click', goToToday);

    let resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        const daysToShow = getDaysToShow();
        weekStartDate = getWeekStart(selectedDate || today, daysToShow);
        renderWeek(weekStartDate, daysToShow);
      }, 250);
    });

    // Check for date in URL
    setTimeout(function () {
      const urlDate = new URLSearchParams(window.location.search).get('date');
      if (urlDate && /^\d{4}-\d{2}-\d{2}$/.test(urlDate)) {
        const [y, m, d] = urlDate.split('-').map(Number);
        const parsedDate = new Date(y, m - 1, d);
        if (parsedDate <= today) {
          const daysToShow = getDaysToShow();
          weekStartDate = getWeekStart(parsedDate, daysToShow);
          selectDate(parsedDate);
          return;
        }
      }
      goToToday();
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
