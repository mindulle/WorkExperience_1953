"use client";

import React from "react";
import { RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  fetchPipelineStatus,
  isTriggerConfigured,
  triggerPipelineRun,
  type PipelineStatus,
} from "@/lib/pipelineTrigger";

type UiState =
  | { kind: "idle" }
  | { kind: "requesting" }
  | { kind: "running" }
  | { kind: "success"; failedSteps?: string[] }
  | { kind: "failed"; message: string };

const POLL_INTERVAL_MS = 6000;
const MAX_POLLS = 150; // 6초 * 150회 ≈ 15분. 이보다 오래 걸리면 폴링을 그만두고 안내만 한다.

export function RefreshButton() {
  const [state, setState] = React.useState<UiState>({ kind: "idle" });
  const pollCountRef = React.useRef(0);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // 상태를 반영하고, 계속 폴링해야 하면 true를 반환한다.
  const applyStatus = React.useCallback((status: PipelineStatus): boolean => {
    if (status.status === "running") {
      setState({ kind: "running" });
      return true;
    }
    if (status.status === "success") {
      setState({ kind: "success", failedSteps: status.failedSteps });
      return false;
    }
    if (status.status === "failed") {
      setState({
        kind: "failed",
        message:
          status.failedSteps && status.failedSteps.length > 0
            ? `실패한 단계: ${status.failedSteps.join(", ")}`
            : "실행 중 오류가 발생했습니다.",
      });
      return false;
    }
    // idle — 아직 시작 전이거나 서버 쪽 상태가 리셋된 경우. 폴링을 계속할 이유가 없다.
    setState({ kind: "idle" });
    return false;
  }, []);

  const poll = React.useCallback(() => {
    pollCountRef.current += 1;
    if (pollCountRef.current > MAX_POLLS) {
      setState({
        kind: "failed",
        message: "실행 확인이 너무 오래 걸리고 있어요. 잠시 후 직접 새로고침해보세요.",
      });
      return;
    }
    fetchPipelineStatus()
      .then((status) => {
        const keepPolling = applyStatus(status);
        if (keepPolling) {
          // eslint-disable-next-line
          timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
        }
      })
      .catch((err: unknown) => {
        setState({ kind: "failed", message: err instanceof Error ? err.message : "상태 확인 중 오류가 발생했습니다." });
      });
  }, [applyStatus]);

  const handleClick = React.useCallback(async () => {
    if (!isTriggerConfigured()) {
      setState({
        kind: "failed",
        message: "트리거 서버 주소가 아직 설정되지 않았습니다. 관리자에게 문의하세요.",
      });
      return;
    }
    setState({ kind: "requesting" });
    pollCountRef.current = 0;
    try {
      const status = await triggerPipelineRun();
      const keepPolling = applyStatus(status);
      // 시작 응답이 곧바로 success 가 아니라면(대부분 running) 한 번은 폴링을 건다.
      if (keepPolling || status.status !== "success") {
        timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
      }
    } catch (err) {
      setState({ kind: "failed", message: err instanceof Error ? err.message : "요청 중 오류가 발생했습니다." });
    }
  }, [applyStatus, poll]);

  const isBusy = state.kind === "requesting" || state.kind === "running";

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="primary"
        onClick={handleClick}
        disabled={isBusy}
        className="h-[38px] px-[13px] text-[12.5px] rounded-[10px]"
      >
        <RefreshCw className={`w-[14px] h-[14px] mr-1.5 ${isBusy ? "animate-spin" : ""}`} aria-hidden />
        {state.kind === "requesting" && "요청 중..."}
        {state.kind === "running" && "실행 중..."}
        {(state.kind === "idle" || state.kind === "success" || state.kind === "failed") && "데이터 갱신"}
      </Button>

      {state.kind === "success" && (
        <p className="flex items-center gap-1 text-[11px] text-[var(--good)]">
          <CheckCircle2 className="w-3 h-3 shrink-0" aria-hidden />
          {state.failedSteps && state.failedSteps.length > 0
            ? `완료 (일부 단계 실패: ${state.failedSteps.join(", ")}) — 사이트 반영까지 몇 분 걸릴 수 있어요`
            : "완료! 사이트 반영까지 몇 분 걸릴 수 있어요, 잠시 후 새로고침해보세요"}
        </p>
      )}
      {state.kind === "failed" && (
        <p className="flex items-center gap-1 text-[11px] text-[var(--critical)] text-right">
          <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden />
          {state.message}
        </p>
      )}
    </div>
  );
}
