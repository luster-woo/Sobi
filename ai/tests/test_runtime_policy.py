import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from pydantic import ValidationError
from test_document_runtime import field, template, value
from app.agent.documents.runtime import DocumentAgentRuntime, DocumentRuntimeRequest

class RuntimePolicyTests(unittest.IsolatedAsyncioTestCase):
    async def run_fields(self,*fields):
        self.source=SimpleNamespace(resolve_source=AsyncMock(return_value=value()))
        self.gms=SimpleNamespace(generate=AsyncMock(side_effect=AssertionError('GMS must not run')))
        self.runtime=DocumentAgentRuntime(repository=SimpleNamespace(load=AsyncMock(return_value=template(*fields))),source_resolver=self.source,gms_client=self.gms)
        return await self.runtime.resolve(DocumentRuntimeRequest(template_id=1,user_id=9))
    async def test_consent_fields_no_executors(self):
        fields=[field(key=k,type='USER_INPUT',value_type='BOOLEAN',id=i+1,order=i) for i,k in enumerate(['consent','disagree','consent_2','disagree_2'])]
        with patch('app.agent.documents.runtime.service.ComputedExecutor') as computed:
            result=await self.run_fields(*fields)
        self.assertEqual(result.status_counts['LEFT_BLANK'],4)
        self.assertTrue(result.ready_for_write)
        for f in result.fields:self.assertIsNone(f.value)
        self.source.resolve_source.assert_not_called();self.gms.generate.assert_not_called();computed.assert_not_called()
    async def test_direct_and_required_blank_ready(self):
        result=await self.run_fields(field(),field(key='birth_date',type='USER_INPUT',value_type='DATE',id=2))
        self.assertTrue(result.ready_for_write);self.assertEqual([f.runtime_status for f in result.fields],['RESOLVED','LEFT_BLANK'])
    async def test_missing_direct_blocks(self):
        await self.run_fields(field(),field(key='birth_date',type='USER_INPUT',id=2))
        self.source.resolve_source.return_value=value(None,False)
        result=await self.runtime.resolve(DocumentRuntimeRequest(template_id=1,user_id=9))
        self.assertFalse(result.ready_for_write)
    async def test_generated_error_blocks(self):
        result=await self.run_fields(field(type='GENERATED'),field(key='birth_date',type='USER_INPUT',id=2))
        self.assertFalse(result.ready_for_write);self.assertEqual(result.fields[0].runtime_status,'ERROR')
    async def test_user_input_unsupported_mapping_still_blank(self):
        result=await self.run_fields(field(type='USER_INPUT',status='UNSUPPORTED'))
        self.assertEqual(result.fields[0].runtime_status,'LEFT_BLANK');self.assertEqual(result.fields[0].mapping_status,'UNSUPPORTED')
    async def test_inputs_not_available_even_empty(self):
        with self.assertRaises(ValidationError):DocumentRuntimeRequest(template_id=1,user_id=9,user_inputs={})
    async def test_removed_cli_flag(self):
        import io
        from app.agent.documents.runtime.__main__ import main as runtime_main
        from app.agent.documents.writer.__main__ import main as writer_main
        for main,args in [(runtime_main,['runtime','1','9']),(writer_main,['writer','1','9','--output','out.hwpx'])]:
            with patch('sys.argv',args+['--user-inputs','input.json']),patch('sys.stderr',new_callable=io.StringIO),self.assertRaises(SystemExit) as caught:main()
            self.assertEqual(caught.exception.code,2)
