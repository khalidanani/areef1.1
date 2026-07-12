// Business Rules Index Page - Toggle & Filter Logic

(function () {
  'use strict';

  // Filter buttons
  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
      this.classList.add('active');

      const filter = this.dataset.filter;
      document.querySelectorAll('.rule-row').forEach(row => {
        if (filter === 'all' || row.dataset.trigger === filter) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    });
  });

  // Search
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      const query = this.value.toLowerCase();
      document.querySelectorAll('.rule-row').forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
      });
    });
  }

  // Toggle rule on/off
  document.querySelectorAll('.rule-toggle').forEach(toggle => {
    toggle.addEventListener('change', async function () {
      const ruleId = this.dataset.ruleId;
      const isEnabled = this.checked;

      try {
        const response = await fetch(`/business-rules/api/toggle/${ruleId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isEnabled })
        });

        const result = await response.json();
        if (!result.success) {
          this.checked = !isEnabled; // revert
          showToast('خطأ في تحديث الحالة', 'danger');
        } else {
          showToast(isEnabled ? 'تم تفعيل القاعدة' : 'تم تعطيل القاعدة', 'success');
        }
      } catch (error) {
        console.error('Toggle error:', error);
        this.checked = !isEnabled; // revert
        showToast('خطأ في الاتصال', 'danger');
      }
    });
  });

  // Toast notification helper
  function showToast(message, type) {
    const container = document.getElementById('toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} alert-dismissible fade show position-relative`;
    toast.style.cssText = 'min-width: 300px; margin-bottom: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
    toast.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
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
