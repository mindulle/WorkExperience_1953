#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""네이버 데이터랩 검색어트렌드 수집 — 브랜드·메뉴 관심도 추이.
- 같은 네이버 키(NAVER_ID/NAVER_SECRET) 사용. 애플리케이션에 '데이터랩' API 추가 필요.
- 결과는 절대 검색량이 아니라 기간 내 최대=100 기준 '상대비율'이다.
"""
import os, csv, json, datetime as dt
from pathlib import Path
from urllib.request import Request, urlopen

def _load_env():
    c=[]
    if os.environ.get("NAVER_ENV_FILE"): c.append(Path(os.environ["NAVER_ENV_FILE"]))
    c.append(Path(__file__).resolve().parent/".env")
    for p in c:
        if p.is_file():
            for ln in p.read_text(encoding="utf-8").splitlines():
                ln=ln.strip()
                if ln and not ln.startswith("#") and "=" in ln:
                    k,v=ln.split("=",1); os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
            break
_load_env()
CID=os.environ.get("NAVER_ID","여기에_CLIENT_ID"); CSEC=os.environ.get("NAVER_SECRET","여기에_CLIENT_SECRET")

START="2025-08-01"; END=dt.date.today().isoformat(); UNIT="month"   # date/week/month
GROUPS=[
 {"groupName":"1953형제돼지국밥","keywords":["1953형제돼지국밥","형제돼지국밥"]},
 {"groupName":"부산 돼지국밥","keywords":["부산 돼지국밥","돼지국밥 맛집"]},
]
OUT="datalab_trend.csv"

def main():
    if "여기에_" in CID: raise SystemExit("NAVER_ID/NAVER_SECRET 설정 필요")
    body=json.dumps({"startDate":START,"endDate":END,"timeUnit":UNIT,"keywordGroups":GROUPS}).encode("utf-8")
    req=Request("https://openapi.naver.com/v1/datalab/search", data=body)
    req.add_header("X-Naver-Client-Id",CID); req.add_header("X-Naver-Client-Secret",CSEC)
    req.add_header("Content-Type","application/json")
    res=json.loads(urlopen(req,timeout=10).read().decode("utf-8"))
    rows=[]
    for g in res.get("results",[]):
        for d in g.get("data",[]):
            rows.append([g["title"], d["period"], d["ratio"]])
    with open(OUT,"w",newline="",encoding="utf-8-sig") as f:
        w=csv.writer(f); w.writerow(["키워드그룹","기간","상대비율(0~100)"]); w.writerows(rows)
    print(f"완료: {len(rows)}행 → {OUT}")
    print("※ 값은 기간 내 최대=100 기준 상대치(절대 검색량 아님).")

if __name__=="__main__": main()
