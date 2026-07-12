(()=>{let i=[];function t(){var t=document.querySelector("[data-halaqa-id]");if(t=t&&t.dataset.halaqaId){(async t=>{try{console.log("Fetching students for halaqa:",t);var e=await fetch("/ManageHalaqa/GetStudentsData?halaqaId="+t),a=(console.log("Response status:",e.status),await e.json());console.log("API Response:",a),a.success&&a.data?(i=a.data,console.log("Students loaded:",i.length,"students"),(s=document.getElementById("studentsListContainer"))&&(0===i.length?s.innerHTML=`
        <div class="text-center py-5">
          <i class="ti tabler-users-off" style="font-size: 48px; color: var(--bs-secondary-color);"></i>
          <p class="text-muted mt-3">لا يوجد طلاب في هذه الحلقة</p>
        </div>
      `:(l=i.map(t=>{return e=t.student_id,o=t.full_name_official_ar||"غير محدد",a=t.full_name_official_en||"---",l=t.student_id||"---",s=t.email_id||"---",i=t.mobile_no||"---",n=t.guardian_comma_sep_mobile||"---",d=t.has_active_plan||!1,t=t.plan_data||null,`
      <div class="student-card" data-student-id="${e}">
        <div class="card-main-row" data-bs-toggle="collapse" data-bs-target="#details-${e}" aria-expanded="false">
          <i class="ti tabler-chevron-down toggle-chevron"></i>
          <div class="student-name">${o}</div>
          <div class="student-plan-badge ${(o=d?{icon:"tabler-clipboard-check",class:"has-plan bg-label-primary",label:"خطة فعالة",title:"لديه خطة نشطة"}:{icon:"tabler-clipboard-off",class:"no-plan bg-label-secondary",label:"بدون خطة",title:"لا توجد خطة"}).class}">
            <i class="ti ${o.icon}"></i>
            <span>${o.label}</span>
          </div>
        </div>

        <div class="collapse" id="details-${e}">
          <!-- Student Details Row -->
          <div class="student-details-wrapper">
            <div class="student-details-grid">
              <div class="detail-item">
                <div class="detail-text">
                  <small class="text-muted">رقم الطالب</small>
                  <div class="fw-medium">${l}</div>
                </div>
                <i class="ti tabler-id-badge-2"></i>
              </div>
              <div class="detail-item">
                <div class="detail-text">
                  <small class="text-muted">رقم المستخدم</small>
                  <div class="fw-medium">${e}</div>
                </div>
                <i class="ti tabler-user"></i>
              </div>
              <div class="detail-item">
                <div class="detail-text">
                  <small class="text-muted">الاسم بالإنجليزي</small>
                  <div class="fw-medium">${a}</div>
                </div>
                <i class="ti tabler-language"></i>
              </div>
              <div class="detail-item">
                <div class="detail-text">
                  <small class="text-muted">البريد الإلكتروني</small>
                  <div class="fw-medium">${s}</div>
                </div>
                <i class="ti tabler-mail"></i>
              </div>
              <div class="detail-item">
                <div class="detail-text">
                  <small class="text-muted">رقم الجوال</small>
                  <div class="fw-medium">${i}</div>
                </div>
                <i class="ti tabler-phone"></i>
              </div>
              <div class="detail-item">
                <div class="detail-text">
                  <small class="text-muted">جوال ولي الأمر</small>
                  <div class="fw-medium">${n}</div>
                </div>
                <i class="ti tabler-phone"></i>
              </div>
            </div>
          </div>

          ${d&&t?`
          <!-- Plan Data Wrapper -->
          <div class="plan-data-wrapper">
            <!-- Tabs and Actions Row -->
            <div class="plan-header-row">
              <!-- Plan Type Tabs -->
              <div class="plan-type-tabs">
                <button class="plan-type-tab ${t.is_primary?"active":""}">
                  <i class="ti tabler-star"></i>
                  <span>خطة أساسية</span>
                </button>
                <button class="plan-type-tab ${t.is_primary?"":"active"}">
                  <i class="ti tabler-layers-difference"></i>
                  <span>خطة فرعية</span>
                </button>
              </div>

              <!-- Plan Actions -->
              <div class="plan-actions-inline">
                <button type="button" class="btn btn-sm btn-link text-primary" onclick="event.preventDefault(); createStudentPlan('${e}');">
                  <i class="ti tabler-plus me-1"></i>
                  إنشاء خطة جديدة
                </button>
                <button type="button" class="btn btn-sm btn-outline-primary" onclick="event.preventDefault(); viewStudentPlan(${t.plan_id});">
                  <i class="ti tabler-eye me-1"></i>
                  عرض الخطط
                </button>
                <button type="button" class="btn btn-sm btn-outline-secondary" onclick="event.preventDefault(); editStudentPlan(${t.plan_id});">
                  <i class="ti tabler-edit me-1"></i>
                  تعديل الخطة
                </button>
              </div>
            </div>

            <!-- Plan Information -->
            <div class="student-plan-info">
              <div class="plan-info-grid">
                <div class="plan-info-item">
                  <i class="ti tabler-compass me-2 text-primary"></i>
                  <div class="plan-info-content">
                    <small class="text-muted">اتجاه الحفظ</small>
                    <div class="fw-medium">${o=t.memorization_direction_name,o?(o=o.trim()).includes("أول")||o.includes("البقرة")||o.toLowerCase().includes("beginning")?"من أول المصحف":o.includes("آخر")||o.includes("الناس")||o.toLowerCase().includes("end")?"من آخر المصحف":o:"---"}</div>
                  </div>
                </div>
                <div class="plan-info-item">
                  <i class="ti tabler-flag me-2 text-primary"></i>
                  <div class="plan-info-content">
                    <small class="text-muted">نقطة البداية</small>
                    <div class="fw-medium">${t.start_sura_name||"---"} - آية ${t.start_ayah||0}</div>
                  </div>
                </div>
                <div class="plan-info-item">
                  <i class="ti tabler-circle-check me-2 text-primary"></i>
                  <div class="plan-info-content">
                    <small class="text-muted">حالة الخطة</small>
                    <div class="fw-medium">${t.status_name||"---"}</div>
                  </div>
                </div>
              </div>

            <div class="plan-daily-targets">
              <div class="daily-targets-header">الأهداف اليومية</div>
              <div class="daily-targets-grid">
                <div class="target-item">
                  <div class="target-item-content">
                    <small>الحفظ اليومي</small>
                    <div class="fw-bold">${t.daily_memorization_amount||0} صفحة</div>
                  </div>
                  <i class="ti tabler-book-2"></i>
                </div>
                <div class="target-item">
                  <div class="target-item-content">
                    <small>صفحات المراجعة</small>
                    <div class="fw-bold">${t.revision_pages||0} صفحة</div>
                  </div>
                  <i class="ti tabler-refresh"></i>
                </div>
                <div class="target-item">
                  <div class="target-item-content">
                    <small>الدروس الجانبية</small>
                    <div class="fw-bold">${t.side_lessons||0}</div>
                  </div>
                  <i class="ti tabler-calendar"></i>
                </div>
              </div>
              </div>
            </div>
          </div>
          `:`
          <!-- No Plan Message -->
          <div class="no-plan-message">
            <div style="text-align: center; padding: 20px;">
              <i class="icon-base ti tabler-clipboard-off" style="font-size: 48px; color: var(--bs-secondary); margin-bottom: 12px;"></i>
              <p style="color: var(--bs-secondary-color); margin-bottom: 16px;">لا توجد خطة لهذا الطالب</p>
              <button type="button" class="btn btn-primary btn-sm create-plan-btn" data-student-id="${e}">
                <i class="icon-base ti tabler-plus me-1"></i>
                إنشاء خطة جديدة
              </button>
            </div>
          </div>
          `}
        </div>
      </div>
    `;var e,a,l,s,i,n,d,o}).join(""),s.innerHTML=l))):(console.error("API returned error:",a.message),n("فشل تحميل بيانات الطلاب: "+(a.message||"خطأ غير معروف")))}catch(t){console.error("Error loading students:",t),n("حدث خطأ أثناء تحميل بيانات الطلاب")}var l,s})(t);{let e=document.getElementById("toggleExpandCollapseBtn");if(e){let t=!1;e.addEventListener("click",function(){(t=!t)?(document.querySelectorAll(".student-card .collapse").forEach(t=>{(bootstrap.Collapse.getInstance(t)||new bootstrap.Collapse(t,{toggle:!1})).show()}),e.classList.add("active"),document.getElementById("toggleBtnText").textContent="طي الكل"):(document.querySelectorAll(".student-card .collapse").forEach(t=>{(bootstrap.Collapse.getInstance(t)||new bootstrap.Collapse(t,{toggle:!1})).hide()}),e.classList.remove("active"),document.getElementById("toggleBtnText").textContent="توسيع الكل")})}}{let t=document.getElementById("studentSearchInput"),e=document.querySelectorAll(".plan-filter-btn"),a="all",l="";t&&t.addEventListener("input",function(t){l=t.target.value.toLowerCase().trim(),s(a,l)}),e.forEach(t=>{t.addEventListener("click",function(){e.forEach(t=>t.classList.remove("active")),this.classList.add("active"),s(a=this.dataset.filter,l)})})}}}function s(s,i){document.querySelectorAll(".student-card").forEach(t=>{let e=t.querySelector(".student-name")?.textContent.toLowerCase()||"",a=t.querySelector(".student-plan-badge")?.classList.contains("has-plan")||!1,l=!0;i&&!e.includes(i)&&(l=!1),(l=!("with-plan"===s&&!a||"no-plan"===s&&a)&&l)?t.style.display="":t.style.display="none"})}function n(t){var e=document.getElementById("studentsListContainer");e&&(e.innerHTML=`
        <div class="alert alert-danger" role="alert">
          <i class="ti tabler-alert-circle me-2"></i>
          ${t}
        </div>
      `)}window.viewStudentPlan=function(t){console.log("View plan:",t),window.location.href="/plans/"+t},window.editStudentPlan=function(t){console.log("Edit plan:",t),window.location.href=`/plans/${t}/edit`},window.createStudentPlan=function(t){console.log("Create plan for student:",t),window.location.href="/plans/new?studentId="+t},window.createStudentPlan=function(t){console.log("createStudentPlan called with studentId:",t);var e=document.querySelector("[data-halaqa-id]"),e=(console.log("Container found:",e),e?e.dataset.halaqaId:"");console.log("Halaqa ID:",e),e?(t=`/StudentPlan/Create?studentId=${t}&halaqaSecId=`+e,console.log("Navigating to:",t),window.location.href=t):console.error("Halaqa ID not found")},window.viewStudentPlan=function(t){window.location.href="/StudentPlan/View?id="+t},window.editStudentPlan=function(t){window.location.href="/StudentPlan/Edit?id="+t},document.addEventListener("click",function(t){var e;t.target.closest(".create-plan-btn")&&(t.preventDefault(),t.stopPropagation(),t=t.target.closest(".create-plan-btn").dataset.studentId,e=(e=document.querySelector("[data-halaqa-id]"))?e.dataset.halaqaId:"",console.log("Create plan clicked - StudentId:",t,"HalaqaId:",e),t&&e?(t=`/StudentPlan/Create?studentId=${t}&halaqaSecId=`+e,console.log("Navigating to:",t),window.location.href=t):console.error("Missing studentId or halaqaId"))}),"loading"===document.readyState?document.addEventListener("DOMContentLoaded",t):t()})();