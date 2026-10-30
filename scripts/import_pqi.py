#!/usr/bin/env python3
"""Build validated static PQI catalog from the officially downloadable KRIVET CSV.
No API key, database, runtime scraping, or non-standard Python dependency.
Usage: python scripts/import_pqi.py official.csv --date 2026-06-30
"""
import argparse
import csv
import datetime as dt
import hashlib
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlencode

ROOT = Path(__file__).resolve().parents[1] / "public" / "data"
FIELDS = {
    "name": ["자격명", "자격증명", "종목명"],
    "registration": ["등록번호", "자격등록번호"],
    "agency": ["자격관리기관", "자격발급기관", "발급기관"],
    "status": ["현재상태", "등록상태"],
    "ministry": ["주무부처", "소관부처"],
    "description": ["자격개요(직무내용)", "직무내용", "자격직무내용"],
    "grade": ["등급명", "등급"],
    "gradeDescription": ["등급별직무내용"],
    "accredited": ["공인여부"],
    "gradeAccredited": ["등급공인여부"],
    "website": ["기관홈페이지", "홈페이지"],
    "registeredAt": ["등록일자", "등록일"]
}
def clean(s): return re.sub(r"\s+","",str(s or ""))
def resolve(headers):
    labels={clean(h):h for h in headers}
    cols={name:next((labels[clean(c)] for c in candidates if clean(c) in labels),None) for name,candidates in FIELDS.items()}
    for required in ("name","registration","agency","status"):
        if not cols[required]: raise ValueError(f"Missing required column: {required}; headers={headers}")
    return cols
def read_csv(path):
    for encoding in ("utf-8-sig","cp949","euc-kr"):
        try:
            with path.open(encoding=encoding,newline="") as f:
                reader=csv.DictReader(f)
                if not reader.fieldnames: raise ValueError("Empty CSV")
                cols=resolve(reader.fieldnames)
                return list(reader),cols,encoding
        except UnicodeError: continue
    raise ValueError("Could not decode official CSV")
def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("file",type=Path)
    parser.add_argument("--date",required=True,help="Reference date of official CSV, YYYY-MM-DD")
    args=parser.parse_args()
    dt.date.fromisoformat(args.date)
    if not args.file.is_file(): raise ValueError("CSV does not exist: "+str(args.file))
    rows,cols,encoding=read_csv(args.file)
    def val(row,k):return str(row.get(cols[k],"") or "").strip() if cols.get(k) else ""
    stats={"registered":0,"closed":0,"canceled":0,"other":0,"invalid":0,"duplicates":0}
    records=[];details={};ids=set()
    for row in rows:
        status=val(row,"status")
        if status=="등록폐지":stats["closed"]+=1;continue
        if status=="등록취소":stats["canceled"]+=1;continue
        if status!="등록완료":stats["other"]+=1;continue
        stats["registered"]+=1
        name,reg,agency=val(row,"name"),val(row,"registration"),val(row,"agency")
        if not (name and reg and agency): stats["invalid"]+=1;continue
        uid=hashlib.sha256((reg+"|"+agency+"|"+name).encode()).hexdigest()[:20]
        key="pqi-"+uid
        if key in ids:stats["duplicates"]+=1;continue
        ids.add(key)
        shard=int(uid[:4],16)%256
        accreditation=val(row,"accredited")
        type_="민간공인" if accreditation in ("공인","부분공인") else "민간등록"
        yr,_,serial=reg.partition("-")
        link="https://www.pqi.or.kr/inf/qul/infQulList.do?"+urlencode({"searchQulRegYy":yr,"searchQulRegNum":serial}) if serial else "https://www.pqi.or.kr/inf/qul/infQulList.do"
        records.append({"id":key,"name":name,"agency":agency,"registration":reg,"type":type_,"shard":shard})
        details.setdefault(shard,{})[key]={
            "source":"한국직업능력연구원 민간자격등록정보","verified":args.date,
            "name":name,"agency":agency,"registration":reg,"type":type_,
            "status":"등록완료","ministry":val(row,"ministry"),
            "grade":val(row,"grade"),"gradeAccredited":val(row,"gradeAccredited"),
            "accreditedScope":accreditation,"registeredAt":val(row,"registeredAt"),
            "website":val(row,"website"),
            "description":(val(row,"description") or val(row,"gradeDescription"))[:4500],
            "url":link
        }
    if not (50000<=len(records)<=100000): raise ValueError(f"Safety guard: unexpected active count {len(records)}. Published files not touched.")
    if sum(stats[k] for k in ("registered","closed","canceled","other"))!=len(rows): raise ValueError("Row classification mismatch")
    records.sort(key=lambda r:(r["name"],r["agency"],r["registration"]))
    objects={"index.json":{"records":records},"manifest.json":{
        "mode":"pqi-csv","fullCatalog":True,
        "total":len(records)+2,"privateQualifications":len(records),"nationalQualifications":2,
        "lastSync":args.date,"sourceAsOf":args.date,"source":"KRIVET/PQI official registered qualifications CSV",
        "scheduleCount":len(json.loads((ROOT/"schedule.json").read_text(encoding="utf-8"))["events"]),
        "officialPrivateTotal":67236,"officialPrivateAsOf":"2026-10-02",
        "officialPrivateSource":"https://pqi.or.kr/inf/qul/infQulSitRegView.do",
        "csvSha256":hashlib.sha256(args.file.read_bytes()).hexdigest(),
        "importedRows":len(rows),"statusCounts":stats
    }}
    for shard in range(256):
        objects[f"details/{shard:03}.json"]=details.get(shard,{})
    serialized={key:json.dumps(obj,ensure_ascii=False,separators=(",",":")) for key,obj in objects.items()}
    for name,content in serialized.items():
        if len(content.encode("utf-8"))>=24*1024*1024:raise ValueError("Oversized Cloudflare static asset: "+name)
    ROOT.mkdir(parents=True,exist_ok=True)
    (ROOT/"details").mkdir(exist_ok=True)
    for name,content in serialized.items():
        (ROOT/name).write_text(content+"\n",encoding="utf-8")
    print(json.dumps({"encoding":encoding,"sourceRows":len(rows),"activeSearchRecords":len(records),"statusCounts":stats,"indexBytes":len(serialized["index.json"].encode("utf-8"))},ensure_ascii=True))
if __name__=="__main__":
    try:main()
    except Exception as e:sys.exit("IMPORT_FAILED: "+str(e))
