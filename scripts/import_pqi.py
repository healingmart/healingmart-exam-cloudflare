#!/usr/bin/env python3
"""Convert the official KRIVET/PQI private-qualification CSV into Cloudflare static assets.
Usage: python scripts/import_pqi.py "C:\Downloads\pqi.csv"
No API keys or third-party packages. It never invents dates or state-accreditation.
"""
import argparse
import csv
import datetime as dt
import hashlib
import json
import re
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
DEST = BASE / "public" / "data"

ALIASES = {
    "name": ("자격명","자격증명","민간자격명","자격종목명","종목명"),
    "registration": ("등록번호","자격등록번호","민간자격등록번호","등록자격번호"),
    "agency": ("자격발급기관","자격관리기관","자격관리자","발급기관","관리기관","기관명","기관명칭"),
    "ministry": ("주무부처","소관부처","주무기관"),
    "region": ("지역","소재지","사업장소재지","기관소재지","시도"),
    "description": ("직무내용","자격직무내용","직무","자격정보","자격설명"),
    "status": ("등록상태","자격상태","운영상태","폐지여부","상태"),
    "accredited": ("공인여부","자격구분","등록구분","공인구분","공인상태"),
    "link": ("상세정보URL","상세정보URL주소","상세링크","원문URL","홈페이지","기관홈페이지")
}
def key(s):
    return re.sub(r"[\s_()\[\].·\-]+", "", str(s or "").strip().lower())
def columns(headers, overrides):
    by_key={key(s):s for s in headers}
    out={}
    for field,names in ALIASES.items():
        required = field in ("name","registration","agency")
        manual=overrides.get(field)
        chosen = (by_key.get(key(manual)) if manual else next((by_key.get(key(n)) for n in names if by_key.get(key(n))), None))
        if required and not chosen:
            raise ValueError(f"Required column missing for {field}. CSV headers={headers!r}. Use --{field}-column")
        out[field]=chosen
    return out
def load_rows(csv_path, encoding):
    guesses = [encoding] if encoding else ["utf-8-sig","cp949","euc-kr"]
    failure=None
    for enc in guesses:
        try:
            with csv_path.open("r",encoding=enc,newline="") as f:
                sample=f.read(4096)
                f.seek(0)
                delimiter = "\t" if sample.count("\t") > sample.count(",") else ","
                reader=csv.DictReader(f,delimiter=delimiter)
                rows=list(reader)
                if not reader.fieldnames or not rows:
                    raise ValueError("CSV is empty")
                return rows,reader.fieldnames,enc
        except UnicodeError as exc:
            failure=exc
    raise ValueError(f"CSV could not be decoded: {failure}")
def norm_type(row, cols):
    val=str(row.get(cols.get("accredited") or "", "") or "").strip()
    # registration != accreditation. Unrecognized statuses stay registered.
    if val and ("공인" in val and "미공인" not in val and "비공인" not in val and "공인신청" not in val):
        return "민간공인"
    return "민간등록"
def safe_http(value):
    v=str(value or "").strip()
    return v if re.match(r"^https?://",v,re.I) else ""
def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("csv",type=Path)
    parser.add_argument("--encoding",choices=["utf-8-sig","utf-8","cp949","euc-kr"])
    for field in ("name","registration","agency"):
        parser.add_argument("--"+field+"-column")
    parser.add_argument("--date",default=dt.date.today().isoformat(),help="CSV reference date YYYY-MM-DD; do not confuse with last sync")
    args=parser.parse_args()
    overrides={x:getattr(args,x+"_column") for x in ("name","registration","agency")}
    if not args.csv.is_file():parser.error(f"CSV not found: {args.csv}")
    rows,headers,encoding=load_rows(args.csv,args.encoding)
    cols=columns(headers,overrides)
    print("CSV encoding:",encoding,"columns:",{k:v for k,v in cols.items() if v})
    def field(row,n):
        return str(row.get(cols.get(n) or "", "") or "").strip()
    records=[]; details={}; duplicates=0; missing=0
    seen=set()
    for row in rows:
        name=field(row,"name")
        registration=field(row,"registration")
        agency=field(row,"agency")
        if not (name and registration and agency):
            missing+=1;continue
        # Distinct organizations can use similar names. Identity includes registration AND institution.
        identity=(registration,agency,name)
        if identity in seen:
            duplicates+=1;continue
        seen.add(identity)
        digest=hashlib.sha256("|".join(identity).encode("utf-8")).hexdigest()[:20]
        item_id=f"pqi-{digest}"
        shard=int(digest[:4],16)%256
        record={"id":item_id,"name":name,"registration":registration,"agency":agency,
                "type":norm_type(row,cols),"region":field(row,"region"),"shard":shard}
        records.append(record)
        desc=field(row,"description")
        status=field(row,"status") or "공식 원장 확인"
        entry={"name":name,"registration":registration,"agency":agency,"ministry":field(row,"ministry"),
               "region":field(row,"region"),"description":desc[:3000],"status":status,
               "type":record["type"],"source":"한국직업능력연구원 민간자격등록정보 CSV",
               "url":safe_http(field(row,"link")) or "https://www.pqi.or.kr/inf/qul/infQulList.do",
               "verified":args.date}
        details.setdefault(shard,{})[item_id]=entry
    if len(records)<100:
        raise ValueError(f"Safety guard: only {len(records)} records parsed. Do not replace live catalog.")
    records.sort(key=lambda r:(r["name"],r["agency"],r["registration"]))
    # Write after all validation to avoid half-published data.
    serialized={f"details/{i:03}.json":json.dumps(details.get(i,{}),ensure_ascii=False,separators=(",",":")) for i in range(256)}
    serialized["index.json"]=json.dumps({"records":records},ensure_ascii=False,separators=(",",":"))
    for name,content in serialized.items():
        if len(content.encode("utf-8"))>24*1024*1024:
            raise ValueError(f"Cloudflare asset limit exceeded: {name}")
    DEST.mkdir(parents=True,exist_ok=True)
    (DEST/"details").mkdir(exist_ok=True)
    for name,content in serialized.items():
        (DEST/name).write_text(content,encoding="utf-8")
    manifest={"mode":"pqi-csv","total":len(records)+2,"privateQualifications":len(records),
              "fullCatalog":True,"nationalQualifications":2,"lastSync":args.date,"source":"KRIVET/PQI CSV + validated Q-Net seed",
              "scheduleCount":0,"csvSha256":hashlib.sha256(args.csv.read_bytes()).hexdigest(),
              "duplicateRows":duplicates,"incompleteRows":missing}
    (DEST/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"imported":len(records),"duplicates":duplicates,"incomplete":missing,"indexBytes":len(serialized["index.json"].encode("utf-8"))},ensure_ascii=False))
if __name__=="__main__":
    try:main()
    except Exception as exc:sys.exit(f"IMPORT_FAILED: {exc}")
