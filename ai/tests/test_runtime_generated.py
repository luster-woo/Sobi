import json
from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase
from unittest.mock import AsyncMock
from test_document_runtime import field, source, template, value, LOCATION
from app.agent.documents.runtime import DocumentAgentRuntime, DocumentRuntimeRequest

class GeneratedTests(IsolatedAsyncioTestCase):
    def setUp(self):
        self.gms = SimpleNamespace(generate=AsyncMock(return_value=json.dumps(dict(status='GENERATED',content='기업입니다.',missing_information=[]))))
        self.sources = SimpleNamespace(resolve_source=AsyncMock(return_value=value()))
        self.repo = SimpleNamespace(load=AsyncMock())
        self.runtime = DocumentAgentRuntime(repository=self.repo, source_resolver=self.sources,gms_client=self.gms)
    async def run_field(self, f=None, others=()):
        self.repo.load.return_value=template(f or field(type='GENERATED'), *others)
        self.output=await self.runtime.resolve(DocumentRuntimeRequest(template_id=1,user_id=9))
        return self.output.fields[0]
    async def test_success(self):
        r=await self.run_field();self.assertEqual((r.runtime_status,r.value),('RESOLVED','기업입니다.'));self.assertTrue(self.output.ready_for_write)
    async def test_location_unchanged_and_private(self):
        r=await self.run_field();self.assertEqual(r.location_info,LOCATION)
        payload=json.loads(self.gms.generate.call_args.kwargs['user_payload'])
        self.assertEqual(set(payload),{'field_key','field_label','instruction','constraints','min_length','max_length','structured_facts','rag_context'})
        self.assertNotIn('native_ref',json.dumps(payload))
    async def test_multiple_contexts(self):
        self.sources.resolve_source.side_effect=[value(),value('주소',key='BUSINESS_ADDRESS')]
        await self.run_field(field(type='GENERATED',sources=[source(),source(key='BUSINESS_ADDRESS',id=11,priority=2)]))
        self.assertEqual(len(json.loads(self.gms.generate.call_args.kwargs['user_payload'])['structured_facts']),2)
    async def test_required_missing(self):
        self.sources.resolve_source.return_value=value(None,False)
        r=await self.run_field();self.assertEqual(r.missing_information,['BUSINESS_NAME']);self.assertEqual(r.runtime_status,'INPUT_REQUIRED');self.gms.generate.assert_not_called()
    async def test_optional_missing(self):
        a=source(key='BUSINESS_ADDRESS',id=11);a['required']=False
        self.sources.resolve_source.side_effect=[value(),value(None,False,key='BUSINESS_ADDRESS')]
        self.assertEqual((await self.run_field(field(type='GENERATED',sources=[source(),a]))).runtime_status,'RESOLVED')
    async def test_required_rag(self):
        r=await self.run_field(field(type='GENERATED',sources=[source(key='PROGRAM_RAG',type='RAG')]))
        self.assertEqual(r.error_code,'RAG_SCOPE_UNSUPPORTED');self.gms.generate.assert_not_called()
    async def test_optional_rag(self):
        a=source(key='PROGRAM_RAG',type='RAG',id=11,query_hint='지원조건');a['required']=False
        self.assertEqual((await self.run_field(field(type='GENERATED',sources=[source(),a]))).runtime_status,'RESOLVED')
    async def test_input_required_response(self):
        self.gms.generate.return_value=json.dumps(dict(status='INPUT_REQUIRED',content=None,missing_information=['자금 사용 계획']))
        r=await self.run_field();self.assertEqual(r.missing_information,['자금 사용 계획']);self.assertFalse(self.output.ready_for_write)
    async def test_invalid_responses(self):
        for raw in ['not json','{}',json.dumps(dict(status='GENERATED',content='',missing_information=[])),json.dumps(dict(status='INPUT_REQUIRED',content='x',missing_information=['x'])),json.dumps(dict(status='GENERATED',content='x',missing_information=['x']))]:
            with self.subTest(raw=raw):
                self.gms.generate.return_value=raw
                self.assertEqual((await self.run_field()).error_code,'GENERATION_RESPONSE_INVALID')
    async def test_max_length(self):
        self.assertEqual((await self.run_field(field(type='GENERATED',max_length=1))).error_code,'GENERATION_RESPONSE_INVALID')
        self.gms.generate.assert_awaited_once()
    async def test_min_length(self):
        self.assertEqual((await self.run_field(field(type='GENERATED',min_length=20))).error_code,'GENERATION_RESPONSE_INVALID')
    async def test_global_length_limit(self):
        self.gms.generate.return_value=json.dumps(dict(status='GENERATED',content='x'*10001,missing_information=[]))
        self.assertEqual((await self.run_field()).error_code,'GENERATION_RESPONSE_INVALID')
    async def test_gms_failure_isolated(self):
        self.gms.generate.side_effect=[RuntimeError('secret'),json.dumps(dict(status='GENERATED',content='본문',missing_information=[]))]
        r=await self.run_field(others=[field(key='second',type='GENERATED',id=2,order=1)])
        self.assertEqual(r.error_code,'GMS_REQUEST_FAILED');self.assertNotIn('secret',r.model_dump_json());self.assertEqual(self.output.fields[1].runtime_status,'RESOLVED')
    async def test_source_error(self):
        self.sources.resolve_source.side_effect=RuntimeError('secret')
        self.assertEqual((await self.run_field()).error_code,'GENERATION_SOURCE_FAILED');self.gms.generate.assert_not_called()
    async def test_mapping_gate(self):
        for status in ['NEEDS_REVIEW','UNSUPPORTED']:
            self.assertEqual((await self.run_field(field(type='GENERATED',status=status))).runtime_status,status)
        self.gms.generate.assert_not_called();self.sources.resolve_source.assert_not_called()
    async def test_optional_unresolved_ready(self):
        self.gms.generate.side_effect=RuntimeError()
        await self.run_field(field(type='GENERATED',required=False));self.assertTrue(self.output.ready_for_write)
    async def test_unknown_source(self):
        self.assertEqual((await self.run_field(field(type='GENERATED',sources=[source(key='UNKNOWN')]))).runtime_status,'UNSUPPORTED')
    async def test_nontext(self):
        self.assertEqual((await self.run_field(field(type='GENERATED',value_type='NUMBER'))).runtime_status,'UNSUPPORTED')
    async def test_mismatched_result(self):
        self.sources.resolve_source.return_value=value(key='BUSINESS_ADDRESS')
        self.assertEqual((await self.run_field()).error_code,'SOURCE_RESULT_MISMATCH')
    async def test_linebreak_preserved(self):
        self.gms.generate.return_value=json.dumps(dict(status='GENERATED',content=' 첫 줄\n둘째 줄 ',missing_information=[]))
        self.assertEqual((await self.run_field()).value,'첫 줄\n둘째 줄')
    async def test_writer_constraints_rejected(self):
        r=await self.run_field(field(type='GENERATED',constraints={'nested':{'native_ref':'secret'}}))
        self.assertEqual(r.error_code,'INVALID_GENERATION_CONSTRAINTS');self.gms.generate.assert_not_called()
    async def test_disabled_cli_client(self):
        from app.agent.documents.runtime.__main__ import DisabledGenerationClient
        self.runtime.generated.gms=DisabledGenerationClient()
        self.assertEqual((await self.run_field()).error_code,'GENERATION_DISABLED')
    async def test_user_input_field_not_in_generated_context(self):
        self.repo.load.return_value=template(field(type='GENERATED'),field(key='private',type='USER_INPUT',sources=[],id=2))
        await self.runtime.resolve(DocumentRuntimeRequest(template_id=1,user_id=9))
        self.assertNotIn('private',self.gms.generate.call_args.kwargs['user_payload'])
    async def test_shared_gms_client(self):
        import sys
        from unittest.mock import Mock, patch
        from app.agent.documents.runtime.generated import GmsGenerationClient
        create=AsyncMock(return_value=SimpleNamespace(choices=[SimpleNamespace(finish_reason='stop',message=SimpleNamespace(content='{}'))]))
        client=SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create)))
        shared=SimpleNamespace(with_options=Mock(return_value=client))
        module=SimpleNamespace(get_client=Mock(return_value=shared),DEFAULT_MODEL='test-model')
        with patch.dict(sys.modules,{'app.core.gms':module}), patch('app.core.gms',module,create=True):
            self.assertEqual(await GmsGenerationClient().generate(system_prompt='system',user_payload='{}'),'{}')
        shared.with_options.assert_called_once_with(timeout=60.0,max_retries=0)
        self.assertEqual(create.call_args.kwargs['response_format'],{'type':'json_object'})
    async def test_shared_gms_exception_safe(self):
        import sys
        from unittest.mock import Mock, patch
        from app.agent.documents.runtime.generated import GmsGenerationClient, GenerationError
        module=SimpleNamespace(get_client=Mock(side_effect=RuntimeError('secret')))
        with patch.dict(sys.modules,{'app.core.gms':module}), patch('app.core.gms',module,create=True):
            with self.assertRaises(GenerationError) as caught:
                await GmsGenerationClient().generate(system_prompt='system',user_payload='{}')
        self.assertEqual(caught.exception.code,'GMS_REQUEST_FAILED');self.assertNotIn('secret',str(caught.exception))
