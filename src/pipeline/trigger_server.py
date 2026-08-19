import os
import sys
import threading
import subprocess
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from dotenv import load_dotenv

import requests

# 로컬 .env 로드
env_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(env_path)

app = FastAPI(title="Pipeline Trigger Server")

# 대시보드(웹)에서 직접 찔러야 할 수 있으므로 CORS 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # 보안이 필요하면 대시보드 도메인으로 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 전역 상태 관리
STATE = {
    "status": "idle", # idle, running, success, failed
    "startedAt": None,
    "finishedAt": None,
    "failedSteps": None
}

API_TOKEN = os.environ.get("PIPELINE_TRIGGER_TOKEN", "default-dev-token")
DEPLOY_HOOK_URL = os.environ.get("CLOUDFLARE_DEPLOY_HOOK_URL", "")

def verify_token(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid or missing token")
    token = authorization.split("Bearer ")[1]
    if token != API_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid token")

def run_pipeline():
    global STATE
    pipeline_dir = Path(__file__).parent
    
    try:
        # main.py 실행
        result = subprocess.run(
            [sys.executable, "main.py"],
            cwd=pipeline_dir,
            capture_output=True,
            text=True
        )
        
        STATE["finishedAt"] = datetime.now().isoformat()
        if result.returncode == 0:
            STATE["status"] = "success"
            STATE["failedSteps"] = []
            
            # 대시보드 정적 사이트(Cloudflare Pages 등) 자동 갱신을 위한 배포 훅 찌르기
            if DEPLOY_HOOK_URL:
                try:
                    res = requests.post(DEPLOY_HOOK_URL, timeout=10)
                    if res.status_code >= 400:
                        print(f"Deploy Hook 실패: {res.status_code} {res.text}")
                except Exception as hook_e:
                    print(f"Deploy Hook 요청 중 오류: {hook_e}")
                    
        else:
            STATE["status"] = "failed"
            # 오류 원인 파악을 위해 로그의 마지막 부분 저장
            all_logs = result.stdout.split('\n') + result.stderr.split('\n')
            # Extract names of steps that failed from logs if possible, otherwise use a generic message
            failed_lines = [line for line in all_logs if "실패" in line or "Error" in line]
            STATE["failedSteps"] = failed_lines[-5:] if failed_lines else ["Pipeline error"]
            
    except Exception as e:
        STATE["finishedAt"] = datetime.now().isoformat()
        STATE["status"] = "failed"
        STATE["failedSteps"] = [str(e)]

@app.post("/run", dependencies=[Depends(verify_token)])
def trigger_run():
    global STATE
    if STATE["status"] == "running":
        return {"message": "Pipeline is already running", "status": STATE["status"]}
    
    STATE["status"] = "running"
    STATE["startedAt"] = datetime.now().isoformat()
    STATE["finishedAt"] = None
    STATE["failedSteps"] = []
    
    thread = threading.Thread(target=run_pipeline)
    thread.daemon = True
    thread.start()
    
    return {"message": "Pipeline started", "status": "running"}

@app.get("/status", dependencies=[Depends(verify_token)])
def get_status():
    return STATE

if __name__ == "__main__":
    import uvicorn
    # 기본 포트 8080
    uvicorn.run("trigger_server:app", host="0.0.0.0", port=8080, reload=False)
