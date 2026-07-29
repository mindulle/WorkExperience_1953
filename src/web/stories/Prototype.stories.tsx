import type { Meta, StoryObj } from '@storybook/nextjs-vite';

// 팀원이 전달한 HTML 프로토타입을 Storybook에서 열람하기 위한 참조 스토리.
// 실물은 docs/design/ 에 있고 .storybook/main.ts 의 staticDirs 가 /design 으로 서빙한다.
// 구현 대조용 기준 문서이므로 배포물(out/)에는 포함되지 않는다.
const PrototypeFrame = ({ src, title }: { src: string; title: string }) => (
  <iframe
    src={src}
    title={title}
    style={{ width: '100%', height: '100vh', border: 0, display: 'block' }}
  />
);

const meta = {
  title: 'Reference/프로토타입',
  component: PrototypeFrame,
  parameters: {
    layout: 'fullscreen',
    // 정적 참조 문서이므로 시각 회귀 대상이 아니다.
    // iframe 로딩 타이밍 때문에 스냅샷이 흔들리기도 해서 제외한다.
    chromatic: { disableSnapshot: true },
  },
} satisfies Meta<typeof PrototypeFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

// 기준 문서. 6개 뷰(대시보드·리뷰 탐색·트렌드 분석·지점 관리·고객 세그먼트·AI 추천)를 모두 포함한다.
export const Console: Story = {
  args: {
    src: '/design/wave-and-vibe-console.html',
    title: '웨이브앤바이브 콘솔 프로토타입 (기준)',
  },
};

// 아래 3종은 콘솔의 개별 화면을 따로 뽑아둔 것으로, 콘솔과 세부가 다를 수 있다.
export const Dashboard: Story = {
  args: {
    src: '/design/dashboard.html',
    title: '매장 리뷰 현황 (단독)',
  },
};

export const CustomerSegment: Story = {
  args: {
    src: '/design/customer-segment.html',
    title: '고객 세그먼트 (단독)',
  },
};

export const AiRecommendations: Story = {
  args: {
    src: '/design/ai-recommendations.html',
    title: 'AI 추천 액션 (단독)',
  },
};
