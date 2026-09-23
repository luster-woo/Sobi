from .errors import TemplatePreprocessingError


class TemplateRepository:
    """Short transactions only; never holds a connection during external work."""

    def __init__(self, acquire=None):
        if acquire is None:
            from app.core import db
            acquire = db.acquire
        self.acquire = acquire

    async def start(self, program_document_id, original_format):
        async with self.acquire() as conn:
            async with conn.transaction():
                document = await (await conn.execute(
                    "SELECT id, type FROM program_document WHERE id = %s FOR UPDATE",
                    (program_document_id,),
                )).fetchone()
                if document is None:
                    raise TemplatePreprocessingError("PROGRAM_DOCUMENT_NOT_FOUND")
                if document["type"] != "작성용":
                    raise TemplatePreprocessingError("DOCUMENT_NOT_WRITABLE")
                # Parent row serializes first creation too; unique index remains the final guard.
                template = await (await conn.execute("""
                    SELECT id, parse_status FROM document_template
                    WHERE program_document_id = %s AND schema_version = 1
                """, (program_document_id,))).fetchone()
                if template is None:
                    template = await (await conn.execute("""
                        INSERT INTO document_template
                            (program_document_id, original_format, schema_version, parse_status)
                        VALUES (%s, %s, 1, 'PENDING') RETURNING id
                    """, (program_document_id, original_format.value))).fetchone()
                elif template["parse_status"] == "PARSING":
                    raise TemplatePreprocessingError("PREPROCESSING_IN_PROGRESS")
                await conn.execute("""
                    UPDATE document_template SET original_format = %s, parse_status = 'PARSING',
                        parse_error = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = %s
                """, (original_format.value, template["id"]))
                return template["id"]

    async def normalized(self, template_id, result):
        await self._update("""
            UPDATE document_template SET normalized_format = %s, normalized_path = %s,
                updated_at = CURRENT_TIMESTAMP WHERE id = %s AND parse_status = 'PARSING'
            RETURNING id
        """, (result.normalized_format.value, result.normalized_path, template_id))

    async def completed(self, template_id):
        await self._update("""
            UPDATE document_template SET parse_status = 'COMPLETED', parse_error = NULL,
                updated_at = CURRENT_TIMESTAMP WHERE id = %s AND parse_status = 'PARSING'
            RETURNING id
        """, (template_id,))

    async def failed(self, template_id, message):
        await self._update("""
            UPDATE document_template SET parse_status = 'FAILED', parse_error = %s,
                updated_at = CURRENT_TIMESTAMP WHERE id = %s AND parse_status = 'PARSING'
            RETURNING id
        """, (message, template_id))

    async def _update(self, sql, params):
        async with self.acquire() as conn:
            async with conn.transaction():
                if await (await conn.execute(sql, params)).fetchone() is None:
                    raise TemplatePreprocessingError("TEMPLATE_STATE_CONFLICT")
