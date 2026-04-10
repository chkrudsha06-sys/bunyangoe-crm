import json
import urllib.request
import urllib.error

SUPABASE_URL = "https://rlpdhufcsuewvwluydky.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJscGRodWZjc3Vld3Z3bHV5ZGt5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTc3NDYzNywiZXhwIjoyMDkxMzUwNjM3fQ.7fqdUa085rW3uYkxT96IhQrOHI02tFHU-PbjgLD36Fk"

headers = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json; charset=utf-8",
    "Prefer": "return=minimal"
}

with open("data.json", "r", encoding="utf-8") as f:
    data = json.load(f)

print(f"총 {len(data)}건 임포트 시작...")

BATCH = 200
success = 0

for i in range(0, len(data), BATCH):
    batch = data[i:i+BATCH]
    body = json.dumps(batch, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/contacts",
        data=body,
        headers=headers,
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as res:
            success += len(batch)
            print(f"  ✅ {min(i+BATCH, len(data))}/{len(data)} 완료")
    except urllib.error.HTTPError as e:
        print(f"  ❌ 오류: {e.read().decode('utf-8')[:200]}")

print(f"\n✅ 완료: {success}건 성공")