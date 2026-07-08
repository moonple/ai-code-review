// ============================================================
// AI Code Review
// 自动环境切换：本地走后端（key 安全）、线上直连 API（Demo 可用）
// ============================================================

// ========== 环境检测 ==========
const IS_LOCAL = window.location.hostname === 'localhost' ||
                 window.location.hostname === '127.0.0.1';

// ========== 线上配置（仅在线上直连时使用）==========
// 注意：线上 Demo 的 key 会暴露在前端代码中，这是静态托管的权宜之计
// 生产环境应走后端代理，key 存在服务器 .env 中
const DEMO_API_KEY = '替换为你的ohmygpt-key';  // 部署到 PythonAnywhere 前手动替换
const DEMO_BASE_URL = 'https://api.ohmygpt.com/v1/chat/completions';
const MODEL = 'claude-sonnet-4-5';

// ========== System Prompt ==========
const SYSTEM_PROMPT = `你是一个资深代码审查专家，能够看出代码在bug/性能/安全/可读性这四个方面的问题，并指出应该如何修改。
严格按照以下 JSON 结构回复我，不要输出其他文字:
{
  "summary": "总体评价（一句话）",
  "issues": [
    {
      "dimension": "bug|performance|security|readability",
      "severity": "high|medium|low",
      "line": "行号或范围（如 18 行）",
      "title": "问题标题",
      "description": "问题描述",
      "suggestion": "修改建议"
    }
  ]
}`;

// ========== 工具函数 ==========

/** 从 AI 回复中提取纯 JSON（剥离 markdown 代码块包裹） */
function cleanJsonResponse(text) {
    const match = text.match(/```(?:json)?\s*\n?(.*?)\n?```/s);
    if (match) {
        return match[1].trim();
    }
    return text.trim();
}

/** 防 XSS：把 < > & 等转义为安全文本 */
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ========== 维度 / 严重程度 中文标签 ==========

function dimLabel(d) {
    const map = { bug: 'Bug', performance: '性能', security: '安全', readability: '可读性' };
    return map[d] || d;
}

function sevLabel(s) {
    const map = { high: '🔴 严重', medium: '🟡 中等', low: '⚪ 轻微' };
    return map[s] || s;
}

// ========== 获取选中的审查维度 ==========

function getSelectedDimensions() {
    return Array.from(document.querySelectorAll('.dimensions input:checked'))
        .map(cb => cb.value);
}

// ========== 调 API（双模式）==========

async function callClaudeAPI(code, dimensions) {
    if (IS_LOCAL) {
        // 本地开发 → 走后端 /review，key 在 .env 里，安全
        return await callViaBackend(code, dimensions);
    } else {
        // 线上 Demo → 直连 ohmygpt，key 暴露但能绕过 PythonAnywhere 限制
        return await callDirectAPI(code, dimensions);
    }
}

/** 本地：走后端代理 */
async function callViaBackend(code, dimensions) {
    const response = await fetch('/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, dimensions }),
    });

    if (!response.ok) {
        throw new Error(`服务器错误 (${response.status})`);
    }

    return await response.json();
}

/** 线上：直连 ohmygpt */
async function callDirectAPI(code, dimensions) {
    const dimsText = dimensions.join('、');
    const userPrompt = `请从以下角度审查代码：${dimsText}\n代码：${code}`;

    const response = await fetch(DEMO_BASE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEMO_API_KEY}`,
        },
        body: JSON.stringify({
            model: MODEL,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userPrompt },
            ],
            max_tokens: 5000,
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API 错误 (${response.status}): ${errText}`);
    }

    const json = await response.json();
    const raw = json.choices[0].message.content;
    const cleaned = cleanJsonResponse(raw);

    try {
        return JSON.parse(cleaned);
    } catch (e) {
        return {
            summary: '审查结果解析失败，请重试',
            issues: [],
            raw_response: raw,
        };
    }
}

// ========== 主流程 ==========

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

    setState('loading');

    try {
        const data = await callClaudeAPI(code, dimensions);
        setState('success');
        renderResult(data);
    } catch (err) {
        showError(`请求失败: ${err.message}`);
        setState('error');
    }
}

// ========== 页面状态切换 ==========

function setState(state) {
    const loading = document.getElementById('loading');
    const error   = document.getElementById('error');
    const result  = document.getElementById('result');
    const btn     = document.getElementById('reviewBtn');

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

// ========== 错误提示 ==========

function showError(msg) {
    const el = document.getElementById('error');
    el.classList.remove('hidden');
    el.querySelector('.error-msg').textContent = msg;
}

// ========== 渲染审查结果 ==========

function renderResult(data) {
    const resultDiv = document.getElementById('result');
    resultDiv.classList.remove('hidden');

    // 总结区
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

// ========== 一键清除 ==========

function clearAll() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('error').classList.add('hidden');
    document.getElementById('result').classList.add('hidden');

    document.getElementById('codeInput').value = '';
    document.querySelectorAll('.dimensions input[type="checkbox"]').forEach(cb => {
        cb.checked = true;
    });
    document.getElementById('reviewBtn').disabled = false;
}
