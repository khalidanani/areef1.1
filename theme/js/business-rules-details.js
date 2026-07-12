// Business Rules Details Page - Parameter Editing, Toggle Recipients

(function () {
  'use strict';

  // Manual trigger button
  document.querySelectorAll('.trigger-rule-btn').forEach(btn => {
    btn.addEventListener('click', async function () {
      const ruleId = this.dataset.ruleId;
      const ruleCode = this.dataset.ruleCode;

      if (!confirm(`تشغيل "${ruleCode}" الآن كمهمة فورية؟`)) return;

      this.disabled = true;
      const original = this.innerHTML;
      this.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> جارٍ الإرسال...';

      try {
        const response = await fetch(`/business-rules/api/${ruleId}/trigger`, { method: 'POST' });
        const result = await response.json();
        if (result.success) {
          showToast('تم إرسال المهمة إلى قائمة الانتظار بنجاح', 'success');
        } else {
          showToast(result.message || 'خطأ في تشغيل القاعدة', 'danger');
        }
      } catch (error) {
        console.error('Trigger error:', error);
        showToast('خطأ في الاتصال', 'danger');
      } finally {
        this.innerHTML = original;
        this.disabled = false;
      }
    });
  });

  // Rule toggle (main)
  document.querySelectorAll('.rule-toggle').forEach(toggle => {
    toggle.addEventListener('change', async function () {
      const ruleId = this.dataset.ruleId;
      const isEnabled = this.checked;
      const label = this.nextElementSibling;

      try {
        const response = await fetch(`/business-rules/api/toggle/${ruleId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isEnabled })
        });

        const result = await response.json();
        if (result.success) {
          if (label) label.textContent = isEnabled ? 'مفعّلة' : 'معطّلة';
          showToast(isEnabled ? 'تم تفعيل القاعدة' : 'تم تعطيل القاعدة', 'success');
        } else {
          this.checked = !isEnabled;
          showToast('خطأ في تحديث الحالة', 'danger');
        }
      } catch (error) {
        console.error('Toggle error:', error);
        this.checked = !isEnabled;
        showToast('خطأ في الاتصال', 'danger');
      }
    });
  });

  // Channel matrix toggles — add or remove recipient+channel combinations
  document.querySelectorAll('.channel-toggle').forEach(toggle => {
    toggle.addEventListener('change', async function () {
      const role = this.dataset.role;
      const channel = this.dataset.channel;
      const recipientId = parseInt(this.dataset.recipientId);
      const isChecked = this.checked;
      const ruleId = document.getElementById('channelMatrix').dataset.ruleId;

      try {
        if (isChecked) {
          // Add or enable this recipient+channel
          if (recipientId > 0) {
            // Existing recipient — just toggle on
            const response = await fetch(`/business-rules/api/recipient/${recipientId}/toggle`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ isEnabled: true })
            });
            const result = await response.json();
            if (!result.success) { this.checked = false; showToast('خطأ في تفعيل القناة', 'danger'); return; }
          } else {
            // New recipient — add it
            const response = await fetch(`/business-rules/api/${ruleId}/recipients/add`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ recipientRole: role, channel })
            });
            const result = await response.json();
            if (!result.success) { this.checked = false; showToast('خطأ في إضافة القناة', 'danger'); return; }
          }
          showToast('تم تفعيل القناة', 'success');
        } else {
          // Disable this recipient+channel
          if (recipientId > 0) {
            const response = await fetch(`/business-rules/api/recipient/${recipientId}/toggle`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ isEnabled: false })
            });
            const result = await response.json();
            if (!result.success) { this.checked = true; showToast('خطأ في تعطيل القناة', 'danger'); return; }
            showToast('تم تعطيل القناة', 'success');
          } else {
            // Nothing to disable — it doesn't exist yet
            this.checked = false;
          }
        }
      } catch (error) {
        console.error('Channel toggle error:', error);
        this.checked = !isChecked;
        showToast('خطأ في الاتصال', 'danger');
      }
    });
  });

  // Parameter inline editing - show save/cancel on change
  document.querySelectorAll('.param-input').forEach(input => {
    input.addEventListener('input', function () {
      const group = this.closest('.param-group');
      const saveBtn = group.querySelector('.param-save');
      const cancelBtn = group.querySelector('.param-cancel');
      const original = this.dataset.original;

      if (this.value !== original) {
        saveBtn.classList.remove('d-none');
        cancelBtn.classList.remove('d-none');
      } else {
        saveBtn.classList.add('d-none');
        cancelBtn.classList.add('d-none');
      }
    });
  });

  // Save parameter
  document.querySelectorAll('.param-save').forEach(btn => {
    btn.addEventListener('click', async function () {
      const group = this.closest('.param-group');
      const ruleId = group.dataset.ruleId;
      const paramKey = group.dataset.paramKey;
      const input = group.querySelector('.param-input');
      const newValue = input.value.trim();

      if (!newValue) {
        showToast('القيمة لا يمكن أن تكون فارغة', 'warning');
        return;
      }

      try {
        const response = await fetch(`/business-rules/api/parameter/${ruleId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paramKey, paramValue: newValue })
        });

        const result = await response.json();
        if (result.success) {
          input.dataset.original = newValue;
          group.querySelector('.param-save').classList.add('d-none');
          group.querySelector('.param-cancel').classList.add('d-none');
          showToast(`تم تحديث ${paramKey} إلى ${newValue}`, 'success');
        } else {
          showToast('خطأ في حفظ الإعداد', 'danger');
        }
      } catch (error) {
        console.error('Save param error:', error);
        showToast('خطأ في الاتصال', 'danger');
      }
    });
  });

  // Cancel parameter edit
  document.querySelectorAll('.param-cancel').forEach(btn => {
    btn.addEventListener('click', function () {
      const group = this.closest('.param-group');
      const input = group.querySelector('.param-input');
      input.value = input.dataset.original;
      group.querySelector('.param-save').classList.add('d-none');
      group.querySelector('.param-cancel').classList.add('d-none');
    });
  });

  // Toast helper
  function showToast(message, type) {
    const container = document.getElementById('toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} alert-dismissible fade show position-relative`;
    toast.style.cssText = 'min-width: 300px; margin-bottom: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
    toast.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position: fixed; top: 20px; left: 20px; z-index: 9999;';
    document.body.appendChild(container);
    return container;
  }
})();
