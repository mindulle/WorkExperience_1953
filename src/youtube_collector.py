#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""YouTube Data API v3 — 1953형제돼지국밥 영상·댓글 언급 수집.
[준비] Google Cloud Console → 'YouTube Data API v3' 사용 설정 → API 키 발급
       환경변수 YOUTUBE_API_KEY 또는 .env(YOUTUBE_API_KEY=...) 에 저장
[쿼터] 1일 10,000 units. search=100/회, commentThreads=1/회.
       아래 상한값으로 쿼터를 통제(기본: search 2페이지=200u + 댓글 소량).
[개인정보] 댓글 작성자명은 수집하지 않는다(텍스트·좋아요·날짜만).
"""
import os, csv, json
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen
from urllib.error import HTTPError

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
KEY=os.environ.get("YOUTUBE_API_KEY","여기에_API_KEY")
QUERY="1953형제돼지국밥"
MAX_SEARCH_PAGES=2        # 페이지당 50 → 2페이지=100영상=200units
COMMENTS_PER_VIDEO=20
MAX_COMMENT_VIDEOS=40     # 댓글 수집 영상 상한(쿼터 보호)
OUT_VID="youtube_videos.csv"; OUT_CMT="youtube_comments.csv"
BASE="https://www.googleapis.com/youtube/v3/"

def get(endpoint, **params):
    params["key"]=KEY
    return json.loads(urlopen(BASE+endpoint+"?"+urlencode(params),timeout=10).read().decode("utf-8"))

def main():
    if "여기에_" in KEY: raise SystemExit("YOUTUBE_API_KEY 설정 필요")
    videos=[]; token=None
    for _ in range(MAX_SEARCH_PAGES):
        p=dict(part="snippet", q=QUERY, type="video", maxResults=50, order="date")
        if token: p["pageToken"]=token
        r=get("search", **p)
        for it in r.get("items",[]):
            s=it["snippet"]; vid=it["id"].get("videoId")
            if not vid: continue
            videos.append({"videoId":vid,"제목":s["title"],"채널":s["channelTitle"],
                           "게시일":s["publishedAt"][:10],"설명":s.get("description","")[:200],
                           "URL":f"https://youtu.be/{vid}"})
        token=r.get("nextPageToken")
        if not token: break
    comments=[]
    for v in videos[:MAX_COMMENT_VIDEOS]:
        try:
            r=get("commentThreads", part="snippet", videoId=v["videoId"],
                  maxResults=COMMENTS_PER_VIDEO, order="relevance", textFormat="plainText")
        except HTTPError:
            continue   # 댓글 비활성/제한 영상은 건너뜀
        for it in r.get("items",[]):
            c=it["snippet"]["topLevelComment"]["snippet"]
            comments.append({"videoId":v["videoId"],"영상제목":v["제목"],
                             "댓글":c["textDisplay"].replace("\n"," ").strip(),
                             "좋아요":c.get("likeCount",0),"작성일":c["publishedAt"][:10]})
    with open(OUT_VID,"w",newline="",encoding="utf-8-sig") as f:
        w=csv.DictWriter(f,fieldnames=["videoId","제목","채널","게시일","설명","URL"]); w.writeheader(); w.writerows(videos)
    with open(OUT_CMT,"w",newline="",encoding="utf-8-sig") as f:
        w=csv.DictWriter(f,fieldnames=["videoId","영상제목","댓글","좋아요","작성일"]); w.writeheader(); w.writerows(comments)
    print(f"완료: 영상 {len(videos)} → {OUT_VID} / 댓글 {len(comments)} → {OUT_CMT}")

if __name__=="__main__": main()
