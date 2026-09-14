import os, json, time, httpx
from dotenv import load_dotenv, find_dotenv
from openai import OpenAI

load_dotenv(find_dotenv())  # 루트 .env 까지 올라가서 찾음
KEY, BASE = os.environ["GMS_API_KEY"], os.environ["GMS_BASE_URL"]
client = OpenAI(api_key=KEY, base_url=BASE)

# 1) 모델별 통과 여부·지연
for model in ["gpt-4o-mini", "gpt-4.1-mini", "gpt-4.1", "gpt-4o"]:
    try:
        t = time.time()
        res = client.chat.completions.create(model=model, max_tokens=10,
            messages=[{"role": "user", "content": "한 단어로 답해: 안녕"}])
        print(f"[OK]   {model:12s} {time.time()-t:.1f}s  {res.choices[0].message.content!r}")
    except Exception as e:
        print(f"[FAIL] {model:12s} {type(e).__name__}: {str(e)[:100]}")

# 0) 잔여 크레딧
r = httpx.get(
    "https://gms.ssafy.io/gmsapi/key-info",
    headers={
        "authorization": f"Bearer {KEY}",
        "User-Agent": "curl/8.0",
    },
)
print("[크레딧]", r.json())

# 2) JSON 모드
try:
    res = client.chat.completions.create(model="gpt-4o-mini",
        response_format={"type": "json_object"},
        messages=[{"role": "system", "content": "JSON으로만 답한다."},
                  {"role": "user", "content": '{"program_id":1,"eligible":true,"reason":"..."} 형식 예시 하나'}])
    print("[JSON OK]", json.loads(res.choices[0].message.content))
except Exception as e:
    print("[JSON FAIL]", type(e).__name__, str(e)[:150])