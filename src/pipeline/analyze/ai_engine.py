import os
import json
import re
import requests
import pandas as pd
import concurrent.futures
from pathlib import Path
import gspread
from google.oauth2.service_account import Credentials

# ---------------------------------------------------------
# 팀원 프롬프트 기반 AI 감성 분석 엔진 (ACP HTTP 통신 버전)
# (Issue #114: opencode ACP 서버를 통한 AI 감성 분석 엔진 교체)
# ---------------------------------------------------------

ACP_PORT = 4100
ACP_BASE_URL = f"http://127.0.0.1:{ACP_PORT}"
MODEL_PAYLOAD = {
    "providerID": "google",
    "modelID": "antigravity-claude-sonnet-4-6"
}

JSON_FORMAT = """
아래 JSON 형식에 맞추어 반드시 ```json 과 ``` 로 감싼 JSON 코드 블록만 출력하세요. 다른 인사말이나 설명은 절대 포함하지 마세요.
```json
{
  "sentiment_final": "'긍정', '중립', '부정', '분석 불가' 중 하나",
  "sentiment_confidence": "'HIGH', 'MEDIUM', 'LOW' 중 하나",
  "mentioned_menu": "언급된 메뉴 (여러 개는 ';'로 구분). 없으면 빈 문자열",
  "visit_origin": "'직장인', '가족', '학생', '관광객', '혼밥', '기타' 중 하나. 판단 불가시 빈 문자열",
  "needs_response": "'Y' 또는 'N' (1~2점이거나 불만/개선 요청 포함 시 'Y')",
  "word_level_keywords": ["단순 명사 키워드 (예: 국물, 주차, 웨이팅) 배열. 없으면 빈 배열"],
  "aspect_analysis": [
    {
      "category": "'맛', '주차/시설', '서비스', '위생', '가격/가성비', '기타' 중 하나",
      "sentiment": "'긍정', '중립', '부정' 중 하나",
      "context": "해당 평가의 구체적인 이유 (예: '주차장이 좁아서 갓길에 대야 함'). 없으면 빈 배열"
    }
  ]
}
```
"""

DEFAULT_RULES = """
당신은 음식점 온라인 리뷰를 분석하는 10년 차 데이터 엔지니어이자 분석가입니다.
실제 존재하는 리뷰 데이터를 기반으로 철저하게 객관적인 분석 데이터셋을 생성해야 합니다.

[가장 중요한 규칙]
1. 절대로 존재하지 않는 정보를 생성하거나 추측(Hallucination)하지 않습니다.
2. 텍스트가 없는 별점 리뷰는 내용을 유추하지 않고 '분석 불가'로 처리합니다.
3. 확인되지 않은 값은 반드시 빈 문자열(NULL)로 남깁니다.

[감성 분류 기준]
- 긍정: 맛, 서비스, 청결 등에 대한 명확한 만족 표현 ("맛있다", "친절하다" 등)
- 부정: 불친절, 냄새, 맛없음 등 명확한 불만 표현
- 중립: 단순 방문 기록이거나 긍정/부정이 혼재되어 방향 판단이 어려운 경우
- 분석 불가: 텍스트가 없거나 이모티콘만 있는 경우
주의: 별점이 높다고 무조건 긍정이 아니며, 리뷰 문장 자체를 근거로 판별하세요.
"""

def get_dynamic_prompt() -> str:
    env_path = Path(__file__).resolve().parent.parent.parent.parent / ".env"
    if env_path.exists():
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
                    
    cred_path = os.environ.get("GOOGLE_CREDENTIALS_PATH")
    if cred_path and not cred_path.startswith('/'):
        cred_path = str(Path(__file__).resolve().parent.parent.parent.parent / cred_path.lstrip('./'))
    sheet_url = os.environ.get("GOOGLE_SHEET_URL")
    
    if not cred_path or not sheet_url:
        print("⚠️ 구글 시트 환경 변수 누락. 기본 하드코딩 프롬프트를 사용합니다.")
        return DEFAULT_RULES + JSON_FORMAT
        
    try:
        scopes = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
        credentials = Credentials.from_service_account_file(cred_path, scopes=scopes)
        client = gspread.authorize(credentials)
        sh = client.open_by_url(sheet_url)
        worksheet = sh.worksheet("기획")
        
        rules = worksheet.get_all_values()[1][0]
        if not rules.strip():
            return DEFAULT_RULES + JSON_FORMAT
            
        return rules + "\n\n" + JSON_FORMAT
    except Exception as e:
        return DEFAULT_RULES + JSON_FORMAT

def analyze_review_acp(review_text: str, rating: float, system_prompt: str) -> dict:
    if pd.isna(review_text) or str(review_text).strip() == "":
        return {"sentiment_final": "분석 불가"}
        
    prompt = f"{system_prompt}\n\n[분석할 리뷰]\n별점: {rating}\n리뷰 내용: {review_text}"
    
    try:
        # 1. Create a new session for clean context
        ses_res = requests.post(f"{ACP_BASE_URL}/session", json={}, timeout=10)
        ses_res.raise_for_status()
        session_id = ses_res.json().get("id")
        
        if not session_id:
            raise ValueError("세션 ID를 받지 못했습니다.")
            
        # 2. Send message and get synchronous response
        msg_payload = {
            "parts": [{"type": "text", "text": prompt}],
            "model": MODEL_PAYLOAD
        }
        msg_res = requests.post(
            f"{ACP_BASE_URL}/session/{session_id}/message", 
            json=msg_payload,
            timeout=180
        )
        msg_res.raise_for_status()
        
        # 3. Extract text from response
        data = msg_res.json()
        full_text = ""
        for part in data.get("parts", []):
            if part.get("type") == "text":
                full_text += part.get("text", "")
                
        # 4. Parse JSON
        match = re.search(r'```json\s*(\{.*?\})\s*```', full_text, re.DOTALL)
        if not match:
            match = re.search(r'\{.*\}', full_text, re.DOTALL)
            
        if match:
            json_str = match.group(1) if match.lastindex else match.group(0)
            return json.loads(json_str)
        else:
            print(f"❌ JSON 파싱 실패: {full_text[:100]}...")
            return None

    except requests.exceptions.RequestException as e:
        print(f"❌ ACP 통신 오류: {e}")
        return None
    except Exception as e:
        print(f"❌ 분석 오류: {e}")
        return None

def main():
    project_root = Path(__file__).resolve().parent.parent.parent.parent
    input_csv = project_root / "data" / "clean" / "reviews_analyzed.csv"
    output_csv = project_root / "data" / "clean" / "reviews_analyzed_ai.csv"
    
    if not input_csv.exists():
        print(f"❌ {input_csv} 파일이 존재하지 않습니다. 먼저 rule_classifier.py를 실행하세요.")
        return

    df = pd.read_csv(input_csv, encoding="utf-8-sig")
    system_prompt = get_dynamic_prompt()
    
    # 혼합 상태인 리뷰만 추출 (가장 효과적인 타겟)
    mixed_df = df[df['sentiment_final'] == '혼합']
    print(f"총 {len(df)}건 중 '혼합' 상태인 {len(mixed_df)}건에 대해 ACP(Claude) 분석을 시작합니다... 🚀")
    
    # 결과를 담을 리스트 (인덱스 추적용)
    updated_rows = []
    
    def process_row(idx, row):
        print(f"[{idx}] 분석 중...")
        text = row.get("review_text")
        if pd.isna(text) or not str(text).strip():
            text = row.get("본문", "")
        
        analysis = analyze_review_acp(text, row.get("rating", 0), system_prompt)
        
        if analysis and analysis.get("sentiment_final"):
            new_row = row.to_dict()
            new_row.update(analysis)
            print(f"[{idx}] 완료 -> {analysis.get('sentiment_final')}")
            return (idx, new_row)
        else:
            print(f"[{idx}] 실패 -> 기존 규칙 결과 유지")
            return (idx, row.to_dict())

    # 병렬 처리 (ACP 서버 과부하 방지를 위해 max_workers=5 수준으로 제한)
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = []
        for idx, row in mixed_df.iterrows():
            futures.append(executor.submit(process_row, idx, row))
            
        for future in concurrent.futures.as_completed(futures):
            idx, result_row = future.result()
            # 원본 DataFrame 업데이트
            for k, v in result_row.items():
                df.at[idx, k] = v

    output_csv.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_csv, index=False, encoding="utf-8-sig")
    print(f"✅ 분석 및 병합 완료! {output_csv} 에 저장되었습니다.")

if __name__ == "__main__":
    main()
