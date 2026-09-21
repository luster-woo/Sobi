BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT jsonb_build_object(
 'document', (SELECT to_jsonb(p) FROM program_document p WHERE id=40),
 'templates', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM document_template t WHERE program_document_id=40),'[]'::jsonb),
 'fields', COALESCE((SELECT jsonb_agg(to_jsonb(f) ORDER BY f.template_id,f.field_order) FROM document_field_schema f JOIN document_template t ON t.id=f.template_id WHERE t.program_document_id=40),'[]'::jsonb),
 'sources', COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.field_schema_id,s.priority,s.id) FROM document_field_source s JOIN document_field_schema f ON f.id=s.field_schema_id JOIN document_template t ON t.id=f.template_id WHERE t.program_document_id=40),'[]'::jsonb)
);
COMMIT;
