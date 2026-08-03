import os
import json
import pandas as pd
from typing import Optional
from pathlib import Path
from pydantic import BaseModel, Field
from openai import OpenAI

# ---------------------------------------------------------
# 팀원(선영, 상은, 주은) 프롬프트 기반 AI 감성 분석 엔진
# (Issue #15: 구글 시트 기반 AI 감성 분석 백엔드 스크립트)
# ---------------------------------------------------------

class ReviewAnalysis(BaseModel):
    sentiment: str = Field(description="'긍정', '중립', '부정', '분석 불가' 중 하나")
    sentiment_confidence: str = Field(description="'HIGH', 'MEDIUM', 'LOW' 중 하나")
    positive_keywords: Optional[str] = Field(description="긍정 키워드 (여러 개는 '|'로 구분). 없으면 빈 문자열")
    negative_keywords: Optional[str] = Field(description="부정 키워드 (여러 개는 '|'로 구분). 없으면 빈 문자열")
    mentioned_menu: Optional[str] = Field(description="언급된 메뉴 (여러 개는 '|'로 구분). 없으면 빈 문자열")
    customer_type: Optional[str] = Field(description="'직장인', '가족', '학생', '관광객', '혼밥', '기타' 중 하나. 판단 불가시 빈 문자열")
    needs_response: str = Field(description="'Y' 또는 'N' (1~2점이거나 불만/개선 요청 포함 시 'Y')")

SYSTEM_PROMPT = """
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

def analyze_review(client: OpenAI, review_text: str, rating: float) -> dict:
    if pd.isna(review_text) or str(review_text).strip() == "":
        return {
            "sentiment": "분석 불가",
            "sentiment_confidence": "HIGH",
            "positive_keywords": "",
            "negative_keywords": "",
            "mentioned_menu": "",
            "customer_type": "",
            "needs_response": "Y" if rating <= 2.0 else "N"
        }

    try:
        completion = client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"다음 리뷰를 분석하세요.\n별점: {rating}\n리뷰 내용: {review_text}"}
            ],
            response_format=ReviewAnalysis,
        )
        return completion.choices[0].message.parsed.model_dump()
    except Exception as e:
        print(f"API Error: {e}")
        return None

def main():
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("⚠️ OPENAI_API_KEY가 설정되지 않아 분석을 건너뜁니다.")
        return

    client = OpenAI(api_key=api_key)
    
    # 처리할 원본 파일 경로
    input_csv = Path("data/clean/mentions_clean.csv")
    output_csv = Path("data/clean/reviews_merged.csv")
    
    if not input_csv.exists():
        print(f"⚠️ 원본 데이터를 찾을 수 없습니다: {input_csv}")
        return

    df = pd.read_csv(input_csv, encoding="utf-8-sig")
    
    print(f"총 {len(df)}건의 리뷰 분석을 시작합니다...")
    
    # 결과를 담을 리스트
    results = []
    for idx, row in df.iterrows():
        print(f"[{idx+1}/{len(df)}] 리뷰 분석 중...")
        analysis = analyze_review(client, row.get("본문", ""), row.get("별점", 0))
        if analysis:
            row_data = row.to_dict()
            row_data.update(analysis)
            results.append(row_data)
        else:
            results.append(row.to_dict())
            
    result_df = pd.DataFrame(results)
    
    # 엑셀(구글시트) 연동을 위한 파일 저장
    output_csv.parent.mkdir(parents=True, exist_ok=True)
    result_df.to_csv(output_csv, index=False, encoding="utf-8-sig")
    print(f"✅ 분석 완료! {output_csv} 에 저장되었습니다.")

if __name__ == "__main__":
    main()
