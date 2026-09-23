import json

from pydantic import ValidationError

from ..schema_analyzer.enums import FieldSemanticType
from ..schema_analyzer.models import SchemaAnalysisResult
from .errors import SchemaPersistenceError
from .models import PersistedDocumentSchema, StoredLocationInfo


class DocumentSchemaPersistenceService:
    """Replace one template snapshot using the existing async psycopg pool."""

    def __init__(self, acquire=None):
        if acquire is None:
            from app.core import db
            acquire = db.acquire
        self.acquire = acquire

    async def persist(self, template_id: int, result: SchemaAnalysisResult) -> PersistedDocumentSchema:
        if type(template_id) is not int or not 0 < template_id <= 9223372036854775807:
            raise SchemaPersistenceError("INVALID_SCHEMA_INPUT")
        try:
            # Rebuild nested models to defend against mutations/model_construct.
            snapshot = SchemaAnalysisResult.model_validate(result.model_dump(mode="json"))
            fields = []
            keys = set()
            for joined in snapshot.fields:
                field = joined.analysis
                if field.semantic_type == FieldSemanticType.IGNORE:
                    continue
                if (field.candidate_id != joined.candidate.candidate_id
                        or field.field_key in keys or len(field.field_key) > 100
                        or field.field_label is None or len(field.field_label) > 255):
                    raise ValueError("Invalid DB field contract")
                keys.add(field.field_key)
                location = StoredLocationInfo(
                    target_location=joined.candidate.target_location,
                    current_text=joined.candidate.current_text,
                    input_shape=joined.candidate.input_shape,
                    hints=joined.candidate.hints,
                )
                # Encode before deleting anything; JSONB casts use bound parameters.
                location_json = json.dumps(location.model_dump(mode="json"), ensure_ascii=False, allow_nan=False)
                sources = [(source, json.dumps(source.source_params, ensure_ascii=False, allow_nan=False))
                           for source in field.sources]
                fields.append((field, location_json, sources))
        except (ValidationError, ValueError, TypeError, AttributeError):
            raise SchemaPersistenceError("INVALID_SCHEMA_INPUT") from None

        try:
            async with self.acquire() as conn:
                async with conn.transaction():
                    # Serialize replacements of the same template; enforce existing domain rule.
                    template = await (await conn.execute("""
                        SELECT dt.id, pd.type AS document_type
                        FROM document_template dt
                        JOIN program_document pd ON pd.id = dt.program_document_id
                        WHERE dt.id = %s
                        FOR UPDATE OF dt, pd
                    """, (template_id,))).fetchone()
                    if template is None:
                        raise SchemaPersistenceError("DOCUMENT_TEMPLATE_NOT_FOUND")
                    if template["document_type"] != "작성용":
                        raise SchemaPersistenceError("DOCUMENT_NOT_WRITABLE")
                    # V19 source FK has ON DELETE CASCADE.
                    await conn.execute("DELETE FROM document_field_schema WHERE template_id = %s", (template_id,))
                    for order, (field, location_json, sources) in enumerate(fields):
                        saved = await (await conn.execute("""
                            INSERT INTO document_field_schema
                                (template_id, field_key, field_label, field_order, field_type,
                                 value_type, mapping_status, required, instruction, location_info)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb)
                            RETURNING id
                        """, (template_id, field.field_key, field.field_label, order,
                              field.semantic_type.value, field.value_type.value, field.mapping_status.value,
                              field.required, field.instruction, location_json))).fetchone()
                        for source, params_json in sources:
                            await conn.execute("""
                                INSERT INTO document_field_source
                                    (field_schema_id, source_type, source_key, required,
                                     priority, query_hint, source_params)
                                VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb)
                            """, (saved["id"], source.source_type.value, source.source_key.value,
                                  source.required, source.priority, source.query_hint, params_json))
        except SchemaPersistenceError:
            raise
        except Exception:
            # Includes transaction/commit failures; transaction exits before translation.
            raise SchemaPersistenceError() from None
        return PersistedDocumentSchema(
            template_id=template_id, field_count=len(fields),
            source_count=sum(len(sources) for _, _, sources in fields),
            ignored_count=len(snapshot.fields) - len(fields),
        )
