"""기존 app.core.db 풀을 사용하는 읽기 전용 어댑터.

컬럼 이름은 이 모듈에서 논리 SourceKey로 변환된다.
SQL 식별자는 고정된 개발자 매핑이며 외부 source_params를 SQL에 보간하지 않는다.
"""

from .enums import SourceKey, SourceType
from .errors import SourceError
from .provider import MonthlyAmounts, SourceData

USER_FIELDS = {
    SourceKey.USER_NAME: "name", SourceKey.USER_EMAIL: "email",
    SourceKey.CREDIT_RATING: "credit_rating",
}
BUSINESS_FIELDS = {
    SourceKey.BUSINESS_BRN: "b.brn", SourceKey.BUSINESS_NAME: "b.business_name",
    SourceKey.BUSINESS_ADDRESS: "b.address", SourceKey.BUSINESS_REGION: "b.region",
    SourceKey.BUSINESS_CATEGORY: "mc.name", SourceKey.EMPLOYEE_COUNT: "b.employee_count",
    SourceKey.OPEN_DATE: "b.open_date",
}
PROGRAM_FIELDS = {
    SourceKey.PROGRAM_NAME: "pblanc_nm",
    SourceKey.PROGRAM_ORGANIZATION: "jrsdinstt_nm",
    SourceKey.PROGRAM_EXECUTION_ORGANIZATION: "excinstt_nm",
    SourceKey.PROGRAM_TYPE: "type", SourceKey.PROGRAM_START_DATE: "start_date",
    SourceKey.PROGRAM_END_DATE: "end_date", SourceKey.PROGRAM_SUMMARY: "bsns_sumry_cn",
    SourceKey.PROGRAM_APPLICATION_METHOD: "reqst_mth_papers_cn",
    SourceKey.PROGRAM_REFERENCE: "refrnc_nm",
    SourceKey.PROGRAM_MIN_BALANCE: "min_balance", SourceKey.PROGRAM_MAX_BALANCE: "max_balance",
    SourceKey.PROGRAM_INTEREST_RATE: "interest_rate",
}


def columns(mapping):
    return ", ".join(f'{column} AS "{key.value}"' for key, column in mapping.items())


def values(row, mapping):
    return {key: row[key.value] for key in mapping}


def require_id(context, name):
    value = getattr(context, name)
    if value is None:
        raise SourceError("MISSING_CONTEXT_ID", f"{name}가 필요합니다.")
    return value


class PostgresDataProvider:
    def __init__(self, acquire=None):
        if acquire is None:
            from app.core import db
            acquire = db.acquire
        self.acquire = acquire
        self._loaders = {
            SourceType.USER: self._user,
            SourceType.BUSINESS: self._business,
            SourceType.MYDATA: self._mydata,
            SourceType.PROGRAM: self._program,
        }

    async def fetch(self, source_type, context, *, start=None, end=None):
        loader = self._loaders.get(source_type)
        if loader is None:
            raise SourceError("UNSUPPORTED_SOURCE_TYPE", "지원하지 않는 데이터 영역입니다.")
        return await loader(context, start=start, end=end)

    async def _one(self, sql, params, entity):
        async with self.acquire() as conn:
            row = await (await conn.execute(sql, params)).fetchone()
        if row is None:
            raise SourceError(f"{entity}_NOT_FOUND", {
                "USER": "사용자를 찾을 수 없습니다.",
                "BUSINESS": "사업체를 찾을 수 없습니다.",
                "PROGRAM": "지원사업을 찾을 수 없습니다.",
                "MYDATA": "연결된 마이데이터가 없습니다.",
            }[entity], missing=True)
        return row

    async def _all(self, sql, params):
        async with self.acquire() as conn:
            return await (await conn.execute(sql, params)).fetchall()

    async def _user(self, context, **kwargs):
        uid = require_id(context, "user_id")
        row = await self._one(
            f"SELECT {columns(USER_FIELDS)} FROM users WHERE id = %s AND deleted_at IS NULL",
            (uid,), "USER",
        )
        return SourceData(values=values(row, USER_FIELDS))

    async def _business(self, context, **kwargs):
        uid = require_id(context, "user_id")
        await self._user(context)
        rows = await self._all(
            f"SELECT {columns(BUSINESS_FIELDS)} "
            "FROM business_info b LEFT JOIN minor_code mc ON mc.id = b.business_code_id "
            "WHERE b.user_id = %s", (uid,),
        )
        if not rows:
            raise SourceError("BUSINESS_NOT_FOUND", "사업체를 찾을 수 없습니다.", missing=True)
        if len(rows) != 1:
            raise SourceError(
                "DATA_INTEGRITY_ERROR", "사용자에게 여러 사업체가 연결되어 있습니다."
            )
        return SourceData(values=values(rows[0], BUSINESS_FIELDS))

    async def _program(self, context, **kwargs):
        pid = require_id(context, "support_program_id")
        row = await self._one(
            f"SELECT {columns(PROGRAM_FIELDS)} FROM support_program WHERE id = %s",
            (pid,), "PROGRAM",
        )
        return SourceData(values=values(row, PROGRAM_FIELDS))

    async def _mydata(self, context, *, start=None, end=None):
        business = await self._business(context)
        linked = await self._one(
            "SELECT id FROM mydata WHERE brn = %s",
            (business.values[SourceKey.BUSINESS_BRN],), "MYDATA",
        )
        mid = linked["id"]
        if start is not None and end is not None:
            rows = await self._all(
                "SELECT period, revenue, tax FROM mydata_tax "
                "WHERE mydata_id = %s AND period >= %s AND period < %s ORDER BY period",
                (mid, start, end),
            )
            return SourceData(monthly_amounts=[MonthlyAmounts(**row) for row in rows])
        rows = await self._all(
            "SELECT DISTINCT i.id AS policy_id, i.name AS title "
            "FROM mydata_insurance mi JOIN insurance i ON i.id = mi.insurance_id "
            "WHERE mi.mydata_id = %s ORDER BY policy_id", (mid,),
        )
        return SourceData(values={SourceKey.INSURANCE_LIST: rows})

