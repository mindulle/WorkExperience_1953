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
    // 루트 절대경로(/design/...)로 쓰면 GitHub Pages처럼 서브경로(/WorkExperience_1953/)에
    // 배포됐을 때 도메인 루트를 가리켜 404가 난다. iframe.html 기준 상대경로로 둬야
    // 로컬(루트 서빙)과 서브경로 배포 양쪽에서 다 맞는다.
    src: 'design/wave-and-vibe-console.html',
    title: '웨이브앤바이브 콘솔 프로토타입 (기준)',
  },
};

