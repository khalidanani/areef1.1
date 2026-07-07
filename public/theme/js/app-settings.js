/**
 * Settings Management JavaScript
 * Handles fetching, displaying, searching, filtering, and updating settings
 */

(() => {
  'use strict';

  // Store all settings data
  let allSettings = [];
  let currentFilter = 'all';
  let searchTerm = '';

  // Value type detection patterns
  const VALUE_PATTERNS = {
    boolean: /^(true|false)$/i,
    time: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
    integer: /^-?\d+$/,
    decimal: /^-?\d+\.\d+$/
  };

  // Initialize on page load
  document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
  });

  /**
   * Load all settings from the API
   */
  async function loadSettings() {
    showLoading(true);

    try {
      const response = await fetch('/api/settings');
      const result = await response.json();

      if (result.success && result.data?.settings) {
        allSettings = result.data.settings;
        updateStats();
        renderSettings();
      } else {
        showError(result.message || 'Failed to load settings');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      showError('حدث خطأ أثناء تحميل الإعدادات');
    } finally {
      showLoading(false);
    }
  }

  /**
   * Refresh settings (reload from API)
   */
  window.refreshSettings = function () {
    loadSettings();
  };

  /**
   * Detect the value type based on the value content
   */
  function detectValueType(value) {
    if (!value || value === '') return 'string';

    if (VALUE_PATTERNS.boolean.test(value)) return 'boolean';
    if (VALUE_PATTERNS.time.test(value)) return 'time';
    if (VALUE_PATTERNS.integer.test(value)) return 'integer';
    if (VALUE_PATTERNS.decimal.test(value)) return 'decimal';

    return 'string';
  }

  /**
   * Get human-readable type label
   */
  function getTypeLabel(type) {
    const labels = {
      boolean: 'منطقي',
      time: 'وقت',
      integer: 'عدد صحيح',
      decimal: 'عدد عشري',
      string: 'نص'
    };
    return labels[type] || 'نص';
  }

  /**
   * Format the display value based on type
   */
  function formatDisplayValue(value, type) {
    if (type === 'boolean') {
      return value.toLowerCase() === 'true' ? 'نعم (true)' : 'لا (false)';
    }
    return value || '-';
  }

  /**
   * Update statistics display
   */
  function updateStats() {
    const total = allSettings.length;
    const active = allSettings.filter(s => s.is_active).length;
    const inactive = total - active;

    document.getElementById('totalSettings').textContent = total;
    document.getElementById('activeSettings').textContent = active;
    document.getElementById('inactiveSettings').textContent = inactive;
  }

  /**
   * Filter settings by search term
   */
  window.filterSettings = function () {
    searchTerm = document.getElementById('settingsSearch').value.toLowerCase();
    renderSettings();
  };

  /**
   * Filter settings by value type
   */
  window.filterByType = function (type, button) {
    currentFilter = type;

    // Update active button state
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    renderSettings();
  };

  /**
   * Get filtered settings based on current filters
   */
  function getFilteredSettings() {
    return allSettings.filter(setting => {
      // Search filter
      const matchesSearch =
        !searchTerm ||
        setting.setting_key.toLowerCase().includes(searchTerm) ||
        (setting.setting_description || '').toLowerCase().includes(searchTerm) ||
        setting.setting_value.toLowerCase().includes(searchTerm);

      // Type filter
      const valueType = detectValueType(setting.setting_value);
      const matchesType = currentFilter === 'all' || valueType === currentFilter;

      return matchesSearch && matchesType;
    });
  }

  /**
   * Render the settings list
   */
  function renderSettings() {
    const container = document.getElementById('settingsList');
    const emptyState = document.getElementById('emptyState');
    const visibleCount = document.getElementById('visibleCount');

    const filteredSettings = getFilteredSettings();

    if (filteredSettings.length === 0) {
      container.classList.add('d-none');
      emptyState.classList.remove('d-none');
      visibleCount.textContent = '0 إعداد';
      return;
    }

    emptyState.classList.add('d-none');
    container.classList.remove('d-none');
    visibleCount.textContent = `${filteredSettings.length} إعداد`;

    container.innerHTML = filteredSettings.map(setting => {
      const valueType = detectValueType(setting.setting_value);
      const typeLabel = getTypeLabel(valueType);
      const displayValue = formatDisplayValue(setting.setting_value, valueType);

      return `
        <div class="setting-card" id="setting-${setting.id}" data-key="${setting.setting_key}" data-type="${valueType}">
          <div class="d-flex justify-content-between align-items-start">
            <div class="flex-grow-1">
              <div class="d-flex align-items-center mb-2">
                <span class="setting-key">${escapeHtml(setting.setting_key)}</span>
              </div>
              ${setting.setting_description ? `<p class="setting-description">${escapeHtml(setting.setting_description)}</p>` : ''}
              <div class="setting-value-display">
                <span class="setting-value" id="value-${setting.id}">${escapeHtml(displayValue)}</span>
                <span class="setting-type-badge type-${valueType}">${typeLabel}</span>
              </div>
            </div>
            <div class="d-flex gap-2">
              <button class="btn btn-sm ${setting.is_active ? 'btn-primary' : 'btn-label-secondary'}"
                      onclick="toggleActiveStatus('${setting.setting_key}', '${setting.id}', ${setting.is_active})"
                      title="${setting.is_active ? 'تعطيل' : 'تفعيل'}">
                <i class="ti ${setting.is_active ? 'tabler-toggle-right' : 'tabler-toggle-left'} me-1"></i>
                ${setting.is_active ? 'نشط' : 'غير نشط'}
              </button>
              <button class="btn btn-sm btn-icon btn-label-primary" onclick="toggleEditForm('${setting.id}')" title="تعديل">
                <i class="ti tabler-edit"></i>
              </button>
            </div>
          </div>

          <!-- Edit Form -->
          <div class="setting-edit-form" id="edit-form-${setting.id}">
            ${renderEditInput(setting, valueType)}
            <div class="d-flex gap-2 mt-3">
              <button class="btn btn-primary btn-sm" onclick="saveSetting('${setting.setting_key}', '${setting.id}')">
                <i class="ti tabler-check me-1"></i>
                حفظ
              </button>
              <button class="btn btn-label-secondary btn-sm" onclick="cancelEdit('${setting.id}')">
                <i class="ti tabler-x me-1"></i>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Render the appropriate input based on value type
   */
  function renderEditInput(setting, valueType) {
    const currentValue = setting.setting_value;

    switch (valueType) {
      case 'boolean':
        return `
          <div class="mb-3">
            <label class="form-label">القيمة الجديدة</label>
            <div class="d-flex gap-3">
              <div class="form-check">
                <input class="form-check-input" type="radio" name="edit-value-${setting.id}"
                       id="edit-true-${setting.id}" value="true" ${currentValue.toLowerCase() === 'true' ? 'checked' : ''}>
                <label class="form-check-label" for="edit-true-${setting.id}">نعم (true)</label>
              </div>
              <div class="form-check">
                <input class="form-check-input" type="radio" name="edit-value-${setting.id}"
                       id="edit-false-${setting.id}" value="false" ${currentValue.toLowerCase() === 'false' ? 'checked' : ''}>
                <label class="form-check-label" for="edit-false-${setting.id}">لا (false)</label>
              </div>
            </div>
          </div>
        `;

      case 'time':
        return `
          <div class="mb-3">
            <label class="form-label">القيمة الجديدة (صيغة الوقت HH:mm)</label>
            <input type="time" class="form-control" id="edit-input-${setting.id}"
                   value="${currentValue}" style="max-width: 200px;">
            <small class="text-muted">مثال: 20:00</small>
          </div>
        `;

      case 'integer':
        return `
          <div class="mb-3">
            <label class="form-label">القيمة الجديدة (عدد صحيح)</label>
            <input type="number" class="form-control" id="edit-input-${setting.id}"
                   value="${currentValue}" step="1" style="max-width: 200px;">
          </div>
        `;

      case 'decimal':
        return `
          <div class="mb-3">
            <label class="form-label">القيمة الجديدة (عدد عشري)</label>
            <input type="number" class="form-control" id="edit-input-${setting.id}"
                   value="${currentValue}" step="0.01" style="max-width: 200px;">
          </div>
        `;

      default:
        return `
          <div class="mb-3">
            <label class="form-label">القيمة الجديدة</label>
            <input type="text" class="form-control" id="edit-input-${setting.id}"
                   value="${escapeHtml(currentValue)}" style="max-width: 400px;">
          </div>
        `;
    }
  }

  /**
   * Toggle edit form visibility
   */
  window.toggleEditForm = function (settingId) {
    const card = document.getElementById(`setting-${settingId}`);
    const form = document.getElementById(`edit-form-${settingId}`);

    // Close all other edit forms first
    document.querySelectorAll('.setting-edit-form.active').forEach(f => {
      if (f.id !== `edit-form-${settingId}`) {
        f.classList.remove('active');
        f.closest('.setting-card')?.classList.remove('editing');
      }
    });

    // Toggle this form
    form.classList.toggle('active');
    card.classList.toggle('editing');
  };

  /**
   * Cancel editing
   */
  window.cancelEdit = function (settingId) {
    const card = document.getElementById(`setting-${settingId}`);
    const form = document.getElementById(`edit-form-${settingId}`);

    form.classList.remove('active');
    card.classList.remove('editing');
  };

  /**
   * Save setting changes
   */
  window.saveSetting = async function (settingKey, settingId) {
    const card = document.getElementById(`setting-${settingId}`);
    const valueType = card.dataset.type;
    let newValue;

    // Get value based on input type
    if (valueType === 'boolean') {
      const checkedRadio = document.querySelector(`input[name="edit-value-${settingId}"]:checked`);
      newValue = checkedRadio ? checkedRadio.value : null;
    } else {
      const input = document.getElementById(`edit-input-${settingId}`);
      newValue = input ? input.value : null;
    }

    if (newValue === null || newValue === '') {
      Swal.fire({
        icon: 'warning',
        title: 'تحذير',
        text: 'يرجى إدخال قيمة صالحة',
        confirmButtonText: 'حسناً'
      });
      return;
    }

    // Validate based on type
    const validationResult = validateValue(newValue, valueType);
    if (!validationResult.isValid) {
      Swal.fire({
        icon: 'error',
        title: 'خطأ في التحقق',
        text: validationResult.message,
        confirmButtonText: 'حسناً'
      });
      return;
    }

    try {
      const response = await fetch(`/api/settings/${settingKey}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ value: newValue })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Update local data
        const settingIndex = allSettings.findIndex(s => s.setting_key === settingKey);
        if (settingIndex !== -1) {
          allSettings[settingIndex].setting_value = newValue;
        }

        // Close edit form and re-render
        cancelEdit(settingId);
        renderSettings();

        Swal.fire({
          icon: 'success',
          title: 'تم الحفظ',
          text: 'تم تحديث الإعداد بنجاح',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        const errorMsg = result.message || result.data?.message || 'فشل تحديث الإعداد';
        Swal.fire({
          icon: 'error',
          title: 'خطأ',
          text: errorMsg,
          confirmButtonText: 'حسناً'
        });
      }
    } catch (error) {
      console.error('Error saving setting:', error);
      Swal.fire({
        icon: 'error',
        title: 'خطأ',
        text: 'حدث خطأ أثناء حفظ الإعداد',
        confirmButtonText: 'حسناً'
      });
    }
  };

  /**
   * Toggle setting active/inactive status
   */
  window.toggleActiveStatus = async function (settingKey, settingId, currentStatus) {
    const newStatus = !currentStatus;
    const actionText = newStatus ? 'تفعيل' : 'تعطيل';

    const result = await Swal.fire({
      icon: 'question',
      title: `${actionText} الإعداد`,
      text: `هل تريد ${actionText} هذا الإعداد؟`,
      showCancelButton: true,
      confirmButtonText: 'نعم',
      cancelButtonText: 'إلغاء'
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch(`/api/settings/${settingKey}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: newStatus })
      });

      const responseData = await response.json();

      if (response.ok && responseData.success) {
        // Update local data
        const settingIndex = allSettings.findIndex(s => s.setting_key === settingKey);
        if (settingIndex !== -1) {
          allSettings[settingIndex].is_active = newStatus;
        }

        // Re-render and update stats
        updateStats();
        renderSettings();

        Swal.fire({
          icon: 'success',
          title: 'تم',
          text: `تم ${actionText} الإعداد بنجاح`,
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'خطأ',
          text: responseData.message || `فشل ${actionText} الإعداد`,
          confirmButtonText: 'حسناً'
        });
      }
    } catch (error) {
      console.error('Error toggling setting status:', error);
      Swal.fire({
        icon: 'error',
        title: 'خطأ',
        text: 'حدث خطأ أثناء تحديث حالة الإعداد',
        confirmButtonText: 'حسناً'
      });
    }
  };

  /**
   * Validate value based on expected type
   */
  function validateValue(value, expectedType) {
    switch (expectedType) {
      case 'boolean':
        if (!VALUE_PATTERNS.boolean.test(value)) {
          return { isValid: false, message: 'القيمة يجب أن تكون true أو false' };
        }
        break;

      case 'time':
        if (!VALUE_PATTERNS.time.test(value)) {
          return { isValid: false, message: 'القيمة يجب أن تكون بصيغة الوقت (HH:mm)، مثال: 20:00' };
        }
        break;

      case 'integer':
        if (!VALUE_PATTERNS.integer.test(value)) {
          return { isValid: false, message: 'القيمة يجب أن تكون عدداً صحيحاً' };
        }
        break;

      case 'decimal':
        if (!VALUE_PATTERNS.decimal.test(value) && !VALUE_PATTERNS.integer.test(value)) {
          return { isValid: false, message: 'القيمة يجب أن تكون عدداً عشرياً' };
        }
        break;
    }

    return { isValid: true };
  }

  /**
   * Show/hide loading state
   */
  function showLoading(show) {
    const loadingState = document.getElementById('loadingState');
    const settingsList = document.getElementById('settingsList');
    const emptyState = document.getElementById('emptyState');

    if (show) {
      loadingState.classList.remove('d-none');
      settingsList.classList.add('d-none');
      emptyState.classList.add('d-none');
    } else {
      loadingState.classList.add('d-none');
    }
  }

  /**
   * Show error message
   */
  function showError(message) {
    Swal.fire({
      icon: 'error',
      title: 'خطأ',
      text: message,
      confirmButtonText: 'حسناً'
    });
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
})();
