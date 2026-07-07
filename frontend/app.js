// ============================================================
// AI Code Review — 前端直连 ohmygpt API
// 不再依赖后端服务器，浏览器直接调用 Claude
// ============================================================

// ========== API 配置 ==========
const API_KEY  = 'sk-n4tb5O8LC0A2ea1445d3T3BLbkFJ862418d896f84f258A9b';
const BASE_URL = 'https://api.ohmygpt.com/v1/chat/completions';
const MODEL    = 'claude-sonnet-4-5';

// ========== System Prompt（和后端 reviewer.py 一致）==========
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
    // 正则说明：
    // ```         → 匹配代码块开头
    // (?:json)?   → "json" 这个词可有可无
    // \s*\n?      → 空白和换行
    // (.*?)       → 捕获 JSON 内容（非贪婪）
    // ```         → 代码块结束
    // /s          → . 能匹配换行符
    if (match) {
        return match[1].trim();
    }
    return text.trim();
}

/** 防 XSS：把 < > & 等转义为安全文本 */
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;   // textContent 自动转义特殊字符
    return div.innerHTML;     // 读回来就是转义后的字符串
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

// ========== 直连 ohmygpt 调用 Claude ==========

async function callClaudeAPI(code, dimensions) {
    const dimsText = dimensions.join('、');
    const userPrompt = `请从以下角度审查代码：${dimsText}\n代码：${code}`;

    const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
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
        // 解析失败时返回兜底结果
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

    // 先全部隐藏
    loading.classList.add('hidden');
    error.classList.add('hidden');
    result.classList.add('hidden');

    // 按需显示
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
