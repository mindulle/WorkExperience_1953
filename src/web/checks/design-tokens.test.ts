import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// RULES 3.2.1: 시각 규격의 기준은 docs/design/wave-and-vibe-console.html 이다.
// 기준에 있는 토큰이 globals.css 에 없으면 var(--x) 가 미정의 변수로 조용히
// 무시되어, 색이 빠진 채 렌더되고 에러도 나지 않는다. 그 상태를 CI 에서 잡는다.
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(here, '..', '..', '..');

const PROTOTYPE = path.join(repoRoot, 'docs', 'design', 'wave-and-vibe-console.html');
const GLOBALS = path.join(repoRoot, 'src', 'web', 'app', 'globals.css');

/** :root 블록에 선언된 커스텀 프로퍼티를 모은다. */
function readRootTokens(filePath: string): Map<string, string> {
  const source = readFileSync(filePath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const tokens = new Map<string, string>();

  for (const block of source.matchAll(/:root\s*\{([^}]*)\}/g)) {
    for (const [, name, value] of block[1].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
      tokens.set(name, value.trim());
    }
  }
  return tokens;
}

/** rgba(11, 11, 11, 0.08) 과 rgba(11,11,11,.08) 을 같게 본다. */
function normalize(value: string): string {
  return value
    .replace(/\s+/g, '')
    .replace(/(^|[^0-9])0\./g, '$1.')
    .toLowerCase();
}

/** --primary: var(--brand) 처럼 별칭으로 선언된 값을 실제 값까지 따라간다. */
function resolve(name: string, tokens: Map<string, string>, seen = new Set<string>()): string {
  const value = tokens.get(name);
  if (value === undefined) return '';
  if (seen.has(name)) return value; // 순환 참조 방어
  seen.add(name);

  const alias = value.match(/^var\(\s*(--[a-z0-9-]+)\s*\)$/i);
  return alias ? resolve(alias[1], tokens, seen) : value;
}

const prototypeTokens = readRootTokens(PROTOTYPE);
const globalsTokens = readRootTokens(GLOBALS);

describe('디자인 토큰 정합 (프로토타입 기준)', () => {
  it('프로토타입에서 토큰을 읽어온다', () => {
    // 파싱이 조용히 실패하면 아래 테스트가 전부 통과해 버리므로 먼저 확인한다.
    expect(prototypeTokens.size).toBeGreaterThan(20);
    expect(globalsTokens.size).toBeGreaterThan(20);
  });

  it('프로토타입의 모든 토큰이 globals.css 에 정의되어 있다', () => {
    const missing = [...prototypeTokens.keys()].filter((name) => !globalsTokens.has(name));

    expect(
      missing,
      `globals.css 에 없는 기준 토큰: ${missing.join(', ')}\n` +
        `프로토타입에서 var() 로 참조되므로 미정의 시 스타일이 조용히 누락된다.`,
    ).toEqual([]);
  });

  it.each([...prototypeTokens.keys()].map((name) => [name]))('%s 의 값이 기준과 일치한다', (name) => {
    if (!globalsTokens.has(name)) return; // 누락은 위 테스트가 보고한다

    expect(normalize(resolve(name, globalsTokens))).toBe(
      normalize(resolve(name, prototypeTokens)),
    );
  });
});
