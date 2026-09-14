"""비동기 커넥션 풀. ORM 없이 raw SQL을 쓴다."""

import logging
from contextlib import asynccontextmanager

from pgvector.psycopg import register_vector_async
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool

from app.core import config

logger = logging.getLogger(__name__)

_pool: AsyncConnectionPool | None = None


async def _configure(conn) -> None:
    # 커넥션마다 vector 타입 어댑터를 등록해야 list[float] <-> VECTOR 변환이 된다.
    await register_vector_async(conn)


async def open_pool() -> None:
    global _pool
    if _pool is not None:
        return
    _pool = AsyncConnectionPool(
        config.DATABASE_URL,
        min_size=1,
        max_size=4,          # EC2 4vCPU. 늘릴 이유가 생기면 그때.
        configure=_configure,
        kwargs={"row_factory": dict_row},
        open=False,
    )
    await _pool.open(wait=True, timeout=10)
    logger.info("DB 풀 연결 완료: %s:%s/%s",
                config.POSTGRES_HOST, config.POSTGRES_PORT, config.POSTGRES_DB)


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


@asynccontextmanager
async def acquire():
    """커넥션 대여. `async with db.acquire() as conn:` 로 쓴다."""
    if _pool is None:
        raise RuntimeError("DB 풀이 열리지 않았다. lifespan 확인 필요")
    async with _pool.connection() as conn:
        yield conn


async def ping() -> bool:
    try:
        async with acquire() as conn:
            await conn.execute("SELECT 1")
        return True
    except Exception:
        logger.exception("DB ping 실패")
        return False