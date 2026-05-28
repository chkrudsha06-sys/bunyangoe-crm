import json

data = json.loads(open("/dev/stdin").read())
rows = data["rows"]

def fmt(n):
    if not n: return "-"
    return f"{int(n):,}"

html = """<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>분양회 회원 통합 리포트</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Pretendard',sans-serif;background:#f8fafc;color:#1e293b;padding:24px}
h1{font-size:22px;font-weight:900;margin-bottom:4px}
.sub{font-size:12px;color:#64748b;margin-bottom:20px}
.summary{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:24px}
.card{background:#fff;border-radius:12px;padding:16px;border:1px solid #e2e8f0;border-top:4px solid #3b82f6}
.card .label{font-size:10px;font-weight:700;color:#94a3b8;margin-bottom:4px}
.card .value{font-size:24px;font-weight:900;color:#1e293b}
.card .sub2{font-size:10px;color:#94a3b8;margin-top:2px}
.c2{border-top-color:#16a34a}.c3{border-top-color:#ea7c1e}.c4{border-top-color:#7c3aed}.c5{border-top-color:#d97706}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;font-size:11px}
thead{background:#1e3a5f;color:#fff}
th{padding:10px 8px;text-align:center;font-weight:700;font-size:10px;white-space:nowrap}
td{padding:8px 6px;text-align:center;border-bottom:1px solid #f1f5f9;vertical-align:middle}
tr:hover{background:#f8fafc}
.tag{display:inline-block;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:700}
.t-green{background:#dcfce7;color:#16a34a}.t-blue{background:#dbeafe;color:#2563eb}
.t-orange{background:#fef3c7;color:#d97706}.t-purple{background:#ede9fe;color:#7c3aed}
.t-red{background:#fee2e2;color:#dc2626}.t-gray{background:#f1f5f9;color:#94a3b8}
.bold{font-weight:800}
.right{text-align:right}
.detail{font-size:9px;color:#94a3b8;max-width:200px;word-break:break-all}
@media print{body{padding:8px}table{font-size:9px}}
</style>
</head>
<body>
<h1>📊 분양회 회원 통합 리포트</h1>
<p class="sub">총 {total}명 · 생성일: 2026.05.28</p>
""".format(total=len(rows))

# Summary cards
ht_total = sum(r["하이타겟_집행액"] for r in rows)
hog_total = sum(r["호갱노노_집행액"] for r in rows)
lms_total = sum(r["LMS_집행액"] for r in rows)
ht_mileage = sum(r["HT마일리지"] for r in rows)
ht_reward = sum(r["HT리워드"] for r in rows)
hog_reward = sum(r["호갱노노리워드"] for r in rows)
lms_reward = sum(r["LMS리워드"] for r in rows)
ad_total = ht_total + hog_total + lms_total

html += f"""<div class="summary">
<div class="card"><div class="label">총 회원수</div><div class="value">{len(rows)}명</div><div class="sub2">계약완료 {sum(1 for r in rows if r['계약상태']=='계약완료')} / 예약완료 {sum(1 for r in rows if r['계약상태']=='예약완료')}</div></div>
<div class="card c2"><div class="label">하이타겟 집행 총액</div><div class="value">{fmt(ht_total)}원</div><div class="sub2">마일리지 {fmt(ht_mileage)} / 리워드 {fmt(ht_reward)}</div></div>
<div class="card c3"><div class="label">호갱노노 집행 총액</div><div class="value">{fmt(hog_total)}원</div><div class="sub2">리워드 {fmt(hog_reward)}</div></div>
<div class="card c4"><div class="label">LMS 집행 총액</div><div class="value">{fmt(lms_total)}원</div><div class="sub2">리워드 {fmt(lms_reward)}</div></div>
<div class="card c5"><div class="label">광고 집행 총액</div><div class="value">{fmt(ad_total)}원</div><div class="sub2">리워드 총합 {fmt(ht_mileage+ht_reward+hog_reward+lms_reward)}</div></div>
</div>
"""

# Table
html += """<table>
<thead><tr>
<th>No</th><th>넘버링</th><th>고객명</th><th>직급</th><th>유입경로</th><th>대협팀</th><th>컨설턴트</th><th>계약상태</th><th>계약/예약일</th>
<th>하이타겟<br>집행액</th><th>하이타겟<br>상세</th><th>HT<br>마일리지</th><th>HT<br>리워드</th>
<th>호갱노노<br>집행액</th><th>호갱노노<br>상세</th><th>호갱노노<br>리워드</th>
<th>LMS<br>집행액</th><th>LMS<br>상세</th><th>LMS<br>리워드</th>
</tr></thead><tbody>
"""

for i, r in enumerate(rows, 1):
    status_cls = "t-green" if r["계약상태"] == "계약완료" else "t-blue"
    route = r["유입경로"] or "-"
    route_cls = "t-blue" if "VIP" in route else "t-orange" if "TM" in route else "t-purple" if "완판" in route else "t-gray"
    
    html += f"""<tr>
<td class="bold">{i}</td>
<td class="bold">{r['넘버링'] or '-'}</td>
<td class="bold">{r['고객명']}</td>
<td>{r['직급'] or '-'}</td>
<td><span class="tag {route_cls}">{route}</span></td>
<td>{r['대협팀담당'] or '-'}</td>
<td>{r['담당컨설턴트'] or '-'}</td>
<td><span class="tag {status_cls}">{r['계약상태']}</span></td>
<td>{r['계약/예약일'] or '-'}</td>
<td class="bold right">{fmt(r['하이타겟_집행액']) if r['하이타겟_집행액'] else '-'}</td>
<td class="detail">{r['하이타겟_상세'] or '-'}</td>
<td class="right">{fmt(r['HT마일리지']) if r['HT마일리지'] else '-'}</td>
<td class="right">{fmt(r['HT리워드']) if r['HT리워드'] else '-'}</td>
<td class="bold right">{fmt(r['호갱노노_집행액']) if r['호갱노노_집행액'] else '-'}</td>
<td class="detail">{r['호갱노노_상세'] or '-'}</td>
<td class="right">{fmt(r['호갱노노리워드']) if r['호갱노노리워드'] else '-'}</td>
<td class="bold right">{fmt(r['LMS_집행액']) if r['LMS_집행액'] else '-'}</td>
<td class="detail">{r['LMS_상세'] or '-'}</td>
<td class="right">{fmt(r['LMS리워드']) if r['LMS리워드'] else '-'}</td>
</tr>"""

html += """</tbody></table>
</body></html>"""

with open("/mnt/user-data/outputs/분양회_회원_통합리포트.html", "w") as f:
    f.write(html)
print("완료")
