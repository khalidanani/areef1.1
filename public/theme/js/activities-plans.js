(() => {
  let a = [],
    o = null,
    l = 'all',
    searchTermPlans = '', // Search term for filtering students
    halaqaData = null,
    surahsList = [],
    allSurahsList = [], // every surah row regardless of book_type — surahsList is the
                        // book-type-filtered view shown in the dropdown (see applySurahBookTypeFilter)
    bookTypeNameById = {}, // book_type_id -> book_type display name from the surah lookup
                           // (DB value), used to label the التلقين نوع الكتاب picker
    directionsList = [],
    amountTypesList = [],
    planTemplatesList = [],
    surahsLoadingPromise = null,
    directionsLoadingPromise = null,
    amountTypesLoadingPromise = null,
    pendingPlanStudents = new Map(); // studentId → minimalPlan; preserved across reloads until API confirms

  // ASP.NET camelCase serialization turns `Halaqa_Type_ID` into `halaqa_Type_ID`,
  // so read every plausible shape before falling back.
  function getCurrentHalaqaTypeId() {
    if (!halaqaData) return null;
    const raw = halaqaData.halaqa_Type_ID
      ?? halaqaData.Halaqa_Type_ID
      ?? halaqaData.halaqa_type_id
      ?? halaqaData.halaqaTypeId
      ?? halaqaData.HalaqaTypeId;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  // Education type of the current halaqa. التلقين is education type 103 on an
  // under-Quran halaqa (halaqa type 1); those get the القرآن/المدنية book-type picker.
  function getCurrentEducationTypeId() {
    if (!halaqaData) return null;
    const raw = halaqaData.education_Type_ID
      ?? halaqaData.Education_Type_ID
      ?? halaqaData.education_type_id
      ?? halaqaData.educationTypeId
      ?? halaqaData.EducationTypeId;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function isTalqeenHalaqa() {
    return getCurrentHalaqaTypeId() === 1 && getCurrentEducationTypeId() === 103;
  }

  // Static placeholder for the start-point dropdown. التلقين halaqat call the rows
  // "دروس" (the dropdown may list قاعدة lessons, not Quran surahs), so use الدرس
  // there. Static per-halaqa — deliberately NOT toggled by the selected book.
  function surahSelectPlaceholder() {
    return isTalqeenHalaqa() ? '-- اختر الدرس --' : '-- اختر السورة --';
  }

  // Narrow the dropdown's surah list to one book_type. Talqeen halaqat switch this
  // via the book-type picker (1 = Quran, 2 = المدنية); everything else stays on the
  // halaqa's own type. Falls back to the full list if filtering would empty it.
  function applySurahBookTypeFilter(bookTypeId) {
    const source = (allSurahsList && allSurahsList.length) ? allSurahsList : surahsList;
    const bt = parseInt(bookTypeId, 10) || (getCurrentHalaqaTypeId() ?? 1);
    const filtered = source.filter(s => s.book_type_id === bt);
    surahsList = filtered.length ? filtered : source;
  }

  // Book type (1 = Quran, 2 = primer) for a given surah_id, from the surah lookup.
  // surah_ids are globally unique across books, so the id alone resolves the book.
  // Used when editing a plan (the start_id is known but the picker isn't yet set)
  // and on submit. Defaults to 1 (Quran) when the id isn't found.
  function deriveBookTypeFromSurahId(surahId) {
    const id = parseInt(surahId, 10);
    if (!(id > 0)) return 1;
    const src = (allSurahsList && allSurahsList.length) ? allSurahsList : surahsList;
    const row = src.find(s => s.surah_id === id);
    return (row && row.book_type_id) ? row.book_type_id : 1;
  }

  // Granularity rule for the daily-target inputs: memorization (الحفظ، أسطر) and
  // side lessons (جنب الدرس) are counted in whole units, while revision (المراجعة)
  // is measured in pages that may be fractional (0.1, 0.2, ...). The submit
  // handlers call event.preventDefault() before posting, which bypasses the
  // browser's native `step` validation — so enforce the whole-number rule here.
  function validateDailyTargetGranularity(dailyMem, compLessons) {
    const offenders = [];
    if (!Number.isInteger(dailyMem)) offenders.push('مقدار الحفظ');
    if (!Number.isInteger(compLessons)) offenders.push('جنب الدرس');
    if (offenders.length === 0) return true;

    const msg = `يجب إدخال رقم صحيح (بدون كسور) في: ${offenders.join('، ')}`;
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        title: 'قيمة غير صالحة',
        text: msg,
        icon: 'warning',
        confirmButtonText: 'حسناً',
        customClass: { popup: 'swal2-border-radius', confirmButton: 'btn btn-primary' },
        buttonsStyling: false
      });
    } else {
      alert(msg);
    }
    return false;
  }

  // Load Mutoon books into dropdown (called from inline form initialization)
  async function loadMutoonBooks(studentId, container = document) {
    const suffix = studentId ? '-' + studentId : '';
    const bookSelect = container.querySelector('#planMutoonBook' + suffix);
    const surahSelect = container.querySelector('#planStartSurah' + suffix);

    if (!bookSelect) return;

    try {
      const response = await fetch('/ManageHalaqa/GetMutoonBooks');
      const data = await response.json();

      if (data.success && data.data && data.data.books) {
        bookSelect.innerHTML = '<option value="">-- اختر الكتاب --</option>';
        data.data.books.forEach(book => {
          const option = document.createElement('option');
          option.value = book.mtn_book_id;
          option.textContent = book.book_name;
          bookSelect.appendChild(option);
        });

        // When book is selected, load its chapters
        bookSelect.addEventListener('change', async function() {
          const bookId = this.value;
          if (!bookId) {
            surahSelect.innerHTML = '<option value="">-- اختر الدرس --</option>';
            return;
          }

          try {
            const chaptersResponse = await fetch(`/ManageHalaqa/GetMutoonChapters?bookId=${bookId}`);
            const chaptersData = await chaptersResponse.json();

            if (chaptersData.success && chaptersData.data && chaptersData.data.chapters) {
              surahSelect.innerHTML = '<option value="">-- اختر الدرس --</option>';
              chaptersData.data.chapters.forEach(chapter => {
                const option = document.createElement('option');
                option.value = chapter.chapter_id;
                option.textContent = chapter.chapter_name;
                option.setAttribute('data-book-id', bookId);
                surahSelect.appendChild(option);
              });
            }
          } catch (error) {
            console.error('Error loading chapters:', error);
          }
        });

        console.log('Loaded', data.data.books.length, 'Mutoon books');
      }
    } catch (error) {
      console.error('Error loading Mutoon books:', error);
    }
  }

  // Load memorization amount types for both Quran and Mutoon
  async function loadMemorizationAmountTypes(studentId, container = document) {
    const suffix = studentId ? '-' + studentId : '';
    const amountTypeSelect = container.querySelector('#planMemorizationAmountType' + suffix);

    if (!amountTypeSelect) return;

    try {
      const response = await fetch('/ManageHalaqa/GetMemorizationAmountTypes');
      const text = await response.text();
      console.log('GetMemorizationAmountTypes raw:', text?.substring(0, 200));
      if (!text || !text.trim()) {
        console.warn('GetMemorizationAmountTypes returned empty response');
        return;
      }
      const data = JSON.parse(text);

      // Try multiple response shapes
      let types = null;
      if (data?.data?.memorization_amount_types) {
        types = data.data.memorization_amount_types;
      } else if (data?.data?.memorizationAmountTypes) {
        types = data.data.memorizationAmountTypes;
      } else if (Array.isArray(data?.data)) {
        types = data.data;
      } else if (Array.isArray(data)) {
        types = data;
      }

      if (types && types.length > 0) {
        amountTypeSelect.innerHTML = '<option value="">-- اختر نوع الوحدة --</option>';
        types.forEach(type => {
          const option = document.createElement('option');
          option.value = type.id || type.memorization_amount_type_id;
          option.textContent = type.type_name_ar || type.memorization_amount_type_name_ar || type.name_ar;
          amountTypeSelect.appendChild(option);
        });
        console.log('Loaded', types.length, 'memorization amount types');
      } else {
        console.warn('No memorization amount types found in response:', data);
      }
    } catch (error) {
      console.error('Error loading memorization amount types:', error);
    }
  }

  // Pre-load lookup data (surahs and memorization directions) once when Plans tab opens
  async function preloadLookupData() {
    console.log('Pre-loading lookup data (surahs and directions)...');

    // Load both in parallel, but only if not already loaded/loading
    const promises = [];

    if (surahsList.length === 0 && !surahsLoadingPromise) {
      surahsLoadingPromise = (async () => {
        try {
          const response = await fetch('/ManageHalaqa/GetSurahs');
          if (!response.ok) {
            console.error('Surahs API error:', response.status);
            return;
          }
          const data = await response.json();
          console.log('Surahs API response (preload):', data);

          let allSurahs = null;
          if (data && data.data) {
            if (Array.isArray(data.data)) {
              allSurahs = data.data;
            } else if (data.data.surahs && Array.isArray(data.data.surahs)) {
              allSurahs = data.data.surahs;
            } else if (typeof data.data === 'object') {
              allSurahs = Object.values(data.data);
            }
          }

          if (allSurahs && allSurahs.length > 0) {
            // Keep the full list; the dropdown shows a book-type-filtered view. The
            // default book_type matches the halaqa type (1 for Quran/Talqeen), so the
            // initial dropdown is unchanged until the Talqeen picker switches it.
            allSurahsList = allSurahs;
            // Capture the DB book_type name per book_type_id (first occurrence) so the
            // التلقين picker can show the real label (e.g. "القرآن", "المدنية للبرنامج").
            bookTypeNameById = {};
            for (const s of allSurahs) {
              const bt = s.book_type_id;
              const name = s.book_type ?? s.book_type_name ?? s.bookType;
              if (bt != null && name && !bookTypeNameById[bt]) bookTypeNameById[bt] = name;
            }
            const halaqaTypeId = getCurrentHalaqaTypeId() ?? 1;
            applySurahBookTypeFilter(halaqaTypeId);
            console.log('Pre-loaded', allSurahsList.length, 'surahs;', surahsList.length, 'for book_type_id:', halaqaTypeId, '(halaqaData:', halaqaData, ')');
          }
        } catch (error) {
          console.error('Error pre-loading surahs:', error);
        }
      })();
      promises.push(surahsLoadingPromise);
    }

    if (directionsList.length === 0 && !directionsLoadingPromise) {
      directionsLoadingPromise = (async () => {
        try {
          const response = await fetch('/ManageHalaqa/GetMemorizationDirections');
          if (!response.ok) {
            console.error('Directions API error:', response.status);
            return;
          }
          const data = await response.json();
          console.log('Directions API response (preload):', data);
          directionsList = data.data?.memorization_directions || [];
          console.log('Pre-loaded', directionsList.length, 'memorization directions');
        } catch (error) {
          console.error('Error pre-loading directions:', error);
        }
      })();
      promises.push(directionsLoadingPromise);
    }

    if (amountTypesList.length === 0 && !amountTypesLoadingPromise) {
      amountTypesLoadingPromise = (async () => {
        try {
          const response = await fetch('/ManageHalaqa/GetMemorizationAmountTypes');
          if (!response.ok) { console.error('AmountTypes API error:', response.status); return; }
          const data = await response.json();
          console.log('AmountTypes API raw response:', data);
          // Try multiple possible response structures
          let types = null;
          if (data && data.data) {
            if (Array.isArray(data.data)) {
              types = data.data;
            } else if (data.data.memorization_amount_types && Array.isArray(data.data.memorization_amount_types)) {
              types = data.data.memorization_amount_types;
            } else if (data.data.memorizationAmountTypes && Array.isArray(data.data.memorizationAmountTypes)) {
              types = data.data.memorizationAmountTypes;
            } else if (typeof data.data === 'object') {
              types = Object.values(data.data);
            }
          } else if (Array.isArray(data)) {
            types = data;
          }
          amountTypesList = types || [];
          console.log('Pre-loaded', amountTypesList.length, 'memorization amount types:', amountTypesList);
        } catch (error) {
          console.error('Error pre-loading amount types:', error);
        }
      })();
      promises.push(amountTypesLoadingPromise);
    }

    await Promise.all(promises);
    console.log('Lookup data pre-loading complete');
  }

  // Reusable function to load students data
  async function loadStudentsData() {
    if (!o) return;

    var t = document.getElementById('plansStudentsList');
    t.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">جاري التحميل...</span>
        </div>
        <p class="text-muted mt-3">جاري تحميل قائمة الطلاب...</p>
      </div>
    `;

    try {
      var response = await fetch('/ManageHalaqa/GetStudentsData?halaqaId=' + o);
      console.log('loadStudentsData - Response status:', response.status);
      var responseText = await response.text();
      var e = JSON.parse(responseText);
      if (e.success && e.data) {
        a = e.data;
        halaqaData = e.halaqaData;
        console.log('=== HALAQA DATA DEBUG ===');
        console.log('Full API response:', e);
        console.log('halaqaData:', halaqaData);
        console.log('Halaqa_Type_ID:', halaqaData?.Halaqa_Type_ID);
        console.log('========================');
        searchTermPlans = ''; // Reset search term on reload
        // Clear search input
        const searchInput = document.getElementById('plans-search-input');
        if (searchInput) searchInput.value = '';
        console.log('Plans: Loaded', a.length, 'students');

        // Preserve optimistic plan state: if the API still returns a student as
        // has_active_plan=false right after a successful create (eventual consistency),
        // keep our local optimistic mark so the plan badge doesn't flicker away.
        if (pendingPlanStudents.size > 0) {
          a.forEach(s => {
            const sid = String(s.student_id);
            if (pendingPlanStudents.has(sid)) {
              if (s.has_active_plan) {
                // API confirmed at least one plan exists — pending state no longer needed
                pendingPlanStudents.delete(sid);
              } else {
                // API still stale — apply optimistic override
                const mp = pendingPlanStudents.get(sid);
                s.has_active_plan = true;
                s.plan_data = mp;
                s.plans = [mp];
              }
            }
          });
        }

        // Preload lookup data now that we have halaqaData
        await preloadLookupData();
        n();
      } else {
        t.innerHTML = `
          <div class="text-center py-5">
            <i class="ti tabler-alert-circle text-danger" style="font-size: 3rem;"></i>
            <p class="text-danger mt-3">${e.message || 'حدث خطأ أثناء تحميل البيانات'}</p>
          </div>
        `;
      }
    } catch (e) {
      console.error('Error loading students:', e);
      t.innerHTML = `
        <div class="text-center py-5">
          <i class="ti tabler-alert-circle text-danger" style="font-size: 3rem;"></i>
          <p class="text-danger mt-3">حدث خطأ أثناء تحميل البيانات: ${e.message}</p>
        </div>
      `;
    }
  }

  // View plan inline function
  window.showViewPlanFormInline = async function (studentId, planId) {
    console.log('showViewPlanFormInline called:', studentId, planId);

    const collapseElement = document.getElementById('plan-details-' + studentId);
    if (!collapseElement) {
      console.error('Collapse element not found for student:', studentId);
      return;
    }

    const detailsWrapper = collapseElement.querySelector('.student-details-wrapper');
    if (!detailsWrapper) {
      console.error('Details wrapper not found for student:', studentId);
      return;
    }

    // Store original student details content
    const studentDetailsGrid = detailsWrapper.querySelector('.student-details-grid');
    // plan-actions-row is a sibling of detailsWrapper, inside collapseElement
    const planActionsRow = collapseElement.querySelector('.plan-actions-row');

    if (!studentDetailsGrid) {
      console.error('Student details grid not found');
      return;
    }

    // Create or find plan view wrapper
    let planViewWrapper = detailsWrapper.querySelector('.plan-view-wrapper');
    if (!planViewWrapper) {
      planViewWrapper = document.createElement('div');
      planViewWrapper.className = 'plan-view-wrapper';
      detailsWrapper.appendChild(planViewWrapper);
    }

    // Hide action buttons while viewing plan
    if (planActionsRow) {
      planActionsRow.style.display = 'none';
    }

    // Show loading spinner in plan view wrapper
    planViewWrapper.innerHTML = `
      <div style="text-align: center; padding: 60px 20px;">
        <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
          <span class="visually-hidden">جاري التحميل...</span>
        </div>
        <p class="text-muted mt-3" style="font-size: 0.9375rem;">جاري تحميل بيانات الخطة...</p>
      </div>
    `;

    try {
      // Fetch plan data from controller endpoint
      const response = await fetch(`/StudentPlan/GetPlanDetails?planId=${planId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch plan data');
      }
      const result = await response.json();
      const planData = result.data?.data || result.data || result;
      console.log('Plan data received:', planData);

      // Mutoon plans must render book/chapter fields (and no "from start/end of
      // mushaf" direction), not the Quran surah/verse layout. Prefer the plan's
      // own book_id (>0 ⇒ Mutoon) and fall back to the page's halaqa type, which
      // is what the edit form keys off of.
      const isMutoonPlan = (planData.book_id && planData.book_id > 0) || getCurrentHalaqaTypeId() === 2;

      // The /student-plans API leaves book_name AND start_name empty (verified
      // for valid plans too), so resolve the display names from the IDs against
      // the same Mutoon lookups the evaluation tab uses — keyed on book_id, then
      // cached. start_id is the chapter id for Mutoon plans.
      let viewBookName = 'غير محدد';
      let viewChapterName = 'غير محدد';
      let viewSuraName = 'غير محدد';
      if (isMutoonPlan) {
        const bookId = parseInt(planData.book_id, 10) || 0;
        const chapterId = parseInt(planData.start_id, 10) || 0;
        if (bookId > 0) {
          try {
            const [booksRes, chaptersRes] = await Promise.all([
              fetch('/ManageHalaqa/GetMutoonBooks'),
              fetch(`/ManageHalaqa/GetMutoonChapters?bookId=${bookId}`)
            ]);
            const booksJson = await booksRes.json();
            const chaptersJson = await chaptersRes.json();
            const book = booksJson?.data?.books?.find(b => b.mtn_book_id == bookId);
            if (book?.book_name) viewBookName = book.book_name;
            const chapter = chaptersJson?.data?.chapters?.find(c => c.chapter_id == chapterId);
            if (chapter?.chapter_name) viewChapterName = chapter.chapter_name;
          } catch (e) {
            console.error('Error resolving Mutoon book/chapter names for view:', e);
          }
        } else {
          // book_id = 0 ⇒ this Mutoon plan has no book stored (legacy data created
          // before the book_id-persistence fix). Nothing to resolve — leave both
          // as "غير محدد" rather than the misleading Quran sentinel book_name.
          console.warn('Mutoon plan', planId, 'has book_id=0 — book not resolvable; the plan needs re-saving with a book selected.');
        }
      } else {
        // Quran: the API leaves start_name empty here too, so resolve the surah
        // name from start_id (the surah id) against the surah lookup — the same
        // source the create form and eval tab use. Resolve against the FULL list
        // (allSurahsList), not the book-type-filtered surahsList: a Talqeen halaqa
        // may have toggled the picker to المدنية, and surah ids are globally unique
        // across books, so a saved Quran plan must still resolve. Fall back to a fetch.
        const suraId = parseInt(planData.start_id, 10) || 0;
        let list = (allSurahsList && allSurahsList.length)
          ? allSurahsList
          : ((surahsList && surahsList.length) ? surahsList : null);
        if (!list) {
          try {
            const res = await fetch('/ManageHalaqa/GetSurahs');
            const j = await res.json();
            list = j?.data?.surahs || (Array.isArray(j?.data) ? j.data : []) || [];
          } catch (e) {
            console.error('Error resolving surah name for view:', e);
            list = [];
          }
        }
        const sura = (list || []).find(s => (s.surah_id ?? s.sura_id ?? s.id) == suraId);
        if (sura) viewSuraName = sura.surah_name || sura.sura_name_ar || sura.surah_name_ar || sura.name || viewSuraName;
      }

      // Display plan details in wrapper similar to create plan form
      planViewWrapper.innerHTML = `
        <div class="plan-form-card" style="margin-top: 16px;">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h5 class="mb-0 d-flex align-items-center">
              <i class="ti tabler-eye me-2"></i>
              عرض الخطة
            </h5>
            <button type="button" class="btn btn-sm btn-icon btn-label-secondary" onclick="window.closeViewPlanInline('${studentId}')" aria-label="إغلاق" title="إغلاق">
              <i class="ti tabler-x"></i>
            </button>
          </div>

          <!-- Row 1: Plan Type and Memorization Direction.
               View mode uses the SAME pill-group + card-header pattern as the
               create form for visual consistency. pointer-events: none disables
               interaction since this is read-only. -->
          <div class="row g-3 mt-3">
            <div class="col-md-6">
              <div class="card" style="border-radius: 12px;">
                <div class="card-header" style="padding: 16px 20px; background-color: rgba(var(--bs-primary-rgb), 0.05); border-bottom: 1px solid var(--bs-border-color); border-radius: 12px 12px 0 0;">
                  <h6 class="mb-0 d-flex align-items-center"><i class="ti tabler-clipboard-text me-2"></i>نوع الخطة</h6>
                </div>
                <div class="card-body" style="padding: 20px;">
                  <div class="plan-type-pill-group" role="group" aria-label="نوع الخطة" style="pointer-events: none;">
                    <div class="plan-type-pill${planData.is_primary ? ' active' : ''}">خطة أساسية</div>
                    <div class="plan-type-pill${!planData.is_primary ? ' active' : ''}">خطة فرعية</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="col-md-6">
              <div class="card" style="border-radius: 12px;">
                <div class="card-header" style="padding: 16px 20px; background-color: rgba(var(--bs-primary-rgb), 0.05); border-bottom: 1px solid var(--bs-border-color); border-radius: 12px 12px 0 0;">
                  <h6 class="mb-0 d-flex align-items-center"><i class="ti tabler-arrows-right-left me-2"></i>${isMutoonPlan ? 'اتجاه الدرس' : 'اتجاه الحفظ'}</h6>
                </div>
                <div class="card-body" style="padding: 20px;">
                  ${isMutoonPlan
                    ? `<div class="alert alert-info mb-0" style="border-radius: 12px;"><i class="ti tabler-info-circle me-2"></i>الدرس من البداية إلى النهاية</div>`
                    : `<div class="plan-type-pill-group" role="group" aria-label="اتجاه الحفظ" style="pointer-events: none;">
                    <div class="plan-type-pill${planData.memorization_direction_id === 1 ? ' active' : ''}">من أول المصحف</div>
                    <div class="plan-type-pill${planData.memorization_direction_id === 2 ? ' active' : ''}">من آخر المصحف</div>
                  </div>`}
                </div>
              </div>
            </div>
          </div>

          <!-- Row 2: Start Point and Daily Targets.
               Read-only inputs use the same 8px radius as the create form's
               inputs, with a subtle tinted bg to signal disabled state without
               losing the field shape. -->
          <div class="row g-3 mt-3">
            <div class="col-md-6">
              <div class="card" style="border-radius: 12px;">
                <div class="card-header" style="padding: 16px 20px; background-color: rgba(var(--bs-primary-rgb), 0.05); border-bottom: 1px solid var(--bs-border-color); border-radius: 12px 12px 0 0;">
                  <h6 class="mb-0 d-flex align-items-center"><i class="ti tabler-flag me-2"></i>نقطة البداية</h6>
                </div>
                <div class="card-body" style="padding: 20px;">
                  ${isMutoonPlan
                    ? `<div class="row g-3">
                    <div class="col-12">
                      <label class="form-label">الكتاب</label>
                      <input type="text" class="form-control" value="${viewBookName}" readonly style="border-radius: 8px; background-color: var(--bs-tertiary-bg);" />
                    </div>
                    <div class="col-12">
                      <label class="form-label">الدرس (الفصل)</label>
                      <input type="text" class="form-control" value="${viewChapterName}" readonly style="border-radius: 8px; background-color: var(--bs-tertiary-bg);" />
                    </div>
                  </div>`
                    : `<div class="row g-3">
                    <div class="col-12">
                      <label class="form-label">${isTalqeenHalaqa() ? 'الدرس' : 'السورة'}</label>
                      <input type="text" class="form-control" value="${viewSuraName}" readonly style="border-radius: 8px; background-color: var(--bs-tertiary-bg);" />
                    </div>
                    <div class="col-12">
                      <label class="form-label">الموضع</label>
                      <input type="text" class="form-control" value="${planData.start_position ? (deriveBookTypeFromSurahId(planData.start_id) === 2 ? 'مقطع ' : 'آية ') + planData.start_position : (planData.start_position_name || 'غير محدد')}" readonly style="border-radius: 8px; background-color: var(--bs-tertiary-bg);" />
                    </div>
                  </div>`}
                </div>
              </div>
            </div>

            <div class="col-md-6">
              <div class="card" style="border-radius: 12px;">
                <div class="card-header" style="padding: 16px 20px; background-color: rgba(var(--bs-primary-rgb), 0.05); border-bottom: 1px solid var(--bs-border-color); border-radius: 12px 12px 0 0;">
                  <h6 class="mb-0 d-flex align-items-center"><i class="ti tabler-clock-play me-2"></i>الدرس اليومي</h6>
                </div>
                <div class="card-body" style="padding: 20px;">
                  <div class="row g-3">
                    <div class="col-12">
                      <label class="form-label">${isMutoonPlan ? 'الحفظ' : 'الحفظ (أسطر)'}</label>
                      <input type="text" class="form-control" value="${planData.daily_memorization_amount ?? 0}" readonly style="border-radius: 8px; background-color: var(--bs-tertiary-bg);" />
                    </div>
                    <!-- col-lg-6 (not col-md-6) so each gets its own row on
                         tablet (md): col-md-6 squeezed "جنب الدرس (دروس)"
                         into a 2-line wrap because the right card column
                         (col-md-6 of the view modal) is already narrow. -->
                    <div class="col-lg-6">
                      <label class="form-label">المراجعة (صفحات)</label>
                      <input type="text" class="form-control" value="${planData.revision_pages ?? 0}" readonly style="border-radius: 8px; background-color: var(--bs-tertiary-bg);" />
                    </div>
                    <div class="col-lg-6">
                      <label class="form-label">جنب الدرس (دروس)</label>
                      <input type="text" class="form-control" value="${planData.side_lessons ?? 0}" readonly style="border-radius: 8px; background-color: var(--bs-tertiary-bg);" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Row 3: Submission Days (Full Width).
               Mirrors the create form's "white box" pattern but without the
               edit link, so the inner box reads as a value display. -->
          <div class="row g-3 mt-3">
            <div class="col-12">
              <div class="card" style="border-radius: 12px;">
                <div class="card-header" style="padding: 16px 20px; background-color: rgba(var(--bs-primary-rgb), 0.05); border-bottom: 1px solid var(--bs-border-color); border-radius: 12px 12px 0 0;">
                  <h6 class="mb-0 d-flex align-items-center"><i class="ti tabler-calendar-event me-2"></i>أيام التسميع</h6>
                </div>
                <div class="card-body" style="padding: 20px;">
                  <div style="background-color: var(--bs-tertiary-bg); border: 1px solid var(--bs-border-color); border-radius: 8px; padding: 12px 16px;">
                    <span style="font-size: 0.9375rem; color: var(--bs-body-color);">${planData.submission_days || 'خمسة أيام في الأسبوع (من الأحد إلى الخميس)'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Row 4: Plan Status (Full Width) -->
          <div class="row g-3 mt-3">
            <div class="col-12">
              <div class="card" style="border-radius: 12px;">
                <div class="card-header" style="padding: 16px 20px; background-color: rgba(var(--bs-primary-rgb), 0.05); border-bottom: 1px solid var(--bs-border-color); border-radius: 12px 12px 0 0;">
                  <h6 class="mb-0 d-flex align-items-center"><i class="ti tabler-info-circle me-2"></i>حالة الخطة</h6>
                </div>
                <div class="card-body" style="padding: 20px;">
                  <span class="badge ${planData.status_id === 1 ? 'bg-label-success' : 'bg-label-secondary'}" style="font-size: 0.875rem; padding: 8px 16px; border-radius: 8px;">
                    ${planData.status_name || (planData.status_id === 1 ? 'فعالة' : planData.status_id === 2 ? 'متوقفة' : planData.status_id === 3 ? 'مكتملة' : 'غير محدد')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Form Actions -->
          <div class="d-flex justify-content-end gap-2 mt-4">
            <button type="button" class="btn btn-label-secondary" onclick="window.closeViewPlanInline('${studentId}')">
              <i class="ti tabler-x me-1"></i>
              إغلاق
            </button>
            <button type="button" class="btn btn-primary" onclick="window.showEditPlanFormInline('${studentId}', ${planId})">
              <i class="ti tabler-edit me-1"></i>
              تعديل الخطة
            </button>
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Error loading plan data:', error);
      planViewWrapper.innerHTML = `
        <div class="plan-form-card" style="margin-top: 16px;">
          <div style="text-align: center; padding: 40px 20px;">
            <i class="ti tabler-alert-circle" style="font-size: 2rem; color: var(--bs-danger);"></i>
            <p class="text-danger mt-3">حدث خطأ أثناء تحميل بيانات الخطة</p>
            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="window.closeViewPlanInline('${studentId}')" style="border-radius: 8px;">
              <i class="ti tabler-x me-1"></i>
              إغلاق
            </button>
          </div>
        </div>
      `;
    }
  };

  // Close view plan inline
  window.closeViewPlanInline = function (studentId) {
    const collapseElement = document.getElementById('plan-details-' + studentId);
    if (!collapseElement) return;

    const detailsWrapper = collapseElement.querySelector('.student-details-wrapper');

    // Remove plan view wrapper
    const planViewWrapper = detailsWrapper?.querySelector('.plan-view-wrapper');
    if (planViewWrapper) {
      planViewWrapper.remove();
    }

    // Show action buttons again (plan-actions-row is a sibling of detailsWrapper, inside collapseElement)
    const planActionsRow = collapseElement.querySelector('.plan-actions-row');
    if (planActionsRow) {
      planActionsRow.style.display = '';
    }
  };

  // Edit plan inline - shows edit form with existing plan data
  window.showEditPlanFormInline = function (studentId, planId) {
    console.log('showEditPlanFormInline called:', studentId, planId);

    // Find the student's collapse container
    const collapseElement = document.getElementById('plan-details-' + studentId);
    if (!collapseElement) {
      console.error('Collapse element not found for student:', studentId);
      return;
    }

    const detailsWrapper = collapseElement.querySelector('.student-details-wrapper');
    if (!detailsWrapper) {
      console.error('Details wrapper not found for student:', studentId);
      return;
    }

    // Close view plan first if open
    window.closeViewPlanInline(studentId);

    // Hide action buttons (plan-actions-row is a sibling of detailsWrapper, inside collapseElement)
    const planActionsRow = collapseElement.querySelector('.plan-actions-row');
    if (planActionsRow) {
      planActionsRow.style.display = 'none';
    }

    // Create edit form wrapper
    let editFormWrapper = detailsWrapper.querySelector('.edit-plan-wrapper');
    if (!editFormWrapper) {
      editFormWrapper = document.createElement('div');
      editFormWrapper.className = 'edit-plan-wrapper';
      detailsWrapper.appendChild(editFormWrapper);
    }

    // Show loading spinner
    editFormWrapper.innerHTML = `
      <div class="plan-form-card" style="margin-top: 16px;">
        <div style="text-align: center; padding: 60px 20px;">
          <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
            <span class="visually-hidden">جاري التحميل...</span>
          </div>
          <p class="text-muted mt-3" style="font-size: 0.9375rem;">جاري تحميل نموذج التعديل...</p>
        </div>
      </div>
    `;

    // Load plan data and show edit form
    setTimeout(async () => {
      try {
        // Fetch plan details
        const response = await fetch(`/StudentPlan/GetPlanDetails?planId=${planId}`);
        if (!response.ok) throw new Error('Failed to fetch plan details');
        const result = await response.json();
        if (!result.success || !result.data) throw new Error(result.message || 'No plan data');
        const planData = result.data;

        // Get the original form template
        const originalForm = document.getElementById('createPlanFormContainer');
        if (!originalForm) {
          console.error('Original form container not found');
          editFormWrapper.innerHTML = `<div class="alert alert-danger">خطأ: نموذج الإنشاء غير موجود</div>`;
          return;
        }

        // Clone the form
        const formClone = originalForm.cloneNode(true);
        formClone.id = 'inlineEditPlanForm-' + studentId;
        formClone.removeAttribute('style');
        formClone.style.display = 'block';
        formClone.style.marginBottom = '0';

        // Update form IDs to be unique
        const form = formClone.querySelector('#createPlanForm');
        if (form) {
          form.id = 'editPlanForm-' + studentId;

          // Edit forms are populated from server-provided plan data that may pre-date
          // current input constraints (e.g. a legacy plan with a fractional memorization
          // amount). Native HTML5 validation would block the submit before our JS runs —
          // even for an unrelated status change such as cancelling the plan. Disable it
          // here and let handleEditFormSubmit own validation: whole-number amounts are
          // still enforced in JS for real field edits (validateDailyTargetGranularity),
          // and skipped only for a pure status change.
          form.setAttribute('novalidate', '');

          // Update all element IDs
          const elementsWithIds = formClone.querySelectorAll('[id]');
          elementsWithIds.forEach(el => {
            if (el.id && !el.id.includes('-' + studentId)) {
              const oldId = el.id;
              el.id = oldId + '-' + studentId;
              const label = formClone.querySelector(`label[for="${oldId}"]`);
              if (label) label.setAttribute('for', el.id);
            }
          });

          // Set form values from plan data
          const studentIdInput = form.querySelector('input[name="StudentId"]');
          const studentNameInput = form.querySelector('input[id*="planStudentName"]');
          const studentIdDisplay = form.querySelector('input[id*="planStudentIdDisplay"]');
          const halaqaSecIdInput = form.querySelector('input[id*="planHalaqaSecId"]');

          if (studentIdInput) studentIdInput.value = planData.student_id;
          if (studentNameInput) studentNameInput.value = planData.student_name;
          if (studentIdDisplay) studentIdDisplay.value = planData.student_id;
          if (halaqaSecIdInput) halaqaSecIdInput.value = planData.halaqa_sec_id;

          // Set hidden inputs
          const eduTypeInput = form.querySelector('input[id*="planEducationTypeId"]');
          const halaqaTypeInput = form.querySelector('input[id*="planHalaqaTypeId"]');
          const teacherInput = form.querySelector('input[id*="planTeacherId"]');

          if (eduTypeInput) eduTypeInput.value = planData.education_type_id || 0;
          if (halaqaTypeInput) halaqaTypeInput.value = planData.halaqa_type_id || 0;
          if (teacherInput) teacherInput.value = planData.teacher_id || '';

          // Set map_std_edu_period_id from plan data if available
          const mapStdEduPeriodInput = form.querySelector('input[id*="planMapStdEduPeriodId"]');
          if (mapStdEduPeriodInput && planData.mapstd_edu_period_id) {
            mapStdEduPeriodInput.value = planData.mapstd_edu_period_id;
            console.log('Edit form - Set map_std_edu_period_id:', planData.mapstd_edu_period_id);
          }

          // Add hidden plan ID input for update
          let planIdInput = form.querySelector('input[name="PlanId"]');
          if (!planIdInput) {
            planIdInput = document.createElement('input');
            planIdInput.type = 'hidden';
            planIdInput.name = 'PlanId';
            form.appendChild(planIdInput);
          }
          planIdInput.value = planId;

          // --- Status change (edit-only) ---
          // Creating a plan always starts it as Active, so the status control is
          // injected only here in the edit flow. A pure status change is sent via
          // the dedicated PATCH endpoint (in-place + audited); see handleEditFormSubmit.
          injectPlanStatusControl(form, studentId, planData);

          // Update cancel buttons
          const cancelBtns = formClone.querySelectorAll('[id*="cancelPlanFormBtn"]');
          cancelBtns.forEach(btn => {
            btn.onclick = function () {
              closeEditPlanInline(studentId);
            };
          });

          // Update form heading and icon
          const formTitle = formClone.querySelector('.plan-form-card > div > h5');
          if (formTitle) {
            formTitle.innerHTML = '<i class="ti tabler-edit me-2"></i>تعديل الخطة';
          }

          // Update submit button text
          const submitBtn = formClone.querySelector('[type="submit"]');
          if (submitBtn) {
            submitBtn.innerHTML = '<i class="ti tabler-check me-1"></i> حفظ التعديلات';
          }

          // Update form submission handler
          form.onsubmit = async function (event) {
            event.preventDefault();
            await handleEditFormSubmit(event, studentId, planId);
          };
        }

        // Replace loading spinner with form
        editFormWrapper.innerHTML = '';
        editFormWrapper.appendChild(formClone);

        // Load lookups (with pre-selected values for edit). Use the halaqa type,
        // not the plan — the plan is always consistent with its halaqa.
        const isMutoonEdit = getCurrentHalaqaTypeId() === 2;
        if (isMutoonEdit) {
          // For Mutoon plans book_id is the mtn_book_id and start_id is the chapter_id.
          await loadMutoonBooksInline(studentId, planData.book_id || null, planData.start_id || null);
        } else {
          // Talqeen plans may be on the primer (book_type 2). The plan's start_id
          // (globally unique) identifies the book, so set the picker + filter the
          // surah list to it BEFORE loading — otherwise the saved lesson (id 132+)
          // wouldn't be in the Quran-filtered list and couldn't be pre-selected.
          if (isTalqeenHalaqa()) {
            await preloadLookupData();
            const editBookType = deriveBookTypeFromSurahId(planData.start_id);
            const editPicker = formClone.querySelector('select[id*="planBookType"]');
            if (editPicker) editPicker.value = String(editBookType);
            applySurahBookTypeFilter(editBookType);
          }
          await loadSurahsInline(studentId, planData.start_id);
          if (isTalqeenHalaqa()) {
            wireBookTypeSelector(studentId);
            applyBookTypeLabels(studentId);
            // Pre-populate the unit labels for the plan's own book (مقاطع/أبواب when editing
            // a قاعدة plan), since the picker isn't toggled on an edit open.
            applyAmountUnitLabels(studentId, deriveBookTypeFromSurahId(planData.start_id));
          }
        }
        if (!isMutoonEdit) {
          await loadMemorizationDirectionsInline(studentId, planData.memorization_direction_id || 1);
          // قاعدة plans are forward-only — lock the direction when editing one.
          if (isTalqeenHalaqa()) applyDirectionLockForBookType(studentId, deriveBookTypeFromSurahId(planData.start_id));
        }
        await loadAmountTypesInline(studentId, planData.memorization_amount_type_id || null);

        // Set form values - dropdowns are now fully loaded (no setTimeout needed)
        // Set plan type (primary/secondary)
        const primaryPill = formClone.querySelector('.plan-type-pill[data-value="true"]');
        const secondaryPill = formClone.querySelector('.plan-type-pill[data-value="false"]');
        const isPrimaryInput = formClone.querySelector('input[name="IsPrimary"]');
        if (planData.is_primary) {
          if (primaryPill) {
            primaryPill.classList.add('active', 'btn-primary');
            primaryPill.classList.remove('btn-outline-secondary');
          }
          if (secondaryPill) {
            secondaryPill.classList.remove('active', 'btn-primary');
            secondaryPill.classList.add('btn-outline-secondary');
          }
          if (isPrimaryInput) isPrimaryInput.value = 'true';
        } else {
          if (primaryPill) {
            primaryPill.classList.remove('active', 'btn-primary');
            primaryPill.classList.add('btn-outline-secondary');
          }
          if (secondaryPill) {
            secondaryPill.classList.add('active', 'btn-primary');
            secondaryPill.classList.remove('btn-outline-secondary');
          }
          if (isPrimaryInput) isPrimaryInput.value = 'false';
        }

        // Set memorization direction
        const directionContainer = formClone.querySelector(`#memorizationDirectionsContainer-${studentId}`);
        if (directionContainer) {
          const directionBtns = directionContainer.querySelectorAll('.plan-type-pill');
          directionBtns.forEach(btn => {
            const directionId = parseInt(btn.dataset.value);
            if (directionId === planData.memorization_direction_id) {
              btn.classList.add('active');
              btn.setAttribute('aria-pressed', 'true');
            } else {
              btn.classList.remove('active');
              btn.setAttribute('aria-pressed', 'false');
            }
          });
        }
        // Set direction hidden input value
        const directionInput = formClone.querySelector('input[name="MemorizationDirectionId"]') ||
                               formClone.querySelector('input[id*="planMemorizationDirectionId"]');
        if (directionInput) directionInput.value = planData.memorization_direction_id || 1;

        // Surah value is now set by loadSurahsInline with initialValue parameter
        // Just need to set the verse max based on the selected surah
        const surahSelect = formClone.querySelector('select[id*="planStartSurah"]');
        if (surahSelect && surahSelect.selectedIndex > 0) {
          const selectedOption = surahSelect.options[surahSelect.selectedIndex];
          if (selectedOption) {
            const verseCount = selectedOption.getAttribute('data-verses');
            const verseInput = formClone.querySelector('input[id*="planStartVerse"]');
            if (verseInput && verseCount) {
              verseInput.setAttribute('max', verseCount);
            }
          }
        }

        // Set numeric inputs
        const dailyMemInput = formClone.querySelector('input[id*="planDailyMemorization"]');
        const revisionInput = formClone.querySelector('input[id*="planRevisionPages"]');
        const sideLessonsInput = formClone.querySelector('input[id*="planSideLessons"]');
        const startVerseInput = formClone.querySelector('input[id*="planStartVerse"]');

        // Use ?? not || so 0 (a valid "activity not in plan" marker) survives.
        if (dailyMemInput) dailyMemInput.value = planData.daily_memorization_amount ?? 0;
        if (revisionInput) revisionInput.value = planData.revision_pages ?? 0;
        if (sideLessonsInput) sideLessonsInput.value = planData.side_lessons ?? 0;
        if (startVerseInput) startVerseInput.value = planData.start_position || 1;

        console.log('Edit form loaded successfully for student:', studentId);

        // Setup handlers
        setupPlanTypePillHandlers(studentId);
        setupSubmissionDaysToggle(studentId);

        // Now that every field/dropdown is populated, snapshot the values so the
        // submit handler can tell a pure status change (-> PATCH) from a real
        // field edit (-> PUT).
        snapshotPlanFieldsForChangeDetection(form);

      } catch (error) {
        console.error('Error loading edit form:', error);
        editFormWrapper.innerHTML = `
          <div class="plan-form-card" style="margin-top: 16px;">
            <div style="text-align: center; padding: 40px 20px;">
              <i class="ti tabler-alert-circle" style="font-size: 2rem; color: var(--bs-danger);"></i>
              <p class="text-danger mt-3">حدث خطأ أثناء تحميل نموذج التعديل</p>
              <button type="button" class="btn btn-sm btn-outline-secondary" onclick="closeEditPlanInline('${studentId}')" style="border-radius: 8px;">
                <i class="ti tabler-x me-1"></i>
                إغلاق
              </button>
            </div>
          </div>
        `;
      }
    }, 500);
  };

  // Close edit plan inline
  function closeEditPlanInline(studentId) {
    const collapseElement = document.getElementById('plan-details-' + studentId);
    if (!collapseElement) return;

    const detailsWrapper = collapseElement.querySelector('.student-details-wrapper');

    // Remove edit form wrapper
    const editFormWrapper = detailsWrapper?.querySelector('.edit-plan-wrapper');
    if (editFormWrapper) {
      editFormWrapper.remove();
    }

    // Show action buttons again (plan-actions-row is a sibling of detailsWrapper, inside collapseElement)
    const planActionsRow = collapseElement.querySelector('.plan-actions-row');
    if (planActionsRow) {
      planActionsRow.style.display = '';
    }
  }

  // Statuses the teacher can set from the edit form. Status ids match
  // dbo.Plan_Statuses: 1 Active, 2 Paused, 3 Completed, 4 Transferred,
  // 5 Replaced, 6 Cancelled. Transferred(4) and Replaced(5) are system-managed
  // and omitted. Only Active(1) and Paused(2) stay visible on this activities
  // page (the server lists those two); setting Completed(3) or Cancelled(6)
  // removes the plan from this page — by design.
  const PLAN_STATUS_OPTIONS = [
    { id: 1, label: 'نشطة' },
    { id: 2, label: 'موقوفة' },
    { id: 3, label: 'مكتملة' },
    { id: 6, label: 'ملغاة' }
  ];

  // Builds the status dropdown + optional reason field and inserts it near the top
  // of the edit form. Also stashes the original status and a snapshot of the
  // non-status fields on the form so the submit handler can tell a pure status
  // change (-> PATCH) apart from a field edit (-> PUT).
  function injectPlanStatusControl(form, studentId, planData) {
    if (!form) return;

    const originalStatusId = parseInt(planData.status_id) || 1;

    let optionsHtml = PLAN_STATUS_OPTIONS
      .map(o => `<option value="${o.id}" ${o.id === originalStatusId ? 'selected' : ''}>${o.label}</option>`)
      .join('');
    // If the plan is already in a non-selectable status (e.g. Replaced), show it
    // as the current option so we never silently change it.
    if (!PLAN_STATUS_OPTIONS.some(o => o.id === originalStatusId)) {
      const currentLabel = planData.status_name || ('الحالة ' + originalStatusId);
      optionsHtml = `<option value="${originalStatusId}" selected>${currentLabel}</option>` + optionsHtml;
    }

    const statusBlock = document.createElement('div');
    statusBlock.className = 'row g-3 mt-3 plan-status-edit-row';
    statusBlock.innerHTML = `
      <div class="col-12">
        <div class="card" style="border-radius: 12px;">
          <div class="card-header" style="padding: 16px 20px; background-color: rgba(var(--bs-primary-rgb), 0.05); border-bottom: 1px solid var(--bs-border-color); border-radius: 12px 12px 0 0;">
            <h6 class="mb-0 d-flex align-items-center"><i class="ti tabler-flag me-2"></i>حالة الخطة <span class="text-danger">*</span></h6>
          </div>
          <div class="card-body" style="padding: 20px;">
            <div class="row g-3">
              <div class="col-md-5">
                <label class="form-label" for="planStatusSelect-${studentId}">الحالة</label>
                <select class="form-select" id="planStatusSelect-${studentId}" name="PlanStatusId">
                  ${optionsHtml}
                </select>
              </div>
              <div class="col-md-7">
                <label class="form-label" for="planStatusReason-${studentId}">سبب التغيير (اختياري)</label>
                <input type="text" class="form-control" id="planStatusReason-${studentId}" name="PlanStatusReason" placeholder="مثال: إيقاف مؤقت بسبب السفر" />
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Place the status section at the end of the form, just after the
    // "أيام التسميع" (submission days) section and before the action buttons.
    const actionsRow = form.querySelector('div.d-flex.justify-content-end.gap-2.mt-4');
    if (actionsRow) {
      form.insertBefore(statusBlock, actionsRow);
    } else {
      form.appendChild(statusBlock);
    }

    form.dataset.originalStatusId = String(originalStatusId);
    // The non-status field snapshot for change-detection is taken later, in
    // showEditPlanFormInline after every dropdown is populated, via
    // snapshotPlanFieldsForChangeDetection(). Taking it here from planData would
    // miss form-resolved defaults (e.g. the amount-type select loads after this
    // point), making a pure status change look like a field edit.
  }

  // Reads the comparable (non-status) plan fields straight from the edit form,
  // using the SAME extraction the submit handler uses. A snapshot taken at load
  // time therefore only differs from the save-time read when the user actually
  // edits a field — letting us route a pure status change through the dedicated
  // PATCH endpoint instead of the full PUT.
  function readPlanComparableFields(form) {
    const amountSelectEl = form.querySelector('select[name="MemorizationAmountTypeId"]');
    const memorizationAmountTypeId = parseInt(amountSelectEl?.value)
      || parseInt(amountSelectEl?.dataset?.defaultTypeId)
      || null;
    const mutoonBookEl = form.querySelector('select[name="MutoonBookId"]');
    const bookId = parseInt(mutoonBookEl?.value) || 0;
    return {
      halaqa_sec_id: parseInt(form.querySelector('input[id*="planHalaqaSecId"]')?.value) || 0,
      memorization_direction_id: parseInt(form.querySelector('input[id*="planMemorizationDirectionId"]')?.value || form.querySelector('input[name="MemorizationDirectionId"]')?.value) || 1,
      memorization_amount_type_id: memorizationAmountTypeId,
      start_id: parseInt(form.querySelector('select[id*="planStartSurah"]')?.value) || 1,
      start_position: parseInt(form.querySelector('input[id*="planStartVerse"]')?.value) || 1,
      daily_memorization_amount: parseFloat(form.querySelector('input[id*="planDailyMemorization"]')?.value) || 0,
      revision_pages: parseFloat(form.querySelector('input[id*="planRevisionPages"]')?.value) || 0,
      side_lessons: parseFloat(form.querySelector('input[id*="planSideLessons"]')?.value) || 0,
      is_primary: form.querySelector('input[name="IsPrimary"]')?.value === 'true',
      book_id: bookId
    };
  }

  // Snapshots the current (just-populated) field values onto the form so the
  // submit handler can detect real edits. Call after all dropdowns are loaded.
  function snapshotPlanFieldsForChangeDetection(form) {
    if (form) form.dataset.originalPlan = JSON.stringify(readPlanComparableFields(form));
  }

  // Handle edit form submission
  async function handleEditFormSubmit(event, studentId, planId) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('[type="submit"]');
    const originalBtnHtml = submitBtn.innerHTML;

    // Determine up front whether this submit is a PURE status change (cancel,
    // complete, pause) with no field edits. Status changes go through the
    // dedicated PATCH /status endpoint, which sends only { status_id,
    // change_reason } — never the daily amounts — so the field-level validations
    // below must NOT block them. Without this, a legacy plan whose stored
    // memorization amount is fractional (e.g. 2.3) could never be cancelled,
    // because the whole-number check would reject a value the user isn't even
    // editing. Real field edits still get the full validation.
    const _statusSelectEl = form.querySelector('select[name="PlanStatusId"]');
    const _origStatusId = parseInt(form.dataset.originalStatusId) || 1;
    const _newStatusId = parseInt(_statusSelectEl?.value) || _origStatusId;
    let _editedAnyField = true;
    try {
      const _orig = JSON.parse(form.dataset.originalPlan || '{}');
      const _current = readPlanComparableFields(form);
      _editedAnyField = Object.keys(_current).some(k => String(_current[k]) !== String(_orig[k]));
    } catch (e) {
      _editedAnyField = true;
    }
    const isStatusOnlyChange = _newStatusId !== _origStatusId && !_editedAnyField;

    // Activity-subset rule: a plan can include any combination of memorization
    // / revision / side-lessons; at least one must be > 0. Inputs allow 0 to
    // omit the activity from the plan.
    const dailyMem = parseFloat(form.querySelector('input[id*="planDailyMemorization"]')?.value) || 0;
    const dailyRev = parseFloat(form.querySelector('input[id*="planRevisionPages"]')?.value) || 0;
    const compLessons = parseFloat(form.querySelector('input[id*="planSideLessons"]')?.value) || 0;
    if (!isStatusOnlyChange && dailyMem <= 0 && dailyRev <= 0 && compLessons <= 0) {
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          title: 'حقل مطلوب',
          text: 'يجب تحديد قيمة واحدة على الأقل من: مقدار الحفظ، صفحات المراجعة، أو جنب الدرس',
          icon: 'warning',
          confirmButtonText: 'حسناً',
          customClass: { popup: 'swal2-border-radius', confirmButton: 'btn btn-primary' },
          buttonsStyling: false
        });
      } else {
        alert('يجب تحديد قيمة واحدة على الأقل من: مقدار الحفظ، صفحات المراجعة، أو جنب الدرس');
      }
      return;
    }

    // Memorization and side lessons must be whole numbers; revision may be fractional.
    // Skipped for a pure status change — the amounts aren't being edited or sent.
    if (!isStatusOnlyChange && !validateDailyTargetGranularity(dailyMem, compLessons)) {
      return;
    }

    // Completed (3) and Cancelled (5) are terminal on the backend: the plan is
    // archived, drops off this page, and the change can't be undone. Warn the
    // teacher before committing such a status change so it isn't picked by
    // accident. (Active/Paused save with no extra prompt.)
    const statusSelectForConfirm = form.querySelector('select[name="PlanStatusId"]');
    const chosenStatusId = parseInt(statusSelectForConfirm?.value) || (parseInt(form.dataset.originalStatusId) || 1);
    const isTerminalStatus = chosenStatusId === 3 || chosenStatusId === 6;
    if (isTerminalStatus && String(chosenStatusId) !== String(form.dataset.originalStatusId)) {
      const isCompleted = chosenStatusId === 3;
      const confirmResult = await Swal.fire({
        icon: 'warning',
        title: isCompleted ? 'تأكيد إكمال الخطة' : 'تأكيد إلغاء الخطة',
        html: `<p style="margin:0;">${isCompleted
          ? 'سيتم اعتماد الخطة كمكتملة ونقلها إلى الأرشيف. لن تظهر بعد ذلك في صفحة المتابعة، ولا يمكن التراجع عن هذا الإجراء.'
          : 'سيتم إلغاء الخطة ونقلها إلى الأرشيف. لن تظهر بعد ذلك في صفحة المتابعة، ولا يمكن التراجع عن هذا الإجراء.'}<br><br>هل تريد المتابعة؟</p>`,
        showCancelButton: true,
        confirmButtonText: isCompleted ? 'نعم، إكمال الخطة' : 'نعم، إلغاء الخطة',
        cancelButtonText: 'تراجع',
        reverseButtons: true,
        buttonsStyling: false,
        customClass: {
          popup: 'swal2-border-radius',
          confirmButton: 'btn btn-danger me-2',
          cancelButton: 'btn btn-label-secondary',
          htmlContainer: 'swal2-html-container-custom'
        },
        iconColor: '#ff9f43'
      });
      if (!confirmResult.isConfirmed) return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> جاري الحفظ...';

      // Collect form data
      const mapStdEduPeriodId = parseInt(form.querySelector('input[id*="planMapStdEduPeriodId"]')?.value) || 0;
      const amountSelectEl = form.querySelector('select[name="MemorizationAmountTypeId"]');
      const memorizationAmountTypeId = parseInt(amountSelectEl?.value)
        || parseInt(amountSelectEl?.dataset?.defaultTypeId)
        || null;
      // Mutoon plans carry a non-zero book_id (the selected mtn_book_id).
      // Quran plans keep book_id = 0.
      const mutoonBookEl = form.querySelector('select[name="MutoonBookId"]');
      const bookId = parseInt(mutoonBookEl?.value) || 0;
      // Surah-table book type (1 = Quran, 2 = primer). Prefer the التلقين picker,
      // else derive from the selected lesson/surah id. The API validates start_id
      // against this — without it a primer plan (id 132+) fails the 1–114 rule.
      const editStartId = parseInt(form.querySelector('select[id*="planStartSurah"]')?.value) || 1;
      const editBookTypeId = parseInt(form.querySelector('select[id*="planBookType"]')?.value, 10)
        || (bookId === 0 ? deriveBookTypeFromSurahId(editStartId) : 1);
      const formData = {
        student_id: form.querySelector('input[name="StudentId"]')?.value,
        halaqa_sec_id: parseInt(form.querySelector('input[id*="planHalaqaSecId"]')?.value) || 0,
        education_type_id: parseInt(form.querySelector('input[id*="planEducationTypeId"]')?.value) || 0,
        halaqa_type_id: parseInt(form.querySelector('input[id*="planHalaqaTypeId"]')?.value) || 0,
        teacher_id: form.querySelector('input[id*="planTeacherId"]')?.value || '',
        memorization_direction_id: parseInt(form.querySelector('input[id*="planMemorizationDirectionId"]')?.value || form.querySelector('input[name="MemorizationDirectionId"]')?.value) || 1,
        memorization_amount_type_id: memorizationAmountTypeId,
        start_id: parseInt(form.querySelector('select[id*="planStartSurah"]')?.value) || 1,
        start_position: parseInt(form.querySelector('input[id*="planStartVerse"]')?.value) || 1,
        // Subset-allowed: each value may be 0 to omit the activity. The
        // "at least one > 0" rule was already enforced above.
        daily_memorization_amount: dailyMem,
        revision_pages: dailyRev,
        side_lessons: compLessons,
        is_primary: form.querySelector('input[name="IsPrimary"]')?.value === 'true',
        book_id: bookId, // 0 for Quran, mtn_book_id for Mutoon
        book_type_id: editBookTypeId // 1 = Quran, 2 = primer
      };

      // Resolve the chosen status from the edit-only status control. Falls back to
      // the original status so an edit never silently flips status back to Active.
      const statusSelectEl = form.querySelector('select[name="PlanStatusId"]');
      const originalStatusId = parseInt(form.dataset.originalStatusId) || 1;
      const newStatusId = parseInt(statusSelectEl?.value) || originalStatusId;
      const statusReason = form.querySelector('input[name="PlanStatusReason"]')?.value?.trim() || null;
      const statusChanged = newStatusId !== originalStatusId;
      formData.status_id = newStatusId;

      // Did any non-status field actually change? Compare against the snapshot
      // taken when the form was built.
      let fieldsChanged = true;
      try {
        const orig = JSON.parse(form.dataset.originalPlan || '{}');
        const current = readPlanComparableFields(form);
        fieldsChanged = Object.keys(current).some(k => String(current[k]) !== String(orig[k]));
      } catch (e) {
        fieldsChanged = true;
      }

      // Only include MAP_STD_Edu_Period_id if it has a valid value
      if (mapStdEduPeriodId && mapStdEduPeriodId > 0) {
        formData.MAP_STD_Edu_Period_id = mapStdEduPeriodId;
      }

      // Pure status change -> dedicated PATCH (always in-place + audited, never
      // spawns a replacement plan). Any field edit -> full PUT (carries the new
      // status too, so the two stay consistent).
      const statusOnly = statusChanged && !fieldsChanged;
      let response;
      if (statusOnly) {
        console.log('Submitting plan status change:', { planId, status_id: newStatusId, change_reason: statusReason });
        response = await fetch(`/api/student-plan/${planId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status_id: newStatusId, change_reason: statusReason })
        });
      } else {
        console.log('Submitting edit form data:', formData);
        response = await fetch(`/api/student-plan/update/${planId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      }

      const result = await response.json();
      console.log('Edit response:', result);

      if (result.success) {
        // Show success message with same style as create plan dialog
        Swal.fire({
          icon: 'success',
          title: 'تم بنجاح',
          html: `<p style="margin: 0;">${statusOnly ? 'تم تحديث حالة الخطة بنجاح' : 'تم تحديث الخطة بنجاح'}</p>`,
          confirmButtonText: 'حسناً',
          customClass: {
            popup: 'swal2-border-radius',
            confirmButton: 'btn btn-success',
            htmlContainer: 'swal2-html-container-custom'
          },
          buttonsStyling: false,
          iconColor: '#28c76f'
        }).then(() => {
          // Close form and refresh
          closeEditPlanInline(studentId);
          loadStudentsData();
          // A status change (e.g. pausing) changes who shows in the
          // attendance/evaluation tab, so refresh it too.
          if (window.refreshAttnEvalStudents) window.refreshAttnEvalStudents();
        });
      } else {
        throw new Error(result.message || 'فشل تحديث الخطة');
      }
    } catch (error) {
      console.error('Error submitting edit form:', error);
      Swal.fire({
        icon: 'error',
        title: 'خطأ',
        text: error.message || 'حدث خطأ أثناء تحديث الخطة'
      });
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHtml;
    }
  }

  // NEW: Inline form loading function (Phase 1)
  window.showCreatePlanFormInline = function (studentId, studentName, studentData) {
    console.log('showCreatePlanFormInline called:', studentId, studentName, studentData);

    // Find the student's collapse container
    const collapseElement = document.getElementById('plan-details-' + studentId);
    if (!collapseElement) {
      console.error('Collapse element not found for student:', studentId);
      return;
    }

    // Find the no-plan-wrapper inside this collapse. A student who already has a
    // plan has no such wrapper (the card shows the plan action rows instead), so
    // create one on the fly — this lets the "add another plan" button reuse this
    // same inline create flow on the activities page instead of the legacy
    // /StudentPlan/Create wizard. Cancelling a dynamic wrapper removes it
    // (see hideInlineForm) rather than showing a misleading "no plan" message.
    let noPlanWrapper = collapseElement.querySelector('.no-plan-wrapper');
    if (!noPlanWrapper) {
      noPlanWrapper = document.createElement('div');
      noPlanWrapper.className = 'no-plan-wrapper';
      noPlanWrapper.dataset.dynamicAddPlan = 'true';
      collapseElement.appendChild(noPlanWrapper);
    }

    // Show loading spinner
    noPlanWrapper.innerHTML = `
      <div style="text-align: center; padding: 60px 20px;">
        <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
          <span class="visually-hidden">جاري التحميل...</span>
        </div>
        <p class="text-muted mt-3" style="font-size: 0.9375rem;">جاري تحميل النموذج...</p>
      </div>
    `;

    // Simulate loading delay (you can remove this in production)
    setTimeout(async () => {
      // Get the original form template
      const originalForm = document.getElementById('createPlanFormContainer');
      if (!originalForm) {
        console.error('Original form container not found');
        return;
      }

      // Clone the form
      const formClone = originalForm.cloneNode(true);
      formClone.id = 'inlineCreatePlanForm-' + studentId;
      // Remove the original display:none style and set new styles
      formClone.removeAttribute('style');
      formClone.style.display = 'block';
      formClone.style.marginBottom = '0';

      // Update form IDs to be unique for this student
      const form = formClone.querySelector('#createPlanForm');
      if (form) {
        form.id = 'createPlanForm-' + studentId;

        // First, handle memorizationDirectionsContainer before ID updates
        const directionsContainer = formClone.querySelector('#memorizationDirectionsContainer');
        if (directionsContainer) {
          directionsContainer.id = 'memorizationDirectionsContainer-' + studentId;
          console.log('Updated directions container ID to:', directionsContainer.id);
        }

        // Update all element IDs and their corresponding labels
        const elementsWithIds = formClone.querySelectorAll('[id]');
        elementsWithIds.forEach(el => {
          if (el.id && !el.id.includes('-' + studentId)) {
            const oldId = el.id;
            const newId = oldId + '-' + studentId;

            // Find label BEFORE changing the ID
            const label = formClone.querySelector(`label[for="${oldId}"]`);

            // Update element ID
            el.id = newId;

            // Update label's for attribute
            if (label) {
              label.setAttribute('for', newId);
              console.log(`Updated label for ${oldId} to ${newId}`);
            }
          }
        });

        // Set student data
        const studentIdInput = form.querySelector('input[name="StudentId"]');
        const studentNameInput = form.querySelector('input[id*="planStudentName"]');
        const studentIdDisplay = form.querySelector('input[id*="planStudentIdDisplay"]');
        const halaqaSecIdInput = form.querySelector('input[id*="planHalaqaSecId"]');

        if (studentIdInput) studentIdInput.value = studentId;
        if (studentNameInput) studentNameInput.value = studentName;
        if (studentIdDisplay) studentIdDisplay.value = studentId;
        if (halaqaSecIdInput) halaqaSecIdInput.value = o;

        if (halaqaData) {
          const eduTypeInput = form.querySelector('input[id*="planEducationTypeId"]');
          const halaqaTypeInput = form.querySelector('input[id*="planHalaqaTypeId"]');
          const teacherInput = form.querySelector('input[id*="planTeacherId"]');

          if (eduTypeInput) eduTypeInput.value = halaqaData.Education_Type_ID || halaqaData.education_Type_ID || 0;
          if (halaqaTypeInput) {
            const halaqaTypeId = halaqaData.Halaqa_Type_ID || halaqaData.halaqa_Type_ID || halaqaData.halaqa_type_id || 1;
            halaqaTypeInput.value = halaqaTypeId;
            
            console.log('=== SETTING HALAQA TYPE IN FORM ===');
            console.log('Student ID:', studentId);
            console.log('halaqaData object:', halaqaData);
            console.log('Extracted halaqaTypeId:', halaqaTypeId);
            console.log('Form input value set to:', halaqaTypeInput.value);
            console.log('===================================');

            // Mutoon also needs its book list loaded. Amount types are loaded later
            // via loadAmountTypesInline (which picks the halaqa-correct default) —
            // don't fire a second amount-type fetch here; the race would overwrite
            // the default selection and leave the (hidden) Quran select empty.
            if (halaqaTypeId === 2) {
              loadMutoonBooks(studentId, formClone);
            }
          }
          if (teacherInput) teacherInput.value = halaqaData.Teacher_ID || halaqaData.teacher_ID || '';
        }

        // Set map_std_edu_period_id from student data if available
        const mapStdEduPeriodInput = form.querySelector('input[id*="planMapStdEduPeriodId"]');
        if (mapStdEduPeriodInput && studentData && studentData.map_std_edu_period_id) {
          mapStdEduPeriodInput.value = studentData.map_std_edu_period_id;
          console.log('Set map_std_edu_period_id:', studentData.map_std_edu_period_id);
        }

        // Update both cancel buttons to close inline form
        const cancelBtns = formClone.querySelectorAll('[id*="cancelPlanFormBtn"]');
        cancelBtns.forEach(btn => {
          btn.onclick = function () {
            hideInlineForm(studentId);
          };
        });

        // Update form submission handler
        form.onsubmit = async function (event) {
          event.preventDefault();
          // Use existing form submission logic but for inline form
          await handleInlineFormSubmit(event, studentId);
        };
      }

      // Replace loading spinner with form
      noPlanWrapper.innerHTML = '';
      noPlanWrapper.appendChild(formClone);

      // Ensure the collapse container is expanded to show the form
      const collapseEl = document.getElementById('plan-details-' + studentId);
      if (collapseEl && !collapseEl.classList.contains('show')) {
        const bsCollapse = new bootstrap.Collapse(collapseEl, { toggle: false });
        bsCollapse.show();
      }

      // Load lookups into the cloned form. Mutoon halaqat use the book→chapter
      // cascade (mutton-books / mutton-chapters endpoints), Quran halaqat use the
      // surahs lookup. Either way the #planStartSurah select gets populated — the
      // submit code reads it as `start_id` regardless of which source wrote it.
      const isMutoonHalaqa = getCurrentHalaqaTypeId() === 2;
      if (isMutoonHalaqa) {
        console.log('Calling loadMutoonBooksInline for student:', studentId);
        await loadMutoonBooksInline(studentId);
      } else {
        console.log('Calling loadSurahsInline for student:', studentId);
        // Talqeen halaqat default the picker to القرآن (book_type 1); make sure the
        // dropdown matches before the first render, then wire the picker.
        if (isTalqeenHalaqa()) applySurahBookTypeFilter(1);
        await loadSurahsInline(studentId);
        wireBookTypeSelector(studentId);
        applyBookTypeLabels(studentId);
      }
      if (!isMutoonHalaqa) {
        console.log('Calling loadMemorizationDirectionsInline for student:', studentId);
        await loadMemorizationDirectionsInline(studentId);
      }
      console.log('Calling loadAmountTypesInline for student:', studentId);
      await loadAmountTypesInline(studentId);
      await loadPlanTemplatesDropdown(studentId);

      // Setup plan type pill handlers for this inline form
      setupPlanTypePillHandlers(studentId);

      // Teacher always defaults to خطة أساسية
      const isTeacherMode = document.getElementById('createPlanFormContainer')?.dataset.teacher === 'true';
      if (isTeacherMode) {
        const primaryPill = formClone.querySelector('.plan-type-pill[data-value="true"]');
        if (primaryPill) primaryPill.click();
      }

      // Setup submission days toggle for this inline form
      setupSubmissionDaysToggle(studentId);

      // Debug: Check checkbox structure
      const checkboxes = formClone.querySelectorAll('.plan-day-checkbox');
      const labels = formClone.querySelectorAll('.plan-day-label');
      console.log('Checkboxes found:', checkboxes.length);
      console.log('Labels found:', labels.length);
      checkboxes.forEach((cb, i) => {
        const label = labels[i];
        console.log(`Checkbox ${i}: id="${cb.id}", label for="${label?.getAttribute('for')}"`);
      });

      console.log('Inline form loaded successfully for student:', studentId);
    }, 500); // 500ms delay for loading spinner visibility
  };

  function hideInlineForm(studentId) {
    const collapseElement = document.getElementById('plan-details-' + studentId);
    if (!collapseElement) return;

    const noPlanWrapper = collapseElement.querySelector('.no-plan-wrapper');
    if (!noPlanWrapper) return;

    // A wrapper created on the fly for "add another plan" (existing-plan student)
    // is just removed on cancel — the student still has their plan(s), so the
    // "no plan for this student" message below would be misleading.
    if (noPlanWrapper.dataset.dynamicAddPlan === 'true') {
      noPlanWrapper.remove();
      return;
    }

    // Restore original "no plan" message
    noPlanWrapper.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 8px;">
          <i class="ti tabler-clipboard-off" style="font-size: 2rem; color: var(--bs-secondary);"></i>
        </div>
        <p style="color: var(--bs-secondary-color); margin-bottom: 12px; font-size: 0.9375rem;">لا توجد خطة لهذا الطالب</p>
        <button type="button" class="btn btn-primary btn-sm" onclick='window.showCreatePlanFormInline("${studentId}", "", {})'>
          <i class="ti tabler-plus me-1"></i>
          إنشاء خطة جديدة
        </button>
      </div>
    `;
  }

  async function loadSurahsInline(studentId, initialValue = null) {
    // Similar to loadSurahs but targets inline form
    // initialValue: optional surah ID to pre-select after loading
    const select = document.querySelector(`#planStartSurah-${studentId}`);
    console.log('Looking for select element:', `#planStartSurah-${studentId}`, 'Found:', select);
    if (!select) {
      console.error('Surah select not found:', `#planStartSurah-${studentId}`);
      return;
    }

    // Wait for preload if in progress, or trigger load if needed
    if (surahsLoadingPromise) {
      console.log('Waiting for surahs preload to complete...');
      await surahsLoadingPromise;
    } else if (surahsList.length === 0) {
      // Fallback: trigger preload if not already done
      await preloadLookupData();
    }

    // Ensure surahsList is an array
    if (!Array.isArray(surahsList)) {
      console.error('surahsList is not an array:', surahsList);
      return;
    }

    console.log('Populating dropdown with', surahsList.length, 'surahs');

    // Destroy Select2 if already initialized
    if ($(select).data('select2')) {
      $(select).select2('destroy');
    }

    // Only add empty placeholder option if no initial value (for new plans)
    // For edit mode, we skip this so Select2 shows the pre-selected value
    if (!initialValue) {
      select.innerHTML = '<option value="">' + surahSelectPlaceholder() + '</option>';
    } else {
      select.innerHTML = '';
    }

    // Sort surahs by surah_id (order in Quran)
    const sortedSurahs = [...surahsList].sort((a, b) => a.surah_id - b.surah_id);

    sortedSurahs.forEach(surah => {
      const option = document.createElement('option');
      option.value = surah.surah_id;
      // Use the same format as the old function
      option.textContent = surah.surah_name + ' (' + (surah.number_of_verses || surah.total_verses || 0) + ' ' + (surah.book_type_id === 2 ? 'مقطع' : 'آية') + ')';
      option.setAttribute('data-verses', surah.number_of_verses || surah.total_verses || 0);
      // Pre-select if this is the initial value (for edit mode)
      if (initialValue && String(surah.surah_id) === String(initialValue)) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    // Set native select value BEFORE Select2 initialization (for edit mode)
    // This ensures Select2 reads the correct initial value during init
    if (initialValue) {
      select.value = String(initialValue);
      console.log('Native select value set to:', initialValue);
    }

    // Initialize Select2 with search
    try {
      // Build Select2 options - only include placeholder when no initial value
      const select2Options = {
        allowClear: !initialValue, // Don't allow clear in edit mode to avoid confusion
        dir: 'rtl',
        dropdownParent: $(select).closest('.collapse'),
        language: {
          noResults: function () {
            return 'لا توجد نتائج';
          },
          searching: function () {
            return 'جاري البحث...';
          }
        }
      };

      // Only set placeholder for new plans (when no initial value)
      if (!initialValue) {
        select2Options.placeholder = surahSelectPlaceholder();
      }

      $(select).select2(select2Options);
      console.log('Select2 initialized successfully');

      // For edit mode, trigger change to update dependent fields (verse max)
      if (initialValue) {
        $(select).trigger('change');
        console.log('Surah pre-selected:', initialValue);
      }

      // Fix for Select2 display not updating when selection is made via keyboard/search
      // This explicitly updates the rendered display text after selection
      $(select).on('select2:select', function (e) {
        const selectedData = e.params.data;
        const $select2Instance = $(this).data('select2');
        if ($select2Instance && $select2Instance.$selection) {
          const $rendered = $select2Instance.$selection.find('.select2-selection__rendered');
          $rendered.text(selectedData.text);
          $rendered.attr('title', selectedData.text);
          $rendered.removeClass('select2-selection__placeholder');
        }
      });

      // Add change event listener to update verse input max value
      // Listen to both select2:select (user UI interaction) and change (programmatic)
      $(select).on('select2:select change', function () {
        const selectedOption = this.options[this.selectedIndex];
        const verseCount = selectedOption ? selectedOption.getAttribute('data-verses') : null;
        const verseInput = document.querySelector(`#planStartVerse-${studentId}`);

        if (verseInput && verseCount) {
          verseInput.setAttribute('max', verseCount);
          // Only reset to 1 for user interactions (select2:select), not programmatic changes
          // Check if this is a user-triggered event by checking if it has originalEvent
          verseInput.classList.remove('is-invalid');
        }
      });

      // Add input event listener to validate verse number
      const verseInput = document.querySelector(`#planStartVerse-${studentId}`);
      if (verseInput) {
        verseInput.addEventListener('input', function () {
          const max = parseInt(this.getAttribute('max'));
          const value = parseInt(this.value);

          if (value > max && max > 0) {
            this.classList.add('is-invalid');
          } else {
            this.classList.remove('is-invalid');
          }
        });
      }
    } catch (error) {
      console.error('Error initializing Select2:', error);
    }

    console.log('Dropdown populated and Select2 initialized. Total options:', select.options.length);
  }

  // Talqeen-only: the القرآن/المدنية picker re-filters the surah list by book_type
  // and rebuilds the surah dropdown. No-op when the picker isn't in the form
  // (every non-Talqeen halaqa), so it's safe to call unconditionally.
  function wireBookTypeSelector(studentId) {
    const sel = document.querySelector(`#planBookType-${studentId}`);
    if (!sel) return;
    sel.addEventListener('change', async function () {
      applySurahBookTypeFilter(this.value);
      applyAmountUnitLabels(studentId, this.value);
      // Reset any prior surah pick — it belongs to the other book — then repopulate.
      await loadSurahsInline(studentId);
      // قاعدة is forward-only (like Mutoon); القرآن allows all directions.
      applyDirectionLockForBookType(studentId, this.value);
    });
  }

  // Replace the picker's hardcoded option labels with the DB book_type names
  // (from the surah lookup). No-op when the picker is absent or the lookup hasn't
  // populated the map yet, in which case the Razor fallback text stays.
  function applyBookTypeLabels(studentId) {
    const sel = document.querySelector(`#planBookType-${studentId}`);
    if (!sel) return;
    Array.from(sel.options).forEach(opt => {
      const name = bookTypeNameById[parseInt(opt.value, 10)];
      if (name) opt.textContent = name;
    });
  }

  // Talqeen-only: swap the daily-amount unit labels to match the chosen book.
  // قاعدة/المدنية (book_type 2) is measured in مقاطع (lesson) / أبواب (revision); the
  // Quran (book_type 1) in أسطر / صفحات. Display-only — the stored amounts are unchanged.
  // Labels are located via the inputs' column ancestor, so no template ids are needed.
  function applyAmountUnitLabels(studentId, bookTypeId) {
    const isMadaniya = (parseInt(bookTypeId, 10) || 1) === 2;
    const memInput = document.getElementById(`planDailyMemorization-${studentId}`);
    const revInput = document.getElementById(`planRevisionPages-${studentId}`);
    const memLabel = memInput && memInput.closest('[class*="col"]')?.querySelector('.form-label');
    const revLabel = revInput && revInput.closest('[class*="col"]')?.querySelector('.form-label');
    // Guard on the unit being present so a Mutoon "الحفظ" (no unit) is never rewritten.
    if (memLabel && memLabel.textContent.indexOf('الحفظ') !== -1)
      memLabel.textContent = isMadaniya ? 'الحفظ (مقاطع)' : 'الحفظ (أسطر)';
    if (revLabel && revLabel.textContent.indexOf('المراجعة') !== -1)
      revLabel.textContent = isMadaniya ? 'المراجعة (أبواب)' : 'المراجعة (صفحات)';
  }

  // Talqeen-only: قاعدة/المدنية (book_type 2) is taught front-to-back like Mutoon, so it must
  // be FORWARD-ONLY — hide the backward direction pill and force forward selected. القرآن
  // (book_type 1) keeps all directions. No-op when the direction container isn't present.
  function applyDirectionLockForBookType(studentId, bookTypeId) {
    const forwardOnly = (parseInt(bookTypeId, 10) || 1) === 2;
    const container = document.querySelector(`#memorizationDirectionsContainer-${studentId}`);
    if (!container) return;
    container.querySelectorAll('.plan-type-pill').forEach(pill => {
      const dirId = parseInt(pill.dataset.value, 10);
      pill.style.display = (forwardOnly && dirId !== 1) ? 'none' : '';
    });
    if (forwardOnly) {
      const fwd = container.querySelector('.plan-type-pill[data-value="1"]');
      if (fwd) {
        if (!fwd.classList.contains('active')) fwd.click(); // selects + sets hidden input + reorders dropdown
        const hiddenInput = document.querySelector(`input[name="MemorizationDirectionId"][id*="${studentId}"]`);
        if (hiddenInput) hiddenInput.value = '1';
      }
    }
  }

  function reorderSurahDropdown(studentId, directionId) {
    const select = document.querySelector(`#planStartSurah-${studentId}`);
    if (!select || surahsList.length === 0) return;

    // Save current selected value before destroying
    const currentValue = select.value;

    // Destroy Select2 if already initialized
    if ($(select).data('select2')) {
      $(select).select2('destroy');
    }

    // Sort surahs based on direction: 1 = forward (الفاتحة first), 2 = backward (الناس first)
    const sortedSurahs = [...surahsList].sort((a, b) => {
      return directionId === 2 ? b.surah_id - a.surah_id : a.surah_id - b.surah_id;
    });

    // Repopulate dropdown
    select.innerHTML = '<option value="">' + surahSelectPlaceholder() + '</option>';
    sortedSurahs.forEach(surah => {
      const option = document.createElement('option');
      option.value = surah.surah_id;
      option.textContent = surah.surah_name + ' (' + (surah.number_of_verses || surah.total_verses || 0) + ' ' + (surah.book_type_id === 2 ? 'مقطع' : 'آية') + ')';
      option.setAttribute('data-verses', surah.number_of_verses || surah.total_verses || 0);
      select.appendChild(option);
    });

    // Restore selected value if it was a valid surah, otherwise keep placeholder
    if (currentValue && currentValue !== '') {
      select.value = currentValue;
    } else {
      select.value = ''; // Ensure placeholder is selected
    }

    // Re-initialize Select2
    $(select).select2({
      placeholder: surahSelectPlaceholder(),
      allowClear: true,
      dir: 'rtl',
      dropdownParent: $(select).closest('.collapse'),
      language: {
        noResults: function () {
          return 'لا توجد نتائج';
        },
        searching: function () {
          return 'جاري البحث...';
        }
      }
    });

    // Re-attach event listeners after reordering
    $(select).off('select2:select change');

    // Fix for Select2 display not updating when selection is made via keyboard/search
    $(select).on('select2:select', function (e) {
      const selectedData = e.params.data;
      const $select2Instance = $(this).data('select2');
      if ($select2Instance && $select2Instance.$selection) {
        const $rendered = $select2Instance.$selection.find('.select2-selection__rendered');
        $rendered.text(selectedData.text);
        $rendered.attr('title', selectedData.text);
        $rendered.removeClass('select2-selection__placeholder');
      }
    });

    // Change event listener to update verse input max value
    $(select).on('select2:select change', function () {
      const selectedOption = this.options[this.selectedIndex];
      const verseCount = selectedOption ? selectedOption.getAttribute('data-verses') : null;
      const verseInput = document.querySelector(`#planStartVerse-${studentId}`);

      if (verseInput && verseCount) {
        verseInput.setAttribute('max', verseCount);
        verseInput.classList.remove('is-invalid');
      }
    });
  }

  // Mutoon book/chapter cascade. The cloned form has two selects for the start point:
  //   #planMutoonBook-{studentId}  → mtn_book_id  (name="MutoonBookId")
  //   #planStartSurah-{studentId}  → chapter_id   (name="StartSurahId", reused so
  //                                                submit code sends chapter_id as start_id
  //                                                exactly like a Quran plan sends a surah id)
  // The hidden StartVerseNumber is always 1 for Mutoon (Razor emits an <input type=hidden>).
  async function loadMutoonBooksInline(studentId, initialBookId = null, initialChapterId = null) {
    const bookSelect = document.querySelector(`#planMutoonBook-${studentId}`);
    const chapterSelect = document.querySelector(`#planStartSurah-${studentId}`);
    if (!bookSelect || !chapterSelect) {
      console.error('Mutoon selects not found for student:', studentId,
                    'bookSelect=', !!bookSelect, 'chapterSelect=', !!chapterSelect);
      return;
    }

    let books = [];
    try {
      const response = await fetch('/ManageHalaqa/GetMutoonBooks');
      if (!response.ok) {
        console.error('GetMutoonBooks HTTP', response.status);
      } else {
        const data = await response.json();
        // Tolerate snake_case and camelCase envelopes from the API
        books = data?.data?.books
             || data?.data?.Books
             || (Array.isArray(data?.data) ? data.data : null)
             || [];
      }
    } catch (err) {
      console.error('Error loading Mutoon books:', err);
    }

    bookSelect.innerHTML = '<option value="">-- اختر الكتاب --</option>';
    books.forEach(book => {
      const opt = document.createElement('option');
      opt.value = book.mtn_book_id ?? book.mtnBookId ?? book.MtnBookId;
      const name = book.book_name || book.bookName || book.BookName || `كتاب ${opt.value}`;
      opt.textContent = name;
      bookSelect.appendChild(opt);
    });
    console.log('Loaded', books.length, 'Mutoon books for student:', studentId);

    // Reset chapter dropdown to a clean placeholder whenever the book changes.
    bookSelect.onchange = async function () {
      await loadMutoonChaptersInline(studentId, this.value);
    };

    // Edit flow — pre-select the plan's book and chapter without triggering the
    // generic change handler (which wouldn't know the chapter to re-select).
    if (initialBookId) {
      bookSelect.value = String(initialBookId);
      await loadMutoonChaptersInline(studentId, initialBookId, initialChapterId);
    } else {
      // Create flow — leave the chapter dropdown showing its placeholder until
      // the user picks a book.
      chapterSelect.innerHTML = '<option value="">-- اختر الدرس --</option>';
    }
  }

  async function loadMutoonChaptersInline(studentId, bookId, initialChapterId = null) {
    const chapterSelect = document.querySelector(`#planStartSurah-${studentId}`);
    if (!chapterSelect) return;

    if (!bookId) {
      chapterSelect.innerHTML = '<option value="">-- اختر الدرس --</option>';
      return;
    }

    let chapters = [];
    try {
      const response = await fetch(`/ManageHalaqa/GetMutoonChapters?bookId=${encodeURIComponent(bookId)}`);
      if (!response.ok) {
        console.error('GetMutoonChapters HTTP', response.status);
      } else {
        const data = await response.json();
        chapters = data?.data?.chapters
                || data?.data?.Chapters
                || (Array.isArray(data?.data) ? data.data : null)
                || [];
      }
    } catch (err) {
      console.error('Error loading Mutoon chapters:', err);
    }

    chapterSelect.innerHTML = '<option value="">-- اختر الدرس --</option>';
    chapters.forEach(ch => {
      const opt = document.createElement('option');
      const chapterId = ch.chapter_id ?? ch.chapterId ?? ch.ChapterId;
      const chapterNo = ch.chapter_no ?? ch.chapterNo ?? ch.ChapterNo;
      const chapterName = ch.chapter_name || ch.chapterName || ch.ChapterName || '';
      opt.value = chapterId;
      opt.textContent = chapterName
        ? (chapterNo != null ? `${chapterNo}. ${chapterName}` : chapterName)
        : `الدرس ${chapterNo ?? chapterId}`;
      chapterSelect.appendChild(opt);
    });
    console.log('Loaded', chapters.length, 'Mutoon chapters for book', bookId);

    if (initialChapterId) {
      chapterSelect.value = String(initialChapterId);
    }
  }

  async function loadMemorizationDirectionsInline(studentId, initialDirectionId = 1) {
    // Similar to loadMemorizationDirections but targets inline form
    const container = document.querySelector(`#memorizationDirectionsContainer-${studentId}`);
    if (!container) {
      console.error('Container not found:', `#memorizationDirectionsContainer-${studentId}`);
      return;
    }

    // Wait for preload if in progress, or trigger load if needed
    if (directionsLoadingPromise) {
      console.log('Waiting for directions preload to complete...');
      await directionsLoadingPromise;
    } else if (directionsList.length === 0) {
      // Fallback: trigger preload if not already done
      await preloadLookupData();
    }

    // Ensure directionsList is an array
    if (!Array.isArray(directionsList)) {
      console.error('directionsList is not an array:', directionsList);
      return;
    }

    container.innerHTML = '';
    let selectedBtn = null;

    // Get halaqa type to filter directions
    const halaqaTypeId = halaqaData?.Halaqa_ID || halaqaData?.Halaqa_Type_ID || halaqaData?.halaqa_type_id || 1;

    // Filter directions based on halaqa type:
    // - Quran (1): Show all 3 directions (forward, backward, mixed)
    // - Mutoon (2): Show only forward direction (id=1)
    const filteredDirections = directionsList.filter(dir => {
      const dirId = dir.id || dir.memorization_direction_id;
      if (halaqaTypeId === 2) {
        return dirId === 1;
      } else {
        return true;
      }
    });

    filteredDirections.forEach((dir, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'plan-type-pill';
      // Try both possible property names
      const dirId = dir.id || dir.memorization_direction_id;
      button.dataset.value = dirId;
      button.setAttribute('aria-pressed', 'false');

      // Quran directions get the friendlier hardcoded labels that the rest
      // of the app uses ("من أول المصحف" / "من آخر المصحف") instead of the
      // verbose API wording ("من الأول إلى الآخر" / "من الآخر إلى الأول").
      // Mutoon (and any id we don't know about, e.g. mixed = 3) falls back to
      // the API name so this stays correct if the lookup grows new options.
      const friendlyLabels = { 1: 'من أول المصحف', 2: 'من آخر المصحف' };
      button.textContent = friendlyLabels[dirId]
        || dir.direction_name_ar
        || dir.memorization_direction_name_ar
        || dir.name_ar
        || `Direction ${dirId}`;

      button.onclick = function () {
        container.querySelectorAll('.plan-type-pill').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        this.classList.add('active');
        this.setAttribute('aria-pressed', 'true');
        const hiddenInput = document.querySelector(`input[name="MemorizationDirectionId"][id*="${studentId}"]`);
        if (hiddenInput) hiddenInput.value = this.dataset.value;

        // Reorder surah dropdown based on direction
        const directionId = parseInt(this.dataset.value);
        reorderSurahDropdown(studentId, directionId);
      };

      // Mark button to be selected if it matches initialDirectionId
      if (dirId === initialDirectionId) {
        selectedBtn = button;
      }

      container.appendChild(button);
    });

    // Add hidden input for direction
    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.name = 'MemorizationDirectionId';
    hiddenInput.id = 'directionInput-' + studentId;
    hiddenInput.required = true;
    hiddenInput.value = initialDirectionId.toString();
    container.appendChild(hiddenInput);

    // Select the appropriate direction button
    if (selectedBtn) {
      selectedBtn.click();
    } else {
      // Fallback to first button if initialDirectionId not found
      const firstBtn = container.querySelector('.plan-type-pill');
      if (firstBtn) firstBtn.click();
    }
  }

  async function loadPlanTemplatesDropdown(studentId) {
    const select = document.getElementById('planTemplateSelect-' + studentId);
    if (!select) return;
    select.innerHTML = '<option value="">— اختر قالبًا (اختياري) —</option>';
    planTemplatesList = [];
    try {
      const eduTypeId = document.getElementById('planEducationTypeId-' + studentId)?.value || '';
      const halaqaTypeId = getCurrentHalaqaTypeId();
      const params = new URLSearchParams();
      if (eduTypeId) params.set('educationTypeId', eduTypeId);
      if (halaqaTypeId) params.set('halaqaTypeId', halaqaTypeId);
      const resp = await fetch('/api/plan-templates?' + params.toString());
      const data = await resp.json();
      planTemplatesList = data?.data?.templates || [];
      planTemplatesList.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.template_name_ar || t.template_code || `قالب ${t.id}`;
        select.appendChild(opt);
      });
      select.onchange = function () {
        const tmpl = planTemplatesList.find(t => t.id == this.value);
        if (tmpl) applyPlanTemplate(studentId, tmpl);
      };
    } catch (e) {
      console.warn('Failed to load plan templates:', e);
    }
  }

  function applyPlanTemplate(studentId, template) {
    // Inline forms suffix field ids with the student id; fall back to the
    // unsuffixed ids for the legacy modal form.
    const mem = document.getElementById(`planDailyMemorization-${studentId}`) || document.getElementById('planDailyMemorization');
    const rev = document.getElementById(`planRevisionPages-${studentId}`) || document.getElementById('planRevisionPages');
    const side = document.getElementById(`planSideLessons-${studentId}`) || document.getElementById('planSideLessons');
    if (mem && template.daily_memorization_amount != null) mem.value = template.daily_memorization_amount;
    if (rev && template.revision_pages != null) rev.value = template.revision_pages;
    if (side && template.side_lessons != null) side.value = template.side_lessons;

    if (template.memorization_direction_id) {
      const dirBtn = document.querySelector(
        `#memorizationDirectionsContainer-${studentId} .direction-pill[data-value="${template.memorization_direction_id}"]`
      );
      if (dirBtn) dirBtn.click();
    }

    if (template.start_id) {
      const surahSel = document.querySelector(`#planStartSurah-${studentId}`);
      if (surahSel) {
        surahSel.value = template.start_id;
        $(surahSel).trigger('change');
      }
    }

    if (template.start_position) {
      const verseIn = document.querySelector(`#planStartVerse-${studentId}`);
      if (verseIn) verseIn.value = template.start_position;
    }

    if (template.memorization_amount_type_id) {
      const unitSel = document.querySelector(`#planMemorizationAmountType-${studentId}`);
      if (unitSel) unitSel.value = template.memorization_amount_type_id;
    }
  }

  async function loadAmountTypesInline(studentId, initialValue = null) {
    const select = document.querySelector(`#planMemorizationAmountType-${studentId}`);
    if (!select) { console.error('Amount type select not found for student:', studentId); return; }

    if (amountTypesLoadingPromise) await amountTypesLoadingPromise;
    else if (amountTypesList.length === 0) await preloadLookupData();

    if (amountTypesList.length === 0) {
      console.error('No amount types loaded from API');
      return;
    }

    // Filter by the current halaqa's type so Quran halaqat only show Quran-applicable
    // units (page/line/verse...) and Mutoon halaqat only show matn units.
    // Types with null halaqa_type_id are universal and always included.
    const currentHalaqaTypeId = getCurrentHalaqaTypeId();
    let filteredTypes = amountTypesList;
    if (currentHalaqaTypeId) {
      filteredTypes = amountTypesList.filter(t => {
        const typeHalaqaTypeId = t.halaqa_type_id ?? t.halaqaTypeId ?? t.HalaqaTypeId ?? null;
        return typeHalaqaTypeId == null || typeHalaqaTypeId === currentHalaqaTypeId;
      });
      if (filteredTypes.length === 0) {
        console.warn('No amount types match halaqa_type_id', currentHalaqaTypeId, '— falling back to full list');
        filteredTypes = amountTypesList;
      } else {
        console.log('Filtered amount types for halaqa_type_id', currentHalaqaTypeId, '→', filteredTypes.length, 'of', amountTypesList.length);
      }
    }

    // Hide "آية" from the picker and display "مقطع" in place of "مقطعة".
    // These are UI-only tweaks — the underlying API ids are unchanged.
    filteredTypes = filteredTypes.filter(t => {
      const nameAr = t.type_name_ar || t.typeNameAr || t.TypeNameAr || '';
      return nameAr !== 'آية' /* آية */ && nameAr !== 'اية' /* اية */;
    });

    select.innerHTML = '<option value="">-- اختر الوحدة --</option>';
    filteredTypes.forEach(type => {
      const option = document.createElement('option');
      // Handle both snake_case and camelCase from API
      const typeId = type.id ?? type.Id;
      const typeNameAr = type.type_name_ar || type.typeNameAr || type.TypeNameAr;
      const typeNameEn = type.type_name_en || type.typeNameEn || type.TypeNameEn;
      const typeCode = type.type_code || type.typeCode || type.TypeCode;
      option.value = typeId;
      let label = typeNameAr || typeNameEn || typeCode || typeId;
      if (label === 'مقطعة' /* مقطعة */) label = 'مقطع' /* مقطع */;
      option.textContent = label;
      select.appendChild(option);
    });

    // Default unit: "lines" (أسطر) for Quran halaqat, "pages" (صفحات) for Mutoon halaqat.
    const wantsPages = currentHalaqaTypeId === 2;
    const preferredType = filteredTypes.find(t => {
      const code = (t.type_code || t.typeCode || t.TypeCode || '').toLowerCase();
      const nameEn = (t.type_name_en || t.typeNameEn || t.TypeNameEn || '').toLowerCase();
      const nameAr = t.type_name_ar || t.typeNameAr || t.TypeNameAr || '';
      if (wantsPages) {
        return code.includes('page') || nameEn.includes('page') ||
               nameAr.includes('\u0635\u0641\u062D\u0629') /* صفحة */ ||
               nameAr.includes('\u0635\u0641\u062D\u0627\u062A') /* صفحات */;
      }
      return code.includes('line') || nameEn.includes('line') ||
             nameAr.includes('\u0633\u0637\u0631') /* سطر */ ||
             nameAr.includes('\u0623\u0633\u0637\u0631') /* أسطر */;
    });
    const resolvedDefaultId = preferredType
      ? (preferredType.id ?? preferredType.Id)
      : (filteredTypes[0] && (filteredTypes[0].id ?? filteredTypes[0].Id));

    // Stash on the element so handleInlineFormSubmit / handleEditFormSubmit can use a
    // halaqa-type-correct fallback instead of a hardcoded `|| 1`.
    if (resolvedDefaultId != null) {
      select.dataset.defaultTypeId = String(resolvedDefaultId);
    }

    if (initialValue) {
      select.value = initialValue;
    } else if (resolvedDefaultId != null) {
      select.value = resolvedDefaultId;
    }
    console.log('Amount type select populated:',
                'halaqa_type=', currentHalaqaTypeId,
                'wants=', wantsPages ? 'pages' : 'lines',
                'defaultId=', resolvedDefaultId,
                'selected=', select.value);
  }

  function setupPlanTypePillHandlers(studentId) {
    // Look for both create form and edit form
    const formClone = document.querySelector(`#inlineCreatePlanForm-${studentId}`) ||
                      document.querySelector(`#editPlanForm-${studentId}`);
    if (!formClone) return;

    // Scope strictly to pills inside the plan-type group — the form also
    // contains a memorization-direction pill-group that reuses the same
    // .plan-type-pill class; without scoping, clicking one group clears
    // the active state on the other.
    const hiddenInput = formClone.querySelector('input[name="IsPrimary"]');
    const planTypeInput = hiddenInput && hiddenInput.id;
    const group = planTypeInput
      ? formClone.querySelector(`#${planTypeInput}`)?.previousElementSibling
      : null;
    const pillGroup = (group && group.classList.contains('plan-type-pill-group'))
      ? group
      : formClone.querySelector('.plan-type-pill-group:not([id^="memorizationDirectionsContainer"])');
    if (!pillGroup) return;
    const pills = pillGroup.querySelectorAll('.plan-type-pill');

    pills.forEach(pill => {
      pill.addEventListener('click', function () {
        pills.forEach(p => {
          p.classList.remove('active');
          p.setAttribute('aria-pressed', 'false');
        });
        this.classList.add('active');
        this.setAttribute('aria-pressed', 'true');
        if (hiddenInput) {
          hiddenInput.value = this.dataset.value;
        }
      });
    });
  }

  function setupSubmissionDaysToggle(studentId) {
    const formClone = document.querySelector(`#inlineCreatePlanForm-${studentId}`);
    if (!formClone) return;

    const toggleBtn = formClone.querySelector('[id*="planDaysToggleBtn"]');
    const selector = formClone.querySelector('[id*="planDaysSelector"]');
    const daysText = formClone.querySelector('[id*="planDaysText"]');

    if (!toggleBtn || !selector || !daysText) return;

    // Function to update days text based on selection
    function updateDaysText() {
      const checkboxes = selector.querySelectorAll('input[type="checkbox"]:checked');
      const selectedDays = Array.from(checkboxes).map(cb => cb.value);

      if (selectedDays.length === 0) {
        daysText.textContent = 'لم يتم تحديد أيام';
      } else if (selectedDays.length === 7) {
        daysText.textContent = 'جميع أيام الأسبوع';
      } else if (
        selectedDays.length === 5 &&
        selectedDays.includes('الأحد') &&
        selectedDays.includes('الاثنين') &&
        selectedDays.includes('الثلاثاء') &&
        selectedDays.includes('الأربعاء') &&
        selectedDays.includes('الخميس')
      ) {
        daysText.textContent = 'خمسة أيام في الأسبوع (من الأحد إلى الخميس)';
      } else {
        daysText.textContent = selectedDays.join(' - ');
      }
    }

    // Add change event listeners to all checkboxes for real-time update
    const checkboxes = selector.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', updateDaysText);
    });

    toggleBtn.addEventListener('click', function (e) {
      e.preventDefault();
      const btnText = this.textContent.trim();

      if (btnText === 'تعديل') {
        selector.style.setProperty('display', 'grid', 'important');
        this.textContent = 'إلغاء';
      } else {
        selector.style.setProperty('display', 'none', 'important');
        this.textContent = 'تعديل';
        updateDaysText();
      }
    });
  }

  async function handleInlineFormSubmit(event, studentId) {
    const form = event.target;
    const formData = new FormData(form);

    // Activity-subset rule: a plan can include any combination of memorization
    // / revision / side-lessons, but at least one must be > 0. The three
    // amount inputs allow 0 to omit the activity from the plan.
    const dailyMem = parseFloat(formData.get('DailyMemorizationPages')) || 0;
    const dailyRev = parseFloat(formData.get('DailyRevisionPages')) || 0;
    const compLessons = parseFloat(formData.get('ComputerLessons')) || 0;
    if (dailyMem <= 0 && dailyRev <= 0 && compLessons <= 0) {
      event.preventDefault?.();
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          title: 'حقل مطلوب',
          text: 'يجب تحديد قيمة واحدة على الأقل من: مقدار الحفظ، صفحات المراجعة، أو جنب الدرس',
          icon: 'warning',
          confirmButtonText: 'حسناً',
          customClass: { popup: 'swal2-border-radius', confirmButton: 'btn btn-primary' },
          buttonsStyling: false
        });
      } else {
        alert('يجب تحديد قيمة واحدة على الأقل من: مقدار الحفظ، صفحات المراجعة، أو جنب الدرس');
      }
      return;
    }

    // Memorization and side lessons must be whole numbers; revision may be fractional.
    if (!validateDailyTargetGranularity(dailyMem, compLessons)) {
      event.preventDefault?.();
      return;
    }

    // A start point is required. Without this guard a missing/cleared surah-or-lesson
    // selection (e.g. after switching the التلقين book type, which resets the dropdown)
    // sends a null start_id that the API silently defaults to surah 1 (الفاتحة) — so a
    // قاعدة plan gets saved as a Quran الفاتحة plan. Block instead of defaulting.
    const startIdSelected = parseInt(formData.get('StartSurahId'), 10);
    if (!(startIdSelected > 0)) {
      event.preventDefault?.();
      const msg = isTalqeenHalaqa() ? 'يرجى اختيار الدرس قبل حفظ الخطة' : 'يرجى اختيار السورة قبل حفظ الخطة';
      if (typeof Swal !== 'undefined') {
        Swal.fire({ title: 'حقل مطلوب', text: msg, icon: 'warning', confirmButtonText: 'حسناً',
          customClass: { popup: 'swal2-border-radius', confirmButton: 'btn btn-primary' }, buttonsStyling: false });
      } else { alert(msg); }
      return;
    }

    var submissionDays = [];
    formData.getAll('SubmissionDays').forEach(day => submissionDays.push(day));

    var mapStdEduPeriodId = parseInt(formData.get('MapStdEduPeriodId'));
    var halaqaTypeId = parseInt(formData.get('HalaqaTypeId'));
    const amountSelectEl = form.querySelector('select[name="MemorizationAmountTypeId"]');
    const memorizationAmountTypeId = parseInt(amountSelectEl?.value)
      || parseInt(amountSelectEl?.dataset?.defaultTypeId)
      || null;
    // For Mutoon plans the Razor form renders a Book dropdown (name=MutoonBookId);
    // its value becomes book_id on the request. Quran plans have no such field,
    // so book_id stays 0 (the API's Quran sentinel).
    const mutoonBookIdRaw = formData.get('MutoonBookId');
    const bookId = mutoonBookIdRaw ? (parseInt(mutoonBookIdRaw) || 0) : 0;
    // Surah-table book type: 1 = Quran, 2 = المدنية. Only التلقين halaqat render the
    // #planBookType picker; every other plan is Quran (1). The API validates start_id
    // against this — an المدنية surah id (132+) falls outside Quran's 1–114 range, so
    // book_type_id must be sent so the API validates against the right book.
    const bookTypeSelect = form.querySelector('select[id*="planBookType"]');
    const bookTypeId = parseInt(bookTypeSelect?.value, 10) || 1;
    var planData = {
      student_id: formData.get('StudentId'),
      education_type_id: parseInt(formData.get('EducationTypeId')),
      halaqa_type_id: halaqaTypeId,
      halaqa_sec_id: parseInt(formData.get('HalaqaSecId')),
      teacher_id: formData.get('TeacherId'),
      memorization_direction_id: parseInt(formData.get('MemorizationDirectionId')),
      memorization_amount_type_id: memorizationAmountTypeId,
      book_id: bookId,
      book_type_id: bookTypeId,
      start_id: startIdSelected,
      start_position: parseInt(formData.get('StartVerseNumber')),
      // Subset-allowed: each value may be 0 to omit the activity. The "at
      // least one > 0" rule was already enforced above.
      daily_memorization_amount: dailyMem,
      revision_pages: dailyRev,
      side_lessons: compLessons,
      submission_days: submissionDays,
      status_id: parseInt(formData.get('StatusId')),
      is_primary: formData.get('IsPrimary') === 'true'
    };
    // Only include MAP_STD_Edu_Period_id if it has a valid value (not 0 or NaN)
    if (mapStdEduPeriodId && mapStdEduPeriodId > 0) {
      planData.MAP_STD_Edu_Period_id = mapStdEduPeriodId;
    }
    // Include memorization_amount_type_id for both Quran and Mutoon
    const amountTypeId = formData.get('MemorizationAmountTypeId');
    if (amountTypeId) {
      planData.memorization_amount_type_id = parseInt(amountTypeId);
    }

    console.log('Inline form - Plan data to submit:', planData);

    // Show a loading overlay alongside the form (not by swapping the
    // wrapper's innerHTML — that would destroy the form's submit listener,
    // and the next attempt would post natively and redirect away on error).
    const collapseElement = document.getElementById('plan-details-' + studentId);
    const noPlanWrapper = collapseElement?.querySelector('.no-plan-wrapper');
    let overlayEl = null;
    if (noPlanWrapper) {
      form.style.display = 'none';
      overlayEl = document.createElement('div');
      overlayEl.className = 'plan-create-overlay text-center py-5';
      overlayEl.innerHTML = `
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">جاري التحميل...</span>
        </div>
        <p class="text-muted mt-3">جاري إنشاء الخطة...</p>
      `;
      noPlanWrapper.appendChild(overlayEl);
    }
    const restoreForm = () => {
      if (overlayEl && overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
      overlayEl = null;
      if (form) form.style.display = '';
    };

    try {
      var response = await fetch('/api/student-plan/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        let apiMessage = null;
        try {
          const parsed = JSON.parse(errorText);
          apiMessage = parsed.message || (parsed.errors && JSON.stringify(parsed.errors));
        } catch (_) { /* not JSON */ }
        throw new Error(apiMessage || `HTTP ${response.status}: ${response.statusText}`);
      }

      var result = await response.json();
      console.log('API Result:', result);

      if (result.success) {
        Swal.fire({
          icon: 'success',
          title: 'تم بنجاح',
          html: '<p style="margin: 0;">تم إنشاء الخطة بنجاح</p>',
          confirmButtonText: 'حسناً',
          customClass: {
            popup: 'swal2-border-radius',
            confirmButton: 'btn btn-success',
            htmlContainer: 'swal2-html-container-custom'
          },
          buttonsStyling: false,
          iconColor: '#28c76f'
        }).then(() => {
          // Optimistic update: mark the student as having a plan immediately
          // so the badge shows correctly even if the API reload returns stale data.
          const minimalPlan = {
            plan_id: 0,
            memorization_direction_name: '-',
            start_sura_name: '-',
            start_ayah: planData.start_position || 0,
            daily_memorization_amount: planData.daily_memorization_amount || 0,
            revision_pages: planData.revision_pages || 0,
            side_lessons: planData.side_lessons || 0,
            status_id: planData.status_id || 1,
            status_name: 'نشطة',
            is_primary: planData.is_primary ?? true,
            map_std_edu_period_id: planData.MAP_STD_Edu_Period_id || 0
          };
          pendingPlanStudents.set(String(studentId), minimalPlan);
          const studentIdx = a.findIndex(s => String(s.student_id) === String(studentId));
          if (studentIdx !== -1) {
            a[studentIdx].has_active_plan = true;
            a[studentIdx].plan_data = minimalPlan;
            a[studentIdx].plans = [minimalPlan];
          }

          // Set filter to "has-plan" to show the newly created plan
          l = 'has-plan';

          // Update filter buttons visually
          document.querySelectorAll('.plan-filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === 'has-plan');
          });

          // Reload from API to get real plan data (names, IDs, etc.).
          // pendingPlanStudents preserves the optimistic state if API is momentarily stale.
          loadStudentsData();
          // The new plan changes the attendance/evaluation tab too — refresh
          // it so it isn't left with stale "no plan" data for this student.
          if (window.refreshAttnEvalStudents) window.refreshAttnEvalStudents();
        });
      } else {
        // Restore form so user can retry — the live form node stays mounted,
        // we just unhide it (its submit listener is preserved).
        restoreForm();
        Swal.fire({
          icon: 'error',
          title: 'خطأ',
          html: `<p style="margin: 0;">${result.message || 'حدث خطأ أثناء إنشاء الخطة. يرجى المحاولة مرة أخرى.'}</p>`,
          confirmButtonText: 'حسناً',
          customClass: {
            popup: 'swal2-border-radius',
            confirmButton: 'btn btn-danger',
            htmlContainer: 'swal2-html-container-custom'
          },
          buttonsStyling: false,
          iconColor: '#ea5455'
        });
      }
    } catch (error) {
      console.error('Error creating plan:', error);
      // Restore form so user can retry — preserve the live form node.
      restoreForm();
      Swal.fire({
        icon: 'error',
        title: 'خطأ',
        html: `<p style="margin: 0;">${(error && error.message) || 'حدث خطأ أثناء إنشاء الخطة. يرجى المحاولة مرة أخرى.'}</p>`,
        confirmButtonText: 'حسناً',
        customClass: {
          popup: 'swal2-border-radius',
          confirmButton: 'btn btn-danger',
          htmlContainer: 'swal2-html-container-custom'
        },
        buttonsStyling: false,
        iconColor: '#ea5455'
      });
    }
  }

  async function loadSurahs() {
    if (surahsList.length === 0) {
      try {
        var response = await fetch('/ManageHalaqa/GetSurahs');
        if (!response.ok) {
          console.error('Surahs API error:', response.status);
          return;
        }
        var data = await response.json();
        console.log('Surahs data:', data);

        // Get all surahs from response - handle both array and nested object structures
        var allSurahs = null;
        if (data && data.data) {
          if (Array.isArray(data.data)) {
            allSurahs = data.data;
          } else if (data.data.surahs && Array.isArray(data.data.surahs)) {
            allSurahs = data.data.surahs;
          } else if (typeof data.data === 'object') {
            // data.data might be an object with numeric keys, convert to array
            allSurahs = Object.values(data.data);
          }
        }

        if (allSurahs && allSurahs.length > 0) {
          // Filter by halaqa type: 1=القرآن, 2=المتون. Keep the full list so the
          // Talqeen book-type picker can re-filter without re-fetching.
          allSurahsList = allSurahs;
          var halaqaTypeId = getCurrentHalaqaTypeId() ?? 1;
          applySurahBookTypeFilter(halaqaTypeId);

          // Populate dropdown with initial order (from البقرة)
          populateSurahDropdown(surahsList, false);
          console.log('Loaded', surahsList.length, 'surahs for book_type_id:', halaqaTypeId);
        } else {
          console.error('Could not find surahs in response:', data);
        }
      } catch (e) {
        console.error('Error loading surahs:', e);
      }
    }
  }

  function populateSurahDropdown(surahs, reverse) {
    var select = document.getElementById('planStartSurah');
    if (!select) return;

    // Destroy Select2 if already initialized
    if ($(select).data('select2')) {
      $(select).select2('destroy');
    }

    select.innerHTML = '<option value="">-- اختر السورة --</option>';

    // Sort surahs by surah_id (which represents order in Quran)
    var sortedSurahs = [...surahs].sort((a, b) => {
      return reverse ? b.surah_id - a.surah_id : a.surah_id - b.surah_id;
    });

    sortedSurahs.forEach(surah => {
      var option = document.createElement('option');
      option.value = surah.surah_id;
      option.textContent = surah.surah_name + ' (' + (surah.number_of_verses || 0) + ' ' + (surah.book_type_id === 2 ? 'مقطع' : 'آية') + ')';
      option.setAttribute('data-verses', surah.number_of_verses || 0);
      select.appendChild(option);
    });

    // Initialize Select2 with search
    $(select).select2({
      placeholder: '-- اختر السورة --',
      allowClear: true,
      dir: 'rtl',
      language: {
        noResults: function () {
          return 'لا توجد نتائج';
        },
        searching: function () {
          return 'جاري البحث...';
        }
      }
    });
  }

  async function loadMemorizationDirections() {
    if (directionsList.length === 0) {
      try {
        var response = await fetch('/ManageHalaqa/GetMemorizationDirections');
        if (!response.ok) {
          console.error('Memorization Directions API error:', response.status);
          return;
        }
        var data = await response.json();
        console.log('Memorization Directions data:', data);

        if (data && data.data && data.data.memorization_directions) {
          directionsList = data.data.memorization_directions;
          var container = document.getElementById('memorizationDirectionsContainer');
          if (container) {
            container.innerHTML = '';

            directionsList.forEach((direction, index) => {
              var button = document.createElement('button');
              button.type = 'button';
              button.className = 'plan-type-pill direction-pill';
              button.setAttribute('data-value', direction.id);
              button.setAttribute('aria-pressed', 'false');

              // Set text based on direction ID
              if (direction.id === 1) {
                button.textContent = 'من أول المصحف | البقرة ← الناس';
              } else if (direction.id === 2) {
                button.textContent = 'من آخر المصحف | الناس ← البقرة';
              } else {
                button.textContent = direction.direction_name_ar;
              }

              container.appendChild(button);
            });

            // Add hidden input for form submission
            var hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.name = 'MemorizationDirectionId';
            hiddenInput.id = 'directionInput';
            hiddenInput.required = true;
            container.appendChild(hiddenInput);

            console.log('Loaded', directionsList.length, 'memorization directions');
          }
        }
      } catch (e) {
        console.error('Error loading memorization directions:', e);
      }
    }
  }

  function n() {
    let t = document.getElementById('plansStudentsList');
    if (0 === a.length)
      t.innerHTML = `
        <div class="text-center py-5">
          <i class="ti tabler-users-off" style="font-size: 48px; color: var(--bs-secondary-color);"></i>
          <p class="text-muted mt-3">لا يوجد طلاب في هذه الحلقة</p>
        </div>
      `;
    else {
      let e = a;
      // Apply plan filter
      ('has-plan' === l
        ? (e = a.filter(e => e.has_active_plan))
        : 'no-plan' === l && (e = a.filter(e => !e.has_active_plan)));

      // Apply search filter
      if (searchTermPlans && searchTermPlans.trim() !== '') {
        const term = searchTermPlans.toLowerCase().trim();
        e = e.filter(student => {
          const studentName = student.full_name_official_ar || '';
          return studentName.toLowerCase().includes(term);
        });
      }

      (
        0 === e.length
          ? (t.innerHTML = `
        <div class="text-center py-5">
          <i class="ti tabler-filter-off" style="font-size: 48px; color: var(--bs-secondary-color);"></i>
          <p class="text-muted mt-3">لا توجد نتائج للفلتر المحدد</p>
        </div>
      `)
          : ((t.innerHTML = ''),
            e.forEach(e => {
              e = (e => {
                var t = e.has_active_plan || !1,
                  a = t
                    ? (e.plan_data && e.plan_data.status_id === 2
                        ? { icon: 'tabler-player-pause', class: 'bg-label-warning', label: 'موقوفة' }
                        : { icon: 'tabler-clipboard-check', class: 'bg-label-primary', label: 'خطة' })
                    : { icon: 'tabler-clipboard-off', class: 'bg-label-secondary', label: 'بدون' },
                  l = document.createElement('div'),
                  n =
                    ((l.className = 'plans-student-card'),
                    (l.dataset.studentId = e.student_id),
                    (l.dataset.hasPlan = t),
                    document.createElement('div')),
                  s =
                    ((n.className = 'card-main-row'),
                    (n.dataset.bsToggle = 'collapse'),
                    (n.dataset.bsTarget = '#plan-details-' + e.student_id),
                    n.setAttribute('aria-expanded', 'false'),
                    n.setAttribute('role', 'button'),
                    n.setAttribute('data-bs-parent', '#plansStudentsList'),
                    document.createElement('i')),
                  i = ((s.className = 'ti tabler-chevron-down toggle-chevron'), document.createElement('div')),
                  d =
                    ((i.className = 'student-name flex-grow-1'),
                    (i.textContent = e.full_name_official_ar || 'غير محدد'),
                    document.createElement('div'));
                ((d.className = 'student-plan-badge ' + a.class),
                  (d.innerHTML = `
      <i class="ti ${a.icon}"></i>
      <span>${a.label}</span>
    `),
                  n.appendChild(s),
                  n.appendChild(i),
                  n.appendChild(d),
                  ((a = document.createElement('div')).className = 'collapse'),
                  (a.id = 'plan-details-' + e.student_id),
                  ((s = document.createElement('div')).className = 'student-details-wrapper'));
                let c = document.createElement('div');
                return (
                  (c.className = 'student-details-grid'),
                  [
                    { icon: 'tabler-id-badge-2', label: 'رقم الطالب', value: e.student_id || e.Student_ID || '---' },
                    { icon: 'tabler-user', label: 'رقم المستخدم', value: e.user_id || e.User_ID || '---' },
                    { icon: 'tabler-phone', label: 'رقم الجوال', value: e.mobile_no || e.Mobile_No || '---' },
                    {
                      icon: 'tabler-phone',
                      label: 'جوال ولي الأمر',
                      value: e.guardian_comma_sep_mobile || e.Guardian_Comma_Sep_Mobile || '---'
                    }
                  ].forEach(e => {
                    var t = document.createElement('div');
                    ((t.className = 'detail-item'),
                      (t.innerHTML = `
        <div class="detail-text">
          <small class="text-muted">${e.label}</small>
          <div class="fw-medium">${e.value}</div>
        </div>
        <i class="ti ${e.icon}"></i>
      `),
                      c.appendChild(t));
                  }),
                  s.appendChild(c),
                  a.appendChild(s),
                  t && (e.plans && e.plans.length || e.plan_data)
                    ? (() => {
                        // One or more active/paused plans. Render a view/edit action row
                        // per plan. When a student has more than one, prefix each row with
                        // its plan id ("خطة #N") — mirroring the attendance/evaluation tab —
                        // so the teacher can tell duplicate plans apart.
                        const plansArr = e.plans && e.plans.length ? e.plans : [e.plan_data];
                        const multi = plansArr.length > 1;
                        plansArr.forEach((pd, idx) => {
                          const isLast = idx === plansArr.length - 1;
                          const row = document.createElement('div');
                          row.className = 'plan-actions-row';
                          if (multi) row.style.cssText = 'flex-wrap:wrap;margin-bottom:10px;';
                          const pausedBadge =
                            pd.status_id === 2 ? ' <span class="badge bg-label-warning">موقوفة</span>' : '';
                          const idTag = multi
                            ? `<div class="plan-id-tag fw-bold w-100 mb-1">خطة #${pd.plan_id}${pausedBadge}</div>`
                            : '';
                          // The "add another plan" button is rendered once per student (beside
                          // the last plan's edit button). It opens the SAME inline create form
                          // used for no-plan students (window.showCreatePlanFormInline) right
                          // here on the activities page — NOT the legacy /StudentPlan/Create
                          // wizard. The teacher picks "خطة فرعية" to add a secondary plan
                          // alongside the existing one(s). showCreatePlanFormInline creates a
                          // wrapper on the fly for existing-plan students.
                          const addPlanBtn = isLast
                            ? `
        <button type="button" class="btn btn-sm btn-outline-secondary" onclick='window.showCreatePlanFormInline("${e.student_id}", "${(e.full_name_official_ar || '').replace(/"/g, '&quot;')}", ${JSON.stringify(e).replace(/'/g, '&apos;')})' style="border-radius: 8px;">
          <i class="ti tabler-plus me-1"></i>
          اضافة خطة اضافية
        </button>`
                            : '';
                          row.innerHTML = pd.plan_id > 0 ? `
        ${idTag}
        <button type="button" class="btn btn-sm btn-outline-primary" onclick="window.showViewPlanFormInline('${e.student_id}', '${pd.plan_id}')" style="border-radius: 8px;">
          <i class="ti tabler-eye me-1"></i>
          عرض الخطة
        </button>
        <button type="button" class="btn btn-sm btn-outline-secondary" onclick="window.showEditPlanFormInline('${e.student_id}', ${pd.plan_id})" style="border-radius: 8px;">
          <i class="ti tabler-edit me-1"></i>
          تعديل الخطة
        </button>
        ${addPlanBtn}
      ` : `
        ${idTag}
        <span class="text-muted" style="font-size: 0.875rem;"><i class="ti tabler-loader-2 me-1"></i>جاري تحديث البيانات...</span>
      `;
                          a.appendChild(row);
                        });
                      })()
                    : (((d = document.createElement('div')).className = 'no-plan-wrapper'),
                      (d.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 8px;">
            <i class="ti tabler-clipboard-off" style="font-size: 2rem; color: var(--bs-secondary);"></i>
          </div>
          <p style="color: var(--bs-secondary-color); margin-bottom: 12px; font-size: 0.9375rem;">لا توجد خطة لهذا الطالب</p>
          <button type="button" class="btn btn-primary btn-sm" onclick='window.showCreatePlanFormInline("${e.student_id}", "${e.full_name_official_ar || ''}", ${JSON.stringify(e).replace(/'/g, '&apos;')})' style="border-radius: 8px;">
            <i class="ti tabler-plus me-1"></i>
            إنشاء خطة جديدة
          </button>
        </div>
      `),
                      a.appendChild(d)),
                  l.appendChild(n),
                  l.appendChild(a),
                  // Add click event listener for accordion behavior
                  n.addEventListener('click', function () {
                    const targetId = this.dataset.bsTarget;
                    const targetCollapse = document.querySelector(targetId);
                    const cardElement = this.closest('.plans-student-card');

                    if (targetCollapse) {
                      const isExpanded = targetCollapse.classList.contains('show');

                      // Remove expanded class from all cards
                      document.querySelectorAll('.plans-student-card.expanded').forEach(card => {
                        card.classList.remove('expanded');
                      });

                      // Close all other open collapses
                      document.querySelectorAll('#plansStudentsList .collapse.show').forEach(openCollapse => {
                        if (openCollapse !== targetCollapse) {
                          const collapseInstance = bootstrap.Collapse.getInstance(openCollapse);
                          if (collapseInstance) {
                            collapseInstance.hide();
                          }
                        }
                      });

                      // Add expanded class to current card if it's being opened
                      if (!isExpanded && cardElement) {
                        cardElement.classList.add('expanded');
                      }
                    }
                  }),
                  l
                );
              })(e);
              t.appendChild(e);
            })));
    }
  }
  function t() {
    var e = document.getElementById('toggleExpandCollapsePlansBtn'),
      t = e.classList.contains('active'),
      a = document.getElementById('togglePlansBtnText');
    t
      ? (document.querySelectorAll('#plansStudentsList .collapse').forEach(e => {
          e = bootstrap.Collapse.getInstance(e);
          e && e.hide();
        }),
        e.classList.remove('active'),
        (a.textContent = 'إظهار الكل'))
      : (document.querySelectorAll('#plansStudentsList .collapse').forEach(e => {
          new bootstrap.Collapse(e, { toggle: !1 }).show();
        }),
        e.classList.add('active'),
        (a.textContent = 'إخفاء الكل'));
  }
  function e() {
    o = (e = document.querySelector('[data-halaqa-id]')) ? parseInt(e.dataset.halaqaId, 10) : null;

    // Verse validation on surah change
    document.getElementById('planStartSurah')?.addEventListener('change', function () {
      var selectedOption = this.options[this.selectedIndex];
      var maxVerses = parseInt(selectedOption.getAttribute('data-verses')) || 0;
      var verseInput = document.getElementById('planStartVerse');
      var verseHint = document.getElementById('verseHint');

      if (maxVerses > 0) {
        verseInput.setAttribute('max', maxVerses);
        verseHint.textContent = 'الآية (1-' + maxVerses + ')';
        verseInput.value = Math.min(parseInt(verseInput.value) || 1, maxVerses);
      } else {
        verseInput.removeAttribute('max');
        verseHint.textContent = '';
      }
    });

    // Verse validation on input
    document.getElementById('planStartVerse')?.addEventListener('input', function () {
      var maxVerses = parseInt(this.getAttribute('max')) || 0;
      var currentValue = parseInt(this.value) || 0;
      var verseError = document.getElementById('verseError');

      if (maxVerses > 0 && currentValue > maxVerses) {
        this.classList.add('is-invalid');
        verseError.textContent = 'رقم الآية يتجاوز عدد آيات السورة (' + maxVerses + ' آية)';
        verseError.style.display = 'block';
      } else if (currentValue < 1) {
        this.classList.add('is-invalid');
        verseError.textContent = 'رقم الآية يجب أن يكون أكبر من 0';
        verseError.style.display = 'block';
      } else {
        this.classList.remove('is-invalid');
        verseError.style.display = 'none';
      }
    });

    // Daily Memorization validation
    document.getElementById('planDailyMemorization')?.addEventListener('input', function () {
      var value = parseFloat(this.value) || 0;
      var error = document.getElementById('memorizationError');

      if (value < 0.5) {
        this.classList.add('is-invalid');
        error.textContent = 'الحد الأدنى للحفظ اليومي هو 0.5 أسطر';
        error.style.display = 'block';
      } else if (value > 30) {
        this.classList.add('is-invalid');
        error.textContent = 'الحد الأقصى للحفظ اليومي هو 30 أسطر';
        error.style.display = 'block';
      } else {
        this.classList.remove('is-invalid');
        error.style.display = 'none';
      }
    });

    // Revision Pages validation
    document.getElementById('planRevisionPages')?.addEventListener('input', function () {
      var value = parseFloat(this.value) || 0;
      var error = document.getElementById('revisionError');

      if (value < 1) {
        this.classList.add('is-invalid');
        error.textContent = 'الحد الأدنى لصفحات المراجعة هو 1 صفحة';
        error.style.display = 'block';
      } else if (value > 150) {
        this.classList.add('is-invalid');
        error.textContent = 'الحد الأقصى لصفحات المراجعة هو 150 صفحة';
        error.style.display = 'block';
      } else {
        this.classList.remove('is-invalid');
        error.style.display = 'none';
      }
    });

    // Side Lessons validation
    document.getElementById('planSideLessons')?.addEventListener('input', function () {
      var value = parseInt(this.value) || 0;
      var error = document.getElementById('lessonsError');

      if (value < 1) {
        this.classList.add('is-invalid');
        error.textContent = 'الحد الأدنى لجنب الدرس هو 1 درس';
        error.style.display = 'block';
      } else if (value > 15) {
        this.classList.add('is-invalid');
        error.textContent = 'الحد الأقصى لجنب الدرس هو 15 درس';
        error.style.display = 'block';
      } else {
        this.classList.remove('is-invalid');
        error.style.display = 'none';
      }
    });

    var e = document.getElementById('plans-tab'),
      e =
        (e &&
          e.addEventListener('shown.bs.tab', function () {
            (console.log('Plans tab shown'),
              0 === a.length &&
                (async () => {
                  if (o) {
                    var t = document.getElementById('plansStudentsList');
                    t.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">جاري التحميل...</span>
        </div>
        <p class="text-muted mt-3">جاري تحميل قائمة الطلاب...</p>
      </div>
    `;
                    try {
                      var response = await fetch('/ManageHalaqa/GetStudentsData?halaqaId=' + o);
                      console.log('Response status:', response.status);
                      var responseText = await response.text();
                      console.log('Response text:', responseText.substring(0, 500));
                      var e = JSON.parse(responseText);
                      if (e.success && e.data) {
                        a = e.data;
                        halaqaData = e.halaqaData;
                        console.log('Plans: Loaded', a.length, 'students');
                        // Preload surahs and directions - await to ensure they're ready before user can edit
                        await preloadLookupData();
                        n();
                      } else {
                        t.innerHTML = `
          <div class="text-center py-5">
            <i class="ti tabler-alert-circle text-danger" style="font-size: 3rem;"></i>
            <p class="text-danger mt-3">${e.message || 'حدث خطأ أثناء تحميل البيانات'}</p>
          </div>
        `;
                      }
                    } catch (e) {
                      (console.error('Error loading students:', e),
                        (t.innerHTML = `
        <div class="text-center py-5">
          <i class="ti tabler-alert-circle text-danger" style="font-size: 3rem;"></i>
          <p class="text-danger mt-3">حدث خطأ أثناء تحميل البيانات: ${e.message}</p>
        </div>
      `));
                    }
                  }
                })());
          }),
        document.querySelectorAll('.plan-filter-btn').forEach(e => {
          e.addEventListener('click', function () {
            var t;
            ((t = this.dataset.filter),
              (l = t),
              document.querySelectorAll('.plan-filter-btn').forEach(e => {
                e.dataset.filter === t ? e.classList.add('active') : e.classList.remove('active');
              }),
              n());
          });
        }),
        document.getElementById('toggleExpandCollapsePlansBtn'));
    e && e.addEventListener('click', t);

    // Manual refresh — re-fetches the students+plans list. Useful after
    // creating/editing plans on the other tab so this tab doesn't show
    // stale data without a full page reload.
    const refreshPlansBtn = document.getElementById('refreshPlansBtn');
    if (refreshPlansBtn) {
      refreshPlansBtn.addEventListener('click', () => loadStudentsData());
    }

    // Search input handler for plans tab
    const plansSearchInput = document.getElementById('plans-search-input');
    if (plansSearchInput) {
      plansSearchInput.addEventListener('input', function () {
        searchTermPlans = this.value;
        n(); // Re-render with search filter
      });
    }
  }
  'loading' === document.readyState ? document.addEventListener('DOMContentLoaded', e) : e();

  // Plan Type Pill Selection Handler (legacy global form only)
  document.addEventListener('click', function (event) {
    if (event.target.classList.contains('plan-type-pill')) {
      // Scope strictly to the plan-type group — direction pills share the
      // same .plan-type-pill class, so we must filter by data-value shape
      // ("true"/"false") and only operate within the same pill-group.
      const val = event.target.dataset.value;
      if (val !== 'true' && val !== 'false') return;
      const group = event.target.closest('.plan-type-pill-group');
      if (!group) return;
      const pills = group.querySelectorAll('.plan-type-pill');
      const hiddenInput = document.getElementById('planTypeInput');

      pills.forEach(pill => {
        pill.classList.remove('active');
        pill.setAttribute('aria-pressed', 'false');
      });
      event.target.classList.add('active');
      event.target.setAttribute('aria-pressed', 'true');

      if (hiddenInput) hiddenInput.value = val;
    }

    // Direction Pill Selection Handler
    if (event.target.classList.contains('direction-pill')) {
      const pills = document.querySelectorAll('.direction-pill');
      const hiddenInput = document.getElementById('directionInput');

      // Remove active state from all pills
      pills.forEach(pill => {
        pill.classList.remove('active');
        pill.setAttribute('aria-pressed', 'false');
      });

      // Add active state to clicked pill
      event.target.classList.add('active');
      event.target.setAttribute('aria-pressed', 'true');

      // Set hidden input value
      hiddenInput.value = event.target.dataset.value;

      // Reorder surahs based on direction
      if (surahsList.length > 0) {
        // direction_id 1 = من البقرة (forward), 2 = من الناس (reverse)
        var isReverse = event.target.dataset.value === '2';
        populateSurahDropdown(surahsList, isReverse);
      }
    }
  });

  // Update days text based on selection
  function updateDaysText() {
    const checkboxes = document.querySelectorAll('input[name="SubmissionDays"]');
    const selectedDays = [];
    const defaultDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

    checkboxes.forEach(cb => {
      if (cb.checked) {
        selectedDays.push(cb.value);
      }
    });

    const textElement = document.getElementById('planDaysText');
    if (!textElement) return;

    const isDefault = selectedDays.length === 5 && defaultDays.every(day => selectedDays.includes(day));

    if (isDefault) {
      textElement.textContent = 'خمسة أيام في الأسبوع (من الأحد إلى الخميس)';
    } else if (selectedDays.length > 0) {
      textElement.textContent = selectedDays.join(' - ');
    } else {
      textElement.textContent = 'لم يتم اختيار أيام';
    }
  }

  // Submission Days Toggle Handler
  const toggleBtn = document.getElementById('planDaysToggleBtn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function (e) {
      e.preventDefault();
      const selector = document.getElementById('planDaysSelector');
      const btnText = this.textContent.trim();

      if (btnText === 'تعديل') {
        // Show checkboxes, change button to إغلاق
        if (selector) selector.style.display = 'flex';
        this.textContent = 'إغلاق';
      } else {
        // Hide checkboxes, update text, change button to تعديل
        if (selector) selector.style.display = 'none';
        updateDaysText();
        this.textContent = 'تعديل';
      }
    });
  }

  // Listen for checkbox changes
  document.querySelectorAll('input[name="SubmissionDays"]').forEach(checkbox => {
    checkbox.addEventListener('change', updateDaysText);
  });
})();
