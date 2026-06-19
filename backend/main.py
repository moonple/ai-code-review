import traceback
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from reviewer import review_code

app = FastAPI(title="AI Code Review")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST"],
    allow_headers=["*"],
)

class ReviewRequest(BaseModel):
    code:str
    dimensions:list[str] = ["bug","performance","security","readability"]

class ReviewResponse(BaseModel):
    summary:str
    issues:list[dict]

@app.post("/review",response_model=ReviewResponse)
async def review(request:ReviewRequest):
    try:
        result = review_code(request.code, request.dimensions)
        return result
    except Exception as e:
        print("=== ERROR ===")
        traceback.print_exc()
        return {
            "summary": f"服务器错误: {str(e)}",
            "issues": [],
        }