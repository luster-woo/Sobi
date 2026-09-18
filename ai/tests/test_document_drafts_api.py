import ast
from dataclasses import replace
from pathlib import Path
from unittest import IsolatedAsyncioTestCase
from unittest.mock import patch
from uuid import uuid4

import httpx
from fastapi import FastAPI

import test_document_drafts as fixtures
from app.agent.documents.drafts.router import router, get_service, get_settings, get_store


class DraftApiTests(IsolatedAsyncioTestCase):
    def setUp(self):
        self.fx = fixtures.DraftServiceTests()
        self.fx.setUp()
        self.addCleanup(self.fx.doCleanups)
        self.app = FastAPI()
        self.app.include_router(router)
        self.app.dependency_overrides[get_service] = lambda: self.fx.service
        self.app.dependency_overrides[get_settings] = lambda: self.fx.service.settings
        self.app.dependency_overrides[get_store] = lambda: self.fx.service.store
        env = patch.dict('os.environ', {'DOCUMENT_AGENT_DRAFT_API_ENABLED':'true'})
        env.start(); self.addCleanup(env.stop)
        self.url = '/api/v1/document-agent/drafts'

    async def request(self, method, url=None, **kwargs):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=self.app), base_url='http://test') as client:
            return await client.request(method, url or self.url, **kwargs)

    async def post(self):
        return await self.request('POST', json={'templateId':1,'userId':9})

    async def test_post_contract(self):
        response = await self.post()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(set(response.json()), {'draftId','templateId','programDocumentId','status','fileName',
                         'writtenFieldCount','leftBlankFieldCount','unsupportedFieldCount'})
        self.assertEqual(response.json()['status'], 'COMPLETED')
        self.assertNotIn(str(self.fx.fx.root), response.text)
        self.assertNotIn('성현상사', response.text)

    async def test_download(self):
        created = (await self.post()).json()
        response = await self.request('GET', self.url+'/'+created['draftId']+'/file')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b'fake writer output')
        self.assertEqual(response.headers['content-type'], 'application/hwp+zip')
        self.assertIn('attachment;', response.headers['content-disposition'])
        self.assertIn(created['fileName'], response.headers['content-disposition'])

    async def test_unknown_id(self):
        response = await self.request('GET', self.url+f'/{uuid4()}/file')
        self.assertEqual(response.status_code,404)
        self.assertEqual(response.json()['detail']['code'], 'DRAFT_NOT_FOUND')

    async def test_invalid_uuid_and_traversal(self):
        for value in ('bad-uuid','..','%2e%2e%2fsecret','%2Fetc%2Fpasswd'):
            response = await self.request('GET', self.url+f'/{value}/file')
            self.assertIn(response.status_code, (404,422))
            self.assertNotEqual(response.content, b'fake writer output')

    async def test_file_missing(self):
        created = (await self.post()).json()
        (self.fx.fx.root/'generated'/created['fileName']).unlink()
        response = await self.request('GET', self.url+'/'+created['draftId']+'/file')
        self.assertEqual(response.status_code,404)
        self.assertEqual(response.json()['detail']['code'], 'DRAFT_FILE_NOT_FOUND')

    async def test_root_escape_metadata(self):
        (self.fx.fx.root/'generated').mkdir()
        item = fixtures.record(self.fx.fx.root)
        item.generated_file_path.write_bytes(b'private')
        self.fx.service.store.put(item)
        response = await self.request('GET', self.url+f'/{item.response.draft_id}/file')
        self.assertEqual(response.status_code,403)
        self.assertNotIn('private',response.text)
        self.assertNotIn(str(self.fx.fx.root),response.text)

    async def test_wrong_filename_in_root(self):
        root = self.fx.fx.root/'generated'; root.mkdir()
        item = fixtures.record(root)
        other = root/'secret.hwpx'; other.write_bytes(b'private')
        self.fx.service.store.put(replace(item, generated_file_path=other))
        response = await self.request('GET', self.url+f'/{item.response.draft_id}/file')
        self.assertEqual(response.status_code,403)

    async def test_symlink_escape_check(self):
        # Resolved path confinement also applies to ../ paths in stored metadata.
        root = self.fx.fx.root/'generated'; root.mkdir()
        item = fixtures.record(root)
        outside = self.fx.fx.root/item.response.file_name; outside.write_bytes(b'private')
        self.fx.service.store.put(replace(item, generated_file_path=root/'..'/outside.name))
        response = await self.request('GET', self.url+f'/{item.response.draft_id}/file')
        self.assertEqual(response.status_code,403)

    async def test_symlink_is_rejected(self):
        created=(await self.post()).json()
        with patch('pathlib.Path.is_symlink',return_value=True):
            response=await self.request('GET',self.url+'/'+created['draftId']+'/file')
        self.assertEqual(response.status_code,403)

    async def test_query_path_cannot_override_stored_path(self):
        created=(await self.post()).json()
        response=await self.request('GET',self.url+'/'+created['draftId']+'/file',params={'path':'/etc/passwd'})
        self.assertEqual(response.status_code,200)
        self.assertEqual(response.content,b'fake writer output')

    async def test_client_paths_and_values_rejected_without_echo(self):
        for key in ('userInputs','sourcePath','normalizedPath','outputPath','locationInfo','values','user_inputs'):
            response = await self.request('POST',json={'templateId':1,'userId':9,key:'/secret/name@email.test'})
            self.assertEqual(response.status_code,422)
            self.assertNotIn('/secret',response.text)
            self.assertNotIn('name@email.test',response.text)
        self.fx.factory.assert_not_called()

    async def test_ids_strict_and_camel_case_only(self):
        for body in ({'template_id':1,'user_id':9},{'templateId':0,'userId':9},
                     {'templateId':True,'userId':9},{'templateId':'1','userId':9},
                     {'templateId':1,'userId':-1},{'templateId':2**63,'userId':9}):
            self.assertEqual((await self.request('POST',json=body)).status_code,422)

    async def test_feature_flag_false_and_missing(self):
        for env in ({},{'DOCUMENT_AGENT_DRAFT_API_ENABLED':'false'}):
            with patch.dict('os.environ',env,clear=True):
                self.assertEqual((await self.post()).status_code,503)
                self.assertEqual((await self.request('GET',self.url+f'/{uuid4()}/file')).status_code,503)
        self.fx.factory.assert_not_called()

    async def test_not_ready_response(self):
        self.fx.result.ready_for_write=False
        self.fx.result.fields=[self.fx.fx.resolved(runtime_status='VALUE_MISSING',value=None,field_key='user_email',field_label='E-mail')]
        response=await self.post()
        self.assertEqual(response.status_code,409)
        self.assertEqual(response.json()['detail']['code'],'DRAFT_NOT_READY')
        self.assertEqual(response.json()['detail']['details'][0]['status'],'VALUE_MISSING')
        self.fx.writer.write.assert_not_called()

    async def test_schema_has_no_path_or_user_inputs(self):
        schema=self.app.openapi()['components']['schemas']['DraftRequest']
        self.assertEqual(set(schema['properties']),{'templateId','userId'})
        self.assertFalse(schema['additionalProperties'])

    async def test_sync_completion_before_response(self):
        response=await self.post()
        self.assertEqual(response.status_code,201)
        self.assertEqual(len(self.fx.service.store._records),1)
        self.assertTrue((self.fx.fx.root/'generated'/response.json()['fileName']).is_file())

    async def test_main_registers_router(self):
        # Do not boot unrelated model-loading lifespan during tests.
        tree=ast.parse((Path(__file__).parents[1]/'app/main.py').read_text(encoding='utf-8'))
        self.assertTrue(any(isinstance(n,ast.ImportFrom) and n.module=='app.agent.documents.drafts.router' for n in ast.walk(tree)))
        self.assertTrue(any(isinstance(n,ast.Call) and isinstance(n.func,ast.Attribute) and n.func.attr=='include_router'
                            and any(isinstance(a,ast.Name) and a.id=='drafts_router' for a in n.args) for n in ast.walk(tree)))
