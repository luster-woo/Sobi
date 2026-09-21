"""Apply narrowly scoped Agent changes; run only with ai write permission."""
from pathlib import Path

AI = Path(__file__).resolve().parents[3] / 'ai'

def edit(relative, old, new):
    path = AI / relative
    text = path.read_text(encoding='utf-8')
    assert text.count(old) == 1, (relative, old)
    path.write_text(text.replace(old, new), encoding='utf-8')

edit('app/agent/documents/candidates/inline.py',
     '[가-힣A-Za-z0-9 _-]{0,39}?)', '[가-힣A-Za-z0-9 _-]{0,39}?(?:\\([^()\\r\\n]{1,20}\\))?)')
edit('app/agent/documents/candidates/inline.py', 'if len(matches) < 2 or', 'if not matches or')
edit('app/agent/documents/candidates/inline.py',
     'Two or more label:blank groups followed by a fixed parenthesized suffix.',
     'One or more label:blank groups followed by a fixed parenthesized suffix.')
edit('app/agent/documents/candidates/inline.py', 'def extract_inline(parsed):', '''DATE_LINE = re.compile(r" *(?P<year>[12][0-9]{3})년(?P<month> {2,})월(?P<day> {2,})일 *")


def inline_regions(text):
    for match in regions(text):
        yield match.group("label"), *match.span("blank"), "SHORT_TEXT", {"target_kind": "inline_blank"}
    date = DATE_LINE.fullmatch(text)
    if date:
        for part, label in (("month", "월"), ("day", "일")):
            yield label, *date.span(part), "DATE", {"target_kind": "inline_blank",
                "date_part": part, "fixed_year": int(date.group("year"))}


def extract_inline(parsed):''')
edit('app/agent/documents/candidates/inline.py',
     'for match in regions(paragraph.text):\n                start, end = match.span("blank")',
     'for label, start, end, shape, hints in inline_regions(paragraph.text):')
edit('app/agent/documents/candidates/inline.py', '                label = match.group("label")\n', '')
edit('app/agent/documents/candidates/inline.py',
     'current_text=paragraph.text[start:end], input_shape="SHORT_TEXT",\n                    context=paragraph.text, confidence=0.8, hints={"target_kind": "inline_blank"})',
     'current_text=paragraph.text[start:end], input_shape=shape,\n                    context=paragraph.text, confidence=0.8, hints=hints)')

edit('app/agent/sources/enums.py', '    PROGRAM_NAME = "PROGRAM_NAME"',
     '    PROGRAM_DRAFT_DATE = "PROGRAM_DRAFT_DATE"\n    PROGRAM_NAME = "PROGRAM_NAME"')
edit('app/agent/sources/models.py', '    support_program_id: PositiveId | None = None',
     '    support_program_id: PositiveId | None = None\n    draft_date: date | None = None')
edit('app/agent/sources/resolvers.py', 'async def direct(context, request, provider, today):', '''async def draft_date(context, request, provider, today):
    EmptyParams.model_validate(request.source_params)
    if context.draft_date is None:
        raise SourceError("DRAFT_DATE_REQUIRED", "초안 요청 기준일이 필요합니다.")
    return result(request, context.draft_date, timezone="Asia/Seoul")


async def direct(context, request, provider, today):''')
edit('app/agent/sources/defaults.py', '    return registry', '''    from .resolvers import draft_date
    registry.register(SourceKey.PROGRAM_DRAFT_DATE, SourceDefinition(
        SourceType.PROGRAM, FieldType.DIRECT, draft_date,
    ))
    return registry''')
edit('app/agent/documents/schema_analyzer/catalog.py',
     'AmountResolver, direct, business_age, insurance_enrolled, rag_placeholder',
     'AmountResolver, direct, business_age, insurance_enrolled, rag_placeholder, draft_date')
edit('app/agent/documents/schema_analyzer/catalog.py',
     'USER_FACT_DESCRIPTIONS = {',
     'USER_FACT_DESCRIPTIONS = {\n    SourceKey.PROGRAM_DRAFT_DATE: "Draft creation date in Asia/Seoul, fixed once per request. For application date blanks only; never birth dates, program dates or historical events. DATE value; no database query.",')
edit('app/agent/documents/schema_analyzer/catalog.py',
     '(direct, business_age, insurance_enrolled, rag_placeholder):',
     '(direct, business_age, insurance_enrolled, rag_placeholder, draft_date):')
edit('app/agent/documents/runtime/service.py',
     'from pydantic import ValidationError',
     'from datetime import datetime, timedelta, timezone\n\nfrom pydantic import ValidationError')
edit('app/agent/documents/runtime/service.py',
     '    async def resolve(self, request: DocumentRuntimeRequest) -> DocumentRuntimeResult:\n',
     '    async def resolve(self, request: DocumentRuntimeRequest) -> DocumentRuntimeResult:\n        draft_date = datetime.now(timezone(timedelta(hours=9))).date()\n')
edit('app/agent/documents/runtime/service.py',
     'support_program_id=template.support_program_id)',
     'support_program_id=template.support_program_id, draft_date=draft_date)')
edit('app/agent/documents/writer/inline.py',
     '    if field.value_type != "TEXT":\n        raise Error("VALUE_TYPE_UNSUPPORTED")\n    text = format_value(field)',
     '''    if field.value_type == "DATE":
        from .hwpx import parse_date
        import re
        match = re.fullmatch(r" *(?P<year>[12][0-9]{3})년(?P<month> {2,})월(?P<day> {2,})일 *", expected)
        hints = info.get("hints", {})
        part = hints.get("date_part")
        if (match is None or part not in {"month", "day"}
                or match.span(part) != (start, end)
                or type(hints.get("fixed_year")) is not int
                or hints["fixed_year"] != int(match.group("year"))):
            raise Error("DATE_PLACEHOLDER_UNSUPPORTED")
        value = parse_date(field.value)
        if value.year != hints["fixed_year"]:
            raise Error("DATE_YEAR_MISMATCH")
        text = " " + str(getattr(value, part))
    elif field.value_type == "TEXT":
        text = format_value(field)
    else:
        raise Error("VALUE_TYPE_UNSUPPORTED")''')
print('Updated Agent inline extraction, request date source, and Writer.')
