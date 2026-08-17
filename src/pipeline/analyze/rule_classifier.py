"""
규칙 기반 + 수동 보정 감성 분류기
- 1차: 비리뷰 필터링 → 날짜 정규화 → 감성 분류 → 메뉴/키워드/visit_origin 추출
- 2차: confidence 낮은 케이스 CSV 추출 → 수동 보정
"""

import re
import pandas as pd
from pathlib import Path
from datetime import datetime

# ── 경로 설정 ─────────────────────────────────────────────────────────────────
INPUT_CSV = Path(__file__).resolve().parent.parent.parent.parent / "data" / "clean" / "mentions_clean.csv"
OUTPUT_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data" / "clean"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_CSV     = OUTPUT_DIR / "reviews_analyzed.csv"
UNCERTAIN_CSV  = OUTPUT_DIR / "reviews_uncertain.csv"

# ── 메뉴 키워드 ───────────────────────────────────────────────────────────────
MENU_PATTERNS = {
    "뽀얀국밥":   r"뽀얀\s*국밥|뽀얀\s*돼지",
    "맑은국밥":   r"맑은\s*국밥|맑은\s*돼지|맑은\s*육수",
    "불꽃국밥":   r"불꽃\s*국밥|불꽃\s*돼지",
    "마라국밥":   r"마라\s*국밥",
    "섞어국밥":   r"섞어\s*국밥|섞어\s*국",
    "돼지국밥":   r"돼지\s*국밥",
    "수육":       r"수육",
    "순대":       r"순대",
    "솥밥":       r"솥밥",
    "내장":       r"내장",
    "형제1인상":  r"1인상|형제1인",
    "형제2인상":  r"2인상|형제2인",
    "굴라쉬":     r"굴라쉬",
}

# ── 긍정/부정 키워드 ──────────────────────────────────────────────────────────
POS_KEYWORDS = [
    "맛있", "맛잇", "맛나", "맛집", "맛도리", "최고", "강추", "추천", "좋았", "좋아",
    "깔끔", "친절", "훌륭", "대박", "굿", "만족", "감동", "행복", "맛보", "맛보고",
    "또 오", "또올", "재방문", "단골", "자주", "즐거", "완벽", "신선", "진하", "구수",
    "깊은맛", "국물맛", "솥밥", "든든", "따뜻", "포근", "부드러", "깊고", "엄지척",
    "인정", "유명", "인기", "히트", "별점", "⭐", "★", "끝내주", "짱", "ㅠㅠ 맛있",
    # 긍정적 방문 표현
    "성공적", "반함", "반해", "괜찮았", "괜찮아", "나쁘지않", "나쁘지 않",
    "오픈런", "웨이팅 있", "웨이팅있", "줄이", "기대", "다시", "또 가",
    "국물이", "고기도", "깍두기", "솔직후기", "내돈내산", "방문했",
    "댕쫀", "맛탱", "기가 막히", "기가막히", "국룰", "한입에", "반찬도",
    "해장", "든든하게", "뜨끈", "뜨뜻", "따끈", "시원한 국물", "진국",
    "성공", "오랜만에", "국밥집", "후기", "먹고 왔", "먹었다", "먹었어",
]
NEG_KEYWORDS = [
    "별로", "실망", "아쉽", "아쉬", "못했", "맛없", "짜", "싱겁", "비싸", "가격",
    "불친절", "불편", "더럽", "위생", "냄새", "기다", "웨이팅", "오래", "실패",
    "후회", "별로", "그냥 그래", "그저 그래", "노맛", "별로였", "별로네", "별점 낮",
]

# ── 비리뷰 판별 ────────────────────────────────────────────────────────────────
# 실제 방문/체험 리뷰가 아닌 텍스트 패턴
NON_REVIEW_PATTERNS = [
    r"음식점 리스트",
    r"맛집 리스트",
    r"맛집\s*(추천|총정리|모음|탐방|지도)",
    r"업체.*할인",
    r"가맹\s*(모집|운영|안내)",
    r"프랜차이즈.*리스트",
    r"창업.*급매",
    r"임대.*창업",
    r"저작권\s*단속",
    r"사전\s*\d+년",
    r"역사\s*(이야기|기록|속)",
    r"윤회\s*체험",
    r"채팅창",
    r"Karl Barth|슈바이처|바르트",
    r"스크랩.*맛집",
    r"골목상권.*지도",
    r"^\d{2,4}[-./]\d{1,2}[-./]\d{1,2}\s*$",
    # 크리스마스빌리지/박람회/행사 단순 부스 나열 패턴
    r"크리스마스\s*(빌리지|마켓|마을).{0,50}(참여|참가|입점|부스|상점|업체)",
    r"(산타마을|영화의전당).{0,100}(틴타젤|솔팅|라이크댓|미림양장)",
    r"부산국제음식박람회.{0,50}(참가|참관|부스|업체)",
    r"신규사업장",
    r"안심식당\s*지정",
    r"식품접객업소\s*현황",
    r"밀키트\s*(제조|제작)\s*업체",
    r"공급업체\s*찾아요",
    r"타당성\s*분석\s*프로젝트",
    r"정보공개서",
    r"(부산|인천|경기|서울|충청|전라|경남|경북|강원).{0,5}(육류|고기요리|한식)\s*음식점",
    r"50년\s*이상.*한식당",
    r"전통있는\s*한식당",
]
NON_REVIEW_RE = re.compile("|".join(NON_REVIEW_PATTERNS), re.IGNORECASE)

# 1953형제돼지국밥 직접 언급 없으면 비리뷰 가능성 높음 (카페 데이터에서)
BRAND_RE = re.compile(r"1953|형제돼지국밥|형제\s*돼지\s*국밥")

# 이미 브랜드의 매장 페이지에 종속된 채널(네이버 플레이스 영수증 리뷰, 카카오맵 리뷰)은
# 애초에 해당 매장에 달린 리뷰라 브랜드명을 굳이 언급하지 않는 게 정상이다.
# "짧은 본문 + 브랜드명 미언급" 비리뷰 판별 규칙에서 이 채널들은 제외한다. (이슈 #148)
PLACE_BASED_CHANNELS = {"NaverPlace", "KakaoMap"}

# ── visit_origin 패턴 ────────────────────────────────────────────────────────
TOURIST_PATTERNS = r"여행|관광|ktx|ksx|기차|부산\s*(왔|내려|방문)|타지|외지|서울.*부산|부산.*서울|숙소|호텔|여행자|투어"
LOCAL_PATTERNS   = r"단골|매일|자주|항상|늘\s*오|근처\s*살|동네|집\s*근처|퇴근|점심\s*(자주|항상|매일)|자주\s*찾|자주\s*가"

# ── customer_type 패턴 (고객 유형: 직장인/가족/학생) ──────────────────────────
# visit_origin(외지/현지인)과는 별개의 축이다 — 혼동 방지를 위해 별도 컬럼으로 관리한다.
STUDENT_PATTERNS   = r"학생|개강|방학|중간고사|기말고사|캠퍼스|동아리|학교\s*근처"
FAMILY_PATTERNS    = r"가족|아이들|아이와|아기|부모님|엄마.*아빠|유모차"
OFFICE_PATTERNS    = r"직장|퇴근|회사|점심시간|회식"

# ── 날짜 정규화 ────────────────────────────────────────────────────────────────
def normalize_date(date_str: str) -> tuple[str, str]:
    """(approx_ym, date_precision) 반환. 없으면 ('', '없음')"""
    if not date_str or pd.isna(date_str):
        return "", "없음"
    s = str(date_str).strip()
    # YYYY-MM-DD
    m = re.match(r"(\d{4})-(\d{2})-\d{2}", s)
    if m:
        return f"{m.group(1)}-{m.group(2)}", "일"
    # YYYY-MM
    m = re.match(r"(\d{4})-(\d{2})$", s)
    if m:
        return f"{m.group(1)}-{m.group(2)}", "월"
    # YYYY
    m = re.match(r"(\d{4})$", s)
    if m:
        return f"{m.group(1)}", "년"
    return "", "없음"

# ── 메인 분류 함수 ─────────────────────────────────────────────────────────────
def classify_row(row) -> dict:
    title = str(row.get("제목", "") or "")
    body  = str(row.get("본문", "") or "")
    text  = (title + " " + body).strip()
    channel = str(row.get("채널", "") or "")

    result = {
        "sentiment_basis":   "",
        "sentiment_final":   "",
        "confidence":        "",
        "positive_keywords": "",
        "negative_keywords": "",
        "mentioned_menu":    "",
        "visit_origin":      "",
        "customer_type":     "",
        "approx_ym":         "",
        "date_precision":    "",
        "rating":            "",
    }

    # 날짜 정규화
    result["approx_ym"], result["date_precision"] = normalize_date(row.get("작성일", ""))

    # ── 비리뷰 판별 ──────────────────────────────────────────────────────────
    is_non_review = False
    if NON_REVIEW_RE.search(text):
        is_non_review = True
    # 카페 채널에서 브랜드 직접 언급 없으면 비리뷰로 처리
    if channel == "네이버카페" and not BRAND_RE.search(text):
        is_non_review = True
    # 본문이 매우 짧고 브랜드 언급 없음
    # 단, 매장 페이지에 종속된 채널(네이버 플레이스 영수증 리뷰, 카카오맵 리뷰)은
    # 브랜드명을 언급하지 않는 게 정상이므로 이 규칙에서 제외한다. (이슈 #148)
    if channel not in PLACE_BASED_CHANNELS and len(text) < 30 and not BRAND_RE.search(text):
        is_non_review = True

    if is_non_review:
        result["sentiment_basis"]  = "비리뷰"
        result["sentiment_final"]  = "해당없음"
        result["confidence"]       = "high"
        return result

    result["sentiment_basis"] = "리뷰"

    # ── 메뉴 추출 ────────────────────────────────────────────────────────────
    menus = []
    for menu, pattern in MENU_PATTERNS.items():
        if re.search(pattern, text, re.IGNORECASE):
            menus.append(menu)
    # 돼지국밥이 있고 더 구체적 메뉴도 있으면 일반 돼지국밥 제거
    if "돼지국밥" in menus and len(menus) > 1:
        menus.remove("돼지국밥")
    result["mentioned_menu"] = ";".join(menus)

    # ── 긍정/부정 키워드 ─────────────────────────────────────────────────────
    pos_found = [kw for kw in POS_KEYWORDS if kw in text]
    neg_found = [kw for kw in NEG_KEYWORDS if kw in text]
    result["positive_keywords"] = ";".join(pos_found)
    result["negative_keywords"] = ";".join(neg_found)

    # ── 감성 분류 ────────────────────────────────────────────────────────────
    pos_score = len(pos_found)
    neg_score = len(neg_found)

    if pos_score == 0 and neg_score == 0:
        # 키워드 없음 → 불확실
        result["sentiment_final"] = "중립"
        result["confidence"]      = "low"
    elif pos_score > 0 and neg_score == 0:
        result["sentiment_final"] = "긍정"
        result["confidence"]      = "high" if pos_score >= 2 else "medium"
    elif neg_score > 0 and pos_score == 0:
        result["sentiment_final"] = "부정"
        result["confidence"]      = "high" if neg_score >= 2 else "medium"
    elif pos_score > 0 and neg_score > 0:
        result["sentiment_final"] = "혼합"
        result["confidence"]      = "medium"
    
    # ── visit_origin ─────────────────────────────────────────────────────────
    if re.search(TOURIST_PATTERNS, text, re.IGNORECASE):
        result["visit_origin"] = "외지/관광 방문"
    elif re.search(LOCAL_PATTERNS, text, re.IGNORECASE):
        result["visit_origin"] = "현지인/단골"
    else:
        result["visit_origin"] = "정보없음"

    # ── customer_type (고객 유형) ────────────────────────────────────────────
    if re.search(STUDENT_PATTERNS, text, re.IGNORECASE):
        result["customer_type"] = "학생"
    elif re.search(FAMILY_PATTERNS, text, re.IGNORECASE):
        result["customer_type"] = "가족"
    elif re.search(OFFICE_PATTERNS, text, re.IGNORECASE):
        result["customer_type"] = "직장인"
    else:
        result["customer_type"] = "정보없음"

    # ── 별점 추출 ────────────────────────────────────────────────────────────
    # ⭐⭐⭐⭐ 또는 별점 4.5 패턴
    star_m = re.search(r"[⭐★]{1,5}", text)
    if star_m:
        result["rating"] = str(len(star_m.group(0)))
    else:
        rating_m = re.search(r"별점\s*:?\s*([0-9.]+)", text)
        if rating_m:
            result["rating"] = rating_m.group(1)

    return result


def main():
    print(f"[1/4] CSV 로딩: {INPUT_CSV}")
    df = pd.read_csv(INPUT_CSV)
    print(f"  총 {len(df)}건")

    print("[2/4] 규칙 기반 분류 실행...")
    results = [classify_row(row) for _, row in df.iterrows()]
    result_df = pd.DataFrame(results)
    out_df = pd.concat([df.reset_index(drop=True), result_df], axis=1)

    print("[3/4] 결과 저장...")
    out_df.to_csv(OUTPUT_CSV, index=False, encoding="utf-8-sig")
    print(f"  전체: {OUTPUT_CSV}")

    # 불확실 케이스 추출
    uncertain = out_df[out_df["confidence"] == "low"].copy()
    uncertain.to_csv(UNCERTAIN_CSV, index=False, encoding="utf-8-sig")
    print(f"  불확실(low confidence): {len(uncertain)}건 → {UNCERTAIN_CSV}")

    # 통계 출력
    print("\n[4/4] 분류 결과 요약:")
    print(out_df["sentiment_basis"].value_counts().to_string())
    print()
    review_only = out_df[out_df["sentiment_basis"] == "리뷰"]
    print("감성 분포 (리뷰만):")
    print(review_only["sentiment_final"].value_counts().to_string())
    print()
    print("confidence 분포:")
    print(out_df["confidence"].value_counts().to_string())


if __name__ == "__main__":
    main()
