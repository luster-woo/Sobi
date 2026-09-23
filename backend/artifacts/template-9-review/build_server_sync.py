import json
from pathlib import Path

root=Path(__file__).resolve().parent
data=json.loads((root/'local-document-40.json').read_text(encoding='utf-8-sig'))
assert len(data['templates'])==1 and len(data['fields'])==53 and len(data['sources'])==24
payload=json.dumps(data,ensure_ascii=False,indent=2)
sql='''-- Snapshot of local program_document_id=40. Deploy updated AI code first.
-- Replaces Agent schema only. Does not update program_document.
-- Backup server data with export-local-document-40.sql before running.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $sync40$
DECLARE
    snapshot jsonb := $snapshot40$
__PAYLOAD__
$snapshot40$::jsonb;
    source_template jsonb;
    f jsonb;
    s jsonb;
    document_row record;
    target_id bigint;
    field_id bigint;
    template_count integer;
BEGIN
    source_template := snapshot->'templates'->0;
    SELECT * INTO document_row FROM program_document WHERE id=40 FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Server program_document 40 does not exist'; END IF;
    IF document_row.type IS DISTINCT FROM '작성용'
       OR document_row.doc_name IS DISTINCT FROM snapshot->'document'->>'doc_name' THEN
        RAISE EXCEPTION 'Server program_document 40 type/name differs from local document; verify identity';
    END IF;
    SELECT count(*) INTO template_count FROM document_template WHERE program_document_id=40;
    IF template_count>1 THEN RAISE EXCEPTION 'Multiple templates for document 40; choose one explicitly'; END IF;
    IF template_count=0 THEN
        INSERT INTO document_template(program_document_id,original_format,normalized_format,
            normalized_path,parse_status,parse_error,schema_version)
        VALUES(40,source_template->>'original_format',source_template->>'normalized_format',
            source_template->>'normalized_path',source_template->>'parse_status',
            source_template->>'parse_error',(source_template->>'schema_version')::integer)
        RETURNING id INTO target_id;
    ELSE
        SELECT id INTO target_id FROM document_template WHERE program_document_id=40 FOR UPDATE;
        UPDATE document_template SET original_format=source_template->>'original_format',
            normalized_format=source_template->>'normalized_format',normalized_path=source_template->>'normalized_path',
            parse_status=source_template->>'parse_status',parse_error=source_template->>'parse_error',
            schema_version=(source_template->>'schema_version')::integer,updated_at=CURRENT_TIMESTAMP
        WHERE id=target_id;
    END IF;
    DELETE FROM document_field_source WHERE field_schema_id IN
        (SELECT id FROM document_field_schema WHERE template_id=target_id);
    DELETE FROM document_field_schema WHERE template_id=target_id;
    FOR f IN SELECT value FROM jsonb_array_elements(snapshot->'fields') LOOP
        INSERT INTO document_field_schema(template_id,field_key,field_label,field_order,field_type,
            value_type,mapping_status,required,instruction,min_length,max_length,location_info,constraints)
        VALUES(target_id,f->>'field_key',f->>'field_label',(f->>'field_order')::integer,f->>'field_type',
            f->>'value_type',f->>'mapping_status',(f->>'required')::boolean,f->>'instruction',
            (f->>'min_length')::integer,(f->>'max_length')::integer,f->'location_info',NULLIF(f->'constraints','null'::jsonb))
        RETURNING id INTO field_id;
        FOR s IN SELECT value FROM jsonb_array_elements(snapshot->'sources')
                 WHERE value->>'field_schema_id'=f->>'id' LOOP
            INSERT INTO document_field_source(field_schema_id,source_type,source_key,required,priority,query_hint,source_params)
            VALUES(field_id,s->>'source_type',s->>'source_key',(s->>'required')::boolean,
                (s->>'priority')::integer,s->>'query_hint',NULLIF(s->'source_params','null'::jsonb));
        END LOOP;
    END LOOP;
    IF (SELECT count(*) FROM document_field_schema WHERE template_id=target_id)<>53
        OR (SELECT count(*) FROM document_field_source s JOIN document_field_schema f ON f.id=s.field_schema_id
            WHERE f.template_id=target_id)<>24 THEN
        RAISE EXCEPTION 'Field/source count mismatch';
    END IF;
    RAISE NOTICE 'Synced document 40 -> server template %, 53 fields / 24 sources',target_id;
END
$sync40$;
COMMIT;
SELECT t.id AS server_template_id,t.program_document_id,t.parse_status,t.normalized_path,
       (SELECT count(*) FROM document_field_schema f WHERE f.template_id=t.id) AS field_count,
       (SELECT count(*) FROM document_field_source s JOIN document_field_schema f ON f.id=s.field_schema_id
         WHERE f.template_id=t.id) AS source_count
FROM document_template t WHERE t.program_document_id=40;
'''.replace('__PAYLOAD__',payload)
(root/'sync-server-document-40.sql').write_text(sql,encoding='utf-8')
# Execute the exact SQL against session-private tables only; no persistent sequences or rows are changed.
setup='''BEGIN;
CREATE TEMP TABLE program_document (LIKE public.program_document INCLUDING ALL);
CREATE TEMP TABLE document_template (LIKE public.document_template INCLUDING ALL);
CREATE TEMP TABLE document_field_schema (LIKE public.document_field_schema INCLUDING ALL);
CREATE TEMP TABLE document_field_source (LIKE public.document_field_source INCLUDING ALL);
SET LOCAL search_path=pg_temp,public;
INSERT INTO pg_temp.program_document SELECT * FROM public.program_document WHERE id=40;
INSERT INTO pg_temp.document_template(id,program_document_id,original_format,normalized_format,
 normalized_path,parse_status,schema_version) VALUES(900,40,'HWP','HWPX','old-path','COMPLETED',1);
'''
body=sql[sql.index("SET LOCAL lock_timeout"):sql.index('COMMIT;')]
verify='''
DO $check$
BEGIN
 IF (SELECT id FROM pg_temp.document_template WHERE program_document_id=40)<>900 THEN
  RAISE EXCEPTION 'Server ID not preserved'; END IF;
 IF (SELECT count(*) FROM pg_temp.document_field_schema WHERE template_id=900)<>53 THEN
  RAISE EXCEPTION 'Bad target relation'; END IF;
END $check$;
SELECT 'TEMP_TABLE_SYNC_OK' AS result;
ROLLBACK;
'''
(root/'validate-server-sync.sql').write_text(setup+body+body+verify,encoding='utf-8')
print('Generated server sync SQL and temporary-table validation (including repeat execution).')
