// Combined Attendance & Evaluation Tab
(() => {
  let studentsData = [];
  let allStudentsData = []; // Store all students for search filtering
  let selectedDate = null;
  // The date the current studentsData was fetched for. Lets a returning tab detect a date
  // change that happened while it was inactive (the calendar week-strip is shared across
  // tabs) and re-fetch, instead of showing a stale roster and saving to the wrong date.
  let loadedForDate = null;
  let halaqaId = null;
  // Track attendance and evaluation editability separately — they have
  // distinct insert/update offset_days settings and a date can fall outside
  // one window while still being inside the other. The combined `canEdit`
  // stays as OR for UI gating (panel visibility, button enable); the submit
  // path filters per-flag against the actual change type.
  let canEditAttendance = false;
  let canEditEvaluation = false;
  let canEdit = false;
  // True when the viewer is a delegated observer (e.g. guider) acting on a
  // halaqa they don't own. Set from the tab-content data-attr at init.
  let viewerDelegationActive = false;
  let hasChanges = false;
  let searchTerm = ''; // Current search term

  // ---- Quran ayah metadata cache ----------------------------------------
  // The ~6236-row slim ayah array (surah_id, verse_id, line_count, page_no)
  // is fetched once per page load and reused for client-side range math.
  let ayahsCache = null;
  let ayahsPromise = null;
  // surah_id → { firstIdx, lastIdx, lastVerse } — built lazily after the
  // ayah cache loads. Lets us validate override ayah inputs and locate
  // the previous surah's terminal ayah without scanning the array.
  let surahIndexCache = null;
  // surah_id → display name. Populated from observed `sura_name` values on
  // student positions. Falls back to "سورة <id>" when unknown.
  const surahNameMap = new Map();
  // Ordered list of Quran-only surahs (book_type_id == 1) shipped from the
  // server. Used to populate the revision-override surah dropdown — the
  // ayah cache itself may include Mutoon "surahs" we don't want to offer.
  let quranSurahs = [];
  // surah_id -> book_type_id (1 = Quran, 2 = المدنية). Lets the override picker
  // show only the surahs that belong to a given plan's book.
  const surahBookTypeMap = new Map();

  function loadQuranAyahsOnce() {
    if (ayahsCache) return Promise.resolve(ayahsCache);
    if (ayahsPromise) return ayahsPromise;
    ayahsPromise = fetch('/api/activities/quran-ayahs')
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        ayahsCache = j && j.success && Array.isArray(j.data) ? j.data : [];
        // Populate the surah-name map up-front so the revision-override
        // dropdown shows actual names (البقرة, آل عمران, …) rather than
        // falling back to "سورة <id>" for surahs no student has visited yet.
        // The server ships book_type 1 (Quran) and 2 (المدنية), each tagged
        // with book_type_id; the picker is filtered to a plan's own book below.
        if (j && Array.isArray(j.surahs)) {
          quranSurahs = j.surahs.filter(s => s && s.id > 0 && s.name);
          for (const s of quranSurahs) {
            surahNameMap.set(s.id, s.name);
            surahBookTypeMap.set(s.id, s.book_type_id || 1);
          }
        }
        buildSurahIndex();
        return ayahsCache;
      })
      .catch(() => {
        ayahsCache = [];
        return ayahsCache;
      });
    return ayahsPromise;
  }

  function buildSurahIndex() {
    surahIndexCache = new Map();
    if (!ayahsCache || !ayahsCache.length) return;
    for (let i = 0; i < ayahsCache.length; i++) {
      const a = ayahsCache[i];
      const entry = surahIndexCache.get(a.surah_id);
      if (!entry) {
        surahIndexCache.set(a.surah_id, { firstIdx: i, lastIdx: i, lastVerse: a.verse_id });
      } else {
        entry.lastIdx = i;
        entry.lastVerse = a.verse_id;
      }
    }
  }

  function harvestSurahNamesFromStudents(students) {
    if (!students) return;
    students.forEach(s => {
      const cp = s && s.current_position;
      if (!cp) return;
      ['lesson', 'revision', 'side_lessons'].forEach(k => {
        const p = cp[k];
        if (p && p.start_id > 0 && p.sura_name) {
          surahNameMap.set(p.start_id, p.sura_name);
        }
      });
    });
  }

  function getSurahName(surahId) {
    if (surahNameMap.has(surahId)) return surahNameMap.get(surahId);
    return surahId > 0 ? `سورة ${surahId}` : '';
  }

  // Which book a plan is on (1 = Quran, 2 = المدنية), inferred from the
  // surah_id of its current position. Surah ids are globally unique across
  // books, so any of the three activity positions resolves the book. Defaults
  // to Quran when nothing has been visited yet (fresh plan).
  function derivePlanBookType(student) {
    const cp = student && student.current_position;
    if (cp) {
      for (const k of ['lesson', 'revision', 'side_lessons']) {
        const id = cp[k] && cp[k].start_id;
        if (id > 0 && surahBookTypeMap.has(id)) return surahBookTypeMap.get(id);
      }
    }
    return 1;
  }

  // book_type for a surah id (1 = Quran 1–114, 2 = قاعدة 115+), from the lookup
  // map. Book boundaries are derived from book_type, NEVER hardcoded surah ids.
  function bookTypeOf(surahId) {
    return surahBookTypeMap.get(surahId) || 1;
  }

  // Consume `amount` units of `amountType` starting from (startSurah, startVerse),
  // following the plan's memorization direction, and return the inclusive end ayah.
  //
  // Recitation order matches the API's calculator: ascending by verse WITHIN a sura,
  // and across suras the sura id moves +1 (forward) or −1 (backward, directionId === 2).
  // So a backward lesson from An-Nas (114) runs 114 ascending, then 113 ascending, then
  // 112… — it does NOT stop at 114's end (that was the bug: the "to" ignored the amount).
  // The walk never leaves the start sura's OWN book (book_type), so a Quran lesson can't
  // bleed into المدنية/النورانية and vice-versa. Boundaries come from book_type, never a
  // hardcoded surah id. amountType: 'line' | 'page' | 'ayah' | 'verse' (verse ≈ ayah).
  // stopAt (optional {surahId, verseId}) is an inclusive walk boundary: the walk halts
  // AT it even if `amount` isn't yet consumed. Used for the revision frontier clamp —
  // because stopAt sits ON the recitation path, stopping at it is correct for both
  // directions and across suras (a sequence-index compare is wrong: within a sura both
  // directions ascend, so a backward revision can overshoot the frontier with a HIGHER
  // index and an index test would miss it).
  function computeEndPosition(startSurah, startVerse, amountType, amount, directionId, stopAt) {
    if (!ayahsCache || !ayahsCache.length || amount <= 0) return null;
    if (!surahIndexCache) buildSurahIndex();
    if (!surahIndexCache.get(startSurah)) return null;

    const backward = directionId === 2;
    const startBook = bookTypeOf(startSurah);
    const isAyah = amountType === 'ayah' || amountType === 'verse';
    const isPage = amountType === 'page';

    let endRow = null;       // last ayah row touched
    let acc = 0;             // accumulated lines
    let ayahCount = 0;       // accumulated ayahs
    let pagesSeen = 0;       // distinct pages touched (in recitation order)
    let lastPage = null;     // page_no of the previous ayah, to detect a new page
    let surah = startSurah;
    let firstVerse = startVerse;
    let guard = 0;
    let done = false;

    while (!done && guard++ < 400) {
      const meta = surahIndexCache.get(surah);
      if (!meta || bookTypeOf(surah) !== startBook) break;  // out of book → stop
      // Index of firstVerse within this surah. verse_ids are normally contiguous
      // 1..N (Quran and قaida both), so the arithmetic lands it directly; validate
      // and fall back to a scan so a gap or non-1-based verse_id can't silently
      // start the walk on the wrong ayah and shift the whole range.
      let from = Math.max(meta.firstIdx + (firstVerse - 1), meta.firstIdx);
      if (!ayahsCache[from] || ayahsCache[from].verse_id !== firstVerse) {
        from = meta.firstIdx;
        for (let i = meta.firstIdx; i <= meta.lastIdx; i++) {
          if (ayahsCache[i].verse_id === firstVerse) { from = i; break; }
        }
      }
      for (let i = from; i <= meta.lastIdx; i++) {
        const row = ayahsCache[i];
        if (isAyah) {
          endRow = row; ayahCount++;
          if (ayahCount >= amount) { done = true; break; }
        } else if (isPage) {
          // Count DISTINCT pages encountered along the recitation path — works in
          // either direction (backward page_no decreases across suras but increases
          // within one, so an abs() distance is non-monotonic and wrong). A new page
          // beyond `amount` ends the range without including it.
          if (row.page_no !== lastPage) {
            if (pagesSeen + 1 > amount) { done = true; break; }
            pagesSeen++; lastPage = row.page_no;
          }
          endRow = row;
        } else { // 'line'
          const next = acc + (row.line_count || 0);
          if (next <= amount) { endRow = row; acc = next; if (acc === amount) { done = true; break; } }
          else { endRow = row; done = true; break; } // partial line still counts this ayah
        }
        // Inclusive stop boundary (revision frontier): if this row IS the boundary, end
        // here. Reached only when the amount hasn't already ended the walk first, so a
        // shorter revision keeps its natural end and a longer one clamps to the frontier.
        if (stopAt && row.surah_id === stopAt.surahId && row.verse_id === stopAt.verseId) {
          endRow = row; done = true; break;
        }
      }
      surah = backward ? surah - 1 : surah + 1;
      firstVerse = 1;
      if (surah < 1) break;
    }

    if (!endRow) return null;
    return { surahId: endRow.surah_id, verseId: endRow.verse_id };
  }

  // Returns the ayah just before (surah, verse) in recitation order, within the
  // SAME book. Returns null at the very first ayah, an empty cache, or a book
  // boundary. The cache is bt1 (surah 1–114) immediately followed by bt2 (132+)
  // with النورانية (bt3) removed, so raw index adjacency (idx-1) at the 114↔132
  // seam would silently jump books — e.g. previousAyah(132,1) would return 114:6.
  // Guard on book_type so قاعدة never bleeds into the Quran (and vice-versa).
  function previousAyah(surahId, verseId) {
    if (!ayahsCache || !ayahsCache.length) return null;
    const idx = ayahsCache.findIndex(a => a.surah_id === surahId && a.verse_id === verseId);
    if (idx <= 0) return null;
    const a = ayahsCache[idx - 1];
    if (bookTypeOf(a.surah_id) !== bookTypeOf(surahId)) return null;
    return { surahId: a.surah_id, verseId: a.verse_id };
  }

  // Sequence index of (surah, verse) within the recitation-ordered ayahsCache, or
  // -1 if absent. Lets us compare two positions' order for the revision clamp.
  function seqIndexOf(surahId, verseId) {
    if (!ayahsCache || !ayahsCache.length) return -1;
    if (!surahIndexCache) buildSurahIndex();
    const meta = surahIndexCache.get(surahId);
    if (!meta) return -1;
    for (let i = meta.firstIdx; i <= meta.lastIdx; i++) {
      if (ayahsCache[i].verse_id === verseId) return i;
    }
    return -1;
  }

  // The lesson frontier = the inclusive lesson_end of the most recent lesson-bearing
  // evaluation, INCLUDING today's lesson being entered. The revision range may not pass
  // it (you can't revise material not yet memorized). Mirrors the API's
  // todayFrontierLesson = (current eval if it records a lesson) else (latest prior
  // lesson eval). Resolution order:
  //   1. A stored lesson-end override on today's eval (honors a teacher override).
  //   2. Today's lesson being entered: walk lesson_start by the live line count.
  //   3. No lesson today: the most recent lesson eval's end = one ayah back, in the
  //      plan's travel direction, from the next lesson start (current_position.lesson).
  function lessonFrontier(student) {
    const cp = student.current_position;
    const lessonPos = cp && cp.lesson;
    if (!lessonPos || !(lessonPos.start_id > 0)) return null;
    const dir = student.plan_defaults?.memorization_direction_id;
    const backward = dir === 2;

    const ev = student.existing_evaluation;
    if (ev && ev.number_of_lines_for_lesson > 0 && ev.lesson_end_id > 0 && ev.lesson_end_position > 0) {
      return { surahId: ev.lesson_end_id, verseId: ev.lesson_end_position };
    }

    const lines = student.evaluationData?.linesCount ?? 0;
    if (lines > 0) {
      const end = computeEndPosition(lessonPos.start_id, lessonPos.start_position, 'line', lines, dir);
      if (end) return end;
    }

    const idx = seqIndexOf(lessonPos.start_id, lessonPos.start_position);
    if (idx < 0) return null;
    const prevIdx = backward ? idx + 1 : idx - 1;
    if (prevIdx < 0 || prevIdx >= ayahsCache.length) return null;
    const a = ayahsCache[prevIdx];
    // Stay within the lesson's own book: the cache puts bt2 (قaida, 132+) directly
    // after bt1 (1–114) with النورانية removed, so the neighbor across the seam is
    // the wrong book. A قaida plan whose lesson sits at the book's first ayah (132:1)
    // has no prior lesson — return null (no historical frontier) rather than 114:6,
    // which would be a Quran ayah the قaida walk never meets, silently voiding the clamp.
    if (bookTypeOf(a.surah_id) !== bookTypeOf(lessonPos.start_id)) return null;
    return { surahId: a.surah_id, verseId: a.verse_id };
  }

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', function () {
    console.log('Combined Attendance & Evaluation tab initialized');

    // Get halaqa ID from tab content
    const tabContent = document.querySelector('.tab-content');
    if (tabContent) {
      halaqaId = parseInt(tabContent.dataset.halaqaId);
      viewerDelegationActive = tabContent.dataset.viewerDelegationActive === 'true';
      console.log('Halaqa ID:', halaqaId, 'Delegated:', viewerDelegationActive);
    }

    // Set today's date as default (using local date, not UTC)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    selectedDate = `${year}-${month}-${day}`; // Format: YYYY-MM-DD (local time)
    canEdit = true; // Today is always editable
    console.log('Default date set to today:', selectedDate);

    // Listen for tab activation - don't load here, let calendar's dateSelected event trigger loading
    const attnEvalTab = document.getElementById('attn-eval-tab');
    if (attnEvalTab) {
      // Only listen for future tab activations (when switching from another tab)
      // The initial load will be triggered by the calendar's dateSelected event
      attnEvalTab.addEventListener('shown.bs.tab', function () {
        console.log('Combined tab activated via tab switch');
        // Load if nothing is loaded yet, OR the date changed while this tab was inactive
        // (the shared calendar can move selectedDate without triggering a reload here).
        if (studentsData.length === 0 || loadedForDate !== selectedDate) {
          loadStudents();
        }
      });
    }

    // Listen for date changes from calendar (calendar dispatches 'dateSelected' on document)
    document.addEventListener('dateSelected', function (e) {
      console.log('Date selected event received:', e.detail);
      selectedDate = e.detail.date;
      canEditAttendance = !!e.detail.canEditAttendance;
      canEditEvaluation = !!e.detail.canEditEvaluation;
      canEdit = canEditAttendance || canEditEvaluation;

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

    // Manual refresh — Bootstrap pills don't reload tab content, so the
    // students list can go stale (e.g. after a plan was created on the
    // Plans tab). This button forces a fresh fetch.
    const refreshBtn = document.getElementById('refreshAttnEvalBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => loadStudents());
    }

    // Reset button
    const resetBtn = document.getElementById('resetAttnEvalBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', resetAllChanges);
    }

    // Submit button
    const submitBtn = document.getElementById('submitAttnEvalBtn');
    if (submitBtn) {
      submitBtn.addEventListener('click', saveAllChanges);
    }

    // Search input handler
    const searchInput = document.getElementById('attn-eval-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        filterStudentsBySearch(this.value);
      });
    }
  });

  // Cross-tab refresh hook: the Plans tab calls this after a plan is created,
  // edited, or has its status changed, because those mutations change which
  // students appear here (e.g. pausing a plan drops the student) and the
  // Bootstrap pill switch alone won't re-fetch. `silent` keeps the current
  // cards in place while new data loads.
  window.refreshAttnEvalStudents = function (opts) {
    loadStudents(opts || { silent: true });
  };

  // `silent` skips the loading spinner — used after a successful save so
  // the section doesn't flash back to a spinner and lose the expanded card.
  // The post-fetch render still replaces the cards, but the visual jump is
  // much smaller because the previous content stays in place until the new
  // markup is ready.
  async function loadStudents(options) {
    const silent = !!(options && options.silent);
    const container = document.getElementById('attnEvalStudentsList');
    if (!container) return;

    // Demo mode: static cards injected in the view for UI work. Skip API load.
    if (container.dataset.demo === '1') return;

    // Check if we have required data
    if (!halaqaId) {
      console.error('Halaqa ID not set');
      return;
    }

    if (!selectedDate) {
      console.log('Waiting for date to be set...');
      container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px;">
          <i class="ti tabler-calendar" style="font-size: 4rem; color: var(--bs-secondary-color); opacity: 0.5;"></i>
          <p class="text-muted mt-3">يرجى اختيار تاريخ من التقويم</p>
        </div>
      `;
      return;
    }

    // Show loading spinner only on initial / explicit loads — for silent
    // refresh-after-save we keep the existing cards rendered until new data
    // arrives, then swap them out in renderStudents.
    if (!silent) {
      container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px;">
          <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
            <span class="visually-hidden">جاري التحميل...</span>
          </div>
          <p class="text-muted mt-3">جاري تحميل بيانات الطلاب...</p>
        </div>
      `;
    }

    // Kick off the ayah-metadata fetch in parallel with the students request.
    // The cache is reused across all subsequent counter changes, so the only
    // cost is on first load — and the network round-trip overlaps with the
    // students fetch so users almost never wait on it.
    loadQuranAyahsOnce();

    // Record the date this roster is being fetched for, so a returning tab can detect a
    // date change that happened while it was inactive and re-fetch (see loadedForDate).
    loadedForDate = selectedDate;

    try {
      const apiUrl = `/api/activities/students/halaqa/${halaqaId}?date=${selectedDate}`;
      console.log('Loading students from:', apiUrl);
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error('Failed to load students');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to load students');
      }

      // Debug: Log first student to see API structure
      if (result.data && result.data.length > 0) {
        console.log('First student from API:', result.data[0]);
      }

      // Map API response to our data structure
      studentsData = (result.data || []).map(student => {
        // Map attendance status from API - check existing_attendance object
        let attendanceStatus = 0; // default: not marked
        const existingStatus = student.existing_attendance?.status || student.currentStatus;
        if (existingStatus === 'present') attendanceStatus = 1;
        else if (existingStatus === 'absent') attendanceStatus = 2;
        else if (existingStatus === 'late') attendanceStatus = 3;
        else if (existingStatus === 'excused') attendanceStatus = 4;

        // Map evaluation data from API
        const evalData = student.existing_evaluation || {};
        const planDefaults = student.plan_defaults || {};
        const hasExistingEval = !!student.existing_evaluation;

        // Pre-fill counts from the plan's daily targets when no evaluation exists
        // yet — saves the teacher from re-typing the expected amounts. Existing
        // evaluations always win and load their saved values.
        const defaultLines = Math.round(planDefaults.daily_memorization_amount || 0);
        const defaultPages = Math.round(planDefaults.revision_pages || 0);
        const defaultLessons = planDefaults.side_lessons || 0;

        const evaluationData = {
          linesCount: hasExistingEval
            ? (evalData.number_of_lines_for_lesson || evalData.number_of_lines || 0)
            : defaultLines,
          linesRating: mapEvaluationRatingFromAPI(evalData.lesson_evaluation_score_id || evalData.memorization_evaluation_score_id, 'lines'),
          // Revision pages: load the saved count just like lines/lessons.
          // The "تم تقييم: من … إلى …" label already disambiguates that this
          // is the completed batch, and surfacing the number is more
          // intuitive — also covers Mutoon (which doesn't render the
          // from/to label) and prevents an inadvertent overwrite-with-0
          // when a teacher only edits a rating on update.
          pagesCount: hasExistingEval
            ? (evalData.number_of_pages_for_revision || evalData.number_of_pages || 0)
            : defaultPages,
          pagesRating: mapEvaluationRatingFromAPI(evalData.revision_evaluation_score_id, 'pages'),
          lessonsCount: hasExistingEval
            ? (evalData.number_of_side_lessons || 0)
            : defaultLessons,
          lessonsRating: mapEvaluationRatingFromAPI(evalData.side_lessons_evaluation_score_id, 'lessons'),
          notes: evalData.evaluation_notes || ''
        };

        // The baseline is the exact state the teacher first sees — INCLUDING
        // the plan-default prefill for new (not-yet-evaluated) rows. An earlier
        // version used a zero baseline so the prefilled counts registered as a
        // "change" and lit the submit button immediately; the cost was that
        // every prefilled-but-untouched student got bundled into the bulk save,
        // producing spurious "attendance required" failures for students the
        // teacher never edited. Cloning the prefilled values makes the
        // change-detector fire only on a genuine edit (rating, count, notes,
        // attendance, or revision override), so the save sends just the rows
        // the teacher actually touched. Attendance is tracked separately
        // (originalAttendanceStatus), so marking a student present still
        // includes them and carries the prefilled counts along.
        const originalEvaluationData = JSON.parse(JSON.stringify(evaluationData));

        return {
          student_id: student.student_id,
          Student_ID: student.student_id,
          plan_id: student.plan_id,
          has_multiple_plans: student.has_multiple_plans || false,
          full_name_official_ar: student.full_Name_AR || student.full_name_official_ar || 'طالب',
          Full_Name_Official_AR: student.full_Name_AR || student.full_name_official_ar || 'طالب',
          attendance_status: attendanceStatus,
          originalAttendanceStatus: attendanceStatus, // Store original for reset
          evaluationData: evaluationData,
          originalEvaluationData: originalEvaluationData,
          // Store existing IDs for update vs create logic
          existing_evaluation_id: evalData.evaluation_id || null,
          existing_attendance_id: student.existing_attendance?.attendance_id || null,
          // Full saved-eval object — used by the post-eval label to compute
          // the from-to range using the saved start positions and counts.
          // Without this, the JS only sees the id and falls back to dashes.
          existing_evaluation: student.existing_evaluation || null,
          // Pass through fields the eval section render reads from the student object
          halaqa_type_id: student.halaqa_type_id,
          current_position: student.current_position || null,
          // Same-day "what's next" preview (advanced next-position + inclusive end
          // when the API provides it) for the evaluated-card preview links.
          next_preview: student.next_preview || null,
          // Per-plan allowed submission days — used by the submit-time
          // gate to refuse saves on weekdays the plan excludes.
          submission_days: student.submission_days || null,
          // Plan defaults for display as placeholders. Keep the raw
          // `daily_memorization_amount` alongside the derived integer because
          // the side-lessons range math (count × daily_memorization_amount)
          // needs the un-rounded multiplier from the API.
          plan_defaults: {
            lines: Math.round(planDefaults.daily_memorization_amount || 0),
            pages: Math.round(planDefaults.revision_pages || 0),
            lessons: planDefaults.side_lessons || 0,
            daily_memorization_amount: planDefaults.daily_memorization_amount || 0,
            revision_pages: planDefaults.revision_pages || 0,
            side_lessons: planDefaults.side_lessons || 0,
            // CRITICAL: carry the memorization direction (1 = forward, 2 = backward).
            // Without it computeEndPosition always walks forward, so a backward plan's
            // "to" never crosses into the previous suras (An-Nas pinned at 114:6).
            memorization_direction_id: planDefaults.memorization_direction_id || 1
          },
          // Revision-only override (Quran plans). Null until the teacher
          // toggles the chip and picks a surah+ayah. The original baseline
          // mirrors this so the change-detector ignores the initial null.
          revisionOverride: null,
          originalRevisionOverride: null
        };
      });

      console.log('Combined tab - Students loaded:', studentsData.length);
      allStudentsData = [...studentsData]; // Store all students for search filtering
      // Harvest any surah names already attached to current_position objects
      // so cross-surah range labels can render localized names without an
      // extra lookup endpoint.
      harvestSurahNamesFromStudents(allStudentsData);
      searchTerm = ''; // Reset search term on load

      // Clear search input
      const searchInput = document.getElementById('attn-eval-search-input');
      if (searchInput) {
        searchInput.value = '';
      }

      renderStudents();
      // Run the change-detector against original baselines — when plans had
      // prefilled defaults but no saved evaluation yet, this flips hasChanges
      // to true so the submit button is enabled out of the gate.
      checkForChanges();
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
  }

  // Helper function to map evaluation ratings from API to UI values
  function mapEvaluationRatingFromAPI(apiValue, type) {
    if (!apiValue) return null;

    // Lines and Lessons: API (1=Excellent, 2=Not Memorized, 3=Not Listened) -> UI (4=Excellent, 1=Not Memorized, 0=Not Listened)
    if (type === 'lines' || type === 'lessons') {
      if (apiValue === 1) return 4; // Excellent
      if (apiValue === 2) return 1; // Not Memorized
      if (apiValue === 3) return 0; // Not Listened
    }

    // Pages: API (1=Excellent, 2=Very Good, 3=Acceptable, 4=Not Memorized, 5=Not Listened) -> UI (5=Excellent, 4=Very Good, 3=Acceptable, 1=Not Memorized, 0=Not Listened)
    if (type === 'pages') {
      if (apiValue === 1) return 5; // Excellent
      if (apiValue === 2) return 4; // Very Good
      if (apiValue === 3) return 3; // Acceptable
      if (apiValue === 4) return 1; // Not Memorized
      if (apiValue === 5) return 0; // Not Listened
    }

    return null;
  }

  function renderStudents() {
    const container = document.getElementById('attnEvalStudentsList');
    if (!container) return;

    if (studentsData.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px;">
          <i class="ti tabler-users" style="font-size: 4rem; color: var(--bs-secondary-color); opacity: 0.5;"></i>
          <p class="text-muted mt-3">يجب تعيين خطط للطلاب حتى تتمكن من اتمام التحضير والتقييم</p>
        </div>
      `;
      updateSummaryCounts();
      return;
    }

    // Capture which student cards were expanded so we can re-open them
    // after the rebuild. Without this every silent post-save reload would
    // collapse whatever the teacher had open.
    const expandedCardIds = Array.from(
      container.querySelectorAll('.collapse.show')
    ).map(el => el.id);

    // Clear container
    container.innerHTML = '';

    // Append each student card
    studentsData.forEach(student => {
      const card = createStudentCard(student);
      container.appendChild(card);
    });

    // Re-expand the cards that were open before the rebuild.
    expandedCardIds.forEach(id => {
      const collapseEl = container.querySelector('#' + CSS.escape(id));
      if (collapseEl && typeof bootstrap !== 'undefined') {
        bootstrap.Collapse.getOrCreateInstance(collapseEl, { toggle: false }).show();
      }
    });

    updateSummaryCounts();
  }

  function filterStudentsBySearch(term) {
    searchTerm = term.toLowerCase().trim();

    if (searchTerm === '') {
      // Show all students if search is empty
      studentsData = [...allStudentsData];
    } else {
      // Filter students by name
      studentsData = allStudentsData.filter(student => {
        const studentName = student.full_name_official_ar || student.Full_Name_Official_AR || '';
        return studentName.toLowerCase().includes(searchTerm);
      });
    }

    renderStudents();
  }

  // A student counts as "evaluated" (تم التقييم) only when EVERY evaluation
  // section the plan requires has a rating. A section is required only when its
  // plan default (daily target) is > 0 — sections the plan sets to 0 are not part
  // of the plan (rendered disabled) and are ignored. So a plan with revision = 0
  // needs only lesson + side-lessons rated to earn the badge; a plan with all
  // three requires all three. If the plan requires none (every default 0 — rare),
  // fall back to "any rating set" so a deliberately-entered rating still counts.
  // A single rating no longer lights the badge — partial evaluations stay
  // un-badged until the required parts are complete.
  function isFullyEvaluated(student) {
    const ed = student.evaluationData;
    if (!ed) return false;
    const pd = student.plan_defaults || {};
    const isRated = v => v !== null && v !== undefined;
    const parts = [
      { required: (pd.lines || 0) > 0, rated: isRated(ed.linesRating) },
      { required: (pd.pages || 0) > 0, rated: isRated(ed.pagesRating) },
      { required: (pd.lessons || 0) > 0, rated: isRated(ed.lessonsRating) }
    ];
    const required = parts.filter(p => p.required);
    if (required.length === 0) return parts.some(p => p.rated);
    return required.every(p => p.rated);
  }

  // Plan-required activities the student left UNRATED while at least one other
  // section IS rated (i.e. a real evaluation is being submitted). Returns their
  // Arabic labels. Under score-gated advancement (API, 2026-07-01) a required
  // activity with no grade does NOT advance — it repeats the same position next
  // day. Intended when the student didn't present it, but usually an accidental
  // omission, so the save flow confirms (see the ungraded gate in saveAllChanges).
  // Returns [] when nothing to warn about: fully rated, or no rating at all (no
  // evaluation row is created, so nothing repeats).
  function ungradedRequiredParts(student) {
    const ed = student.evaluationData;
    if (!ed) return [];
    const pd = student.plan_defaults || {};
    const isRated = v => v !== null && v !== undefined;
    if (!(isRated(ed.linesRating) || isRated(ed.pagesRating) || isRated(ed.lessonsRating))) return [];
    const parts = [
      { required: (pd.lines || 0) > 0, rated: isRated(ed.linesRating), label: 'الحفظ' },
      { required: (pd.pages || 0) > 0, rated: isRated(ed.pagesRating), label: 'المراجعة' },
      { required: (pd.lessons || 0) > 0, rated: isRated(ed.lessonsRating), label: 'جنب الدرس' }
    ];
    return parts.filter(p => p.required && !p.rated).map(p => p.label);
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

      // Evaluation counts — counts alone don't mean "evaluated" (they're prefilled
      // from plan defaults). A row counts as evaluated only when every plan-required
      // section is rated (see isFullyEvaluated). An absent student is never
      // "evaluated": marking absent records attendance only (تحضير), no evaluation.
      const hasEvaluation = student.attendance_status !== 2 && isFullyEvaluated(student);

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

  // Same-day "what's next" preview links, shown ONLY on an evaluated card. Each
  // link opens a Swal with the next lesson/revision/side from→to. Rendered only for
  // plan-required activities (planDefault > 0) that carry a next_preview start.
  function createNextPreviewLinks(student) {
    if (!student.existing_evaluation_id) return '';     // only after an eval is saved
    const np = student.next_preview;
    if (!np) return '';
    const pd = student.plan_defaults || {};
    const items = [
      { type: 'lesson', required: (pd.lines || 0) > 0, label: 'الدرس التالي' },
      { type: 'revision', required: (pd.pages || 0) > 0, label: 'المراجعة التالية' },
      { type: 'side_lessons', required: (pd.lessons || 0) > 0, label: 'الدرس الجانبي التالي' }
    ].filter(it => it.required && np[it.type] && np[it.type].start_id > 0);
    if (items.length === 0) return '';
    const studentId = student.student_id || student.Student_ID;
    const links = items.map(it =>
      `<a href="#" class="next-preview-link" data-student-id="${studentId}" data-preview-type="${it.type}" ` +
      `style="font-size:0.8rem; color:var(--bs-primary); text-decoration:none; display:inline-flex; align-items:center; gap:4px;">` +
      `<i class="ti tabler-arrow-left-circle"></i>${it.label}</a>`
    ).join('<span style="color:var(--bs-border-color);">|</span>');
    return `
      <div class="next-preview-row" style="padding:10px 12px; border-top:1px solid var(--bs-border-color); display:flex; flex-wrap:wrap; gap:10px; align-items:center;">
        <span style="font-size:0.78rem; color:var(--bs-secondary-color);">التالي:</span>
        ${links}
      </div>`;
  }

  // Swal showing the next lesson/revision/side range (from→to). Renders the
  // controller's next_preview verbatim — start→end when the API provides the end
  // (all books, incl. Mutoon), else start-only (activity at book end / API omitted).
  function showNextPreviewSwal(student, type) {
    const np = student.next_preview && student.next_preview[type];
    if (!np) return;
    const titleMap = { lesson: 'الدرس التالي', revision: 'المراجعة التالية', side_lessons: 'الدرس الجانبي التالي' };
    const isMutoon = student.halaqa_type_id === 2;
    const posWord = isMutoon ? 'النص' : (derivePlanBookType(student) === 2 ? 'المقطع' : 'الآية');
    const book = isMutoon ? (np.book_name || '') : '';
    const ev = student.existing_evaluation || {};
    // Name a surah (Quran/قاعدة) or chapter (Mutoon) by id: saved eval's chapter_names,
    // then the preview's own names, then a literal fallback.
    const nameOf = (id) => {
      if (!(id > 0)) return '';
      if (isMutoon) {
        const cn = ev.chapter_names || null;
        return (cn && cn[id]) || (id === np.start_id ? np.chapter_name : id === np.end_id ? np.end_chapter_name : null) || ('الفصل ' + id);
      }
      return getSurahName(id) || (id === np.start_id ? np.sura_name : id === np.end_id ? np.end_sura_name : null) || ('سورة ' + id);
    };
    // Render start→end (or single point / start-only) as Arabic text.
    const rangeText = (sId, sPos, eId, ePos) => {
      const from = nameOf(sId);
      const join = (extra) => isMutoon ? [book, from, extra].filter(Boolean).join(' - ') : `${from} - ${extra}`;
      if (!(eId > 0 && ePos > 0)) return join(`يبدأ من ${posWord} ${sPos}`);
      if (sId === eId && sPos === ePos) return join(`${posWord} ${sPos}`);           // single point
      if (sId === eId) return join(`من ${posWord} ${sPos} إلى ${posWord} ${ePos}`);
      const to = nameOf(eId);
      return isMutoon
        ? [book, `من ${from} ${posWord} ${sPos} إلى ${to} ${posWord} ${ePos}`].filter(Boolean).join(' - ')
        : `من ${from} ${posWord} ${sPos} إلى ${to} ${posWord} ${ePos}`;
    };

    // Revision/side clamp to the lesson frontier; a zero-width "next" (start == end) means
    // the activity caught up to the frontier. Business (INTERIM, pending business input): the
    // student still owes the activity daily, so REPEAT the last saved range for it rather
    // than showing an empty range. (The lesson never clamps — a lesson point is a genuine
    // single-unit assignment and is rendered as a point.)
    const isPoint = np.end_id > 0 && np.end_position > 0 && np.start_id === np.end_id && np.start_position === np.end_position;
    const caughtUp = isPoint && (type === 'revision' || type === 'side_lessons');
    let body, repeated = false;
    if (caughtUp) {
      const rs = ev[type + '_start_id'], rsp = ev[type + '_start_position'];
      const re = ev[type + '_end_id'], rep = ev[type + '_end_position'];
      if (rs > 0 && rsp > 0) { body = rangeText(rs, rsp, re, rep); repeated = true; }
    }
    if (!body) body = rangeText(np.start_id, np.start_position, np.end_id, np.end_position);

    if (typeof Swal === 'undefined') { alert((titleMap[type] || 'الموضع التالي') + '\n' + body); return; }
    Swal.fire({
      title: (titleMap[type] || 'الموضع التالي') + (repeated ? ' — تكرار' : ''),
      html: `<p class="swal2-html-container-custom" style="font-size:1.05rem; direction:rtl;">${body}${repeated ? '<br><span style="font-size:0.82rem; color:var(--bs-secondary-color);">تكرار نفس الدرس (بلغ حدّ الحفظ الحالي)</span>' : ''}</p>`,
      icon: 'info',
      confirmButtonText: 'حسناً',
      customClass: { popup: 'swal2-border-radius', confirmButton: 'btn btn-primary' },
      buttonsStyling: false
    });
  }

  function createStudentCard(student, index) {
    const card = document.createElement('div');
    card.className = 'attendance-student-card mb-3';
    card.style.cssText = 'border: 1px solid var(--bs-border-color); border-radius: 12px; overflow: hidden;';

    const studentId = student.student_id || student.Student_ID;
    const planId = student.plan_id;
    const cardId = student.has_multiple_plans ? `${studentId}-plan${planId}` : studentId;
    const studentName = student.full_name_official_ar || student.Full_Name_Official_AR || 'طالب';
    const attendanceStatus = student.attendance_status || 0;
    // Two independent badges — show تم التحضير when attendance is recorded and
    // تم التقييم when the evaluation is complete, so a student with both shows both.
    // "Complete" = every plan-required section rated (see isFullyEvaluated); a
    // partial evaluation stays un-badged until the required parts are filled in.
    // An absent student has no evaluation (marking absent records attendance only —
    // you didn't actually evaluate them), so it counts as تحضير only — never تم التقييم.
    const isAbsent = attendanceStatus === 2;
    const hasEvaluation = !isAbsent && isFullyEvaluated(student);
    let statusBadge = '';
    if (attendanceStatus > 0) {
      statusBadge += `<span class="badge bg-label-success ms-2" style="font-size: 0.75rem;">تم التحضير</span>`;
    }
    if (hasEvaluation) {
      statusBadge += `<span class="badge bg-label-info ms-2" style="font-size: 0.75rem;">تم التقييم</span>`;
    }
    const planIdBadge = student.has_multiple_plans ? `<span class="badge bg-label-warning ms-2" style="font-size: 0.75rem;">خطة #${planId}</span>` : '';
    const planBadge = `${planIdBadge}${statusBadge}`;

    card.innerHTML = `
      <div class="card-main-row" data-bs-toggle="collapse" data-bs-target="#attneval-${cardId}" aria-expanded="false" aria-controls="attneval-${cardId}">
        <i class="ti tabler-chevron-down toggle-chevron"></i>
        <div class="student-info-wrapper" style="flex: 1;">
          <span class="student-name">${studentName}</span>${planBadge}
        </div>
      </div>

      <div class="collapse" id="attneval-${cardId}">
        <div style="padding: 0;">
          <!-- Evaluation Sections Container -->
          <div class="evaluation-sections-container">
            ${createEvaluationSection(studentId, 'lines', student)}
            ${createEvaluationSection(studentId, 'pages', student)}
            ${createEvaluationSection(studentId, 'lessons', student)}
          </div>
          ${createNextPreviewLinks(student)}

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

    // Add event listener for collapse toggle to add/remove expanded class
    const collapseElement = card.querySelector(`#attneval-${cardId}`);
    if (collapseElement) {
      collapseElement.addEventListener('shown.bs.collapse', function () {
        card.classList.add('expanded');
      });
      collapseElement.addEventListener('hidden.bs.collapse', function () {
        card.classList.remove('expanded');
      });
    }

    // Next-position eye icon — wire each verse-info row through the
    // range-aware handler. (Legacy single-text fallback is still inside
    // wireExpandButton for post-eval / non-range cards.)
    card.querySelectorAll('.verse-info').forEach(node => wireExpandButton(node));

    // "التالي" preview links (evaluated cards) → open the next-lesson from→to Swal.
    card.querySelectorAll('.next-preview-link').forEach(link => {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        showNextPreviewSwal(student, this.dataset.previewType);
      });
    });

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

        // Check if this button is already active (toggle behavior)
        const isAlreadyActive = this.classList.contains('active-' + status);

        // Update UI - remove all active classes
        statusBtns.forEach(b => {
          b.classList.remove('active-present', 'active-absent', 'active-late', 'active-excused');
        });

        // Update data on the plan object in scope, NOT a lookup by student_id
        // (which resolves to the first of a multi-plan student's plans and would
        // toggle attendance on the wrong plan's card).
        if (isAlreadyActive) {
          // Deselect - set to not-marked (0)
          student.attendance_status = 0;
          console.log('Attendance deselected:', studentId, 'plan', planId, 'now not-marked');
        } else {
          // Select new status
          this.classList.add('active-' + status);
          student.attendance_status = statusNum;
          console.log('Attendance updated:', studentId, 'plan', planId, status, statusNum);

          // Marking a student absent only records attendance — it must NOT touch
          // the evaluation. We used to auto-select "لم يسمع" (not listened) here,
          // but that was confusing (it looked like the absent student had been
          // evaluated), so the UI now leaves the evaluation section untouched.
        }
        updateSummaryCounts(); // Update summary immediately
        checkForChanges();
      });
    });

    // Add event listener for notes textarea
    const notesTextarea = card.querySelector('.notes-textarea');
    if (notesTextarea) {
      notesTextarea.addEventListener('input', function () {
        if (!canEdit) return;
        updateStudentEvaluation(student, 'notes', 'notes', this.value);
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
          updateStudentEvaluation(student, sectionType, 'count', currentValue);
          refreshVerseInfoForSection(section, student, uiTypeToPositionKey(sectionType));
        });
      });

      // Counter input - listen for both 'input' (realtime) and 'change' (on blur) events
      if (counterInput) {
        const handleCounterChange = function () {
          if (!canEdit) return;

          let value = parseInt(this.value) || 0;
          value = Math.max(0, Math.min(value, 999));
          this.value = value;

          updateStudentEvaluation(student, sectionType, 'count', value);
          // Re-render the verse-info row for this section to reflect the new
          // count. Range math is local (uses ayahsCache) so this is cheap.
          refreshVerseInfoForSection(section, student, uiTypeToPositionKey(sectionType));
        };

        counterInput.addEventListener('input', handleCounterChange);
        counterInput.addEventListener('change', handleCounterChange);
      }

      // Revision override controls (Quran "pages" section only). Toggle
      // between the counter and a surah+ayah picker; either way the page
      // count still travels in the POST — the override just changes "from".
      if (sectionType === 'pages') {
        wireRevisionOverrideControls(card, section, sectionStudentId, student);
      }

      // Rating buttons
      const ratingBtns = section.querySelectorAll('.evaluation-btn');
      ratingBtns.forEach(btn => {
        btn.addEventListener('click', function () {
          if (!canEdit) return;

          const value = parseInt(this.dataset.value);
          const btnClass = this.dataset.class;

          // Check if this button is already active (toggle behavior)
          const isAlreadyActive = this.classList.contains('active-' + btnClass);

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

          if (isAlreadyActive) {
            // Deselect - clear rating and reset section background
            section.className = 'evaluation-section';
            updateStudentEvaluation(student, sectionType, 'rating', null);
            console.log('Evaluation deselected:', sectionStudentId, sectionType);
          } else {
            // Select new rating
            this.classList.add('active-' + btnClass);
            section.className = 'evaluation-section eval-' + btnClass;
            updateStudentEvaluation(student, sectionType, 'rating', value);
          }
        });
      });
    });

    return card;
  }

  // Mutates the evaluation state of ONE plan. Takes the plan's student object
  // directly (NOT a student_id): a student can have multiple plans — usually
  // same book, occasionally two different books (a التلقين student with a Quran
  // plan AND a قاعدة plan) — so a lookup by student_id alone resolves to the
  // FIRST matching plan and lands the edit on the wrong one. The object is the
  // canonical reference shared by studentsData/allStudentsData, so mutating it
  // updates state everywhere (search filter only copies the array, not objects).
  function updateStudentEvaluation(student, type, field, value) {
    if (!student) return;

    if (!student.evaluationData) {
      student.evaluationData = {};
    }

    if (type === 'notes') {
      student.evaluationData.notes = value;
    } else {
      const fieldName = field === 'count' ? `${type}Count` : `${type}Rating`;
      student.evaluationData[fieldName] = value;
    }

    updateSummaryCounts(); // Update summary immediately
    checkForChanges();
    console.log('Updated evaluation:', student.student_id, 'plan', student.plan_id, type, field, value);
  }

  function checkForChanges() {
    let changesDetected = false;

    // Check ALL students (not just search-filtered ones) for changes
    for (const student of allStudentsData) {
      // Check attendance changes
      if (student.attendance_status !== student.originalAttendanceStatus) {
        changesDetected = true;
        break;
      }

      // Check evaluation changes
      const current = student.evaluationData || {};
      const original = student.originalEvaluationData || {};

      if (
        current.linesCount !== original.linesCount ||
        current.linesRating !== original.linesRating ||
        current.pagesCount !== original.pagesCount ||
        current.pagesRating !== original.pagesRating ||
        current.lessonsCount !== original.lessonsCount ||
        current.lessonsRating !== original.lessonsRating ||
        current.notes !== original.notes
      ) {
        changesDetected = true;
        break;
      }

      // Revision override is its own piece of state (sent as a separate
      // pair of fields in the bulk POST), so a change here must enable
      // the submit button even when no count/rating changed.
      const curOv = student.revisionOverride || null;
      const origOv = student.originalRevisionOverride || null;
      const ovKey = ov => ov ? `${ov.surahId}:${ov.verseId}->${ov.endSurahId || 0}:${ov.endVerseId || 0}|${ov.pagesCount || 0}` : '';
      if (ovKey(curOv) !== ovKey(origOv)) {
        changesDetected = true;
        break;
      }
    }

    hasChanges = changesDetected;
    updateButtonStates();
  }

  function updateButtonStates() {
    const resetBtn = document.getElementById('resetAttnEvalBtn');
    const submitBtn = document.getElementById('submitAttnEvalBtn');

    if (resetBtn) {
      resetBtn.disabled = !hasChanges || !canEdit;
    }
    if (submitBtn) {
      submitBtn.disabled = !hasChanges || !canEdit;
    }
  }

  function resetAllChanges() {
    if (!hasChanges) return;

    Swal.fire({
      title: 'إعادة تعيين التغييرات',
      html: '<p class="swal2-html-container-custom">هل أنت متأكد من إعادة تعيين جميع التغييرات؟</p>',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، إعادة تعيين',
      cancelButtonText: 'إلغاء',
      customClass: {
        popup: 'swal2-border-radius',
        confirmButton: 'btn btn-primary me-3',
        cancelButton: 'btn btn-label-secondary'
      },
      buttonsStyling: false
    }).then(result => {
      if (result.isConfirmed) {
        // Reset all students to original state
        studentsData.forEach(student => {
          student.attendance_status = student.originalAttendanceStatus;
          student.evaluationData = JSON.parse(JSON.stringify(student.originalEvaluationData));
          student.revisionOverride = student.originalRevisionOverride
            ? { ...student.originalRevisionOverride }
            : null;
        });

        hasChanges = false;
        renderStudents();
        updateButtonStates();

        Swal.fire({
          title: 'تم إعادة التعيين',
          html: '<p class="swal2-html-container-custom">تم إعادة تعيين جميع التغييرات بنجاح</p>',
          icon: 'success',
          confirmButtonText: 'حسناً',
          customClass: {
            popup: 'swal2-border-radius',
            confirmButton: 'btn btn-primary'
          },
          buttonsStyling: false
        });
      }
    });
  }

  // Day-of-week index → Arabic name matching the values stored in
  // plan.submission_days. JS getDay(): 0=Sun..6=Sat.
  const ARABIC_WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  // Tiny error-toast helper so the new submit-time gates stay readable.
  function showBlockingError(title, text) {
    if (typeof Swal === 'undefined') { alert(title + '\n' + text); return; }
    Swal.fire({
      title, text, icon: 'warning',
      confirmButtonText: 'حسناً',
      customClass: { popup: 'swal2-border-radius', confirmButton: 'btn btn-primary' },
      buttonsStyling: false
    });
  }

  // A student has an "evaluation edit" when any rating, count, or note differs
  // from the baseline the teacher first saw. Single-sourced so the save filter,
  // the pre-flight gates, and the implicit-attendance rule below all agree on
  // what counts as an evaluation.
  function hasEvaluationEdit(student) {
    const cur = student.evaluationData || {};
    const orig = student.originalEvaluationData || {};
    return (
      cur.linesCount !== orig.linesCount || cur.linesRating !== orig.linesRating ||
      cur.pagesCount !== orig.pagesCount || cur.pagesRating !== orig.pagesRating ||
      cur.lessonsCount !== orig.lessonsCount || cur.lessonsRating !== orig.lessonsRating ||
      cur.notes !== orig.notes
    );
  }

  async function saveAllChanges() {
    if (!hasChanges || !canEdit) return;

    // -----------------------------------------------------------------
    // Pre-flight gates: cutoff, submission_days, delegated past-day eval.
    // Each block is independent and shows a specific message so the
    // teacher/guider knows exactly why save was refused.
    // -----------------------------------------------------------------
    const changedAll = allStudentsData.map(student => {
      const attCh = student.attendance_status !== student.originalAttendanceStatus;
      const cur = student.evaluationData || {};
      const orig = student.originalEvaluationData || {};
      const evCh =
        cur.linesCount !== orig.linesCount || cur.linesRating !== orig.linesRating ||
        cur.pagesCount !== orig.pagesCount || cur.pagesRating !== orig.pagesRating ||
        cur.lessonsCount !== orig.lessonsCount || cur.lessonsRating !== orig.lessonsRating ||
        cur.notes !== orig.notes;
      return { student, attCh, evCh, any: attCh || evCh };
    }).filter(x => x.any);

    const anyAttendanceChange = changedAll.some(x => x.attCh);
    const anyEvalChange = changedAll.some(x => x.evCh);

    // Gate 1 — cutoff. canEditAttendance/Evaluation come from the calendar
    // which reads the admin's offset settings. Block per-type so a date
    // where only one is allowed doesn't quietly let the other through.
    if (anyAttendanceChange && !canEditAttendance) {
      showBlockingError('انتهت مهلة التحضير', 'لا يمكن تعديل التحضير لهذا التاريخ.');
      return;
    }
    if (anyEvalChange && !canEditEvaluation) {
      showBlockingError('انتهت مهلة التقييم', 'لا يمكن تعديل التقييم لهذا التاريخ.');
      return;
    }

    // Gate 2 — submission_days per plan. The selected weekday must be in
    // each changed student's plan.submission_days list. We tolerate plans
    // with no submission_days set (older data) — only enforce when present.
    if (selectedDate) {
      // YYYY-MM-DD is parsed as UTC; getUTCDay aligns with the calendar's
      // "calendar day" view rather than the browser's local TZ shift.
      const sel = new Date(selectedDate + 'T00:00:00Z');
      const arabicDay = ARABIC_WEEKDAYS[sel.getUTCDay()];
      const disallowed = changedAll.filter(x => {
        const days = x.student.submission_days;
        return Array.isArray(days) && days.length > 0 && !days.includes(arabicDay);
      });
      if (disallowed.length > 0) {
        const names = disallowed
          .map(x => x.student.full_name_official_ar || x.student.Full_Name_Official_AR || '')
          .filter(Boolean).slice(0, 3).join('، ');
        const more = disallowed.length > 3 ? `، و${disallowed.length - 3} آخرين` : '';
        showBlockingError(
          'يوم غير مسموح في الخطة',
          `يوم ${arabicDay} ليس ضمن أيام التسليم لخطة الطلاب: ${names}${more}`
        );
        return;
      }
    }

    // Gate 3 — delegated past-day eval over an already-evaluated student.
    // Surface this as a confirm (not a block): the guider may legitimately
    // need to correct, but the teacher's day-of progress could have
    // advanced based on the original eval. Async because Swal returns a
    // promise; bail out unless the guider explicitly confirms.
    if (viewerDelegationActive && selectedDate && anyEvalChange) {
      const todayStr = (() => {
        const d = new Date(); d.setHours(0, 0, 0, 0);
        const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dd}`;
      })();
      const isPastDay = selectedDate < todayStr;
      const evalOverExisting = changedAll.some(x => x.evCh && !!x.student.existing_evaluation_id);
      if (isPastDay && evalOverExisting && typeof Swal !== 'undefined') {
        const proceed = await Swal.fire({
          title: 'تعديل تقييم سابق',
          html: '<p class="swal2-html-container-custom">أنت تعدّل تقييماً لطالب تم تقييمه مسبقاً من قِبَل المعلم. قد يكون الدرس قد تقدّم بناءً على التقييم الأصلي، مما قد يؤثر على المسار. هل ترغب في المتابعة؟</p>',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'متابعة',
          cancelButtonText: 'إلغاء',
          customClass: {
            popup: 'swal2-border-radius',
            confirmButton: 'btn btn-warning me-3',
            cancelButton: 'btn btn-label-secondary'
          },
          buttonsStyling: false
        }).then(r => r.isConfirmed);
        if (!proceed) return;
      }
    }

    // Block save if any active revision override has an unresolved page
    // count. Common case: ayahs cache was still loading when the teacher
    // toggled override + saved fast; pagesCount fell back to 0/plan-default
    // and the API would receive a wrong number_of_pages_for_revision.
    const overrideMissingPages = allStudentsData.find(s => {
      const ov = s.revisionOverride;
      if (!ov || !(ov.surahId > 0) || !(ov.verseId > 0)) return false;
      // Override is "active" only when both endpoints + pages are set.
      const hasEnd = ov.endSurahId > 0 && ov.endVerseId > 0;
      const hasPages = ov.pagesCount > 0;
      return !hasEnd || !hasPages;
    });
    if (overrideMissingPages) {
      Swal.fire({
        title: 'النطاق غير مكتمل',
        text: 'يرجى تحديد آيات البداية والنهاية للمراجعة قبل الحفظ',
        icon: 'warning',
        confirmButtonText: 'حسناً',
        customClass: { popup: 'swal2-border-radius', confirmButton: 'btn btn-primary' },
        buttonsStyling: false
      });
      return;
    }

    // Gate 4 — plan-required activity left ungraded. Under score-gated advancement
    // an activity with no grade does NOT advance; it repeats the same position next
    // day. That's correct when the student didn't present it, but is usually an
    // accidental omission — so confirm (don't block) and name the students/activities
    // that will repeat, suggesting "لم يسمع" if not presented. Absent students are
    // skipped (attendance only, no evaluation row is created).
    const ungradedWarnings = changedAll
      .filter(x => x.evCh && x.student.attendance_status !== 2)
      .map(x => ({ student: x.student, parts: ungradedRequiredParts(x.student) }))
      .filter(w => w.parts.length > 0);
    if (ungradedWarnings.length > 0 && typeof Swal !== 'undefined') {
      const rows = ungradedWarnings.slice(0, 6)
        .map(w => `<li style="margin-bottom:4px;"><strong>${w.student.full_name_official_ar || 'طالب'}</strong>: ${w.parts.join('، ')}</li>`)
        .join('');
      const more = ungradedWarnings.length > 6
        ? `<p class="swal2-html-container-custom">و${ungradedWarnings.length - 6} طلاب آخرين</p>`
        : '';
      const proceed = await Swal.fire({
        title: 'أنشطة غير مقيّمة',
        html:
          '<p class="swal2-html-container-custom">الأنشطة التالية بدون تقييم، ولن تتقدّم إلى الموضع التالي (ستتكرر في اليوم التالي). إن لم يعرض الطالب النشاط، سجّل "لم يسمع".</p>' +
          `<ul style="text-align:right; direction:rtl; display:inline-block; margin:8px auto 0;">${rows}</ul>` +
          more +
          '<p class="swal2-html-container-custom" style="margin-top:8px;">هل تريد المتابعة والحفظ؟</p>',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'متابعة الحفظ',
        cancelButtonText: 'رجوع للتقييم',
        customClass: {
          popup: 'swal2-border-radius',
          confirmButton: 'btn btn-warning me-3',
          cancelButton: 'btn btn-label-secondary'
        },
        buttonsStyling: false
      }).then(r => r.isConfirmed);
      if (!proceed) return;
    }

    // Show loading
    Swal.fire({
      title: 'جاري الحفظ...',
      html: '<p class="swal2-html-container-custom">يرجى الانتظار</p>',
      allowOutsideClick: false,
      allowEscapeKey: false,
      customClass: {
        popup: 'swal2-border-radius'
      },
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      // OPTIMIZATION: Only send students who have actual changes
      // Filter out students with no attendance change AND no evaluation change
      const changedStudents = allStudentsData.filter(student => {
        const attendanceChanged = student.attendance_status !== student.originalAttendanceStatus;
        return attendanceChanged || hasEvaluationEdit(student);
      });

      if (changedStudents.length === 0) {
        Swal.fire({
          title: 'لا توجد تغييرات',
          html: '<p class="swal2-html-container-custom">لم يتم إجراء أي تغييرات على بيانات الطلاب</p>',
          icon: 'info',
          confirmButtonText: 'حسناً',
          customClass: {
            popup: 'swal2-border-radius',
            confirmButton: 'btn btn-primary'
          },
          buttonsStyling: false
        });
        return;
      }

      console.log(`Sending ${changedStudents.length} changed students out of ${allStudentsData.length} total`);

      const combinedData = changedStudents.map(student => {
        const linesCount = student.evaluationData?.linesCount || 0;
        const lessonsCount = student.evaluationData?.lessonsCount || 0;
        // FE-computed end positions for lesson + side-lessons. Walked
        // forward from the start the teacher saw on screen — which is the
        // saved eval's start when updating, or the plan's next-position
        // when creating. Sent only for Quran plans; Mutoon has no ayah
        // math client-side, so the API will populate via the calculator.
        // Lesson + side-lessons END positions are computed by the API's position
        // calculator (verified correct for forward / backward / book-boundary). The FE
        // deliberately does NOT send auto-computed end overrides for them: the API stores
        // an override id+position verbatim and skips the calculator, and a client-side end
        // could be wrong (e.g. a Quran lesson's end bled into the last Nuraniyah/قاعدة
        // surah, stored as 131:46). Leaving these null lets the calculator run. Only the
        // teacher's MANUAL revision from/to override (revision*Override below) is sent.
        const lessonEnd = null, sideLessonsEnd = null;

        // Recording an evaluation implies the student was present. If the
        // teacher entered a rating/count/note but never marked attendance,
        // default it to "present" so the API's "attendance required before
        // evaluation" rule is satisfied — you cannot evaluate a student who
        // wasn't there. An explicit attendance choice (absent/late/excused)
        // is always respected.
        let attendanceStatus = mapAttendanceStatusToString(student.attendance_status);
        if (attendanceStatus === 'not-marked' && hasEvaluationEdit(student)) {
          attendanceStatus = 'present';
        }

        return {
          planId: student.plan_id,
          studentId: student.student_id,
          linesCount: linesCount,
          linesRating: mapEvaluationRatingToAPI(student.evaluationData?.linesRating, 'lines'),
          // Override mode: ship the FE-computed page count between the two
          // teacher-picked endpoints (counter input is hidden in that mode).
          // Count mode: use the counter value as before.
          pagesCount: (student.revisionOverride?.pagesCount > 0)
            ? student.revisionOverride.pagesCount
            : (student.evaluationData?.pagesCount || 0),
          pagesRating: mapEvaluationRatingToAPI(student.evaluationData?.pagesRating, 'pages'),
          lessonsCount: lessonsCount,
          lessonsRating: mapEvaluationRatingToAPI(student.evaluationData?.lessonsRating, 'lessons'),
          notes: student.evaluationData?.notes || '',
          attendanceStatus: attendanceStatus,
          // Include existing IDs for update vs create logic
          existingEvaluationId: student.existing_evaluation_id || null,
          existingAttendanceId: student.existing_attendance_id || null,
          // Revision start-from override (Quran only; null when teacher used
          // the count chip). The C# side maps these to the upstream
          // revision_start_id_override / revision_start_position_override.
          revisionStartIdOverride: student.revisionOverride?.surahId ?? null,
          revisionStartPositionOverride: student.revisionOverride?.verseId ?? null,
          // Revision end override — exact end ayah the teacher picked. Pairs
          // with the start override above. Persisted server-side so the
          // displayed range survives reload without a page-walk approximation.
          revisionEndIdOverride: student.revisionOverride?.endSurahId ?? null,
          revisionEndPositionOverride: student.revisionOverride?.endVerseId ?? null,
          // FE-computed end for lesson + side-lessons. Calculator runs on
          // the API side as a fallback when these are null (backward compat
          // for old clients / Mutoon plans).
          lessonEndIdOverride: lessonEnd?.surahId ?? null,
          lessonEndPositionOverride: lessonEnd?.verseId ?? null,
          sideLessonsEndIdOverride: sideLessonsEnd?.surahId ?? null,
          sideLessonsEndPositionOverride: sideLessonsEnd?.verseId ?? null
        };
      });

      const response = await fetch(`/api/activities/evaluations/halaqa/${halaqaId}?date=${selectedDate}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: combinedData })
      });

      // Check HTTP status first
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'فشل حفظ البيانات');
      }

      // Check response body success field
      const result = await response.json();
      if (!result.success) {
        // Build detailed error message from errors array if available
        let errorMessage = result.message || 'فشل حفظ البيانات';
        if (result.errors && result.errors.length > 0) {
          // Try to extract specific error details from the errors array
          const errorDetails = result.errors.map(err => {
            // Check if error contains JSON with detailed results
            if (err.includes('error_message')) {
              try {
                // Extract the JSON part from the error string
                const jsonMatch = err.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  const parsed = JSON.parse(jsonMatch[0]);
                  if (parsed.data && parsed.data.results) {
                    return parsed.data.results
                      .filter(r => !r.success && r.error_message)
                      .map(r => r.error_message)
                      .join('\n');
                  }
                }
              } catch (e) {
                console.error('Error parsing error details:', e);
              }
            }
            return err;
          }).filter(e => e).join('\n');

          if (errorDetails) {
            errorMessage = errorDetails;
          }
        }
        throw new Error(errorMessage);
      }

      // Success - update original data for ALL students (including search-filtered ones)
      allStudentsData.forEach(student => {
        student.originalAttendanceStatus = student.attendance_status;
        student.originalEvaluationData = JSON.parse(JSON.stringify(student.evaluationData));
        student.originalRevisionOverride = student.revisionOverride
          ? { ...student.revisionOverride }
          : null;
      });
      // Also update the visible filtered list
      studentsData.forEach(student => {
        student.originalAttendanceStatus = student.attendance_status;
        student.originalEvaluationData = JSON.parse(JSON.stringify(student.evaluationData));
        student.originalRevisionOverride = student.revisionOverride
          ? { ...student.revisionOverride }
          : null;
      });

      hasChanges = false;
      updateButtonStates();

      // Refetch students silently — keeps the existing cards on-screen
      // while the new data loads, then swaps them in. Without `silent` the
      // section would flash to a spinner, collapse the expanded student
      // card, and look like it's "constantly reloading" after every save.
      loadStudents({ silent: true });

      Swal.fire({
        title: 'تم الحفظ بنجاح',
        html: '<p class="swal2-html-container-custom">تم حفظ جميع التغييرات بنجاح</p>',
        icon: 'success',
        confirmButtonText: 'حسناً',
        customClass: {
          popup: 'swal2-border-radius',
          confirmButton: 'btn btn-primary'
        },
        buttonsStyling: false
      });
    } catch (error) {
      console.error('Error saving data:', error);
      Swal.fire({
        title: 'خطأ في الحفظ',
        html: `<p class="swal2-html-container-custom">${error.message || 'حدث خطأ أثناء حفظ البيانات. يرجى المحاولة مرة أخرى.'}</p>`,
        icon: 'error',
        confirmButtonText: 'حسناً',
        customClass: {
          popup: 'swal2-border-radius',
          confirmButton: 'btn btn-primary'
        },
        buttonsStyling: false
      });
    }
  }

  // HTML-escape for safely inlining the next-text snippet inside a <span>.
  function escapeHtmlForBadge(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Attribute-escape for inlining the full text into a data-* attribute.
  function escapeAttrForBadge(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function mapAttendanceStatusToString(statusNum) {
    if (statusNum === 1) return 'present';
    if (statusNum === 2) return 'absent';
    if (statusNum === 3) return 'late';
    if (statusNum === 4) return 'excused';
    return 'not-marked';
  }

  function mapEvaluationRatingToAPI(uiValue, type) {
    if (uiValue === null || uiValue === undefined) return null;

    // Lines and Lessons: UI (4=Excellent, 1=Not Memorized, 0=Not Listened) -> API (1=Excellent, 2=Not Memorized, 3=Not Listened)
    if (type === 'lines' || type === 'lessons') {
      if (uiValue === 4) return 1; // Excellent
      if (uiValue === 1) return 2; // Not Memorized
      if (uiValue === 0) return 3; // Not Listened
    }

    // Pages: UI (5=Excellent, 4=Very Good, 3=Acceptable, 1=Not Memorized, 0=Not Listened) -> API (1=Excellent, 2=Very Good, 3=Acceptable, 4=Not Memorized, 5=Not Listened)
    if (type === 'pages') {
      if (uiValue === 5) return 1; // Excellent
      if (uiValue === 4) return 2; // Very Good
      if (uiValue === 3) return 3; // Acceptable
      if (uiValue === 1) return 4; // Not Memorized
      if (uiValue === 0) return 5; // Not Listened
    }

    return null;
  }

  // Builds the inner HTML of a verse-info row for a given activity type.
  // Returns an object { headerLabel, snippet, fullText } so the caller can
  // wrap it in the outer <div class="verse-info"> with the right
  // data-position-key. Returns null when there's nothing to render.
  function buildVerseInfoBody(student, type) {
    const cp = student.current_position;
    const pos = cp ? cp[type] : null;
    if (!pos) return null;

    const isQuran = student.halaqa_type_id === 1;
    const isMutoon = student.halaqa_type_id === 2;

    // Mutoon: pre-eval renders next-position; post-eval renders a saved
    // from/to "تم تقييم" range parallel to the Quran path. We have no
    // book-text math client-side, so the END comes from the API's
    // persisted *_end_* fields. When those are absent we degrade to
    // showing just the saved start so the "evaluated" framing still
    // applies (instead of misleadingly showing tomorrow's next-position).
    if (isMutoon) {
      const bookName = pos.book_name || '';
      const currentChapterId = pos.chapter_id > 0 ? pos.chapter_id : null;
      const currentChapterName = pos.chapter_name || (currentChapterId ? 'الفصل ' + currentChapterId : '');

      if (student.existing_evaluation_id) {
        const savedEval = student.existing_evaluation;
        let startChapter = 0, startText = 0, endChapter = 0, endText = 0;
        if (savedEval) {
          if (type === 'lesson') {
            startChapter = savedEval.lesson_start_id || 0;
            startText = savedEval.lesson_start_position || 0;
            endChapter = savedEval.lesson_end_id || 0;
            endText = savedEval.lesson_end_position || 0;
          } else if (type === 'revision') {
            startChapter = savedEval.revision_start_id || 0;
            startText = savedEval.revision_start_position || 0;
            endChapter = savedEval.revision_end_id || 0;
            endText = savedEval.revision_end_position || 0;
          } else if (type === 'side_lessons') {
            startChapter = savedEval.side_lessons_start_id || 0;
            startText = savedEval.side_lessons_start_position || 0;
            endChapter = savedEval.side_lessons_end_id || 0;
            endText = savedEval.side_lessons_end_position || 0;
          }
        }

        // Chapter-name resolution order:
        //   1. The eval's chapter_names map from the controller — covers any
        //      chapter id referenced in the saved start/end (cross-chapter).
        //   2. Fallback to the current chapter name when the id matches.
        //   3. Literal "الفصل N" when neither is known.
        const evalChapterNames = (savedEval && savedEval.chapter_names) || null;
        const chapterLabel = (id) => {
          if (evalChapterNames && evalChapterNames[id]) return evalChapterNames[id];
          if (currentChapterId && id === currentChapterId && currentChapterName) return currentChapterName;
          return `الفصل ${id}`;
        };

        const fromKnown = startChapter > 0 && startText > 0;
        const toKnown = endChapter > 0 && endText > 0;
        let rangeLabel;
        if (fromKnown && toKnown && startChapter === endChapter) {
          // Same chapter — collapse to "<book> - <chapter> - من النص X إلى النص Y".
          const parts = [bookName, chapterLabel(startChapter), `من النص ${startText} إلى النص ${endText}`].filter(Boolean);
          rangeLabel = parts.join(' - ');
        } else if (fromKnown && toKnown) {
          // Cross-chapter — name both ends.
          const parts = [bookName, `من ${chapterLabel(startChapter)} النص ${startText} إلى ${chapterLabel(endChapter)} النص ${endText}`].filter(Boolean);
          rangeLabel = parts.join(' - ');
        } else if (fromKnown) {
          // End missing (older eval row, or API hasn't persisted *_end_*).
          const parts = [bookName, chapterLabel(startChapter), `النص ${startText} إلى —`].filter(Boolean);
          rangeLabel = parts.join(' - ');
        } else {
          rangeLabel = 'من — إلى —';
        }

        return {
          headerLabel: `تم تقييم: ${rangeLabel}`,
          fullText: ''
        };
      }

      // Pre-eval — original single-line "next position" rendering.
      const nextPos = pos.next_position ?? pos.start_position;
      if (!(nextPos > 0 || pos.chapter_id > 0 || pos.book_id > 0)) return null;
      const tail = nextPos > 0 ? `النص ${nextPos}` : '';
      const parts = [bookName, currentChapterName, tail].filter(Boolean);
      if (parts.length === 0) return null;
      return {
        headerLabel: `الموضع التالي: ${parts.join(' - ')}`,
        fullText: pos.next_text || ''
      };
    }

    if (!isQuran) return null;

    // قاعدة/المدنية (book_type 2) positions are مقطعة, not آية. Quran keeps آية.
    const isMadaniyaPlan = derivePlanBookType(student) === 2;
    const posWord = isMadaniyaPlan ? 'مقطع' : 'آية';        // "آية 5" → "مقطع 5"
    const posWordDef = isMadaniyaPlan ? 'المقطع' : 'الآية'; // "الآية التالية" → "المقطع التالي"

    // Quran path. Determine effective override for revision (used as the
    // "from" anchor when teacher set "بدء من").
    const override =
      type === 'revision' && student.revisionOverride && student.revisionOverride.surahId > 0
        ? student.revisionOverride
        : null;

    const fromSurah = override ? override.surahId : pos.start_id;
    const fromVerse = override ? override.verseId : pos.start_position;
    const fromSurahName = override ? getSurahName(override.surahId) : pos.sura_name || getSurahName(pos.start_id);

    // Renders the legacy single-line "next position" label as a fallback.
    const renderNextFallback = () => {
      const nextPos = pos.next_position ?? pos.start_position;
      if (!(nextPos > 0 || pos.start_id > 0)) return null;
      const primary = pos.sura_name || (pos.start_id > 0 ? `سورة ${pos.start_id}` : '');
      const tail = nextPos > 0 ? `${posWord} ${nextPos}` : '';
      const parts = [primary, tail].filter(Boolean);
      if (parts.length === 0) return null;
      return {
        headerLabel: `${posWordDef} التالية: ${parts.join(' - ')}`,
        fullText: pos.next_text || ''
      };
    };

    // Post-eval label: render the actual evaluated FROM/TO range using the
    // saved evaluation's start position + amount. Same shape as the
    // pre-eval range, just with "تم تقييم" prefix — the teacher sees both
    // ends so an override (or any non-default amount) is unambiguous.
    if (student.existing_evaluation_id) {
      const savedEval = student.existing_evaluation;
      let savedStartSurah = 0, savedStartVerse = 0;
      let savedAmount = 0;
      let savedAmountType = 'line';
      if (savedEval) {
        if (type === 'lesson'
            && savedEval.lesson_start_id > 0
            && savedEval.lesson_start_position > 0
            && savedEval.number_of_lines_for_lesson > 0) {
          savedStartSurah = savedEval.lesson_start_id;
          savedStartVerse = savedEval.lesson_start_position;
          savedAmount = savedEval.number_of_lines_for_lesson;
          savedAmountType = 'line';
        } else if (type === 'revision'
            && savedEval.revision_start_id > 0
            && savedEval.revision_start_position > 0
            && savedEval.number_of_pages_for_revision > 0) {
          savedStartSurah = savedEval.revision_start_id;
          savedStartVerse = savedEval.revision_start_position;
          savedAmount = savedEval.number_of_pages_for_revision;
          savedAmountType = 'page';
        } else if (type === 'side_lessons'
            && savedEval.side_lessons_start_id > 0
            && savedEval.side_lessons_start_position > 0
            && (savedEval.number_of_side_lessons || 0) > 0) {
          savedStartSurah = savedEval.side_lessons_start_id;
          savedStartVerse = savedEval.side_lessons_start_position;
          // Side-lesson count is "memorization batches" — multiply by the
          // plan's daily memorization amount to get the effective lines.
          const dma = student.plan_defaults?.daily_memorization_amount ?? 0;
          savedAmount = savedEval.number_of_side_lessons * dma;
          savedAmountType = 'line';
        }
      }

      // Build start + end with graceful "—" placeholders so the label
      // structure ("من … إلى …") stays consistent even when API data is
      // partial (e.g. older evals with null position fields).
      // - START comes from saved eval positions when available.
      // - END priority for all three types: saved `<type>_end_*` (the
      //   exact end persisted by the API on save) → line/page walk →
      //   previousAyah(next-start). The saved end matters for mid-amount
      //   precision that a fresh walk would lose (e.g. mid-page revision
      //   stops, or partial-line memorization).
      let endSurahId = 0, endVerseId = 0;
      if (savedEval) {
        if (type === 'lesson'
            && savedEval.lesson_end_id > 0
            && savedEval.lesson_end_position > 0) {
          endSurahId = savedEval.lesson_end_id;
          endVerseId = savedEval.lesson_end_position;
        } else if (type === 'revision'
            && savedEval.revision_end_id > 0
            && savedEval.revision_end_position > 0) {
          endSurahId = savedEval.revision_end_id;
          endVerseId = savedEval.revision_end_position;
        } else if (type === 'side_lessons'
            && savedEval.side_lessons_end_id > 0
            && savedEval.side_lessons_end_position > 0) {
          endSurahId = savedEval.side_lessons_end_id;
          endVerseId = savedEval.side_lessons_end_position;
        }
      }
      if (!(endSurahId > 0) && savedStartSurah > 0 && savedStartVerse > 0 && savedAmount > 0) {
        const to = computeEndPosition(savedStartSurah, savedStartVerse, savedAmountType, savedAmount, student.plan_defaults?.memorization_direction_id);
        if (to) { endSurahId = to.surahId; endVerseId = to.verseId; }
      }
      if (!(endSurahId > 0)) {
        const prev = previousAyah(fromSurah, fromVerse);
        if (prev) { endSurahId = prev.surahId; endVerseId = prev.verseId; }
      }

      const fromKnown = savedStartSurah > 0 && savedStartVerse > 0;
      const toKnown = endSurahId > 0 && endVerseId > 0;
      const fromSurahNameSaved = fromKnown ? getSurahName(savedStartSurah) : '';
      const toSurahName = toKnown ? getSurahName(endSurahId) : '';

      // Render the from-to structure even when one side is unknown — we
      // show "—" so the teacher sees the structure is consistent and an
      // ayah is just missing (typically for old evals created before the
      // API stored positions).
      let rangeLabel;
      if (fromKnown && toKnown && endSurahId === savedStartSurah) {
        rangeLabel = `${fromSurahNameSaved} - من ${posWord} ${savedStartVerse} إلى ${posWord} ${endVerseId}`;
      } else if (fromKnown && toKnown) {
        rangeLabel = `من ${fromSurahNameSaved} ${posWord} ${savedStartVerse} إلى ${toSurahName} ${posWord} ${endVerseId}`;
      } else if (toKnown) {
        rangeLabel = `من — إلى ${toSurahName} ${posWord} ${endVerseId}`;
      } else if (fromKnown) {
        rangeLabel = `من ${fromSurahNameSaved} ${posWord} ${savedStartVerse} إلى —`;
      } else {
        rangeLabel = 'من — إلى —';
      }

      return {
        headerLabel: `تم تقييم: ${rangeLabel}`,
        fullText: '',
        // Eye-icon SweetAlert: lazy-fetches the two ayah texts. When an
        // endpoint is unknown the popup shows "(لا يوجد نص)" for that side.
        isRange: true,
        startAyah: { surahId: savedStartSurah, verseId: savedStartVerse, surahName: fromSurahNameSaved, text: '' },
        endAyah: { surahId: endSurahId, verseId: endVerseId, surahName: toSurahName }
      };
    }

    // Range label (no eval yet): walk forward from "from" by the live count.
    let amountType = 'line';
    let count = 0;
    if (type === 'lesson') {
      count = student.evaluationData?.linesCount ?? 0;
      amountType = 'line';
    } else if (type === 'revision') {
      count = student.evaluationData?.pagesCount ?? 0;
      amountType = 'page';
    } else if (type === 'side_lessons') {
      const lessonsCount = student.evaluationData?.lessonsCount ?? 0;
      const dma = student.plan_defaults?.daily_memorization_amount ?? 0;
      count = lessonsCount * dma;
      amountType = 'line';
    }

    // For a revision override that has both endpoints, take the END directly
    // from the override (no count-walk). For all other cases (count mode, or
    // override missing the end pair), walk by count.
    let to = null;
    if (override && override.endSurahId > 0 && override.endVerseId > 0) {
      to = { surahId: override.endSurahId, verseId: override.endVerseId };
    } else {
      if (count <= 0) return renderNextFallback();
      // Neither revision NOR side lessons may pass the lesson frontier (today's lesson_end)
      // — you can't review/extend past material not memorized today. Pass it as an inclusive
      // stop boundary so the walk halts AT it along its real path. The API clamps the stored
      // revision_end AND side_lessons_end to today's lesson the same way (side lessons made
      // symmetric with revision 2026-06), so this preview mirrors it and FE == API. NOTE:
      // the side-lessons clamp must deploy together-with/after the matching API change —
      // shipping the FE clamp first would re-introduce a pre/post flip (FE clamps, API still
      // overshoots on day 1). The wrap-to-plan-start once revision overlaps the lesson is
      // API-driven and surfaces here as the "from" (current_position.revision).
      const stopAt = (type === 'revision' || type === 'side_lessons') ? lessonFrontier(student) : null;
      to = computeEndPosition(fromSurah, fromVerse, amountType, count, student.plan_defaults?.memorization_direction_id, stopAt);
      if (!to) return renderNextFallback();
    }

    const toSurahName = getSurahName(to.surahId);
    // Same-surah is the common case — collapse to "<Surah> - من آية X إلى آية Y".
    // Cross-surah needs both surahs labelled to be unambiguous.
    const headerLabel = (to.surahId === fromSurah)
      ? `${fromSurahName} - من ${posWord} ${fromVerse} إلى ${posWord} ${to.verseId}`
      : `من ${fromSurahName} ${posWord} ${fromVerse} إلى ${toSurahName} ${posWord} ${to.verseId}`;
    return {
      headerLabel,
      fullText: pos.next_text || '',
      // Range mode — the eye-icon SweetAlert renders both start and end
      // ayahs fully. End ayah text is fetched on demand from the server.
      isRange: true,
      startAyah: { surahId: fromSurah, verseId: fromVerse, surahName: fromSurahName, text: pos.next_text || '' },
      endAyah: { surahId: to.surahId, verseId: to.verseId, surahName: toSurahName }
    };
  }

  // Compact "next position" strip rendered inside an evaluation section's
  // header, one per activity type. The position object comes from
  // `student.current_position[type]` (lesson / revision / side_lessons),
  // each with its own start_id/start_position/next_text resolved server-side.
  function buildSectionVerseInfo(student, type) {
    const body = buildVerseInfoBody(student, type);
    if (!body) return '';
    const { headerLabel, fullText, isRange, startAyah, endAyah } = body;

    // In range mode we drop the inline snippet (real estate is tight and the
    // start ayah's text alone is misleading — teacher cares about the end
    // ayah). The eye-icon SweetAlert shows both ayahs fully.
    const SNIPPET_MAX = 50;
    const snippet = !isRange && fullText && fullText.length > SNIPPET_MAX
      ? fullText.slice(0, SNIPPET_MAX).trim() + '…'
      : (!isRange ? (fullText || '') : '');
    const snippetHtml = snippet
      ? `<span class="next-text-snippet quran-text" style="color: var(--bs-body-color); font-weight: 500;">«${escapeHtmlForBadge(snippet)}»</span>`
      : '';

    // Range-mode eye button carries start+end metadata so the click handler
    // can lazy-fetch the end ayah text and render both verses in the popup.
    const rangeAttrs = isRange
      ? ` data-mode="range"
          data-start-surah="${startAyah.surahId}"
          data-start-verse="${startAyah.verseId}"
          data-start-surah-name="${escapeAttrForBadge(startAyah.surahName || '')}"
          data-start-text="${escapeAttrForBadge(startAyah.text || '')}"
          data-end-surah="${endAyah.surahId}"
          data-end-verse="${endAyah.verseId}"
          data-end-surah-name="${escapeAttrForBadge(endAyah.surahName || '')}"`
      : '';
    const expandBtn = (isRange || fullText)
      ? `<button type="button" class="btn btn-sm btn-icon p-0 next-text-expand-btn"
                   title="عرض النص كاملاً"
                   data-full-text="${escapeAttrForBadge(fullText || '')}"
                   data-header="${escapeAttrForBadge(headerLabel)}"
                   ${rangeAttrs}
                   style="border:none; background:transparent; color: var(--bs-primary); width:auto; height:auto; margin-inline-start: auto;">
            <i class="ti tabler-eye" style="font-size: 0.95rem;"></i>
         </button>`
      : '';

    return `
      <div class="verse-info" data-position-key="${type}" style="
        font-size: 0.75rem;
        color: var(--bs-primary);
        display: flex;
        align-items: center;
        gap: 4px;
        flex-wrap: wrap;
      ">
        <i class="ti tabler-book-2" style="font-size: 0.9rem;"></i>
        <span class="verse-info-label">${escapeHtmlForBadge(headerLabel)}</span>
        ${snippetHtml}
        ${expandBtn}
      </div>
    `;
  }

  // Re-renders just the .verse-info row for a single section after a count
  // or override change. Keeps the eye-icon expand button working by re-binding
  // the click handler on the new node.
  function refreshVerseInfoForSection(sectionEl, student, positionKey) {
    if (!sectionEl) return;
    const titleEl = sectionEl.querySelector('.evaluation-section-title');
    if (!titleEl) return;
    const existing = titleEl.querySelector('.verse-info');
    const newHtml = buildSectionVerseInfo(student, positionKey);
    if (existing) {
      if (newHtml) {
        const tmp = document.createElement('div');
        tmp.innerHTML = newHtml.trim();
        const newNode = tmp.firstElementChild;
        existing.replaceWith(newNode);
        wireExpandButton(newNode);
      } else {
        existing.remove();
      }
    } else if (newHtml) {
      titleEl.insertAdjacentHTML('beforeend', newHtml);
      const newNode = titleEl.querySelector('.verse-info');
      wireExpandButton(newNode);
    }
  }

  // Lazy on-demand fetch of one ayah's text. Cached in-memory by (surah, ayah)
  // so re-clicking the same eye doesn't re-hit the server.
  const ayahTextCache = new Map();
  function fetchAyahText(surahId, verseId) {
    if (!(surahId > 0 && verseId > 0)) return Promise.resolve('');
    const key = `${surahId}:${verseId}`;
    if (ayahTextCache.has(key)) return Promise.resolve(ayahTextCache.get(key));
    return fetch(`/api/activities/ayah-text?surah=${surahId}&ayah=${verseId}`)
      .then(r => r.ok ? r.json() : null)
      .then(j => {
        const text = (j && j.success && j.data && j.data.text) || '';
        ayahTextCache.set(key, text);
        return text;
      })
      .catch(() => '');
  }

  function wireExpandButton(verseInfoNode) {
    if (!verseInfoNode) return;
    const btn = verseInfoNode.querySelector('.next-text-expand-btn');
    if (!btn) return;
    verseInfoNode.style.cursor = 'pointer';
    verseInfoNode.addEventListener('click', function (e) {
      if (e.target === btn || btn.contains(e.target)) return;
      btn.click();
    });
    btn.addEventListener('click', async function (e) {
      e.preventDefault();
      e.stopPropagation();
      const header = this.dataset.header || '';
      const isRange = this.dataset.mode === 'range';

      if (isRange) {
        // Range mode: render two sections — start ayah (text already in
        // dataset) and end ayah (fetched on demand).
        const startSurah = +this.dataset.startSurah;
        const startVerse = +this.dataset.startVerse;
        const startSurahName = this.dataset.startSurahName || '';
        const startText = this.dataset.startText || '';
        const endSurah = +this.dataset.endSurah;
        const endVerse = +this.dataset.endVerse;
        const endSurahName = this.dataset.endSurahName || '';
        // قاعدة/المدنية (book_type 2) positions are مقطعة, not آية.
        const popupPosWord = bookTypeOf(startSurah) === 2 ? 'مقطع' : 'آية';

        if (typeof Swal === 'undefined') {
          alert(header);
          return;
        }
        Swal.fire({
          title: header,
          html: '<div style="text-align:center; padding: 16px;"><div class="spinner-border text-primary" role="status"></div></div>',
          confirmButtonText: 'إغلاق',
          customClass: { popup: 'swal2-border-radius quran-popup', confirmButton: 'btn btn-primary' },
          buttonsStyling: false,
          didOpen: async () => {
            // Pre-eval ships the start text on the dataset; post-eval
            // doesn't (server only ships next-position text), so fetch it
            // when missing. Both fetches go through the same in-memory
            // cache so repeat clicks are free.
            const [resolvedStart, endText] = await Promise.all([
              startText ? Promise.resolve(startText) : fetchAyahText(startSurah, startVerse),
              fetchAyahText(endSurah, endVerse)
            ]);
            const fmtAyah = (label, surahName, verse, text) => `
              <div style="margin-bottom: 12px;">
                <div style="font-size: 0.85rem; color: var(--bs-secondary-color); margin-bottom: 4px; text-align: center;">
                  ${label} — ${escapeHtmlForBadge(surahName)} : ${popupPosWord} ${verse}
                </div>
                <div class="quran-text" style="font-size: 1.05rem; line-height: 1.9; text-align: center; padding: 8px 4px; direction: rtl;">
                  ${text ? text.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '<span style="color: var(--bs-secondary-color);">(لا يوجد نص)</span>'}
                </div>
              </div>`;
            const html = `
              ${fmtAyah('من', startSurahName, startVerse, resolvedStart)}
              <hr style="margin: 12px 0; border-top: 1px solid var(--bs-border-color);" />
              ${fmtAyah('إلى', endSurahName, endVerse, endText)}
            `;
            Swal.update({ html });
          }
        });
        return;
      }

      // Single-text mode: legacy behavior (post-eval label / fallback).
      const fullText = this.dataset.fullText || '';
      if (!fullText) return;
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          title: header,
          html: `<div class="quran-text" style="font-size: 1.05rem; line-height: 1.9; text-align: center; padding: 8px 4px; direction: rtl;">${fullText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`,
          confirmButtonText: 'إغلاق',
          customClass: { popup: 'swal2-border-radius quran-popup', confirmButton: 'btn btn-primary' },
          buttonsStyling: false
        });
      } else {
        alert(header + '\n\n' + fullText);
      }
    });
  }

  function uiTypeToPositionKey(type) {
    return type === 'lines' ? 'lesson' : type === 'pages' ? 'revision' : 'side_lessons';
  }

  // Populate the surah <select> for the revision override picker, sourced
  // from the server-filtered Quran-only list (book_type_id == 1). Wraps the
  // <select> in Select2 for searchable typeahead so the teacher can pick by
  // name from 114 surahs without scrolling.
  function populateOverrideSurahSelect(selectEl, selectedSurahId, bookTypeId) {
    if (!selectEl) return;
    const bt = bookTypeId || 1;
    const fill = () => {
      if (!quranSurahs || quranSurahs.length === 0) return;
      // Idempotent: skip if already populated.
      if (selectEl.options.length > 1) return;
      // Only the surahs of this plan's book (Quran vs المدنية).
      quranSurahs
        .filter(s => (surahBookTypeMap.get(s.id) || 1) === bt)
        .forEach(s => {
        const opt = document.createElement('option');
        opt.value = String(s.id);
        opt.textContent = `${s.id}. ${s.name}`;
        if (selectedSurahId && Number(selectedSurahId) === s.id) opt.selected = true;
        selectEl.appendChild(opt);
      });
      // Enhance with Select2 once jQuery + the plugin are available. The
      // Activities view already loads vendor/libs/select2 scripts.
      if (typeof window.jQuery !== 'undefined' && window.jQuery.fn && window.jQuery.fn.select2) {
        const $sel = window.jQuery(selectEl);
        if ($sel.data('select2')) $sel.select2('destroy');
        $sel.select2({
          dir: 'rtl',
          language: 'ar',
          width: '100%',
          minimumResultsForSearch: 8,
          dropdownParent: window.jQuery(selectEl).closest('.attendance-student-card'),
          placeholder: '— سورة —'
        });
        // Bridge Select2's jQuery 'change' to a native event so the existing
        // vanilla-JS listener on the <select> still fires.
        $sel.off('change.activities').on('change.activities', function () {
          this.dispatchEvent(new Event('change', { bubbles: true }));
        });
      }
    };
    if (quranSurahs && quranSurahs.length > 0) {
      fill();
    } else {
      loadQuranAyahsOnce().then(fill);
    }
  }

  // Look up an ayah row in the slim cache. O(1) within a surah block via
  // surahIndexCache.firstIdx + (verseId - 1).
  function findAyahRow(surahId, verseId) {
    if (!surahIndexCache || !ayahsCache) return null;
    const meta = surahIndexCache.get(surahId);
    if (!meta) return null;
    const idx = meta.firstIdx + (verseId - 1);
    if (idx < meta.firstIdx || idx > meta.lastIdx) return null;
    const row = ayahsCache[idx];
    if (!row || row.surah_id !== surahId || row.verse_id !== verseId) return null;
    return row;
  }

  // Inclusive page span between two teacher-picked ayahs. Direction-agnostic: the
  // teacher explicitly chose both endpoints, so the span is |Δpage|+1 whether the
  // plan reads forward or backward (a backward range legitimately ends in an
  // earlier/lower-page ayah). Returns 0 only when a row is missing from the cache.
  function computePagesBetween(startSurahId, startVerseId, endSurahId, endVerseId) {
    const a = findAyahRow(startSurahId, startVerseId);
    const b = findAyahRow(endSurahId, endVerseId);
    if (!a || !b) return 0;
    return Math.max(Math.abs(b.page_no - a.page_no) + 1, 1);
  }

  // Wires the chip-toggle ("عدد" / "بدء من") plus the from/to surah/ayah
  // inputs for the revision section. Override = teacher picks BOTH start
  // and end ayahs; FE computes the page count between them and ships that
  // as number_of_pages_for_revision. Mutates `student.revisionOverride`
  // and refreshes the verse-info live.
  function wireRevisionOverrideControls(card, section, studentId, student) {
    const toggleBtns = section.querySelectorAll('.revision-mode-btn');
    if (!toggleBtns || toggleBtns.length === 0) return;

    const counterCtl = section.querySelector('.counter-control');
    const planHint = section.querySelector('.plan-default-hint');
    const overrideCtl = section.querySelector('.revision-override-control');
    const surahSelect = section.querySelector('.revision-override-surah');
    const verseInput = section.querySelector('.revision-override-verse');
    const endSurahSelect = section.querySelector('.revision-override-end-surah');
    const endVerseInput = section.querySelector('.revision-override-end-verse');
    const pagesDisplay = section.querySelector('.revision-override-pages');

    const ensureSurahDropdownsPopulated = () => {
      // Derive the plan's book ONLY after the surah/book-type map has loaded.
      // surahBookTypeMap is filled by loadQuranAyahsOnce, which may still be in
      // flight when this card first renders; deriving synchronously would
      // misclassify an المدنية plan as Quran (map empty → default 1) and the
      // populate idempotency guard would then lock the wrong surah list in.
      loadQuranAyahsOnce().then(() => {
        const planBookType = derivePlanBookType(student);
        if (surahSelect) populateOverrideSurahSelect(surahSelect, student.revisionOverride?.surahId || 0, planBookType);
        if (endSurahSelect) populateOverrideSurahSelect(endSurahSelect, student.revisionOverride?.endSurahId || 0, planBookType);
      });
    };
    ensureSurahDropdownsPopulated();

    const clampVerse = (surahId, verseId) => {
      const meta = surahIndexCache && surahIndexCache.get(surahId);
      const max = meta ? meta.lastVerse : verseId;
      return Math.min(Math.max(verseId, 1), max);
    };

    const readPair = (selectEl, inputEl) => {
      const surahId = parseInt(selectEl?.value, 10);
      const verseId = parseInt(inputEl?.value, 10);
      if (!(surahId > 0) || !(verseId > 0)) return null;
      const clamped = clampVerse(surahId, verseId);
      if (clamped !== verseId && inputEl) inputEl.value = String(clamped);
      return { surahId, verseId: clamped };
    };

    const renderPagesDisplay = (pages, valid) => {
      if (!pagesDisplay) return;
      if (!valid) {
        pagesDisplay.textContent = 'النطاق غير صالح';
        pagesDisplay.style.color = 'var(--bs-danger)';
      } else if (pages > 0) {
        pagesDisplay.textContent = `${derivePlanBookType(student) === 2 ? 'عدد الأبواب' : 'عدد الصفحات'}: ${pages}`;
        pagesDisplay.style.color = 'var(--bs-secondary-color)';
      } else {
        pagesDisplay.textContent = '';
      }
    };

    const applyOverrideFromInputs = () => {
      const start = readPair(surahSelect, verseInput);
      const end = readPair(endSurahSelect, endVerseInput);

      // Both required for an active override. Either missing → no override
      // (counter mode value persists for save).
      if (!start || !end) {
        student.revisionOverride = null;
        renderPagesDisplay(0, true);
      } else {
        const pages = computePagesBetween(start.surahId, start.verseId, end.surahId, end.verseId);
        if (pages <= 0) {
          // End before start, or rows missing — invalid. Don't set the override.
          student.revisionOverride = null;
          renderPagesDisplay(0, false);
        } else {
          student.revisionOverride = {
            surahId: start.surahId,
            verseId: start.verseId,
            endSurahId: end.surahId,
            endVerseId: end.verseId,
            pagesCount: pages
          };
          renderPagesDisplay(pages, true);
        }
      }
      refreshVerseInfoForSection(section, student, 'revision');
      checkForChanges();
    };

    // On first toggle to override mode, pre-populate inputs so the teacher
    // sees the range that's about to be (or was already) evaluated. Anchor
    // priority:
    //   1. Existing in-memory revisionOverride (teacher already adjusted).
    //   2. The saved eval's revision_start_* + walk by saved pages count
    //      — this is the "today's submitted range" view that matters once
    //      an eval exists.
    //   3. current_position.revision (= tomorrow's start when post-eval).
    const seedOverrideInputs = () => {
      const pos = student.current_position?.revision;
      const savedEval = student.existing_evaluation;
      let startSurah = 0, startVerse = 0;
      let endSurah = 0, endVerse = 0;

      if (student.revisionOverride?.surahId > 0 && student.revisionOverride?.verseId > 0) {
        startSurah = student.revisionOverride.surahId;
        startVerse = student.revisionOverride.verseId;
        endSurah = student.revisionOverride.endSurahId || 0;
        endVerse = student.revisionOverride.endVerseId || 0;
      } else if (savedEval && savedEval.revision_start_id > 0 && savedEval.revision_start_position > 0) {
        // Post-eval: anchor on what the teacher actually submitted today,
        // not on tomorrow's next-start. Prefer the saved exact end ayah
        // over the page-walk so the pickers show what was really picked.
        startSurah = savedEval.revision_start_id;
        startVerse = savedEval.revision_start_position;
        if (savedEval.revision_end_id > 0 && savedEval.revision_end_position > 0) {
          endSurah = savedEval.revision_end_id;
          endVerse = savedEval.revision_end_position;
        } else {
          const pagesCount = savedEval.number_of_pages_for_revision || 0;
          if (pagesCount > 0) {
            const to = computeEndPosition(startSurah, startVerse, 'page', pagesCount, student.plan_defaults?.memorization_direction_id);
            if (to) { endSurah = to.surahId; endVerse = to.verseId; }
          }
        }
      } else if (pos) {
        startSurah = pos.start_id;
        startVerse = pos.start_position;
      }

      if (!(startSurah > 0) || !(startVerse > 0)) return;

      // If end still unset, fall back to walking the current counter value.
      if (!(endSurah > 0) || !(endVerse > 0)) {
        const pagesCount = student.evaluationData?.pagesCount || 0;
        if (pagesCount > 0) {
          const to = computeEndPosition(startSurah, startVerse, 'page', pagesCount, student.plan_defaults?.memorization_direction_id);
          if (to) { endSurah = to.surahId; endVerse = to.verseId; }
        }
      }

      setSelectValue(surahSelect, startSurah);
      if (verseInput) verseInput.value = String(startVerse);
      if (endSurah > 0 && endVerse > 0) {
        setSelectValue(endSurahSelect, endSurah);
        if (endVerseInput) endVerseInput.value = String(endVerse);
      }
    };

    // Programmatic select value setter that also nudges Select2 so its visible
    // chip matches the new value. Triggers `change.select2` (Select2-internal),
    // NOT `change` — so this does not loop through our own change listeners.
    const setSelectValue = (sel, v) => {
      if (!sel) return;
      sel.value = String(v);
      if (typeof window.jQuery !== 'undefined' && window.jQuery.fn && window.jQuery.fn.select2) {
        const $s = window.jQuery(sel);
        if ($s.data('select2')) $s.trigger('change.select2');
      }
    };

    const setMode = mode => {
      const isStart = mode === 'start';
      toggleBtns.forEach(b => {
        const active = b.dataset.mode === mode;
        b.style.background = active ? 'var(--bs-primary)' : 'transparent';
        b.style.color = active ? '#fff' : 'var(--bs-primary)';
      });
      if (counterCtl) counterCtl.style.display = isStart ? 'none' : '';
      if (planHint) planHint.style.display = isStart ? 'none' : '';
      if (overrideCtl) overrideCtl.style.display = isStart ? 'grid' : 'none';
      if (isStart) {
        ensureSurahDropdownsPopulated();
      }
    };

    toggleBtns.forEach(btn => {
      btn.addEventListener('click', function () {
        if (!canEdit) return;
        const mode = this.dataset.mode;
        setMode(mode);
        if (mode === 'count') {
          student.revisionOverride = null;
          renderPagesDisplay(0, true);
          refreshVerseInfoForSection(section, student, 'revision');
          checkForChanges();
        } else {
          seedOverrideInputs();
          applyOverrideFromInputs();
        }
      });
    });

    const wireVerseInput = (input) => {
      if (!input) return;
      const h = () => { if (canEdit) applyOverrideFromInputs(); };
      input.addEventListener('input', h);
      input.addEventListener('change', h);
    };

    // "From" surah change → reset from-ayah to 1, mirror surah to "to" select,
    // reset to-ayah to 1. Rationale: ayah numbering doesn't roll over between
    // surahs (a 25 in surah 2 is meaningless in surah 108), and the most
    // common revision range is within a single surah — "to" surah ≥ "from"
    // surah is a hard constraint, same-surah is the natural default.
    if (surahSelect) {
      surahSelect.addEventListener('change', () => {
        if (!canEdit) return;
        if (verseInput) verseInput.value = '1';
        setSelectValue(endSurahSelect, surahSelect.value);
        if (endVerseInput) endVerseInput.value = '1';
        applyOverrideFromInputs();
      });
    }

    // "To" surah change → reset to-ayah to 1 (previous ayah number may not
    // exist in the newly picked surah).
    if (endSurahSelect) {
      endSurahSelect.addEventListener('change', () => {
        if (!canEdit) return;
        if (endVerseInput) endVerseInput.value = '1';
        applyOverrideFromInputs();
      });
    }

    wireVerseInput(verseInput);
    wireVerseInput(endVerseInput);

    // If an override was already on the student at render time, render the
    // pages-display immediately so it isn't blank until first interaction.
    if (student.revisionOverride?.pagesCount > 0) {
      renderPagesDisplay(student.revisionOverride.pagesCount, true);
    }
  }

  function createEvaluationSection(studentId, type, student) {
    let title, counterLabel, countField, ratingField, buttons;
    const countValue = student.evaluationData?.[`${type}Count`] || 0;
    // Use ?? (not ||): the "لم يسمع" (not-listened) rating is value 0, and
    // `0 || null` would wrongly coerce it to null — dropping the active rating on
    // re-render, so a لم يسمع evaluation would flash and then disappear after save.
    const ratingValue = student.evaluationData?.[`${type}Rating`] ?? null;

    // Get plan default for this type to show as placeholder
    const planDefault = student.plan_defaults?.[type] || 0;
    const placeholderText = planDefault > 0 ? String(planDefault) : '0';

    // Activity gating: a plan can include any subset of memorization /
    // revision / side-lessons. When the plan default is 0 for this activity
    // it's not part of the plan — disable the entire card and skip the
    // verse-info range. The save payload still ships 0/null for the
    // disabled activity (API accepts that).
    const isEnabled = planDefault > 0;
    const lockAttr = (!canEdit || !isEnabled) ? 'disabled' : '';

    // قاعدة/المدنية (book_type 2) is measured in its own units — مقاطع for the lesson and
    // أبواب for revision — vs أسطر/صفحات for the Quran. Display-only; the calc is unchanged.
    const isMadaniya = derivePlanBookType(student) === 2;
    if (type === 'lines') {
      title = isMadaniya ? 'الحفظ (مقاطع)' : 'الحفظ (أسطر)';
      counterLabel = isMadaniya ? 'عدد المقاطع' : 'عدد الأسطر';
      countField = 'linesCount';
      ratingField = 'linesRating';
      buttons = [
        { value: 4, icon: 'tabler-star', label: 'ممتاز', class: 'excellent' },
        { value: 1, icon: 'tabler-book-off', label: 'لم يحفظ', class: 'not-memorized' },
        { value: 0, icon: 'tabler-ear-off', label: 'لم يسمع', class: 'not-listened' }
      ];
    } else if (type === 'pages') {
      title = isMadaniya ? 'المراجعة (أبواب)' : 'المراجعة (صفحات)';
      counterLabel = isMadaniya ? 'عدد الأبواب' : 'عدد الصفحات';
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
    const baseClass = activeClass ? `evaluation-section eval-${activeClass}` : 'evaluation-section';
    const sectionClass = isEnabled ? baseClass : `${baseClass} eval-disabled`;
    const sectionStyle = isEnabled ? '' : 'opacity:0.55;';

    // Map UI type → server-side current_position key for the per-card badge.
    const positionKey = type === 'lines' ? 'lesson' : type === 'pages' ? 'revision' : 'side_lessons';
    // Skip the from-to / next-position badge entirely when the activity
    // isn't part of the plan — there's no meaningful range to display.
    const verseInfo = isEnabled ? buildSectionVerseInfo(student, positionKey) : '';

    // Revision override (Quran plans only): chip-toggle replacing the
    // counter with surah+ayah inputs when "بدء من" is active. Hidden when
    // revision isn't part of the plan.
    const isQuran = student.halaqa_type_id === 1;
    const showOverrideUi = type === 'pages' && isQuran && isEnabled;
    const overrideActive = !!(student.revisionOverride && student.revisionOverride.surahId > 0);
    const ovSurah = overrideActive ? student.revisionOverride.surahId : '';
    const ovVerse = overrideActive ? student.revisionOverride.verseId : '';

    // Post-eval: neither chip pill is "active" by default — the teacher has
    // already evaluated, so the UI shouldn't suggest a mode is in progress.
    // They click into a mode explicitly if they want to update.
    const hasExistingEval = !!student.existing_evaluation_id;
    const countActive = !hasExistingEval && !overrideActive;
    const startActive = !hasExistingEval && overrideActive;
    const chipToggleHtml = showOverrideUi
      ? `
        <div class="revision-mode-toggle" data-student-id="${studentId}" style="display:inline-flex; margin-inline-start:8px; border:1px solid var(--bs-primary); border-radius:5px; overflow:hidden;">
          <button type="button" class="revision-mode-btn" data-mode="count" ${lockAttr} style="padding:1px 10px; font-size:0.75rem; line-height:1.4; border:none; background:${countActive ? 'var(--bs-primary)' : 'transparent'}; color:${countActive ? '#fff' : 'var(--bs-primary)'}; cursor:pointer; transition:background 0.15s,color 0.15s;">عدد</button>
          <button type="button" class="revision-mode-btn" data-mode="start" ${lockAttr} style="padding:1px 10px; font-size:0.75rem; line-height:1.4; border:none; border-inline-start:1px solid var(--bs-primary); background:${startActive ? 'var(--bs-primary)' : 'transparent'}; color:${startActive ? '#fff' : 'var(--bs-primary)'}; cursor:pointer; transition:background 0.15s,color 0.15s;">بدء من</button>
        </div>
      `
      : '';

    const planHintHtml = planDefault > 0
      ? `<div class="plan-default-hint" ${showOverrideUi && overrideActive ? 'style="display:none; font-size:0.75rem; color:var(--bs-secondary-color);"' : 'style="font-size:0.75rem; color:var(--bs-secondary-color);"'}>المطلوب: ${planDefault}</div>`
      : '';

    const counterHtml = `
      <div class="counter-control" ${showOverrideUi && overrideActive ? 'style="display:none;"' : ''}>
        <button type="button" class="counter-btn" data-action="decrement" ${lockAttr}>−</button>
        <input type="number" class="counter-value" value="${countValue}" min="0" max="999" placeholder="${placeholderText}" ${lockAttr} />
        <button type="button" class="counter-btn" data-action="increment" ${lockAttr}>+</button>
      </div>
    `;

    const ovEndSurah = overrideActive && student.revisionOverride.endSurahId > 0 ? student.revisionOverride.endSurahId : '';
    const ovEndVerse = overrideActive && student.revisionOverride.endVerseId > 0 ? student.revisionOverride.endVerseId : '';
    const overrideInputsHtml = showOverrideUi
      ? `
        <div class="revision-override-control" style="display:${overrideActive ? 'grid' : 'none'}; grid-template-columns:auto minmax(0,1fr) 34px auto minmax(0,1fr) 34px; gap:6px; align-items:center; align-content:center; height:68px; padding:0 12px;">
          <span style="font-size:0.8125rem; color:var(--bs-secondary-color); white-space:nowrap;">من</span>
          <select class="form-select form-select-sm revision-override-surah" ${lockAttr} style="font-size:0.8125rem; width:100%; min-width:0;">
            <option value="">— سورة —</option>
          </select>
          <input type="number" class="form-control form-control-sm revision-override-verse" min="1" placeholder="" value="${ovVerse}" ${lockAttr} style="width:100%; font-size:0.75rem; padding:2px 0; text-align:center; -moz-appearance:textfield;" data-selected-surah="${ovSurah}" />
          <span style="font-size:0.8125rem; color:var(--bs-secondary-color); white-space:nowrap;">إلى</span>
          <select class="form-select form-select-sm revision-override-end-surah" ${lockAttr} style="font-size:0.8125rem; width:100%; min-width:0;">
            <option value="">— سورة —</option>
          </select>
          <input type="number" class="form-control form-control-sm revision-override-end-verse" min="1" placeholder="" value="${ovEndVerse}" ${lockAttr} style="width:100%; font-size:0.75rem; padding:2px 0; text-align:center; -moz-appearance:textfield;" data-selected-surah="${ovEndSurah}" />
        </div>
      `
      : '';

    return `
      <div class="${sectionClass}" data-student-id="${studentId}" data-type="${type}" data-enabled="${isEnabled ? '1' : '0'}" style="${sectionStyle}">
        <div class="evaluation-section-header">
          <div class="evaluation-section-title">
            <h6 style="position:relative; display:flex; align-items:center; justify-content:flex-start; margin:0;">
              ${chipToggleHtml ? `<span style="position:absolute; left:0; top:50%; transform:translateY(-50%);">${chipToggleHtml}</span>` : ''}
              <span>${title}</span>
            </h6>
            ${!isEnabled ? `
            <div style="margin-top:8px; border:1px solid var(--bs-border-color); border-radius:6px; background:rgba(var(--bs-body-color-rgb),0.04); display:flex; align-items:center; justify-content:center; padding:6px 8px;">
              <span style="font-size:0.75rem; color:var(--bs-secondary-color);">غير مفعّل في هذه الخطة</span>
            </div>` : (planHintHtml || verseInfo || showOverrideUi) ? `
            <div style="margin-top:8px; border:1px solid var(--bs-border-color); border-radius:6px; background:rgba(var(--bs-body-color-rgb),0.04); display:flex; align-items:stretch; overflow:hidden;">
              ${(planHintHtml || showOverrideUi) ? `<div style="flex:0 0 33.333%; padding:6px 8px; border-inline-end:1px solid var(--bs-border-color); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px;">${planHintHtml}<div class="revision-override-pages" style="font-size:0.75rem; color:var(--bs-secondary-color); text-align:center;"></div></div>` : ''}
              ${verseInfo ? `<div style="flex:1; padding:6px 8px; display:flex; align-items:center; min-width:0;">${verseInfo}</div>` : ''}
            </div>` : ''}
          </div>
          <div class="evaluation-counter-wrapper">
            ${counterHtml}
            ${overrideInputsHtml}
          </div>
        </div>
        <div class="evaluation-section-content">
          <div class="evaluation-buttons-grid ${type === 'pages' ? 'evaluation-buttons-5' : ''}">
            ${buttons
              .map(
                btn => `
              <button type="button" class="evaluation-btn ${ratingValue === btn.value ? 'active-' + btn.class : ''}"
                      data-value="${btn.value}" data-class="${btn.class}" ${lockAttr}>
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
