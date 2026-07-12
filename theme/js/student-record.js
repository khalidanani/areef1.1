// Student Record Page - Halaqa Selection and Student Loading
(() => {
  let selectedHalaqaId = null;
  let allStudents = []; // Store all students for filtering
  const halaqaStudentsCache = {}; // keyed by halaqaId; avoids re-fetching on re-selection

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', function () {
    console.log('Student Record page initialized');

    // Add click handlers to halaqa cards
    const halaqaCards = document.querySelectorAll('.halaqa-card');
    halaqaCards.forEach(card => {
      card.addEventListener('click', function () {
        const halaqaId = parseInt(this.dataset.halaqaId);
        selectHalaqa(halaqaId, this);
      });
    });

    // Clear selection button
    const clearBtn = document.getElementById('clear-selection-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', clearSelection);
    }

    // Search input handler
    const searchInput = document.getElementById('students-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        filterStudents(this.value);
      });
    }
  });

  function selectHalaqa(halaqaId, cardElement) {
    console.log('=== Halaqa Selected ===');
    console.log('Halaqa ID:', halaqaId);
    console.log('Card Element:', cardElement);

    // Update selected state
    selectedHalaqaId = halaqaId;

    // Remove selected class from all cards
    document.querySelectorAll('.halaqa-card').forEach(card => {
      card.classList.remove('selected');
    });

    // Add selected class to clicked card
    cardElement.classList.add('selected');
    console.log('Card marked as selected');

    // Show clear button
    const clearBtn = document.getElementById('clear-selection-btn');
    if (clearBtn) {
      clearBtn.style.display = 'block';
      console.log('Clear button shown');
    }

    // Show search wrapper
    const searchWrapper = document.getElementById('students-search-wrapper');
    if (searchWrapper) {
      searchWrapper.style.display = 'block';
    }

    // Clear search input
    const searchInput = document.getElementById('students-search-input');
    if (searchInput) {
      searchInput.value = '';
    }

    // Scroll to students section
    const studentsSection = document.getElementById('students-section');
    if (studentsSection) {
      studentsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      console.log('Scrolled to students section');
    }

    // Use cached students if available; avoids a redundant API call on re-selection
    if (halaqaStudentsCache[halaqaId]) {
      allStudents = halaqaStudentsCache[halaqaId];
      renderStudents(allStudents);
      return;
    }

    console.log('Calling loadStudents with ID:', halaqaId);
    loadStudents(halaqaId);
  }

  function clearSelection() {
    console.log('Clearing halaqa selection');

    selectedHalaqaId = null;
    allStudents = [];

    // Remove selected class from all cards
    document.querySelectorAll('.halaqa-card').forEach(card => {
      card.classList.remove('selected');
    });

    // Hide clear button
    const clearBtn = document.getElementById('clear-selection-btn');
    if (clearBtn) {
      clearBtn.style.display = 'none';
    }

    // Hide search wrapper
    const searchWrapper = document.getElementById('students-search-wrapper');
    if (searchWrapper) {
      searchWrapper.style.display = 'none';
    }

    // Clear students list and show empty state
    const studentsList = document.getElementById('students-list');
    const emptyEl = document.getElementById('students-empty');

    if (studentsList) {
      studentsList.innerHTML = '';
    }

    if (emptyEl) {
      emptyEl.style.display = 'block';
    }
  }

  async function loadStudents(halaqaId) {
    console.log('=== loadStudents called ===');
    console.log('Halaqa ID parameter:', halaqaId);

    const loadingEl = document.getElementById('students-loading');
    const listEl = document.getElementById('students-list');
    const emptyEl = document.getElementById('students-empty');

    console.log('DOM elements:', { loadingEl, listEl, emptyEl });

    // Show loading state
    if (loadingEl) {
      loadingEl.style.display = 'block';
      console.log('Loading state shown');
    }
    if (listEl) listEl.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'none';

    try {
      // Fetch students from API using StudentRecord endpoint
      const apiUrl = `/api/student-record/students/halaqa/${halaqaId}`;
      console.log('Fetching from API:', apiUrl);

      const response = await fetch(apiUrl);
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('API Response:', result);
      console.log('Success:', result.success);
      console.log('Data:', result.data);
      console.log('Data is array:', Array.isArray(result.data));
      console.log('Data length:', result.data ? result.data.length : 0);

      // Hide loading
      if (loadingEl) {
        loadingEl.style.display = 'none';
        console.log('Loading state hidden');
      }

      if (!result.success || !result.data || result.data.length === 0) {
        // Show empty state
        console.log('No students found, showing empty state');
        if (emptyEl) emptyEl.style.display = 'block';
        return;
      }

      // Store students, cache, and render
      allStudents = result.data;
      halaqaStudentsCache[halaqaId] = result.data;
      console.log('Rendering students:', result.data.length);
      renderStudents(result.data);
    } catch (error) {
      console.error('=== Error loading students ===');
      console.error('Error:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);

      // Hide loading
      if (loadingEl) loadingEl.style.display = 'none';

      // Show error message
      if (listEl) {
        listEl.innerHTML = `
          <div class="alert alert-danger" role="alert">
            <i class="ti tabler-alert-circle me-2"></i>
            حدث خطأ أثناء تحميل بيانات الطلاب: ${error.message}
          </div>
        `;
      }
    }
  }

  function filterStudents(searchTerm) {
    if (!allStudents || allStudents.length === 0) return;

    const term = searchTerm.toLowerCase().trim();

    if (term === '') {
      // Show all students if search is empty
      renderStudents(allStudents);
    } else {
      // Filter students by name
      const filtered = allStudents.filter(student => {
        const studentName = student.full_name_official_ar || student.student_name || '';
        return studentName.toLowerCase().includes(term);
      });

      renderStudents(filtered);
    }
  }

  function renderStudents(students) {
    const listEl = document.getElementById('students-list');
    if (!listEl) return;

    let html = '';

    students.forEach(student => {
      const studentName = student.full_name_official_ar || student.student_name || 'غير محدد';
      const studentId = student.student_id || student.Student_ID || 0;

      html += `
        <a href="/student/${studentId}/record" class="student-record-card mb-3">
          <div class="card-main-row">
            <span class="student-name">${studentName}</span>
            <i class="ti tabler-arrow-narrow-left"></i>
          </div>
        </a>
      `;
    });

    listEl.innerHTML = html;

    // Add hover effect using CSS classes instead of inline styles
    const cards = listEl.querySelectorAll('.student-record-card');
    cards.forEach(card => {
      card.addEventListener('mouseenter', function () {
        this.classList.add('student-card-hover');
      });
      card.addEventListener('mouseleave', function () {
        this.classList.remove('student-card-hover');
      });
    });
  }
})();
