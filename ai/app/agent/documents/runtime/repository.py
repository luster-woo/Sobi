from .errors import DocumentRuntimeError
from .models import RuntimeTemplate


class RuntimeRepository:
    def __init__(self, acquire=None):
        if acquire is None:
            from app.core import db
            acquire = db.acquire
        self.acquire = acquire

    async def load(self, template_id: int) -> RuntimeTemplate:
        try:
            async with self.acquire() as conn:
                async with conn.transaction():
                    # One MVCC snapshot across all three reads; no locks during source resolution.
                    await conn.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY")
                    template = await (await conn.execute("""
                        SELECT dt.id AS template_id, dt.program_document_id, pd.support_program_id,
                               pd.type AS document_type, dt.parse_status, dt.schema_version,
                               dt.normalized_format, dt.normalized_path
                        FROM document_template dt
                        JOIN program_document pd ON pd.id = dt.program_document_id
                        WHERE dt.id = %s
                    """, (template_id,))).fetchone()
                    if template is None:
                        raise DocumentRuntimeError("TEMPLATE_NOT_FOUND")
                    if template["parse_status"] != "COMPLETED":
                        raise DocumentRuntimeError("TEMPLATE_NOT_COMPLETED")
                    if template["document_type"] != "작성용":
                        raise DocumentRuntimeError("DOCUMENT_NOT_WRITABLE")
                    fields = await (await conn.execute("""
                        SELECT id, field_key, field_label, field_order, field_type, value_type,
                               mapping_status, required, instruction, min_length, max_length,
                               constraints, location_info
                        FROM document_field_schema WHERE template_id = %s ORDER BY field_order, id
                    """, (template_id,))).fetchall()
                    sources = await (await conn.execute("""
                        SELECT s.id, s.field_schema_id, s.source_type, s.source_key, s.required,
                               s.priority, s.query_hint, s.source_params
                        FROM document_field_source s
                        JOIN document_field_schema f ON f.id = s.field_schema_id
                        WHERE f.template_id = %s ORDER BY s.priority, s.id
                    """, (template_id,))).fetchall()
            grouped = {field["id"]: [] for field in fields}
            for source in sources:
                grouped[source["field_schema_id"]].append({key: value for key, value in source.items() if key != "field_schema_id"})
            return RuntimeTemplate.model_validate({**template, "fields": [
                {**field, "sources": grouped[field["id"]]} for field in fields]})
        except DocumentRuntimeError:
            raise
        except Exception:
            raise DocumentRuntimeError("SCHEMA_LOAD_FAILED") from None
