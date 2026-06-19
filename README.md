# AI Code Review

一个基于 Claude API 的在线代码审查工具，粘贴代码即可从 Bug、性能、安全、可读性四个维度获得结构化审查报告。

## 功能

- 粘贴代码片段，选择审查维度
- 调用 Claude API 进行智能审查
- 结构化的审查报告（按严重程度标记高/中/低）
- 按维度分类展示问题卡片
- 支持多语言代码审查

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | HTML + CSS + JavaScript（原生） |
| 后端 | Python + FastAPI |
| AI | Claude API (via OpenAI SDK) |
| 部署 | Railway / Render |

## 本地运行

### 1. 克隆仓库

```bash
git clone https://github.com/moonple/ai-code-review.git
cd ai-code-review
```

### 2. 安装依赖

```bash
pip install -r backend/requirements.txt
```

### 3. 配置 API Key

在 `backend/.env` 中填入你的 API Key：

```
ANTHROPIC_API_KEY=你的key
```

### 4. 启动后端

```bash
cd backend
uvicorn main:app --reload
```

后端运行在 `http://localhost:8000`，访问 `/docs` 可测试 API。

### 5. 打开前端

用 VS Code Live Server 打开 `frontend/index.html`，或直接在浏览器中打开。

## 项目结构

```
ai-code-review/
├── backend/
│   ├── main.py          # FastAPI 入口
│   ├── reviewer.py      # Prompt 构造 + API 调用
│   ├── config.py        # 环境变量配置
│   ├── requirements.txt # Python 依赖
│   └── .env             # API Key（不提交）
├── frontend/
│   ├── index.html       # 主页面
│   ├── style.css        # 样式
│   └── app.js           # 前端逻辑
└── README.md
```

## License

MIT
