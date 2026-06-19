import json
import re
import httpx
from openai import OpenAI
from config import ANTHROPIC_API_KEY

client = OpenAI(
    api_key=ANTHROPIC_API_KEY,
    base_url="https://api.ohmygpt.com/v1",
    timeout=httpx.Timeout(120.0, connect=30.0),
)
MODEL = "claude-sonnet-4-5"
SYSTEM_PROMPT = """你是一个资深代码审查专家,能够看出代码在bug/性能/安全/可读性这四个方面的问题，并指出应该如何修改
并严格按照一下json结构回复我:
{
"summary":"总体评价（一句话）",
"issues":[
{
"dimension":"bug|performance|security|readability",
"severity":"high|medium|low",
"line":"行号或范围(如18行)",
"description":"问题描述",
"suggestion":"修改建议"
}
],
}
"""


def clean_json_response(text: str) -> str:
    """剥离 markdown 包裹，返回纯 JSON 字符串"""
    match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return text.strip()


def review_code(code: str, dimensions: list[str]) -> dict:
    """调用 Claude API 对代码进行审查，返回结构化结果"""
    dims_text = "、".join(dimensions)
    user_prompt = f"""请从以下角度{dims_text}审查代码
    代码：{code},并严格按照system_prompt中的json格式回答我,不输出其他文字"""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        max_tokens=5000,
    )

    raw = response.choices[0].message.content
    cleaned = clean_json_response(raw)

    try:
        result = json.loads(cleaned)
    except json.JSONDecodeError:
        result = {
            "summary": "审查结果解析失败,请重试",
            "issues": [],
            "raw_response": raw,
        }

    return result
