// 대시보드가 소비하는 데이터 계약.
//
// 팀원이 수집·정제한 데이터를 화면에 붙이려면 이 모양을 맞춰야 한다.
// 각 타입에 대응하는 프로토타입 카드를 함께 적어 두었다
// (기준: docs/design/wave-and-vibe-console.html, RULES §3.2.1).

/** 키워드 언급. 프로토타입의 "주요 언급 키워드" / "개선이 필요한 키워드" 카드용. */
export type KeywordMention = {
  keyword: string;
  count: number;
  /** 최근 2주 추세(%). 없으면 화면에서 추세 표시를 생략한다. */
  trendPct?: number;
};

/** 메뉴 언급량. 프로토타입의 "메뉴 언급량" 카드용. */
export type MenuMention = {
  menu: string;
  count: number;
};

/** 방문 목적. 프로토타입의 "방문 목적" 도넛 카드용. */
export type VisitPurpose = {
  purpose: string;
  /** 비율(%). 합계 100 을 기대한다. */
  ratio: number;
};

/**
 * 고객 유형(직장인/가족/학생/정보없음). 프로토타입의 "방문자 고객 유형" 카드용.
 * visit_origin(방문 목적)과는 별개의 분류축이다 — rule_classifier.py/ai_engine.py의
 * customer_type 컬럼에서 온다(이슈 #124 회의 인사이트: 고객 세그먼트 - 학생 개강이벤트).
 */
export type CustomerType = {
  type: string;
  /** 비율(%). 합계 100 을 기대한다. */
  ratio: number;
};

/**
 * 월별 리뷰 추이. 프로토타입의 "월별 리뷰 추이 (시즌 비교)" 막대그래프용.
 * 상대 날짜("3주 전")만 있어 연-월조차 알 수 없는 리뷰는 집계에서 제외한다 —
 * 이슈 #68 기준 전체의 약 47%가 이에 해당하므로, 이 배열의 count 합계는
 * totalReviews 보다 작은 게 정상이다.
 */
export type MonthlyTrend = {
  /** "YYYY-MM" */
  month: string;
  count: number;
  /** 해당 월 평균 평점(5점 만점). 평점이 없는 행은 평균 계산에서 제외. */
  avgRating?: number;
};

/**
 * 지점별 강점(경쟁우위) 비교. 프로토타입의 "지점별 강점" 카드용.
 * "강점"은 긍정률 기준 내림차순으로 정의한다(이슈 #72). 표본이 적은 지점은
 * 비율이 극단적으로 나올 수 있어 reviewCount를 함께 보여줘 오해를 막는다.
 */
export type BranchStat = {
  branch: string;
  reviewCount: number;
  avgRating?: number;
  positivePct: number;
  negativePct: number;
};

/** 데이터 출처. 시트 조회 실패 시 기본값이 쓰였음을 화면에 알리기 위해 필요하다. */
export type DashboardSource = "sheet" | "fallback";

export type DashboardData = {
  /** 시트를 읽은 시각(ISO). 정적 익스포트라 빌드 시각과 같다. */
  fetchedAt: string;
  /**
   * sheet   — 구글 시트 조회 성공, 실제 값
   * fallback — 조회 실패로 기본값 사용. 화면에서 실제 값처럼 보이면 안 된다.
   */
  source: DashboardSource;

  // ── 현재 시트에서 얻는 값 ──
  /** 정제 완료 언급 수. RULES §2.3 기준 1,716건. */
  totalReviews: number;
  positivePct: number;
  negativePct: number;

  // ── 파이프라인 연동 대기 (빈 배열로 온다) ──
  topKeywords: KeywordMention[];
  menuRanking: MenuMention[];
  purposes: VisitPurpose[];
  customerTypes: CustomerType[];
  monthlyTrend: MonthlyTrend[];
  branchStats: BranchStat[];

  // ── 아직 수집하지 않는 항목 ──
  // 값이 생기면 선택 필드를 채우면 되고, 화면은 없을 때 사유를 표시한다.
  /** 평균 평점(5점 만점). 파이프라인에 평점 수집이 없다. */
  averageRating?: number;
  /** 응답 필요 리뷰 수. 오너 콘솔 데이터가 필요하다. */
  pendingReplies?: number;
};

/** 개별 리뷰 원문 (리뷰 탐색 페이지용) */
export type ReviewItem = {
  id: string;
  branch: string;
  channel: string;
  author: string;
  date: string;
  ym: string;
  content: string;
  sentiment: "긍정" | "중립" | "부정" | "분석 불가" | string;
  rating?: number;
  url?: string;
  keywords: string[];
  menus?: string[];
  purpose?: string;
  customerType?: string;
  /** customer_type이 규칙 기반으로 못 찾아 AI가 추측한 경우의 판단 근거. 규칙으로 찾은 경우는 비어있다. */
  customerTypeReason?: string;
};

/** AI 주간리포트 지점별 인사이트 */
export type AiInsightItem = {
  branch: string;
  summary: string;
  keyIssues: string;
  recommendedAction: string;
  severity: string;
  metrics: string;
  foreignInsight?: string;
};
