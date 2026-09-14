"""로컬 개발용 실행 스크립트. Windows에서만 필요하다.

uvicorn 0.36+ 는 Windows 단일 프로세스에서 ProactorEventLoop를 하드코딩해
반환하는데(uvicorn/loops/asyncio.py), psycopg async가 이를 지원하지 않는다.
이벤트 루프 정책을 바꿔도 loop factory가 우선하므로 소용이 없다.
그래서 여기서 SelectorEventLoop를 직접 만들어 서버를 돌린다.

배포는 Dockerfile의 `uvicorn app.main:app` 을 그대로 쓴다(리눅스는 무관).

    python run_dev.py
"""

import asyncio
import sys

import uvicorn

if __name__ == "__main__":
    config = uvicorn.Config("app.main:app", host="127.0.0.1", port=8000)
    server = uvicorn.Server(config)

    if sys.platform == "win32":
        with asyncio.Runner(loop_factory=asyncio.SelectorEventLoop) as runner:
            runner.run(server.serve())
    else:
        server.run()