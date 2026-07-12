'use strict';

(function () {
    const channelLabels = {
        system: 'النظام',
        push: 'تنبيه التطبيق',
        sms: 'SMS',
        whatsapp: 'واتساب',
        email: 'بريد إلكتروني'
    };

    function getCheckedChannels() {
        return Array.from(document.querySelectorAll('.test-channel:checked')).map(el => el.value);
    }

    function renderUserContact(snapshot) {
        if (!snapshot) {
            return '<div class="text-muted">لا توجد بيانات</div>';
        }
        const name = snapshot.full_name_ar || snapshot.full_name_en || snapshot.username || '-';
        const emailMark = snapshot.email_verified
            ? '<i class="ti tabler-check text-success"></i>'
            : '<i class="ti tabler-x text-danger"></i>';
        const mobileMark = snapshot.mobile_verified
            ? '<i class="ti tabler-check text-success"></i>'
            : '<i class="ti tabler-x text-danger"></i>';
        const deviceCount = snapshot.active_device_token_count || 0;
        const devicesText = deviceCount > 0
            ? `${deviceCount} (${(snapshot.device_types || []).join(', ') || 'unknown'})`
            : '<span class="text-warning">لا يوجد</span>';

        return `
            <div class="row small">
                <div class="col-md-6 mb-1"><span class="text-muted">الاسم:</span> <strong>${escapeHtml(name)}</strong></div>
                <div class="col-md-6 mb-1"><span class="text-muted">المعرف:</span> <strong>${snapshot.user_id}</strong></div>
                <div class="col-md-6 mb-1"><span class="text-muted">البريد:</span> ${snapshot.email ? escapeHtml(snapshot.email) : '<span class="text-warning">غير متوفر</span>'} ${emailMark}</div>
                <div class="col-md-6 mb-1"><span class="text-muted">الجوال:</span> ${snapshot.mobile ? escapeHtml(snapshot.mobile) : '<span class="text-warning">غير متوفر</span>'} ${mobileMark}</div>
                <div class="col-md-12 mb-1"><span class="text-muted">أجهزة FCM النشطة:</span> ${devicesText}</div>
            </div>`;
    }

    function renderTestResults(payload) {
        if (!payload) {
            return '<div class="alert alert-danger mb-0">لم يصل ردّ من الخادم</div>';
        }
        const overall = payload.overall_success
            ? '<span class="badge bg-label-success">نجح الإرسال على جميع القنوات</span>'
            : '<span class="badge bg-label-warning">فشل الإرسال على بعض القنوات</span>';
        const rows = (payload.results || []).map(r => {
            const code = r.channel_code;
            const badge = r.success
                ? '<span class="badge bg-label-success">نجح</span>'
                : '<span class="badge bg-label-danger">فشل</span>';
            return `
                <tr>
                    <td><strong>${channelLabels[code] || code}</strong></td>
                    <td>${badge}</td>
                    <td><small>${r.recipient ? escapeHtml(r.recipient) : '-'}</small></td>
                    <td><small>${escapeHtml(r.message || '')}</small></td>
                </tr>`;
        }).join('');
        return `
            <div class="mb-2">${overall}</div>
            <div class="table-responsive">
                <table class="table table-sm table-bordered mb-0">
                    <thead><tr><th>القناة</th><th>الحالة</th><th>المستلم</th><th>التفاصيل</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
    }

    function escapeHtml(s) {
        if (s == null) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getJsonHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        const tokenInput = document.querySelector('input[name="__RequestVerificationToken"]');
        if (tokenInput) headers['RequestVerificationToken'] = tokenInput.value;
        return headers;
    }

    document.getElementById('refreshStatusBtn')?.addEventListener('click', () => {
        window.location.reload();
    });

    document.getElementById('checkContactBtn')?.addEventListener('click', async () => {
        const userId = parseInt(document.getElementById('testUserId').value, 10);
        const wrapper = document.getElementById('userContactInfo');
        const body = document.getElementById('userContactBody');
        if (!userId || userId <= 0) {
            wrapper.classList.remove('d-none');
            body.innerHTML = '<div class="text-warning">أدخل رقم مستخدم صالح</div>';
            return;
        }
        wrapper.classList.remove('d-none');
        body.innerHTML = '<div class="text-muted"><i class="spinner-border spinner-border-sm me-1"></i> جاري الفحص...</div>';
        try {
            const r = await fetch(`/notification-status/api/user-contact/${userId}`, { credentials: 'same-origin' });
            const json = await r.json();
            if (!json.success) {
                body.innerHTML = `<div class="text-danger">${escapeHtml(json.message || 'فشل')}</div>`;
                return;
            }
            body.innerHTML = renderUserContact(json.data);
        } catch (err) {
            body.innerHTML = `<div class="text-danger">خطأ في الاتصال: ${escapeHtml(err.message)}</div>`;
        }
    });

    document.getElementById('sendTestBtn')?.addEventListener('click', async () => {
        const userId = parseInt(document.getElementById('testUserId').value, 10);
        const channels = getCheckedChannels();
        const title = document.getElementById('testTitle').value.trim();
        const body = document.getElementById('testBody').value.trim();
        const resultsWrapper = document.getElementById('testResults');
        const resultsBody = document.getElementById('testResultsBody');

        if (!userId || userId <= 0) {
            resultsWrapper.classList.remove('d-none');
            resultsBody.innerHTML = '<div class="alert alert-warning mb-0">أدخل رقم مستخدم صالح</div>';
            return;
        }
        if (channels.length === 0) {
            resultsWrapper.classList.remove('d-none');
            resultsBody.innerHTML = '<div class="alert alert-warning mb-0">اختر قناة واحدة على الأقل</div>';
            return;
        }

        resultsWrapper.classList.remove('d-none');
        resultsBody.innerHTML = '<div class="text-muted"><i class="spinner-border spinner-border-sm me-1"></i> جاري الإرسال...</div>';

        try {
            const r = await fetch('/notification-status/api/test-send', {
                method: 'POST',
                headers: getJsonHeaders(),
                credentials: 'same-origin',
                body: JSON.stringify({ userId, channels, title, body })
            });
            const json = await r.json();
            if (!json.success) {
                resultsBody.innerHTML = `<div class="alert alert-danger mb-0">${escapeHtml(json.message || 'فشل')}</div>`;
                return;
            }
            resultsBody.innerHTML = renderTestResults(json.data);
        } catch (err) {
            resultsBody.innerHTML = `<div class="alert alert-danger mb-0">خطأ في الاتصال: ${escapeHtml(err.message)}</div>`;
        }
    });
})();
