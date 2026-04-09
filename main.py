from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from url_extractor import extract_from_url, clean_text
from normalization_service import normalize_text
import uvicorn

app = FastAPI(title="JP-Norm++ API")

class URLRequest(BaseModel):
    url: str

@app.post("/extract")
async def extract_endpoint(request: URLRequest):
    try:
        raw_text = extract_from_url(request.url)
        cleaned_text = clean_text(raw_text)
        return {"extracted_text": cleaned_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/normalize-from-url")
async def normalize_from_url_endpoint(request: URLRequest):
    try:
        # 1. Extract
        raw_text = extract_from_url(request.url)
        cleaned_text = clean_text(raw_text)
        
        if not cleaned_text or len(cleaned_text) < 2:
            raise HTTPException(status_code=400, detail="Could not extract meaningful text from URL")
            
        # 2. Normalize
        result = await normalize_text(cleaned_text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
