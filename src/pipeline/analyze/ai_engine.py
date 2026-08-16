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
# 팀원 프롬프트 기반 AI 감성 분석 엔진 (opencode HTTP API 통신 버전)
# (Issue #114: opencode 서버를 통한 AI 감성 분석 엔진 교체)
#
# 이름은 ACP지만 실제로는 opencode의 진짜 ACP(에디터가 stdio로 subprocess를
# 띄우는 방식)가 아니라 `opencode serve`가 노출하는 HTTP API(POST /session,
# POST /session/{id}/message)를 그대로 사용한다. 4100은 존재하지 않는 포트였고,
# 실제로는 opencode serve가 떠 있는 머신의 8082 포트를 쓴다.
# ---------------------------------------------------------

ACP_BASE_URL = os.environ.get("OPENCODE_SERVER_URL", "http://llmops-instance:8082")
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
  "customer_type": "'직장인', '가족', '학생', '정보없음' 중 하나 (rule_classifier.py 의 customer_type 분류와 동일한 기준 사용). 판단 불가시 '정보없음'",
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

# 이슈 #151: 블로그 채널 재검증용 프롬프트.
# 블로그는 한 게시물에 여러 화제(여행기, 다른 가게, 일상 기록 등)가 섞이는 경우가 많아,
# 규칙 기반 키워드 매칭이 "브랜드와 무관한 문장에서 뽑힌 감성 표현"을 오분류하는 사례가 QA로 확인됨.
BLOG_RECHECK_RULES = """
당신은 블로그 게시물에서 특정 브랜드(1953형제돼지국밥)에 대한 실제 평가만 골라내는 분석가입니다.
이 게시물은 규칙 기반 분류기가 이미 '긍정' 또는 '부정'으로 확정했지만, 블로그 특성상
아래와 같은 오분류 위험이 있어 재검증이 필요합니다:
- 게시물에 여러 장소/주제가 섞여 있어, 브랜드와 무관한 문장의 감성 표현이 브랜드 평가로 잘못 집계됨
  (예: 다른 식당 이야기의 "아쉬웠다", 숙소 얘기의 "비쌌다", 완전히 무관한 화제의 부정 표현 등)
- 반대 의미 표현("웨이팅 없어서 좋았다")이 표면적 키워드만 보고 반대로 분류됨

[가장 중요한 규칙]
1. 반드시 "1953형제돼지국밥"(또는 형제돼지국밥, 국밥집 자체)에 대한 문장만 근거로 판단하세요.
   게시물 내 다른 장소·화제에 대한 감성 표현은 절대 이 브랜드의 감성으로 채택하지 마세요.
2. 브랜드에 대한 감성 표현을 찾을 수 없으면(단순 언급뿐이면) '중립'으로 판단하세요.
3. 존재하지 않는 정보를 생성·추측하지 않습니다.
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

# ---------------------------------------------------------
# customer_type 전용 추측 (수정사안 7: "정보없음"을 AI 추측 기반 정보로 대체)
# rule_classifier.py 의 정규식이 학생/가족/직장인 키워드를 못 찾아 '정보없음'으로 남긴
# 리뷰를 대상으로, 명시적 키워드가 없어도 문맥(인원수·동행·시간대 등)으로 가장 가능성
# 높은 유형을 추측하게 한다. 다른 필드(sentiment_final 등)는 건드리지 않는다.
# ---------------------------------------------------------

CUSTOMER_TYPE_RULES = """
당신은 음식점 리뷰에서 방문 고객 유형(직장인/가족/학생)을 추정하는 분석가입니다.
이 리뷰는 규칙 기반 분류가 명시적 키워드(학생/개강, 가족/아이들, 회식/점심시간 등)를
찾지 못해 '정보없음'으로 남긴 리뷰입니다. 명시적 키워드가 없더라도 아래와 같은 문맥
신호를 근거로 가장 가능성 높은 유형 하나를 추측해 주세요:
- 인원수/동행 표현(혼밥, 2인, 단체), 방문 시간대(점심시간, 저녁 회식), 어투나 말투
- 메뉴 구성(1인상 vs 2인상 이상), 요일/시간 언급
근거가 전혀 없는 극히 짧은 리뷰일 때만 '정보없음'을 유지하세요.
"""

CUSTOMER_TYPE_FORMAT = """
아래 JSON 형식에 맞추어 반드시 ```json 과 ``` 로 감싼 JSON 코드 블록만 출력하세요. 다른 인사말이나 설명은 절대 포함하지 마세요.
```json
{
  "customer_type": "'직장인', '가족', '학생' 중 하나. 정말 아무 단서도 없을 때만 '정보없음'.",
  "reason": "위 유형으로 판단한 근거를 한국어 한 문장으로. 어떤 표현/문맥을 봤는지 구체적으로.",
  "confidence": "'HIGH' (인원수/동행/시간대 등 구체적 문맥 근거가 명확함), 'MEDIUM' (근거가 있지만 다른 해석도 가능), 'LOW' (뚜렷한 근거 없이 추측에 가까움) 중 하나. 확신이 없으면 솔직하게 LOW를 쓰세요 — LOW라고 답해도 페널티는 없습니다."
}
```
"""

def infer_customer_type_acp(review_text: str, rating: float) -> dict | None:
    """customer_type과 그 판단 근거(reason)를 함께 반환한다. 실패 시 None."""
    if pd.isna(review_text) or str(review_text).strip() == "":
        return None

    prompt = f"{CUSTOMER_TYPE_RULES}\n\n{CUSTOMER_TYPE_FORMAT}\n\n[분석할 리뷰]\n별점: {rating}\n리뷰 내용: {review_text}"

    try:
        ses_res = requests.post(f"{ACP_BASE_URL}/session", json={}, timeout=10)
        ses_res.raise_for_status()
        session_id = ses_res.json().get("id")
        if not session_id:
            raise ValueError("세션 ID를 받지 못했습니다.")

        msg_res = requests.post(
            f"{ACP_BASE_URL}/session/{session_id}/message",
            json={"parts": [{"type": "text", "text": prompt}], "model": MODEL_PAYLOAD},
            timeout=180,
        )
        msg_res.raise_for_status()

        data = msg_res.json()
        full_text = "".join(part.get("text", "") for part in data.get("parts", []) if part.get("type") == "text")

        match = re.search(r'```json\s*(\{.*?\})\s*```', full_text, re.DOTALL)
        if not match:
            match = re.search(r'\{.*\}', full_text, re.DOTALL)
        if not match:
            print(f"❌ customer_type JSON 파싱 실패: {full_text[:100]}...")
            return None

        json_str = match.group(1) if match.lastindex else match.group(0)
        parsed = json.loads(json_str)
        customer_type = parsed.get("customer_type")
        if not customer_type:
            return None
        return {
            "customer_type": customer_type,
            "reason": parsed.get("reason", ""),
            "confidence": parsed.get("confidence", "LOW"),
        }
    except requests.exceptions.RequestException as e:
        print(f"❌ customer_type 추측 ACP 통신 오류: {e}")
        return None
    except Exception as e:
        print(f"❌ customer_type 추측 오류: {e}")
        return None

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
    blog_recheck_prompt = BLOG_RECHECK_RULES + JSON_FORMAT

    # 혼합 상태인 리뷰 (기존 로직 — 가장 효과적인 타겟)
    mixed_df = df[df['sentiment_final'] == '혼합']

    # 이슈 #151: 블로그 채널은 규칙이 '긍정'/'부정'으로 확정한 것도 재검증 대상에 포함한다.
    # 블로그는 한 글에 여러 화제가 섞여, 규칙 기반 키워드 매칭이 브랜드와 무관한 문장의
    # 감성을 잘못 귀속시키는 사례가 QA(2026-08-17)로 다수 확인되었기 때문.
    blog_confirmed_df = df[
        (df['채널'] == '네이버블로그') & (df['sentiment_final'].isin(['긍정', '부정']))
    ]

    print(f"총 {len(df)}건 중 '혼합' {len(mixed_df)}건 + 블로그 확정({len(blog_confirmed_df)}건) "
          f"= 총 {len(mixed_df) + len(blog_confirmed_df)}건에 대해 ACP(Claude) 분석을 시작합니다... 🚀")

    updated_rows = []

    def process_row(idx, row, prompt):
        print(f"[{idx}] 분석 중...")
        text = row.get("review_text")
        if pd.isna(text) or not str(text).strip():
            text = row.get("본문", "")

        analysis = analyze_review_acp(text, row.get("rating", 0), prompt)

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
            futures.append(executor.submit(process_row, idx, row, system_prompt))
        for idx, row in blog_confirmed_df.iterrows():
            futures.append(executor.submit(process_row, idx, row, blog_recheck_prompt))

        for future in concurrent.futures.as_completed(futures):
            idx, result_row = future.result()
            # 원본 DataFrame 업데이트
            for k, v in result_row.items():
                df.at[idx, k] = v

    # customer_type이 아직 '정보없음'인 리뷰는 AI로 유형을 추측해 채운다 (수정사안 7).
    # 혼합/블로그 재검증에서 이미 처리된 행은 중복 호출을 피하려고 제외한다.
    already_processed_idx = mixed_df.index.union(blog_confirmed_df.index)
    unresolved_df = df[(df['customer_type'] == '정보없음') & (~df.index.isin(already_processed_idx))]
    print(f"customer_type '정보없음' {len(unresolved_df)}건에 대해 AI 추측을 시작합니다... 🔍")

    def infer_row(idx, row):
        text = row.get("review_text")
        if pd.isna(text) or not str(text).strip():
            text = row.get("본문", "")
        return (idx, infer_customer_type_acp(text, row.get("rating", 0)))

    if '고객유형_근거' not in df.columns:
        df['고객유형_근거'] = ""

    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(infer_row, idx, row) for idx, row in unresolved_df.iterrows()]
        for future in concurrent.futures.as_completed(futures):
            idx, result = future.result()
            if not result or not result.get('customer_type') or result['customer_type'] == '정보없음':
                continue
            # LOW confidence는 억지 추측일 가능성이 높아 '정보없음'을 그대로 유지한다.
            if result.get('confidence') == 'LOW':
                print(f"[{idx}] LOW confidence로 스킵 -> {result['customer_type']} ({result.get('reason', '')})")
                continue
            df.at[idx, 'customer_type'] = result['customer_type']
            df.at[idx, '고객유형_근거'] = result.get('reason', '')
            print(f"[{idx}] customer_type 추측 -> {result['customer_type']} [{result.get('confidence')}] ({result.get('reason', '')})")

    output_csv.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_csv, index=False, encoding="utf-8-sig")
    print(f"✅ 분석 및 병합 완료! {output_csv} 에 저장되었습니다.")

if __name__ == "__main__":
    main()
