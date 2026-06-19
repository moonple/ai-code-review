const API_URL = '/review';

function getSelectedDimensions() {
    return Array.from(document.querySelectorAll('.dimensions input:checked'))
        .map(cb => cb.value);
}

async function startReview() {
    const code = document.getElementById('codeInput').value.trim();
    if (!code) {
        showError('请先粘贴代码');
        return;
    }

    const dimensions = getSelectedDimensions();
    if (dimensions.length === 0) {
        showError('请至少选择一个审查维度');
        return;
    }

    // 切换到加载状态
    setState('loading');

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, dimensions }),
        });

        if (!response.ok) {
            throw new Error(`服务器错误: ${response.status}`);
        }

        const data = await response.json();
        setState('success');
        renderResult(data);
    } catch (err) {
        showError(`请求失败: ${err.message}`);
        setState('error');
    }
}

function setState(state) {
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const result = document.getElementById('result');
    const btn = document.getElementById('reviewBtn');

    loading.classList.add('hidden');
    error.classList.add('hidden');
    result.classList.add('hidden');

    if (state === 'loading') {
        loading.classList.remove('hidden');
        btn.disabled = true;
    } else if (state === 'success') {
        result.classList.remove('hidden');
        btn.disabled = false;
    } else if (state === 'error') {
        error.classList.remove('hidden');
        btn.disabled = false;
    }
}

function showError(msg) {
    const el = document.getElementById('error');
    el.classList.remove('hidden');
    el.querySelector('.error-msg').textContent = msg;
}

function renderResult(data) {
    const resultDiv = document.getElementById('result');
    resultDiv.classList.remove('hidden');

    // 总分
    resultDiv.querySelector('.summary').innerHTML = `
        <strong>审查总结：</strong> ${escapeHtml(data.summary)}
    `;

    // 问题列表
    const issuesDiv = resultDiv.querySelector('.issues');
    if (!data.issues || data.issues.length === 0) {
        issuesDiv.innerHTML = '<p style="color:#6ee7b7;text-align:center;padding:20px;">✅ 未发现问题</p>';
        return;
    }

    issuesDiv.innerHTML = data.issues.map((issue, i) => `
        <div class="issue-card severity-${issue.severity}">
            <div class="issue-header">
                <span class="badge badge-${issue.dimension}">${dimLabel(issue.dimension)}</span>
                <span class="badge severity-${issue.severity}">${sevLabel(issue.severity)}</span>
                ${issue.line ? `<span style="color:#888;font-size:12px;">📍 第 ${issue.line} 行</span>` : ''}
            </div>
            <div class="issue-title">${i + 1}. ${escapeHtml(issue.title)}</div>
            <div class="issue-desc">${escapeHtml(issue.description)}</div>
            <div class="issue-suggestion">💡 ${escapeHtml(issue.suggestion)}</div>
        </div>
    `).join('');
}

function dimLabel(d) {
    const map = { bug: 'Bug', performance: '性能', security: '安全', readability: '可读性' };
    return map[d] || d;
}

function sevLabel(s) {
    const map = { high: '🔴 严重', medium: '🟡 中等', low: '⚪ 轻微' };
    return map[s] || s;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
