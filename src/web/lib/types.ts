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

/** 방문 목적 / 고객 유형. 프로토타입의 "고객 유형 분석" 카드용. */
export type VisitPurpose = {
  purpose: string;
  /** 비율(%). 합계 100 을 기대한다. */
  ratio: number;
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

  // ── 아직 수집하지 않는 항목 ──
  // 값이 생기면 선택 필드를 채우면 되고, 화면은 없을 때 사유를 표시한다.
  /** 평균 평점(5점 만점). 파이프라인에 평점 수집이 없다. */
  averageRating?: number;
  /** 응답 필요 리뷰 수. 오너 콘솔 데이터가 필요하다. */
  pendingReplies?: number;
};
