class BatchDocumentRepository:
    def __init__(self, acquire=None):
        if acquire is None:
            from app.core import db
            acquire = db.acquire
        self.acquire = acquire

    async def list_documents(self):
        async with self.acquire() as conn:
            return await (await conn.execute("""
                SELECT pd.id AS program_document_id, dt.id AS template_id, dt.parse_status
                FROM program_document pd
                LEFT JOIN document_template dt
                    ON dt.program_document_id = pd.id AND dt.schema_version = 1
                WHERE pd.type = '작성용'
                ORDER BY pd.id
            """)).fetchall()
