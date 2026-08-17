import os
import json
import re
import time
import requests
import pandas as pd
import concurrent.futures
from pathlib import Path
import gspread
from google.oauth2.service_account import Credentials

# ---------------------------------------------------------
# 팀원 프롬프트 기반 AI 감성 분석 엔진 (Groq API 버전)
# (Issue #156: antigravity 정액제(개인 구독, 비공식 플러그인) → Groq 무료 API 전환)
#
# 예전에는 opencode serve가 띄운 자체 HTTP API(세션 생성 → 메시지 전송)를 거쳐
# antigravity 플러그인으로 개인 정액제 계정을 통해 Claude를 호출했다(Issue #114).
# 이제는 Groq의 OpenAI 호환 chat completions 엔드포인트를 바로 호출한다 —
# 세션 개념이 없어 매 요청이 완결된 단일 HTTP 호출이다.
# ---------------------------------------------------------

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
# 모델 ID는 실제 Groq 키로 /openai/v1/models 조회해 확인한 값(2026-08-17 기준).
# Groq 쪽 라인업이 바뀌면 다시 안 맞을 수 있으니, 이상하면 다시 조회해서 갱신할 것.
DEFAULT_GROQ_MODEL = "qwen/qwen3.6-27b"
# qwen/qwen3.6-27b는 기본이 "thinking 모드"라 매 호출마다 <think>...</think> 추론
# 텍스트를 먼저 길게 쓰고 그 뒤에 최종 답을 낸다(Groq 문서 console.groq.com/docs/reasoning,
# console.groq.com/docs/model/qwen/qwen3.6-27b 확인, 2026-08-17). 우리 분류 작업은
# 복잡한 추론이 필요 없어 "none"으로 꺼서 파싱 안정성과 토큰/속도를 모두 확보한다.
# 다른 모델로 바꿔서 이 파라미터를 지원하지 않으면 GROQ_REASONING_EFFORT=""로 비활성화할 것.
DEFAULT_REASONING_EFFORT = "none"

# qwen/qwen3.6-27b 무료 티어 실측 한도 (console.groq.com/docs/rate-limits, 2026-08-17 확인):
#   RPM 30 / RPD 1,000 / TPM 8,000 / TPD 200,000
# 실제로 QA 샘플 40건을 순차 호출했을 때도 10건 안팎에서 429가 뜨기 시작함 —
# 병목은 RPM이 아니라 TPM(분당 토큰 8,000)이라, 프롬프트가 길면 금방 찬다.
# 그래서 429가 뜨면 포기하지 말고 Retry-After만큼 기다렸다가 재시도한다.
MAX_RETRIES = 6
DEFAULT_BACKOFF_SECONDS = 15  # Groq가 Retry-After 헤더를 안 줄 때의 대체 대기시간

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

[블로그 등 여러 화제가 섞인 글 판정 시 주의 — 이슈 #151]
블로그 글은 한 게시글 안에 여행기, 일상 기록, 다른 가게 이야기 등 브랜드(1953형제돼지국밥)와
무관한 내용이 함께 섞여 있는 경우가 많습니다. 다음 원칙을 반드시 지키세요:
- 감성 판정은 반드시 "1953형제돼지국밥"을 직접 언급하거나 명백히 그 가게를 가리키는
  문장에서만 근거를 찾으세요. 다른 가게, 다른 장소, 숙소, 여행 일정 등에 대한 불만/칭찬
  표현은 브랜드와 무관하므로 감성 판정 근거로 삼지 마세요.
- 글 전체가 브랜드와 사실상 무관하고(스쳐 지나가듯 한 번 언급되는 정도), 브랜드 자체에
  대한 평가라고 보기 어려우면 sentiment_final을 '분석 불가'로 처리하세요.
- "웨이팅 없어서 좋았다"처럼 부정적으로 보이는 단어(웨이팅, 못했 등)가 실제로는 반대
  의미(부정어와 함께 쓰여 긍정/중립을 뜻함)로 쓰였는지 문장 전체 의미로 다시 판단하세요.
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

def call_groq(prompt: str) -> str | None:
    """Groq chat completions를 호출해 응답 텍스트(문자열)를 반환한다. 실패 시 None.

    GROQ_API_KEY/GROQ_MODEL은 호출 시점에 os.environ에서 읽는다 — get_dynamic_prompt()가
    .env 파일을 읽어 os.environ에 채워 넣는 시점이 모듈 임포트 이후이기 때문에, 모듈
    최상단에서 미리 읽어두면 .env에만 키가 있는 경우 빈 값을 캐싱하게 되는 문제가 있다.

    429(레이트리밋)를 만나면 포기하지 않고 Retry-After 헤더가 알려주는 시간만큼
    기다렸다가 재시도한다(최대 MAX_RETRIES회). 무료 티어는 TPM(분당 토큰) 8,000이
    병목이라, 리뷰를 많이 처리할수록 이 경로를 자주 타게 된다 — 정상 동작이다.
    """
    api_key = os.environ.get("GROQ_API_KEY")
    model = os.environ.get("GROQ_MODEL", DEFAULT_GROQ_MODEL)
    reasoning_effort = os.environ.get("GROQ_REASONING_EFFORT", DEFAULT_REASONING_EFFORT)

    if not api_key:
        print("❌ GROQ_API_KEY가 설정되어 있지 않습니다. .env에 키를 추가하세요.")
        return None

    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
    }
    # 모델이 reasoning_effort를 지원하지 않으면 GROQ_REASONING_EFFORT=""로 비워
    # 파라미터 자체를 안 보내도록 할 수 있다.
    if reasoning_effort:
        payload["reasoning_effort"] = reasoning_effort

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            res = requests.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=180,
            )

            if res.status_code == 429:
                retry_after = res.headers.get("retry-after")
                wait_seconds = float(retry_after) if retry_after else DEFAULT_BACKOFF_SECONDS * attempt
                print(f"⏳ Groq 레이트리밋(429) — {wait_seconds:.0f}초 대기 후 재시도 ({attempt}/{MAX_RETRIES})")
                time.sleep(wait_seconds)
                continue

            res.raise_for_status()
            data = res.json()
            return data["choices"][0]["message"]["content"]
        except requests.exceptions.RequestException as e:
            print(f"❌ Groq API 통신 오류: {e}")
            return None
        except (KeyError, IndexError) as e:
            print(f"❌ Groq 응답 형식 오류: {e}")
            return None

    print(f"❌ 재시도 {MAX_RETRIES}회 모두 레이트리밋 — 이번 호출은 포기합니다.")
    return None

def infer_customer_type_groq(review_text: str, rating: float) -> dict | None:
    """customer_type과 그 판단 근거(reason)를 함께 반환한다. 실패 시 None."""
    if pd.isna(review_text) or str(review_text).strip() == "":
        return None

    prompt = f"{CUSTOMER_TYPE_RULES}\n\n{CUSTOMER_TYPE_FORMAT}\n\n[분석할 리뷰]\n별점: {rating}\n리뷰 내용: {review_text}"

    full_text = call_groq(prompt)
    if full_text is None:
        return None

    try:
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
    except Exception as e:
        print(f"❌ customer_type 추측 오류: {e}")
        return None

def analyze_review_groq(review_text: str, rating: float, system_prompt: str) -> dict:
    if pd.isna(review_text) or str(review_text).strip() == "":
        return {"sentiment_final": "분석 불가"}

    prompt = f"{system_prompt}\n\n[분석할 리뷰]\n별점: {rating}\n리뷰 내용: {review_text}"

    full_text = call_groq(prompt)
    if full_text is None:
        return None

    try:
        match = re.search(r'```json\s*(\{.*?\})\s*```', full_text, re.DOTALL)
        if not match:
            match = re.search(r'\{.*\}', full_text, re.DOTALL)

        if match:
            json_str = match.group(1) if match.lastindex else match.group(0)
            return json.loads(json_str)
        else:
            print(f"❌ JSON 파싱 실패: {full_text[:100]}...")
            return None
    except Exception as e:
        print(f"❌ 분석 오류: {e}")
        return None

# 규칙 단계에서 부정어 처리 없이 keyword-only 매칭을 하다 보니, "혼합"만 재판정해서는
# 못 잡는 오분류가 있었다(이슈 #151). 네이버블로그는 한 글에 여러 화제(여행기, 다른
# 가게 얘기 등)가 섞여 있는 경우가 많아, neg_score > 0 / pos_score == 0 조건으로
# 규칙 단계에서 곧장 "부정"이 확정돼 버리면 재판정 대상에서 빠진다. 그래서 "혼합"뿐
# 아니라 이 채널의 확정 "부정" 리뷰도 재판정 대상에 포함해 Groq가 문맥(브랜드 관련
# 문장인지, 부정어로 뒤집힌 표현인지)을 다시 보게 한다.
BLOG_RECHECK_CHANNEL = "네이버블로그"


def main():
    project_root = Path(__file__).resolve().parent.parent.parent.parent
    input_csv = project_root / "data" / "clean" / "reviews_analyzed.csv"
    output_csv = project_root / "data" / "clean" / "reviews_analyzed_ai.csv"

    if not input_csv.exists():
        print(f"❌ {input_csv} 파일이 존재하지 않습니다. 먼저 rule_classifier.py를 실행하세요.")
        return

    df = pd.read_csv(input_csv, encoding="utf-8-sig")
    system_prompt = get_dynamic_prompt()

    # 재판정 대상: (1) 규칙 단계에서 '혼합'으로 판정된 리뷰 전체 +
    #             (2) 네이버블로그 채널에서 '부정'으로 확정된 리뷰 (이슈 #151)
    # (2)를 넣는 이유는 위 BLOG_RECHECK_CHANNEL 설명 참고.
    if "채널" in df.columns:
        blog_negative_mask = (df["sentiment_final"] == "부정") & (df["채널"] == BLOG_RECHECK_CHANNEL)
    else:
        print("⚠️ '채널' 컬럼이 없어 네이버블로그 '부정' 재판정을 건너뜁니다 (이슈 #151 대상 축소).")
        blog_negative_mask = pd.Series(False, index=df.index)

    recheck_mask = (df['sentiment_final'] == '혼합') | blog_negative_mask
    mixed_df = df[recheck_mask]
    print(
        f"총 {len(df)}건 중 재판정 대상 {len(mixed_df)}건"
        f"(혼합 {int((df['sentiment_final'] == '혼합').sum())}건"
        f" + 네이버블로그 부정 {int(blog_negative_mask.sum())}건)에 대해 Groq 분석을 시작합니다... 🚀"
    )

    # 결과를 담을 리스트 (인덱스 추적용)
    updated_rows = []

    def process_row(idx, row):
        print(f"[{idx}] 분석 중...")
        text = row.get("review_text")
        if pd.isna(text) or not str(text).strip():
            text = row.get("본문", "")

        analysis = analyze_review_groq(text, row.get("rating", 0), system_prompt)

        if analysis and analysis.get("sentiment_final"):
            new_row = row.to_dict()
            new_row.update(analysis)
            print(f"[{idx}] 완료 -> {analysis.get('sentiment_final')}")
            return (idx, new_row)
        else:
            print(f"[{idx}] 실패 -> 기존 규칙 결과 유지")
            return (idx, row.to_dict())

    # 병렬 처리 — 무료 티어 병목이 TPM(분당 토큰 8,000)이라 동시성을 높여도
    # 처리량이 늘지 않고 429만 늘어난다. 2 정도로 낮춰서 재시도 로직과 함께 쓴다.
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        futures = []
        for idx, row in mixed_df.iterrows():
            futures.append(executor.submit(process_row, idx, row))

        for future in concurrent.futures.as_completed(futures):
            idx, result_row = future.result()
            # 원본 DataFrame 업데이트
            for k, v in result_row.items():
                df.at[idx, k] = v

    # customer_type이 아직 '정보없음'인 리뷰는 AI로 유형을 추측해 채운다 (수정사안 7).
    # 혼합 감성 재분석에서 이미 처리된 행은 중복 호출을 피하려고 제외한다.
    unresolved_df = df[(df['customer_type'] == '정보없음') & (~df.index.isin(mixed_df.index))]
    print(f"customer_type '정보없음' {len(unresolved_df)}건에 대해 AI 추측을 시작합니다... 🔍")

    def infer_row(idx, row):
        text = row.get("review_text")
        if pd.isna(text) or not str(text).strip():
            text = row.get("본문", "")
        return (idx, infer_customer_type_groq(text, row.get("rating", 0)))

    if '고객유형_근거' not in df.columns:
        df['고객유형_근거'] = ""

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
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
