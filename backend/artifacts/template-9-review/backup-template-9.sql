-- Read-only snapshot: save this query's single JSON value before replacement.
SELECT jsonb_build_object(
    'template', (SELECT to_jsonb(t) FROM document_template t WHERE id = 9),
    'fields', COALESCE((SELECT jsonb_agg(to_jsonb(f) ORDER BY field_order)
                         FROM document_field_schema f WHERE template_id = 9), '[]'::jsonb),
    'sources', COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.id)
                          FROM document_field_source s
                          JOIN document_field_schema f ON f.id = s.field_schema_id
                         WHERE f.template_id = 9), '[]'::jsonb)
);
