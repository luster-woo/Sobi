"""SourceKey 추가 시 이 등록표와 필요한 resolver/provider 매핑만 확장한다."""

from .enums import FieldType, SourceKey, SourceType
from .registry import SourceDefinition, SourceRegistry
from .resolvers import (
    AmountResolver, business_age, direct, insurance_enrolled,
    rag_placeholder,
)


def build_registry() -> SourceRegistry:
    registry = SourceRegistry()
    registry.register(SourceKey.USER_NAME, SourceDefinition(
        SourceType.USER, FieldType.DIRECT, direct,
    ))
    registry.register(SourceKey.USER_EMAIL, SourceDefinition(
        SourceType.USER, FieldType.DIRECT, direct,
    ))
    registry.register(SourceKey.CREDIT_RATING, SourceDefinition(
        SourceType.USER, FieldType.DIRECT, direct,
    ))
    registry.register(SourceKey.BUSINESS_BRN, SourceDefinition(
        SourceType.BUSINESS, FieldType.DIRECT, direct,
    ))
    registry.register(SourceKey.BUSINESS_NAME, SourceDefinition(
        SourceType.BUSINESS, FieldType.DIRECT, direct,
    ))
    registry.register(SourceKey.BUSINESS_ADDRESS, SourceDefinition(
        SourceType.BUSINESS, FieldType.DIRECT, direct,
    ))
    registry.register(SourceKey.BUSINESS_REGION, SourceDefinition(
        SourceType.BUSINESS, FieldType.DIRECT, direct,
    ))
    registry.register(SourceKey.BUSINESS_CATEGORY, SourceDefinition(
        SourceType.BUSINESS, FieldType.DIRECT, direct,
    ))
    registry.register(SourceKey.EMPLOYEE_COUNT, SourceDefinition(
        SourceType.BUSINESS, FieldType.DIRECT, direct,
    ))
    registry.register(SourceKey.OPEN_DATE, SourceDefinition(
        SourceType.BUSINESS, FieldType.DIRECT, direct,
    ))
    registry.register(SourceKey.BUSINESS_AGE_MONTHS, SourceDefinition(
        SourceType.BUSINESS, FieldType.COMPUTED, business_age,
    ))
    registry.register(SourceKey.REVENUE_SUM, SourceDefinition(
        SourceType.MYDATA, FieldType.COMPUTED, AmountResolver("revenue"),
    ))
    registry.register(SourceKey.REVENUE_AVERAGE, SourceDefinition(
        SourceType.MYDATA, FieldType.COMPUTED, AmountResolver("revenue", average=True),
    ))
    registry.register(SourceKey.TAX_SUM, SourceDefinition(
        SourceType.MYDATA, FieldType.COMPUTED, AmountResolver("tax"),
    ))
    registry.register(SourceKey.TAX_AVERAGE, SourceDefinition(
        SourceType.MYDATA, FieldType.COMPUTED, AmountResolver("tax", average=True),
    ))
    registry.register(SourceKey.INSURANCE_LIST, SourceDefinition(
        SourceType.MYDATA, FieldType.DIRECT, direct,
    ))
    registry.register(SourceKey.INSURANCE_ENROLLED, SourceDefinition(
        SourceType.MYDATA, FieldType.COMPUTED, insurance_enrolled,
    ))
    registry.register(SourceKey.PROGRAM_NAME, SourceDefinition(
        SourceType.PROGRAM, FieldType.DIRECT, direct,
    ))
    registry.register(SourceKey.PROGRAM_ORGANIZATION, SourceDefinition(
        SourceType.PROGRAM, FieldType.DIRECT, direct,
    ))
    registry.register(SourceKey.PROGRAM_EXECUTION_ORGANIZATION, SourceDefinition(
        SourceType.PROGRAM, FieldType.DIRECT, direct,
    ))
    registry.register(SourceKey.PROGRAM_TYPE, SourceDefinition(
        SourceType.PROGRAM, FieldType.DIRECT, direct,
    ))
    registry.register(SourceKey.PROGRAM_START_DATE, SourceDefinition(
        SourceType.PROGRAM, FieldType.DIRECT, direct,
    ))
    registry.register(SourceKey.PROGRAM_END_DATE, SourceDefinition(
        SourceType.PROGRAM, FieldType.DIRECT, direct,
    ))
    registry.register(SourceKey.PROGRAM_SUMMARY, SourceDefinition(
        SourceType.PROGRAM, FieldType.DIRECT, direct,
    ))
    registry.register(SourceKey.PROGRAM_APPLICATION_METHOD, SourceDefinition(
        SourceType.PROGRAM, FieldType.DIRECT, direct,
    ))
    registry.register(SourceKey.PROGRAM_REFERENCE, SourceDefinition(
        SourceType.PROGRAM, FieldType.DIRECT, direct,
    ))
    registry.register(SourceKey.PROGRAM_MIN_BALANCE, SourceDefinition(
        SourceType.PROGRAM, FieldType.DIRECT, direct,
    ))
    registry.register(SourceKey.PROGRAM_MAX_BALANCE, SourceDefinition(
        SourceType.PROGRAM, FieldType.DIRECT, direct,
    ))
    registry.register(SourceKey.PROGRAM_INTEREST_RATE, SourceDefinition(
        SourceType.PROGRAM, FieldType.DIRECT, direct,
    ))
    registry.register(SourceKey.PROGRAM_RAG, SourceDefinition(
        SourceType.RAG, FieldType.GENERATED, rag_placeholder,
    ))
    return registry

