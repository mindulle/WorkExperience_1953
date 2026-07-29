import { Card } from "@/components/ui/Card";

// 셸 구조(이슈 #54)만 먼저 세우고 카드는 뷰 단위로 후속 구현한다.
// 무엇이 들어올 자리인지 적어 두어야 팀원이 진행 상황을 알 수 있다.
export function ViewPlaceholder({
  title,
  planned,
}: {
  title: string;
  planned: string[];
}) {
  return (
    <>
      <header className="bg-[var(--surface)] p-5 rounded-[var(--r-lg)] border border-[var(--hairline)] [box-shadow:var(--shadow-sm)]">
        <h2 className="text-2xl font-bold">{title}</h2>
      </header>

      <Card className="flex-1 flex flex-col">
        <h3 className="text-base font-bold mb-2">구현 예정</h3>
        <p className="text-sm text-[var(--muted)] mb-4">
          docs/design/wave-and-vibe-console.html 기준으로 다음 항목이 들어올 자리입니다.
        </p>
        <ul className="flex flex-col gap-2">
          {planned.map((item) => (
            <li
              key={item}
              className="text-sm text-[var(--ink-2)] border border-dashed border-[var(--hairline)] bg-[var(--plane)] rounded-[var(--r-sm)] px-4 py-3"
            >
              {item}
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
