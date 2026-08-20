#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
매크로 AI 인사이트 파이프라인 (Macro AI Insight)
- 비용 최적화를 위해 개별 리뷰가 아닌 '지점별 리뷰 묶음'을 한 번에 AI에게 분석시킵니다.
- 지점별로 "이번 주 주요 불만 사항"과 "추천 액션 플랜"을 도출합니다.
"""

import os
import json
import pandas as pd
from pathlib import Path

# ai_engine.py의 Groq API 호출 함수 재사용 (Docker 이관 시 opencode CLI 종속성 제거)
try:
    from ai_engine import call_groq
except ImportError:
    # 모듈이 다른 경로에서 실행될 때를 대비한 fallback
    import sys
    sys.path.append(str(Path(__file__).parent))
    from ai_engine import call_groq

# 출력될 JSON 포맷
MACRO_JSON_FORMAT = """
아래 JSON 형식에 맞추어 오직 유효한 JSON 포맷 하나만 출력하세요. Markdown 태그는 제외하세요.
{
  "summary": "해당 지점의 전반적인 리뷰 분위기 1줄 요약",
  "issues": ["주요 불만 사항이나 개선점 1", "주요 불만 사항 2"],
  "action_plans": ["즉시 실행 가능한 추천 액션 1", "추천 액션 2"],
  "severity": "'긴급', '주의', '기회', '모니터링' 중 하나",
  "metrics": "가장 핵심적인 지표 요약 (예: '긍정률 66%', '부정 214건' 등)"
}
"""

MACRO_PROMPT_TEMPLATE = """
당신은 프랜차이즈 식당의 리뷰 데이터를 분석하는 수석 데이터 사이언티스트입니다.
아래 제공되는 리뷰들은 특정 지점의 최근 데이터 모음입니다.
이 리뷰들을 종합하여, 점장에게 전달할 핵심 문제점과 구체적인 액션 플랜을 도출해 주세요.

[분석할 지점]: {branch_name}
[리뷰 텍스트 모음 (최대 100건)]
{reviews_text}
"""

def get_macro_insight(branch_name: str, reviews_text: str) -> dict:
    if not reviews_text.strip():
        return {"summary": "리뷰 없음", "issues": [], "action_plans": []}
        
    prompt = MACRO_PROMPT_TEMPLATE.format(branch_name=branch_name, reviews_text=reviews_text)
    prompt += "\n\n" + MACRO_JSON_FORMAT

    try:
        # 텍스트 길이는 적절히 자릅니다 (최대 5000자)
        prompt = prompt[:5000] 
        
        # --- [실제 구동 코드: Groq API로 대체] ---
        full_text = call_groq(prompt)
        
        if not full_text:
            return {"summary": "분석 오류", "issues": [], "action_plans": [], "severity": "모니터링", "metrics": "API 호출 실패"}

        import re
        match = re.search(r'```json\s*(\{.*?\})\s*```', full_text, re.DOTALL)
        if not match:
            match = re.search(r'\{.*\}', full_text, re.DOTALL)
        if match:
            json_str = match.group(1) if match.lastindex else match.group(0)
            return json.loads(json_str)
        else:
            print(f"❌ JSON 파싱 실패 (원본 응답): {full_text[:200]}")
            return {"summary": "분석 오류", "issues": [], "action_plans": [], "severity": "모니터링", "metrics": "오류"}

    except Exception as e:
        print(f"API Error for {branch_name}: {e}")
        return {"summary": "분석 오류", "issues": [], "action_plans": [], "severity": "모니터링", "metrics": "오류"}

def main():
    project_root = Path(__file__).resolve().parent.parent.parent.parent
    input_csv = project_root / "data" / "clean" / "mentions_clean.csv"
    output_csv = project_root / "data" / "clean" / "macro_insights.csv"
    
    if not input_csv.exists():
        print(f"⚠️ {input_csv} 가 존재하지 않습니다. 스킵합니다.")
        return

    df = pd.read_csv(input_csv, encoding="utf-8-sig")
    
    # 지점별로 그룹화
    # 텍스트가 존재하는 리뷰만 모음
    df = df.dropna(subset=['review_text', '지점']) if 'review_text' in df.columns else df.dropna(subset=['본문', '지점'])
    text_col = 'review_text' if 'review_text' in df.columns else '본문'
    
    results = []
    branches = df['지점'].unique()
    
    print(f"총 {len(branches)}개 지점에 대한 매크로(Macro) AI 분석을 시작합니다... (비용 최적화 모드 🚀)")
    
    for branch in branches:
        print(f"[{branch}] 인사이트 분석 중...")
        branch_reviews = df[df['지점'] == branch][text_col].astype(str).tolist()
        
        # 최대 50건 정도의 텍스트만 이어 붙임 (토큰 최적화)
        combined_text = "\n---\n".join(branch_reviews[:50])
        
        analysis = get_macro_insight(branch, combined_text)
        
        results.append({
            "지점": branch,
            "리뷰요약": analysis.get("summary", ""),
            "주요이슈": " / ".join(analysis.get("issues", [])),
            "추천액션": " / ".join(analysis.get("action_plans", [])),
            "중요도": analysis.get("severity", "모니터링"),
            "핵심지표": analysis.get("metrics", "")
        })
        
    result_df = pd.DataFrame(results)
    
    output_csv.parent.mkdir(parents=True, exist_ok=True)
    result_df.to_csv(output_csv, index=False, encoding="utf-8-sig")
    print(f"✅ 매크로 분석 완료! {output_csv} 에 저장되었습니다.")

if __name__ == "__main__":
    main()
