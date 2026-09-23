BEGIN;
CREATE TEMP TABLE program_document (LIKE public.program_document INCLUDING ALL);
CREATE TEMP TABLE document_template (LIKE public.document_template INCLUDING ALL);
CREATE TEMP TABLE document_field_schema (LIKE public.document_field_schema INCLUDING ALL);
CREATE TEMP TABLE document_field_source (LIKE public.document_field_source INCLUDING ALL);
SET LOCAL search_path=pg_temp,public;
INSERT INTO pg_temp.program_document SELECT * FROM public.program_document WHERE id=40;
INSERT INTO pg_temp.document_template(id,program_document_id,original_format,normalized_format,
 normalized_path,parse_status,schema_version) VALUES(900,40,'HWP','HWPX','old-path','COMPLETED',1);
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $sync40$
DECLARE
    snapshot jsonb := $snapshot40$
{
  "fields": [
    {
      "id": 3078,
      "required": false,
      "field_key": "business_name",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "TEXT",
      "constraints": null,
      "field_label": "업체명",
      "field_order": 0,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "       ",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 2,
          "native_ref": {
            "row_order": 2,
            "cell_order": 1,
            "element_name": "tc",
            "element_path": [
              0,
              0,
              2,
              6,
              1
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 0,
          "table_index": 0,
          "column_index": 1,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3079,
      "required": false,
      "field_key": "applicant_name",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "TEXT",
      "constraints": null,
      "field_label": "신청인 (대표자)",
      "field_order": 1,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "             ",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 2,
          "native_ref": {
            "row_order": 2,
            "cell_order": 3,
            "element_name": "tc",
            "element_path": [
              0,
              0,
              2,
              6,
              3
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 0,
          "table_index": 0,
          "column_index": 10,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3080,
      "required": false,
      "field_key": "business_address",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "TEXT",
      "constraints": null,
      "field_label": "주소지",
      "field_order": 2,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "helper_text": "(사업자등록증상)",
          "target_kind": "helper"
        },
        "version": 1,
        "input_shape": "UNKNOWN",
        "current_text": "(사업자등록증상)",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 3,
          "native_ref": {
            "row_order": 3,
            "cell_order": 1,
            "element_name": "tc",
            "element_path": [
              0,
              0,
              2,
              7,
              1
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 0,
          "table_index": 0,
          "column_index": 1,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3081,
      "required": false,
      "field_key": "applicant_mobile",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "TEXT",
      "constraints": null,
      "field_label": "휴대전화",
      "field_order": 3,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 3,
          "native_ref": {
            "row_order": 3,
            "cell_order": 3,
            "element_name": "tc",
            "element_path": [
              0,
              0,
              2,
              7,
              3
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 0,
          "table_index": 0,
          "column_index": 10,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3082,
      "required": false,
      "field_key": "applicant_email",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "TEXT",
      "constraints": null,
      "field_label": "e메일",
      "field_order": 4,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 4,
          "native_ref": {
            "row_order": 4,
            "cell_order": 2,
            "element_name": "tc",
            "element_path": [
              0,
              0,
              2,
              8,
              2
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 0,
          "table_index": 0,
          "column_index": 10,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3083,
      "required": false,
      "field_key": "outdoor_sign_change",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "신청분야(☑)",
      "field_order": 5,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "placeholder",
          "placeholder_text": "□ 옥외 간판교체"
        },
        "version": 1,
        "input_shape": "CHECKBOX",
        "current_text": "□ 옥외 간판교체",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 7,
          "native_ref": {
            "row_order": 7,
            "cell_order": 0,
            "element_name": "tc",
            "element_path": [
              0,
              0,
              2,
              11,
              0
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 0,
          "table_index": 0,
          "column_index": 0,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3084,
      "required": false,
      "field_key": "new_sign_install",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "(공급가 80% \n최대 300만원)",
      "field_order": 6,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "placeholder",
          "placeholder_text": "□ 신규 간판 설치"
        },
        "version": 1,
        "input_shape": "CHECKBOX",
        "current_text": "□ 신규 간판 설치",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 7,
          "native_ref": {
            "row_order": 7,
            "cell_order": 2,
            "element_name": "tc",
            "element_path": [
              0,
              0,
              2,
              11,
              2
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 0,
          "table_index": 0,
          "column_index": 4,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3085,
      "required": false,
      "field_key": "sign_replacement",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "세부개선내용(☑)",
      "field_order": 7,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "placeholder",
          "placeholder_text": "□ 간판 교체"
        },
        "version": 1,
        "input_shape": "CHECKBOX",
        "current_text": "□ 간판 교체 ",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 7,
          "native_ref": {
            "row_order": 7,
            "cell_order": 3,
            "element_name": "tc",
            "element_path": [
              0,
              0,
              2,
              11,
              3
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 0,
          "table_index": 0,
          "column_index": 7,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3086,
      "required": false,
      "field_key": "sign_equipment_replacement",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "세부개선내용(☑)",
      "field_order": 8,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "placeholder",
          "placeholder_text": "□ 간판 내부설비 교체"
        },
        "version": 1,
        "input_shape": "CHECKBOX",
        "current_text": "□ 간판 내부설비 교체",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 7,
          "native_ref": {
            "row_order": 7,
            "cell_order": 4,
            "element_name": "tc",
            "element_path": [
              0,
              0,
              2,
              11,
              4
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 0,
          "table_index": 0,
          "column_index": 12,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3087,
      "required": false,
      "field_key": "interior_renovation",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "(공급가 80% \n최대 500만원)",
      "field_order": 9,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "placeholder",
          "placeholder_text": "□ 내부인테리어"
        },
        "version": 1,
        "input_shape": "CHECKBOX",
        "current_text": "□ 내부인테리어",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 9,
          "native_ref": {
            "row_order": 9,
            "cell_order": 2,
            "element_name": "tc",
            "element_path": [
              0,
              0,
              2,
              13,
              2
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 0,
          "table_index": 0,
          "column_index": 4,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3088,
      "required": false,
      "field_key": "led_electrical_work",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "(공급가 80% \n최대 500만원)",
      "field_order": 10,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "placeholder",
          "placeholder_text": "□ LED 조명 및 전기공사"
        },
        "version": 1,
        "input_shape": "CHECKBOX",
        "current_text": "□ LED 조명 및 전기공사",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 10,
          "native_ref": {
            "row_order": 10,
            "cell_order": 0,
            "element_name": "tc",
            "element_path": [
              0,
              0,
              2,
              14,
              0
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 0,
          "table_index": 0,
          "column_index": 4,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3089,
      "required": false,
      "field_key": "dining_table_replacement",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "(공급가 80% \n최대 500만원)",
      "field_order": 11,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "placeholder",
          "placeholder_text": "□ (식당) 입식 테이블로 교체"
        },
        "version": 1,
        "input_shape": "CHECKBOX",
        "current_text": "□ (식당) 입식 테이블로 교체",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 11,
          "native_ref": {
            "row_order": 11,
            "cell_order": 0,
            "element_name": "tc",
            "element_path": [
              0,
              0,
              2,
              15,
              0
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 0,
          "table_index": 0,
          "column_index": 4,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3090,
      "required": false,
      "field_key": "pos_system",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "(공급가 80%\n최대 200만원)",
      "field_order": 12,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "placeholder",
          "placeholder_text": "□ POS시스템"
        },
        "version": 1,
        "input_shape": "CHECKBOX",
        "current_text": "□ POS시스템",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 13,
          "native_ref": {
            "row_order": 13,
            "cell_order": 2,
            "element_name": "tc",
            "element_path": [
              0,
              0,
              2,
              17,
              2
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 0,
          "table_index": 0,
          "column_index": 4,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3091,
      "required": false,
      "field_key": "table_order",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "(공급가 80%\n최대 200만원)",
      "field_order": 13,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "placeholder",
          "placeholder_text": "□ 테이블오더"
        },
        "version": 1,
        "input_shape": "CHECKBOX",
        "current_text": "□ 테이블오더 ",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 14,
          "native_ref": {
            "row_order": 14,
            "cell_order": 0,
            "element_name": "tc",
            "element_path": [
              0,
              0,
              2,
              18,
              0
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 0,
          "table_index": 0,
          "column_index": 4,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3092,
      "required": false,
      "field_key": "consulting_service",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "컨설팅 분야 선택(☑)",
      "field_order": 14,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "placeholder",
          "placeholder_text": "□ 서비스 개선"
        },
        "version": 1,
        "input_shape": "CHECKBOX",
        "current_text": "□ 서비스 개선",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 17,
          "native_ref": {
            "row_order": 17,
            "cell_order": 0,
            "element_name": "tc",
            "element_path": [
              0,
              0,
              2,
              21,
              0
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 0,
          "table_index": 0,
          "column_index": 0,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3093,
      "required": false,
      "field_key": "consulting_finance",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "컨설팅 분야 선택(☑)",
      "field_order": 15,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "placeholder",
          "placeholder_text": "□ 재무관리"
        },
        "version": 1,
        "input_shape": "CHECKBOX",
        "current_text": "□ 재무관리",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 17,
          "native_ref": {
            "row_order": 17,
            "cell_order": 1,
            "element_name": "tc",
            "element_path": [
              0,
              0,
              2,
              21,
              1
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 0,
          "table_index": 0,
          "column_index": 5,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3094,
      "required": false,
      "field_key": "business_plan_detail",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "GENERATED",
      "max_length": 300,
      "min_length": null,
      "updated_at": "2026-09-21T15:35:55.100313",
      "value_type": "TEXT",
      "constraints": null,
      "field_label": "점포 소개, 점포개선할 내용, 필요성 등 자율 기재 (300자 이내 간략 기술)",
      "field_order": 16,
      "instruction": "제공된 업체명·업종·주소를 바탕으로 점포 소개와 일반적인 점포 개선 방향, 기대효과를 공백 포함 300자 이내로 작성한다. 구체적인 개선 항목이 제공되지 않았다면 고객 편의와 쾌적한 이용환경 조성 등 일반적인 목표를 향후 계획으로 표현한다. 세부 개선 항목이 없다는 이유만으로 INPUT_REQUIRED를 반환하지 않는다. 확인되지 않은 시설 노후화, 매출, 견적, 확정된 공사 내용이나 수치 성과를 사실처럼 작성하지 않는다. 성공 content에는 신청서에 들어갈 본문만 작성한다.",
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "LONG_TEXT",
        "current_text": "\n\n\n\n\n\n\n\n ",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 3,
          "native_ref": {
            "row_order": 3,
            "cell_order": 0,
            "element_name": "tc",
            "element_path": [
              1,
              0,
              0,
              7,
              0
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 1,
          "table_index": 1,
          "column_index": 0,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3095,
      "required": false,
      "field_key": "estimate_business_name",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "TEXT",
      "constraints": null,
      "field_label": "업체명",
      "field_order": 17,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 2,
          "native_ref": {
            "row_order": 2,
            "cell_order": 1,
            "element_name": "tc",
            "element_path": [
              2,
              0,
              0,
              6,
              1
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 3,
          "table_index": 2,
          "column_index": 2,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3096,
      "required": false,
      "field_key": "estimate_applicant_name",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "TEXT",
      "constraints": null,
      "field_label": "신청인 (대표자)",
      "field_order": 18,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 2,
          "native_ref": {
            "row_order": 2,
            "cell_order": 3,
            "element_name": "tc",
            "element_path": [
              2,
              0,
              0,
              6,
              3
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 3,
          "table_index": 2,
          "column_index": 8,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3097,
      "required": false,
      "field_key": "planned_application_category",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "TEXT",
      "constraints": null,
      "field_label": "신청분야",
      "field_order": 19,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 6,
          "native_ref": {
            "row_order": 6,
            "cell_order": 0,
            "element_name": "tc",
            "element_path": [
              2,
              0,
              0,
              10,
              0
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 3,
          "table_index": 2,
          "column_index": 0,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3098,
      "required": false,
      "field_key": "contractor_name",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "TEXT",
      "constraints": null,
      "field_label": "외주업체명",
      "field_order": 20,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 6,
          "native_ref": {
            "row_order": 6,
            "cell_order": 1,
            "element_name": "tc",
            "element_path": [
              2,
              0,
              0,
              10,
              1
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 3,
          "table_index": 2,
          "column_index": 2,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3099,
      "required": false,
      "field_key": "planned_improvement_item",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "TEXT",
      "constraints": null,
      "field_label": "세부개선내용\n(개선예정 품목)",
      "field_order": 21,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 6,
          "native_ref": {
            "row_order": 6,
            "cell_order": 2,
            "element_name": "tc",
            "element_path": [
              2,
              0,
              0,
              10,
              2
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 3,
          "table_index": 2,
          "column_index": 3,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3100,
      "required": false,
      "field_key": "planned_quantity",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "NUMBER",
      "constraints": null,
      "field_label": "수량 ",
      "field_order": 22,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 6,
          "native_ref": {
            "row_order": 6,
            "cell_order": 3,
            "element_name": "tc",
            "element_path": [
              2,
              0,
              0,
              10,
              3
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 3,
          "table_index": 2,
          "column_index": 4,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3101,
      "required": false,
      "field_key": "planned_specification",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "TEXT",
      "constraints": null,
      "field_label": "규격",
      "field_order": 23,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 6,
          "native_ref": {
            "row_order": 6,
            "cell_order": 4,
            "element_name": "tc",
            "element_path": [
              2,
              0,
              0,
              10,
              4
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 3,
          "table_index": 2,
          "column_index": 5,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3102,
      "required": false,
      "field_key": "quoted_supply_price",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "NUMBER",
      "constraints": null,
      "field_label": "공급가",
      "field_order": 24,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 6,
          "native_ref": {
            "row_order": 6,
            "cell_order": 5,
            "element_name": "tc",
            "element_path": [
              2,
              0,
              0,
              10,
              5
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 3,
          "table_index": 2,
          "column_index": 7,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "UNSUPPORTED"
    },
    {
      "id": 3103,
      "required": false,
      "field_key": "quoted_vat",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "NUMBER",
      "constraints": null,
      "field_label": "부가세",
      "field_order": 25,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 6,
          "native_ref": {
            "row_order": 6,
            "cell_order": 6,
            "element_name": "tc",
            "element_path": [
              2,
              0,
              0,
              10,
              6
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 3,
          "table_index": 2,
          "column_index": 9,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "UNSUPPORTED"
    },
    {
      "id": 3104,
      "required": false,
      "field_key": "total_supply_price",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "COMPUTED",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "NUMBER",
      "constraints": null,
      "field_label": "합 계",
      "field_order": 26,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 15,
          "native_ref": {
            "row_order": 15,
            "cell_order": 1,
            "element_name": "tc",
            "element_path": [
              2,
              0,
              0,
              19,
              1
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 3,
          "table_index": 2,
          "column_index": 7,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "UNSUPPORTED"
    },
    {
      "id": 3105,
      "required": false,
      "field_key": "previous_application_yes",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "2021년 ~ 2025년 본 사업에 신청하신 적이 있습니까?",
      "field_order": 27,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 2,
          "native_ref": {
            "row_order": 2,
            "cell_order": 1,
            "element_name": "tc",
            "element_path": [
              11,
              0,
              0,
              6,
              1
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 12,
          "table_index": 6,
          "column_index": 1,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3106,
      "required": false,
      "field_key": "previous_application_no",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "아니오",
      "field_order": 28,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 2,
          "native_ref": {
            "row_order": 2,
            "cell_order": 2,
            "element_name": "tc",
            "element_path": [
              11,
              0,
              0,
              6,
              2
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 12,
          "table_index": 6,
          "column_index": 2,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3107,
      "required": false,
      "field_key": "anti_kickback_acknowledgement",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "확인",
      "field_order": 29,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 1,
          "native_ref": {
            "row_order": 1,
            "cell_order": 1,
            "element_name": "tc",
            "element_path": [
              16,
              0,
              0,
              5,
              1
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 17,
          "table_index": 7,
          "column_index": 1,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3108,
      "required": false,
      "field_key": "bonus_evidence_acknowledgement",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "가점사항에 대한 증빙을 제출하지 않은 경우, 점수 부여 불가합니다.",
      "field_order": 30,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 5,
          "native_ref": {
            "row_order": 5,
            "cell_order": 1,
            "element_name": "tc",
            "element_path": [
              16,
              0,
              0,
              9,
              1
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 17,
          "table_index": 7,
          "column_index": 1,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3109,
      "required": false,
      "field_key": "evidence_deadline_acknowledgement",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "사업 신청기간 내에 접수되지 않은 증빙서류에 대해 추가 보완 불가하며 이의를 제기하지않습니다",
      "field_order": 31,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 6,
          "native_ref": {
            "row_order": 6,
            "cell_order": 1,
            "element_name": "tc",
            "element_path": [
              16,
              0,
              0,
              10,
              1
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 17,
          "table_index": 7,
          "column_index": 1,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3110,
      "required": false,
      "field_key": "privacy_collection_consent",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "동의",
      "field_order": 32,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 0,
          "native_ref": {
            "row_order": 0,
            "cell_order": 1,
            "element_name": "tc",
            "element_path": [
              30,
              0,
              1,
              4,
              1
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 32,
          "table_index": 10,
          "column_index": 1,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3111,
      "required": false,
      "field_key": "privacy_collection_refusal",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "미동의",
      "field_order": 33,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 0,
          "native_ref": {
            "row_order": 0,
            "cell_order": 4,
            "element_name": "tc",
            "element_path": [
              30,
              0,
              1,
              4,
              4
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 32,
          "table_index": 10,
          "column_index": 4,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3112,
      "required": false,
      "field_key": "province_sharing_consent",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "동의",
      "field_order": 34,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 0,
          "native_ref": {
            "row_order": 0,
            "cell_order": 1,
            "element_name": "tc",
            "element_path": [
              36,
              0,
              1,
              4,
              1
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 39,
          "table_index": 12,
          "column_index": 1,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3113,
      "required": false,
      "field_key": "province_sharing_refusal",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "미동의",
      "field_order": 35,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 0,
          "native_ref": {
            "row_order": 0,
            "cell_order": 4,
            "element_name": "tc",
            "element_path": [
              36,
              0,
              1,
              4,
              4
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 39,
          "table_index": 12,
          "column_index": 4,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3114,
      "required": false,
      "field_key": "external_sharing_consent",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "동의",
      "field_order": 36,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 0,
          "native_ref": {
            "row_order": 0,
            "cell_order": 1,
            "element_name": "tc",
            "element_path": [
              38,
              0,
              1,
              4,
              1
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 43,
          "table_index": 13,
          "column_index": 1,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3115,
      "required": false,
      "field_key": "external_sharing_refusal",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "미동의",
      "field_order": 37,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 0,
          "native_ref": {
            "row_order": 0,
            "cell_order": 4,
            "element_name": "tc",
            "element_path": [
              38,
              0,
              1,
              4,
              4
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 43,
          "table_index": 13,
          "column_index": 4,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3116,
      "required": false,
      "field_key": "application_month_1",
      "created_at": "2026-09-21T16:09:26.588362",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T16:09:26.588362",
      "value_type": "DATE",
      "constraints": null,
      "field_label": "월",
      "field_order": 38,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "date_part": "month",
          "fixed_year": 2026,
          "target_kind": "inline_blank"
        },
        "version": 1,
        "input_shape": "DATE",
        "current_text": "     ",
        "target_location": {
          "type": "PARAGRAPH_INLINE",
          "row_index": 20,
          "native_ref": {
            "xml_id": "2147483648",
            "element_name": "p",
            "element_path": [
              0,
              0,
              2,
              24,
              0,
              0,
              2
            ],
            "inline_range": {
              "end": 12,
              "start": 7,
              "paragraph_text": "  2026년     월     일 "
            },
            "section_file": "Contents/section0.xml",
            "fragment_index": 0,
            "text_element_paths": [
              [
                0,
                0,
                2,
                24,
                0,
                0,
                2,
                0,
                0
              ],
              [
                0,
                0,
                2,
                24,
                0,
                0,
                2,
                1,
                0
              ],
              [
                0,
                0,
                2,
                24,
                0,
                0,
                2,
                2,
                0
              ]
            ]
          },
          "block_index": 2,
          "table_index": 0,
          "column_index": 0,
          "section_index": 0,
          "paragraph_index": 2
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3117,
      "required": false,
      "field_key": "application_day_1",
      "created_at": "2026-09-21T16:09:26.588362",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T16:09:26.588362",
      "value_type": "DATE",
      "constraints": null,
      "field_label": "일",
      "field_order": 39,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "date_part": "day",
          "fixed_year": 2026,
          "target_kind": "inline_blank"
        },
        "version": 1,
        "input_shape": "DATE",
        "current_text": "     ",
        "target_location": {
          "type": "PARAGRAPH_INLINE",
          "row_index": 20,
          "native_ref": {
            "xml_id": "2147483648",
            "element_name": "p",
            "element_path": [
              0,
              0,
              2,
              24,
              0,
              0,
              2
            ],
            "inline_range": {
              "end": 18,
              "start": 13,
              "paragraph_text": "  2026년     월     일 "
            },
            "section_file": "Contents/section0.xml",
            "fragment_index": 0,
            "text_element_paths": [
              [
                0,
                0,
                2,
                24,
                0,
                0,
                2,
                0,
                0
              ],
              [
                0,
                0,
                2,
                24,
                0,
                0,
                2,
                1,
                0
              ],
              [
                0,
                0,
                2,
                24,
                0,
                0,
                2,
                2,
                0
              ]
            ]
          },
          "block_index": 2,
          "table_index": 0,
          "column_index": 0,
          "section_index": 0,
          "paragraph_index": 2
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3118,
      "required": false,
      "field_key": "application_name_1",
      "created_at": "2026-09-21T16:09:26.588362",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T16:09:26.588362",
      "value_type": "TEXT",
      "constraints": null,
      "field_label": "신청인(대표자)",
      "field_order": 40,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "inline_blank"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "                ",
        "target_location": {
          "type": "PARAGRAPH_INLINE",
          "row_index": 20,
          "native_ref": {
            "xml_id": "2147483648",
            "element_name": "p",
            "element_path": [
              0,
              0,
              2,
              24,
              0,
              0,
              3
            ],
            "inline_range": {
              "end": 26,
              "start": 10,
              "paragraph_text": "신청인(대표자) :                (서명, 인)"
            },
            "section_file": "Contents/section0.xml",
            "fragment_index": 0,
            "text_element_paths": [
              [
                0,
                0,
                2,
                24,
                0,
                0,
                3,
                0,
                0
              ],
              [
                0,
                0,
                2,
                24,
                0,
                0,
                3,
                1,
                0
              ]
            ]
          },
          "block_index": 3,
          "table_index": 0,
          "column_index": 0,
          "section_index": 0,
          "paragraph_index": 3
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3119,
      "required": false,
      "field_key": "application_month_2",
      "created_at": "2026-09-21T16:09:26.588362",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T16:09:26.588362",
      "value_type": "DATE",
      "constraints": null,
      "field_label": "월",
      "field_order": 41,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "date_part": "month",
          "fixed_year": 2026,
          "target_kind": "inline_blank"
        },
        "version": 1,
        "input_shape": "DATE",
        "current_text": "     ",
        "target_location": {
          "type": "PARAGRAPH_INLINE",
          "row_index": 16,
          "native_ref": {
            "xml_id": "2147483648",
            "element_name": "p",
            "element_path": [
              2,
              0,
              0,
              20,
              0,
              0,
              7
            ],
            "inline_range": {
              "end": 10,
              "start": 5,
              "paragraph_text": "2026년     월     일 "
            },
            "section_file": "Contents/section0.xml",
            "fragment_index": 0,
            "text_element_paths": [
              [
                2,
                0,
                0,
                20,
                0,
                0,
                7,
                0,
                0
              ]
            ]
          },
          "block_index": 7,
          "table_index": 2,
          "column_index": 0,
          "section_index": 0,
          "paragraph_index": 7
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3120,
      "required": false,
      "field_key": "application_day_2",
      "created_at": "2026-09-21T16:09:26.588362",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T16:09:26.588362",
      "value_type": "DATE",
      "constraints": null,
      "field_label": "일",
      "field_order": 42,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "date_part": "day",
          "fixed_year": 2026,
          "target_kind": "inline_blank"
        },
        "version": 1,
        "input_shape": "DATE",
        "current_text": "     ",
        "target_location": {
          "type": "PARAGRAPH_INLINE",
          "row_index": 16,
          "native_ref": {
            "xml_id": "2147483648",
            "element_name": "p",
            "element_path": [
              2,
              0,
              0,
              20,
              0,
              0,
              7
            ],
            "inline_range": {
              "end": 16,
              "start": 11,
              "paragraph_text": "2026년     월     일 "
            },
            "section_file": "Contents/section0.xml",
            "fragment_index": 0,
            "text_element_paths": [
              [
                2,
                0,
                0,
                20,
                0,
                0,
                7,
                0,
                0
              ]
            ]
          },
          "block_index": 7,
          "table_index": 2,
          "column_index": 0,
          "section_index": 0,
          "paragraph_index": 7
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3121,
      "required": false,
      "field_key": "application_name_2",
      "created_at": "2026-09-21T16:09:26.588362",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T16:09:26.588362",
      "value_type": "TEXT",
      "constraints": null,
      "field_label": "신청인(대표자)",
      "field_order": 43,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "inline_blank"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "                ",
        "target_location": {
          "type": "PARAGRAPH_INLINE",
          "row_index": 17,
          "native_ref": {
            "xml_id": "2147483648",
            "element_name": "p",
            "element_path": [
              2,
              0,
              0,
              21,
              0,
              0,
              0
            ],
            "inline_range": {
              "end": 26,
              "start": 10,
              "paragraph_text": "신청인(대표자) :                (서명, 인)"
            },
            "section_file": "Contents/section0.xml",
            "fragment_index": 0,
            "text_element_paths": [
              [
                2,
                0,
                0,
                21,
                0,
                0,
                0,
                0,
                0
              ],
              [
                2,
                0,
                0,
                21,
                0,
                0,
                0,
                1,
                0
              ]
            ]
          },
          "block_index": 0,
          "table_index": 2,
          "column_index": 0,
          "section_index": 0,
          "paragraph_index": 0
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3122,
      "required": false,
      "field_key": "application_month_3",
      "created_at": "2026-09-21T16:09:26.588362",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T16:09:26.588362",
      "value_type": "DATE",
      "constraints": null,
      "field_label": "월",
      "field_order": 44,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "date_part": "month",
          "fixed_year": 2026,
          "target_kind": "inline_blank"
        },
        "version": 1,
        "input_shape": "DATE",
        "current_text": "     ",
        "target_location": {
          "type": "PARAGRAPH_INLINE",
          "row_index": null,
          "native_ref": {
            "xml_id": "2147483648",
            "element_name": "p",
            "element_path": [
              5
            ],
            "inline_range": {
              "end": 12,
              "start": 7,
              "paragraph_text": "  2026년     월     일 "
            },
            "section_file": "Contents/section0.xml",
            "fragment_index": 0,
            "text_element_paths": [
              [
                5,
                0,
                0
              ],
              [
                5,
                1,
                0
              ],
              [
                5,
                2,
                0
              ]
            ]
          },
          "block_index": 6,
          "table_index": null,
          "column_index": null,
          "section_index": 0,
          "paragraph_index": 5
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3123,
      "required": false,
      "field_key": "application_day_3",
      "created_at": "2026-09-21T16:09:26.588362",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T16:09:26.588362",
      "value_type": "DATE",
      "constraints": null,
      "field_label": "일",
      "field_order": 45,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "date_part": "day",
          "fixed_year": 2026,
          "target_kind": "inline_blank"
        },
        "version": 1,
        "input_shape": "DATE",
        "current_text": "     ",
        "target_location": {
          "type": "PARAGRAPH_INLINE",
          "row_index": null,
          "native_ref": {
            "xml_id": "2147483648",
            "element_name": "p",
            "element_path": [
              5
            ],
            "inline_range": {
              "end": 18,
              "start": 13,
              "paragraph_text": "  2026년     월     일 "
            },
            "section_file": "Contents/section0.xml",
            "fragment_index": 0,
            "text_element_paths": [
              [
                5,
                0,
                0
              ],
              [
                5,
                1,
                0
              ],
              [
                5,
                2,
                0
              ]
            ]
          },
          "block_index": 6,
          "table_index": null,
          "column_index": null,
          "section_index": 0,
          "paragraph_index": 5
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3124,
      "required": false,
      "field_key": "application_name_3",
      "created_at": "2026-09-21T16:09:26.588362",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T16:09:26.588362",
      "value_type": "TEXT",
      "constraints": null,
      "field_label": "신청인(대표자)",
      "field_order": 46,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "inline_blank"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "                ",
        "target_location": {
          "type": "PARAGRAPH_INLINE",
          "row_index": null,
          "native_ref": {
            "xml_id": "2147483648",
            "element_name": "p",
            "element_path": [
              6
            ],
            "inline_range": {
              "end": 26,
              "start": 10,
              "paragraph_text": "신청인(대표자) :                (서명, 인)"
            },
            "section_file": "Contents/section0.xml",
            "fragment_index": 0,
            "text_element_paths": [
              [
                6,
                0,
                0
              ],
              [
                6,
                1,
                0
              ]
            ]
          },
          "block_index": 7,
          "table_index": null,
          "column_index": null,
          "section_index": 0,
          "paragraph_index": 6
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3125,
      "required": false,
      "field_key": "application_month_4",
      "created_at": "2026-09-21T16:09:26.588362",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T16:09:26.588362",
      "value_type": "DATE",
      "constraints": null,
      "field_label": "월",
      "field_order": 47,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "date_part": "month",
          "fixed_year": 2026,
          "target_kind": "inline_blank"
        },
        "version": 1,
        "input_shape": "DATE",
        "current_text": "     ",
        "target_location": {
          "type": "PARAGRAPH_INLINE",
          "row_index": null,
          "native_ref": {
            "xml_id": "0",
            "element_name": "p",
            "element_path": [
              19
            ],
            "inline_range": {
              "end": 12,
              "start": 7,
              "paragraph_text": "  2026년     월     일 "
            },
            "section_file": "Contents/section0.xml",
            "fragment_index": 0,
            "text_element_paths": [
              [
                19,
                0,
                0
              ],
              [
                19,
                1,
                0
              ],
              [
                19,
                2,
                0
              ]
            ]
          },
          "block_index": 20,
          "table_index": null,
          "column_index": null,
          "section_index": 0,
          "paragraph_index": 19
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3126,
      "required": false,
      "field_key": "application_day_4",
      "created_at": "2026-09-21T16:09:26.588362",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T16:09:26.588362",
      "value_type": "DATE",
      "constraints": null,
      "field_label": "일",
      "field_order": 48,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "date_part": "day",
          "fixed_year": 2026,
          "target_kind": "inline_blank"
        },
        "version": 1,
        "input_shape": "DATE",
        "current_text": "     ",
        "target_location": {
          "type": "PARAGRAPH_INLINE",
          "row_index": null,
          "native_ref": {
            "xml_id": "0",
            "element_name": "p",
            "element_path": [
              19
            ],
            "inline_range": {
              "end": 18,
              "start": 13,
              "paragraph_text": "  2026년     월     일 "
            },
            "section_file": "Contents/section0.xml",
            "fragment_index": 0,
            "text_element_paths": [
              [
                19,
                0,
                0
              ],
              [
                19,
                1,
                0
              ],
              [
                19,
                2,
                0
              ]
            ]
          },
          "block_index": 20,
          "table_index": null,
          "column_index": null,
          "section_index": 0,
          "paragraph_index": 19
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3127,
      "required": false,
      "field_key": "application_name_4",
      "created_at": "2026-09-21T16:09:26.588362",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T16:09:26.588362",
      "value_type": "TEXT",
      "constraints": null,
      "field_label": "신청인(대표자)",
      "field_order": 49,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "inline_blank"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "                ",
        "target_location": {
          "type": "PARAGRAPH_INLINE",
          "row_index": null,
          "native_ref": {
            "xml_id": "2147483648",
            "element_name": "p",
            "element_path": [
              20
            ],
            "inline_range": {
              "end": 26,
              "start": 10,
              "paragraph_text": "신청인(대표자) :                (서명, 인)"
            },
            "section_file": "Contents/section0.xml",
            "fragment_index": 0,
            "text_element_paths": [
              [
                20,
                0,
                0
              ],
              [
                20,
                1,
                0
              ]
            ]
          },
          "block_index": 21,
          "table_index": null,
          "column_index": null,
          "section_index": 0,
          "paragraph_index": 20
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3128,
      "required": false,
      "field_key": "application_month_5",
      "created_at": "2026-09-21T16:09:26.588362",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T16:09:26.588362",
      "value_type": "DATE",
      "constraints": null,
      "field_label": "월",
      "field_order": 50,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "date_part": "month",
          "fixed_year": 2026,
          "target_kind": "inline_blank"
        },
        "version": 1,
        "input_shape": "DATE",
        "current_text": "     ",
        "target_location": {
          "type": "PARAGRAPH_INLINE",
          "row_index": null,
          "native_ref": {
            "xml_id": "2147483648",
            "element_name": "p",
            "element_path": [
              39
            ],
            "inline_range": {
              "end": 11,
              "start": 6,
              "paragraph_text": " 2026년     월     일 "
            },
            "section_file": "Contents/section0.xml",
            "fragment_index": 0,
            "text_element_paths": [
              [
                39,
                0,
                0
              ],
              [
                39,
                1,
                0
              ]
            ]
          },
          "block_index": 45,
          "table_index": null,
          "column_index": null,
          "section_index": 0,
          "paragraph_index": 39
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3129,
      "required": false,
      "field_key": "application_day_5",
      "created_at": "2026-09-21T16:09:26.588362",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T16:09:26.588362",
      "value_type": "DATE",
      "constraints": null,
      "field_label": "일",
      "field_order": 51,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "date_part": "day",
          "fixed_year": 2026,
          "target_kind": "inline_blank"
        },
        "version": 1,
        "input_shape": "DATE",
        "current_text": "     ",
        "target_location": {
          "type": "PARAGRAPH_INLINE",
          "row_index": null,
          "native_ref": {
            "xml_id": "2147483648",
            "element_name": "p",
            "element_path": [
              39
            ],
            "inline_range": {
              "end": 17,
              "start": 12,
              "paragraph_text": " 2026년     월     일 "
            },
            "section_file": "Contents/section0.xml",
            "fragment_index": 0,
            "text_element_paths": [
              [
                39,
                0,
                0
              ],
              [
                39,
                1,
                0
              ]
            ]
          },
          "block_index": 45,
          "table_index": null,
          "column_index": null,
          "section_index": 0,
          "paragraph_index": 39
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3130,
      "required": false,
      "field_key": "application_name_5",
      "created_at": "2026-09-21T16:09:26.588362",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T16:09:26.588362",
      "value_type": "TEXT",
      "constraints": null,
      "field_label": "신청인(대표자)",
      "field_order": 52,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "inline_blank"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "                ",
        "target_location": {
          "type": "PARAGRAPH_INLINE",
          "row_index": null,
          "native_ref": {
            "xml_id": "2147483648",
            "element_name": "p",
            "element_path": [
              41
            ],
            "inline_range": {
              "end": 26,
              "start": 10,
              "paragraph_text": "신청인(대표자) :                (서명, 인)"
            },
            "section_file": "Contents/section0.xml",
            "fragment_index": 0,
            "text_element_paths": [
              [
                41,
                0,
                0
              ],
              [
                41,
                1,
                0
              ]
            ]
          },
          "block_index": 47,
          "table_index": null,
          "column_index": null,
          "section_index": 0,
          "paragraph_index": 41
        }
      },
      "mapping_status": "RESOLVED"
    }
  ],
  "sources": [
    {
      "id": 816,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T15:21:42.068892",
      "query_hint": null,
      "source_key": "BUSINESS_NAME",
      "source_type": "BUSINESS",
      "source_params": {},
      "field_schema_id": 3078
    },
    {
      "id": 817,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T15:21:42.068892",
      "query_hint": null,
      "source_key": "USER_NAME",
      "source_type": "USER",
      "source_params": {},
      "field_schema_id": 3079
    },
    {
      "id": 818,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T15:21:42.068892",
      "query_hint": null,
      "source_key": "BUSINESS_ADDRESS",
      "source_type": "BUSINESS",
      "source_params": {},
      "field_schema_id": 3080
    },
    {
      "id": 819,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T15:21:42.068892",
      "query_hint": null,
      "source_key": "USER_EMAIL",
      "source_type": "USER",
      "source_params": {},
      "field_schema_id": 3082
    },
    {
      "id": 820,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T15:21:42.068892",
      "query_hint": null,
      "source_key": "BUSINESS_NAME",
      "source_type": "BUSINESS",
      "source_params": {},
      "field_schema_id": 3094
    },
    {
      "id": 821,
      "priority": 2,
      "required": true,
      "created_at": "2026-09-21T15:21:42.068892",
      "query_hint": null,
      "source_key": "BUSINESS_CATEGORY",
      "source_type": "BUSINESS",
      "source_params": {},
      "field_schema_id": 3094
    },
    {
      "id": 822,
      "priority": 3,
      "required": true,
      "created_at": "2026-09-21T15:21:42.068892",
      "query_hint": null,
      "source_key": "BUSINESS_ADDRESS",
      "source_type": "BUSINESS",
      "source_params": {},
      "field_schema_id": 3094
    },
    {
      "id": 823,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T15:21:42.068892",
      "query_hint": null,
      "source_key": "BUSINESS_NAME",
      "source_type": "BUSINESS",
      "source_params": {},
      "field_schema_id": 3095
    },
    {
      "id": 824,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T15:21:42.068892",
      "query_hint": null,
      "source_key": "USER_NAME",
      "source_type": "USER",
      "source_params": {},
      "field_schema_id": 3096
    },
    {
      "id": 825,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T16:09:26.588362",
      "query_hint": null,
      "source_key": "PROGRAM_DRAFT_DATE",
      "source_type": "PROGRAM",
      "source_params": {},
      "field_schema_id": 3116
    },
    {
      "id": 826,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T16:09:26.588362",
      "query_hint": null,
      "source_key": "PROGRAM_DRAFT_DATE",
      "source_type": "PROGRAM",
      "source_params": {},
      "field_schema_id": 3117
    },
    {
      "id": 827,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T16:09:26.588362",
      "query_hint": null,
      "source_key": "USER_NAME",
      "source_type": "USER",
      "source_params": {},
      "field_schema_id": 3118
    },
    {
      "id": 828,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T16:09:26.588362",
      "query_hint": null,
      "source_key": "PROGRAM_DRAFT_DATE",
      "source_type": "PROGRAM",
      "source_params": {},
      "field_schema_id": 3119
    },
    {
      "id": 829,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T16:09:26.588362",
      "query_hint": null,
      "source_key": "PROGRAM_DRAFT_DATE",
      "source_type": "PROGRAM",
      "source_params": {},
      "field_schema_id": 3120
    },
    {
      "id": 830,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T16:09:26.588362",
      "query_hint": null,
      "source_key": "USER_NAME",
      "source_type": "USER",
      "source_params": {},
      "field_schema_id": 3121
    },
    {
      "id": 831,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T16:09:26.588362",
      "query_hint": null,
      "source_key": "PROGRAM_DRAFT_DATE",
      "source_type": "PROGRAM",
      "source_params": {},
      "field_schema_id": 3122
    },
    {
      "id": 832,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T16:09:26.588362",
      "query_hint": null,
      "source_key": "PROGRAM_DRAFT_DATE",
      "source_type": "PROGRAM",
      "source_params": {},
      "field_schema_id": 3123
    },
    {
      "id": 833,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T16:09:26.588362",
      "query_hint": null,
      "source_key": "USER_NAME",
      "source_type": "USER",
      "source_params": {},
      "field_schema_id": 3124
    },
    {
      "id": 834,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T16:09:26.588362",
      "query_hint": null,
      "source_key": "PROGRAM_DRAFT_DATE",
      "source_type": "PROGRAM",
      "source_params": {},
      "field_schema_id": 3125
    },
    {
      "id": 835,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T16:09:26.588362",
      "query_hint": null,
      "source_key": "PROGRAM_DRAFT_DATE",
      "source_type": "PROGRAM",
      "source_params": {},
      "field_schema_id": 3126
    },
    {
      "id": 836,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T16:09:26.588362",
      "query_hint": null,
      "source_key": "USER_NAME",
      "source_type": "USER",
      "source_params": {},
      "field_schema_id": 3127
    },
    {
      "id": 837,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T16:09:26.588362",
      "query_hint": null,
      "source_key": "PROGRAM_DRAFT_DATE",
      "source_type": "PROGRAM",
      "source_params": {},
      "field_schema_id": 3128
    },
    {
      "id": 838,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T16:09:26.588362",
      "query_hint": null,
      "source_key": "PROGRAM_DRAFT_DATE",
      "source_type": "PROGRAM",
      "source_params": {},
      "field_schema_id": 3129
    },
    {
      "id": 839,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T16:09:26.588362",
      "query_hint": null,
      "source_key": "USER_NAME",
      "source_type": "USER",
      "source_params": {},
      "field_schema_id": 3130
    }
  ],
  "document": {
    "id": 40,
    "url": null,
    "type": "작성용",
    "doc_name": "붙임2.[2026+경북+소상공인+새바람체인지업]+서식1~6",
    "support_program_id": 17
  },
  "templates": [
    {
      "id": 9,
      "created_at": "2026-09-18T13:02:32.757617",
      "updated_at": "2026-09-18T13:02:54.136982",
      "parse_error": null,
      "parse_status": "COMPLETED",
      "schema_version": 1,
      "normalized_path": "/data/document-agent/normalized/40/normalized-dy7clhwk.hwpx",
      "original_format": "HWP",
      "normalized_format": "HWPX",
      "program_document_id": 40
    }
  ]
}
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
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $sync40$
DECLARE
    snapshot jsonb := $snapshot40$
{
  "fields": [
    {
      "id": 3078,
      "required": false,
      "field_key": "business_name",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "TEXT",
      "constraints": null,
      "field_label": "업체명",
      "field_order": 0,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "       ",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 2,
          "native_ref": {
            "row_order": 2,
            "cell_order": 1,
            "element_name": "tc",
            "element_path": [
              0,
              0,
              2,
              6,
              1
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 0,
          "table_index": 0,
          "column_index": 1,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3079,
      "required": false,
      "field_key": "applicant_name",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "TEXT",
      "constraints": null,
      "field_label": "신청인 (대표자)",
      "field_order": 1,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "             ",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 2,
          "native_ref": {
            "row_order": 2,
            "cell_order": 3,
            "element_name": "tc",
            "element_path": [
              0,
              0,
              2,
              6,
              3
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 0,
          "table_index": 0,
          "column_index": 10,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3080,
      "required": false,
      "field_key": "business_address",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "TEXT",
      "constraints": null,
      "field_label": "주소지",
      "field_order": 2,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "helper_text": "(사업자등록증상)",
          "target_kind": "helper"
        },
        "version": 1,
        "input_shape": "UNKNOWN",
        "current_text": "(사업자등록증상)",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 3,
          "native_ref": {
            "row_order": 3,
            "cell_order": 1,
            "element_name": "tc",
            "element_path": [
              0,
              0,
              2,
              7,
              1
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 0,
          "table_index": 0,
          "column_index": 1,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3081,
      "required": false,
      "field_key": "applicant_mobile",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "TEXT",
      "constraints": null,
      "field_label": "휴대전화",
      "field_order": 3,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 3,
          "native_ref": {
            "row_order": 3,
            "cell_order": 3,
            "element_name": "tc",
            "element_path": [
              0,
              0,
              2,
              7,
              3
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 0,
          "table_index": 0,
          "column_index": 10,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3082,
      "required": false,
      "field_key": "applicant_email",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "TEXT",
      "constraints": null,
      "field_label": "e메일",
      "field_order": 4,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 4,
          "native_ref": {
            "row_order": 4,
            "cell_order": 2,
            "element_name": "tc",
            "element_path": [
              0,
              0,
              2,
              8,
              2
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 0,
          "table_index": 0,
          "column_index": 10,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3083,
      "required": false,
      "field_key": "outdoor_sign_change",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "신청분야(☑)",
      "field_order": 5,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "placeholder",
          "placeholder_text": "□ 옥외 간판교체"
        },
        "version": 1,
        "input_shape": "CHECKBOX",
        "current_text": "□ 옥외 간판교체",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 7,
          "native_ref": {
            "row_order": 7,
            "cell_order": 0,
            "element_name": "tc",
            "element_path": [
              0,
              0,
              2,
              11,
              0
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 0,
          "table_index": 0,
          "column_index": 0,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3084,
      "required": false,
      "field_key": "new_sign_install",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "(공급가 80% \n최대 300만원)",
      "field_order": 6,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "placeholder",
          "placeholder_text": "□ 신규 간판 설치"
        },
        "version": 1,
        "input_shape": "CHECKBOX",
        "current_text": "□ 신규 간판 설치",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 7,
          "native_ref": {
            "row_order": 7,
            "cell_order": 2,
            "element_name": "tc",
            "element_path": [
              0,
              0,
              2,
              11,
              2
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 0,
          "table_index": 0,
          "column_index": 4,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3085,
      "required": false,
      "field_key": "sign_replacement",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "세부개선내용(☑)",
      "field_order": 7,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "placeholder",
          "placeholder_text": "□ 간판 교체"
        },
        "version": 1,
        "input_shape": "CHECKBOX",
        "current_text": "□ 간판 교체 ",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 7,
          "native_ref": {
            "row_order": 7,
            "cell_order": 3,
            "element_name": "tc",
            "element_path": [
              0,
              0,
              2,
              11,
              3
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 0,
          "table_index": 0,
          "column_index": 7,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3086,
      "required": false,
      "field_key": "sign_equipment_replacement",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "세부개선내용(☑)",
      "field_order": 8,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "placeholder",
          "placeholder_text": "□ 간판 내부설비 교체"
        },
        "version": 1,
        "input_shape": "CHECKBOX",
        "current_text": "□ 간판 내부설비 교체",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 7,
          "native_ref": {
            "row_order": 7,
            "cell_order": 4,
            "element_name": "tc",
            "element_path": [
              0,
              0,
              2,
              11,
              4
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 0,
          "table_index": 0,
          "column_index": 12,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3087,
      "required": false,
      "field_key": "interior_renovation",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "(공급가 80% \n최대 500만원)",
      "field_order": 9,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "placeholder",
          "placeholder_text": "□ 내부인테리어"
        },
        "version": 1,
        "input_shape": "CHECKBOX",
        "current_text": "□ 내부인테리어",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 9,
          "native_ref": {
            "row_order": 9,
            "cell_order": 2,
            "element_name": "tc",
            "element_path": [
              0,
              0,
              2,
              13,
              2
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 0,
          "table_index": 0,
          "column_index": 4,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3088,
      "required": false,
      "field_key": "led_electrical_work",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "(공급가 80% \n최대 500만원)",
      "field_order": 10,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "placeholder",
          "placeholder_text": "□ LED 조명 및 전기공사"
        },
        "version": 1,
        "input_shape": "CHECKBOX",
        "current_text": "□ LED 조명 및 전기공사",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 10,
          "native_ref": {
            "row_order": 10,
            "cell_order": 0,
            "element_name": "tc",
            "element_path": [
              0,
              0,
              2,
              14,
              0
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 0,
          "table_index": 0,
          "column_index": 4,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3089,
      "required": false,
      "field_key": "dining_table_replacement",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "(공급가 80% \n최대 500만원)",
      "field_order": 11,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "placeholder",
          "placeholder_text": "□ (식당) 입식 테이블로 교체"
        },
        "version": 1,
        "input_shape": "CHECKBOX",
        "current_text": "□ (식당) 입식 테이블로 교체",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 11,
          "native_ref": {
            "row_order": 11,
            "cell_order": 0,
            "element_name": "tc",
            "element_path": [
              0,
              0,
              2,
              15,
              0
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 0,
          "table_index": 0,
          "column_index": 4,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3090,
      "required": false,
      "field_key": "pos_system",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "(공급가 80%\n최대 200만원)",
      "field_order": 12,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "placeholder",
          "placeholder_text": "□ POS시스템"
        },
        "version": 1,
        "input_shape": "CHECKBOX",
        "current_text": "□ POS시스템",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 13,
          "native_ref": {
            "row_order": 13,
            "cell_order": 2,
            "element_name": "tc",
            "element_path": [
              0,
              0,
              2,
              17,
              2
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 0,
          "table_index": 0,
          "column_index": 4,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3091,
      "required": false,
      "field_key": "table_order",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "(공급가 80%\n최대 200만원)",
      "field_order": 13,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "placeholder",
          "placeholder_text": "□ 테이블오더"
        },
        "version": 1,
        "input_shape": "CHECKBOX",
        "current_text": "□ 테이블오더 ",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 14,
          "native_ref": {
            "row_order": 14,
            "cell_order": 0,
            "element_name": "tc",
            "element_path": [
              0,
              0,
              2,
              18,
              0
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 0,
          "table_index": 0,
          "column_index": 4,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3092,
      "required": false,
      "field_key": "consulting_service",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "컨설팅 분야 선택(☑)",
      "field_order": 14,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "placeholder",
          "placeholder_text": "□ 서비스 개선"
        },
        "version": 1,
        "input_shape": "CHECKBOX",
        "current_text": "□ 서비스 개선",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 17,
          "native_ref": {
            "row_order": 17,
            "cell_order": 0,
            "element_name": "tc",
            "element_path": [
              0,
              0,
              2,
              21,
              0
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 0,
          "table_index": 0,
          "column_index": 0,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3093,
      "required": false,
      "field_key": "consulting_finance",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "컨설팅 분야 선택(☑)",
      "field_order": 15,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "placeholder",
          "placeholder_text": "□ 재무관리"
        },
        "version": 1,
        "input_shape": "CHECKBOX",
        "current_text": "□ 재무관리",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 17,
          "native_ref": {
            "row_order": 17,
            "cell_order": 1,
            "element_name": "tc",
            "element_path": [
              0,
              0,
              2,
              21,
              1
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 0,
          "table_index": 0,
          "column_index": 5,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3094,
      "required": false,
      "field_key": "business_plan_detail",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "GENERATED",
      "max_length": 300,
      "min_length": null,
      "updated_at": "2026-09-21T15:35:55.100313",
      "value_type": "TEXT",
      "constraints": null,
      "field_label": "점포 소개, 점포개선할 내용, 필요성 등 자율 기재 (300자 이내 간략 기술)",
      "field_order": 16,
      "instruction": "제공된 업체명·업종·주소를 바탕으로 점포 소개와 일반적인 점포 개선 방향, 기대효과를 공백 포함 300자 이내로 작성한다. 구체적인 개선 항목이 제공되지 않았다면 고객 편의와 쾌적한 이용환경 조성 등 일반적인 목표를 향후 계획으로 표현한다. 세부 개선 항목이 없다는 이유만으로 INPUT_REQUIRED를 반환하지 않는다. 확인되지 않은 시설 노후화, 매출, 견적, 확정된 공사 내용이나 수치 성과를 사실처럼 작성하지 않는다. 성공 content에는 신청서에 들어갈 본문만 작성한다.",
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "LONG_TEXT",
        "current_text": "\n\n\n\n\n\n\n\n ",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 3,
          "native_ref": {
            "row_order": 3,
            "cell_order": 0,
            "element_name": "tc",
            "element_path": [
              1,
              0,
              0,
              7,
              0
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 1,
          "table_index": 1,
          "column_index": 0,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3095,
      "required": false,
      "field_key": "estimate_business_name",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "TEXT",
      "constraints": null,
      "field_label": "업체명",
      "field_order": 17,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 2,
          "native_ref": {
            "row_order": 2,
            "cell_order": 1,
            "element_name": "tc",
            "element_path": [
              2,
              0,
              0,
              6,
              1
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 3,
          "table_index": 2,
          "column_index": 2,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3096,
      "required": false,
      "field_key": "estimate_applicant_name",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "TEXT",
      "constraints": null,
      "field_label": "신청인 (대표자)",
      "field_order": 18,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 2,
          "native_ref": {
            "row_order": 2,
            "cell_order": 3,
            "element_name": "tc",
            "element_path": [
              2,
              0,
              0,
              6,
              3
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 3,
          "table_index": 2,
          "column_index": 8,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3097,
      "required": false,
      "field_key": "planned_application_category",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "TEXT",
      "constraints": null,
      "field_label": "신청분야",
      "field_order": 19,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 6,
          "native_ref": {
            "row_order": 6,
            "cell_order": 0,
            "element_name": "tc",
            "element_path": [
              2,
              0,
              0,
              10,
              0
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 3,
          "table_index": 2,
          "column_index": 0,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3098,
      "required": false,
      "field_key": "contractor_name",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "TEXT",
      "constraints": null,
      "field_label": "외주업체명",
      "field_order": 20,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 6,
          "native_ref": {
            "row_order": 6,
            "cell_order": 1,
            "element_name": "tc",
            "element_path": [
              2,
              0,
              0,
              10,
              1
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 3,
          "table_index": 2,
          "column_index": 2,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3099,
      "required": false,
      "field_key": "planned_improvement_item",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "TEXT",
      "constraints": null,
      "field_label": "세부개선내용\n(개선예정 품목)",
      "field_order": 21,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 6,
          "native_ref": {
            "row_order": 6,
            "cell_order": 2,
            "element_name": "tc",
            "element_path": [
              2,
              0,
              0,
              10,
              2
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 3,
          "table_index": 2,
          "column_index": 3,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3100,
      "required": false,
      "field_key": "planned_quantity",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "NUMBER",
      "constraints": null,
      "field_label": "수량 ",
      "field_order": 22,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 6,
          "native_ref": {
            "row_order": 6,
            "cell_order": 3,
            "element_name": "tc",
            "element_path": [
              2,
              0,
              0,
              10,
              3
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 3,
          "table_index": 2,
          "column_index": 4,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3101,
      "required": false,
      "field_key": "planned_specification",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "TEXT",
      "constraints": null,
      "field_label": "규격",
      "field_order": 23,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 6,
          "native_ref": {
            "row_order": 6,
            "cell_order": 4,
            "element_name": "tc",
            "element_path": [
              2,
              0,
              0,
              10,
              4
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 3,
          "table_index": 2,
          "column_index": 5,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3102,
      "required": false,
      "field_key": "quoted_supply_price",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "NUMBER",
      "constraints": null,
      "field_label": "공급가",
      "field_order": 24,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 6,
          "native_ref": {
            "row_order": 6,
            "cell_order": 5,
            "element_name": "tc",
            "element_path": [
              2,
              0,
              0,
              10,
              5
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 3,
          "table_index": 2,
          "column_index": 7,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "UNSUPPORTED"
    },
    {
      "id": 3103,
      "required": false,
      "field_key": "quoted_vat",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "NUMBER",
      "constraints": null,
      "field_label": "부가세",
      "field_order": 25,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 6,
          "native_ref": {
            "row_order": 6,
            "cell_order": 6,
            "element_name": "tc",
            "element_path": [
              2,
              0,
              0,
              10,
              6
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 3,
          "table_index": 2,
          "column_index": 9,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "UNSUPPORTED"
    },
    {
      "id": 3104,
      "required": false,
      "field_key": "total_supply_price",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "COMPUTED",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "NUMBER",
      "constraints": null,
      "field_label": "합 계",
      "field_order": 26,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 15,
          "native_ref": {
            "row_order": 15,
            "cell_order": 1,
            "element_name": "tc",
            "element_path": [
              2,
              0,
              0,
              19,
              1
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 3,
          "table_index": 2,
          "column_index": 7,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "UNSUPPORTED"
    },
    {
      "id": 3105,
      "required": false,
      "field_key": "previous_application_yes",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "2021년 ~ 2025년 본 사업에 신청하신 적이 있습니까?",
      "field_order": 27,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 2,
          "native_ref": {
            "row_order": 2,
            "cell_order": 1,
            "element_name": "tc",
            "element_path": [
              11,
              0,
              0,
              6,
              1
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 12,
          "table_index": 6,
          "column_index": 1,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3106,
      "required": false,
      "field_key": "previous_application_no",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "아니오",
      "field_order": 28,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 2,
          "native_ref": {
            "row_order": 2,
            "cell_order": 2,
            "element_name": "tc",
            "element_path": [
              11,
              0,
              0,
              6,
              2
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 12,
          "table_index": 6,
          "column_index": 2,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3107,
      "required": false,
      "field_key": "anti_kickback_acknowledgement",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "확인",
      "field_order": 29,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 1,
          "native_ref": {
            "row_order": 1,
            "cell_order": 1,
            "element_name": "tc",
            "element_path": [
              16,
              0,
              0,
              5,
              1
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 17,
          "table_index": 7,
          "column_index": 1,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3108,
      "required": false,
      "field_key": "bonus_evidence_acknowledgement",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "가점사항에 대한 증빙을 제출하지 않은 경우, 점수 부여 불가합니다.",
      "field_order": 30,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 5,
          "native_ref": {
            "row_order": 5,
            "cell_order": 1,
            "element_name": "tc",
            "element_path": [
              16,
              0,
              0,
              9,
              1
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 17,
          "table_index": 7,
          "column_index": 1,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3109,
      "required": false,
      "field_key": "evidence_deadline_acknowledgement",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "사업 신청기간 내에 접수되지 않은 증빙서류에 대해 추가 보완 불가하며 이의를 제기하지않습니다",
      "field_order": 31,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 6,
          "native_ref": {
            "row_order": 6,
            "cell_order": 1,
            "element_name": "tc",
            "element_path": [
              16,
              0,
              0,
              10,
              1
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 17,
          "table_index": 7,
          "column_index": 1,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3110,
      "required": false,
      "field_key": "privacy_collection_consent",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "동의",
      "field_order": 32,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 0,
          "native_ref": {
            "row_order": 0,
            "cell_order": 1,
            "element_name": "tc",
            "element_path": [
              30,
              0,
              1,
              4,
              1
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 32,
          "table_index": 10,
          "column_index": 1,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3111,
      "required": false,
      "field_key": "privacy_collection_refusal",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "미동의",
      "field_order": 33,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 0,
          "native_ref": {
            "row_order": 0,
            "cell_order": 4,
            "element_name": "tc",
            "element_path": [
              30,
              0,
              1,
              4,
              4
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 32,
          "table_index": 10,
          "column_index": 4,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3112,
      "required": false,
      "field_key": "province_sharing_consent",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "동의",
      "field_order": 34,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 0,
          "native_ref": {
            "row_order": 0,
            "cell_order": 1,
            "element_name": "tc",
            "element_path": [
              36,
              0,
              1,
              4,
              1
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 39,
          "table_index": 12,
          "column_index": 1,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3113,
      "required": false,
      "field_key": "province_sharing_refusal",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "미동의",
      "field_order": 35,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 0,
          "native_ref": {
            "row_order": 0,
            "cell_order": 4,
            "element_name": "tc",
            "element_path": [
              36,
              0,
              1,
              4,
              4
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 39,
          "table_index": 12,
          "column_index": 4,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3114,
      "required": false,
      "field_key": "external_sharing_consent",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "동의",
      "field_order": 36,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 0,
          "native_ref": {
            "row_order": 0,
            "cell_order": 1,
            "element_name": "tc",
            "element_path": [
              38,
              0,
              1,
              4,
              1
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 43,
          "table_index": 13,
          "column_index": 1,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3115,
      "required": false,
      "field_key": "external_sharing_refusal",
      "created_at": "2026-09-21T15:21:42.068892",
      "field_type": "USER_INPUT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T15:21:42.068892",
      "value_type": "BOOLEAN",
      "constraints": null,
      "field_label": "미동의",
      "field_order": 37,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "empty"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "",
        "target_location": {
          "type": "TABLE_CELL",
          "row_index": 0,
          "native_ref": {
            "row_order": 0,
            "cell_order": 4,
            "element_name": "tc",
            "element_path": [
              38,
              0,
              1,
              4,
              4
            ],
            "section_file": "Contents/section0.xml"
          },
          "block_index": 43,
          "table_index": 13,
          "column_index": 4,
          "section_index": 0,
          "paragraph_index": null
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3116,
      "required": false,
      "field_key": "application_month_1",
      "created_at": "2026-09-21T16:09:26.588362",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T16:09:26.588362",
      "value_type": "DATE",
      "constraints": null,
      "field_label": "월",
      "field_order": 38,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "date_part": "month",
          "fixed_year": 2026,
          "target_kind": "inline_blank"
        },
        "version": 1,
        "input_shape": "DATE",
        "current_text": "     ",
        "target_location": {
          "type": "PARAGRAPH_INLINE",
          "row_index": 20,
          "native_ref": {
            "xml_id": "2147483648",
            "element_name": "p",
            "element_path": [
              0,
              0,
              2,
              24,
              0,
              0,
              2
            ],
            "inline_range": {
              "end": 12,
              "start": 7,
              "paragraph_text": "  2026년     월     일 "
            },
            "section_file": "Contents/section0.xml",
            "fragment_index": 0,
            "text_element_paths": [
              [
                0,
                0,
                2,
                24,
                0,
                0,
                2,
                0,
                0
              ],
              [
                0,
                0,
                2,
                24,
                0,
                0,
                2,
                1,
                0
              ],
              [
                0,
                0,
                2,
                24,
                0,
                0,
                2,
                2,
                0
              ]
            ]
          },
          "block_index": 2,
          "table_index": 0,
          "column_index": 0,
          "section_index": 0,
          "paragraph_index": 2
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3117,
      "required": false,
      "field_key": "application_day_1",
      "created_at": "2026-09-21T16:09:26.588362",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T16:09:26.588362",
      "value_type": "DATE",
      "constraints": null,
      "field_label": "일",
      "field_order": 39,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "date_part": "day",
          "fixed_year": 2026,
          "target_kind": "inline_blank"
        },
        "version": 1,
        "input_shape": "DATE",
        "current_text": "     ",
        "target_location": {
          "type": "PARAGRAPH_INLINE",
          "row_index": 20,
          "native_ref": {
            "xml_id": "2147483648",
            "element_name": "p",
            "element_path": [
              0,
              0,
              2,
              24,
              0,
              0,
              2
            ],
            "inline_range": {
              "end": 18,
              "start": 13,
              "paragraph_text": "  2026년     월     일 "
            },
            "section_file": "Contents/section0.xml",
            "fragment_index": 0,
            "text_element_paths": [
              [
                0,
                0,
                2,
                24,
                0,
                0,
                2,
                0,
                0
              ],
              [
                0,
                0,
                2,
                24,
                0,
                0,
                2,
                1,
                0
              ],
              [
                0,
                0,
                2,
                24,
                0,
                0,
                2,
                2,
                0
              ]
            ]
          },
          "block_index": 2,
          "table_index": 0,
          "column_index": 0,
          "section_index": 0,
          "paragraph_index": 2
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3118,
      "required": false,
      "field_key": "application_name_1",
      "created_at": "2026-09-21T16:09:26.588362",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T16:09:26.588362",
      "value_type": "TEXT",
      "constraints": null,
      "field_label": "신청인(대표자)",
      "field_order": 40,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "inline_blank"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "                ",
        "target_location": {
          "type": "PARAGRAPH_INLINE",
          "row_index": 20,
          "native_ref": {
            "xml_id": "2147483648",
            "element_name": "p",
            "element_path": [
              0,
              0,
              2,
              24,
              0,
              0,
              3
            ],
            "inline_range": {
              "end": 26,
              "start": 10,
              "paragraph_text": "신청인(대표자) :                (서명, 인)"
            },
            "section_file": "Contents/section0.xml",
            "fragment_index": 0,
            "text_element_paths": [
              [
                0,
                0,
                2,
                24,
                0,
                0,
                3,
                0,
                0
              ],
              [
                0,
                0,
                2,
                24,
                0,
                0,
                3,
                1,
                0
              ]
            ]
          },
          "block_index": 3,
          "table_index": 0,
          "column_index": 0,
          "section_index": 0,
          "paragraph_index": 3
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3119,
      "required": false,
      "field_key": "application_month_2",
      "created_at": "2026-09-21T16:09:26.588362",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T16:09:26.588362",
      "value_type": "DATE",
      "constraints": null,
      "field_label": "월",
      "field_order": 41,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "date_part": "month",
          "fixed_year": 2026,
          "target_kind": "inline_blank"
        },
        "version": 1,
        "input_shape": "DATE",
        "current_text": "     ",
        "target_location": {
          "type": "PARAGRAPH_INLINE",
          "row_index": 16,
          "native_ref": {
            "xml_id": "2147483648",
            "element_name": "p",
            "element_path": [
              2,
              0,
              0,
              20,
              0,
              0,
              7
            ],
            "inline_range": {
              "end": 10,
              "start": 5,
              "paragraph_text": "2026년     월     일 "
            },
            "section_file": "Contents/section0.xml",
            "fragment_index": 0,
            "text_element_paths": [
              [
                2,
                0,
                0,
                20,
                0,
                0,
                7,
                0,
                0
              ]
            ]
          },
          "block_index": 7,
          "table_index": 2,
          "column_index": 0,
          "section_index": 0,
          "paragraph_index": 7
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3120,
      "required": false,
      "field_key": "application_day_2",
      "created_at": "2026-09-21T16:09:26.588362",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T16:09:26.588362",
      "value_type": "DATE",
      "constraints": null,
      "field_label": "일",
      "field_order": 42,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "date_part": "day",
          "fixed_year": 2026,
          "target_kind": "inline_blank"
        },
        "version": 1,
        "input_shape": "DATE",
        "current_text": "     ",
        "target_location": {
          "type": "PARAGRAPH_INLINE",
          "row_index": 16,
          "native_ref": {
            "xml_id": "2147483648",
            "element_name": "p",
            "element_path": [
              2,
              0,
              0,
              20,
              0,
              0,
              7
            ],
            "inline_range": {
              "end": 16,
              "start": 11,
              "paragraph_text": "2026년     월     일 "
            },
            "section_file": "Contents/section0.xml",
            "fragment_index": 0,
            "text_element_paths": [
              [
                2,
                0,
                0,
                20,
                0,
                0,
                7,
                0,
                0
              ]
            ]
          },
          "block_index": 7,
          "table_index": 2,
          "column_index": 0,
          "section_index": 0,
          "paragraph_index": 7
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3121,
      "required": false,
      "field_key": "application_name_2",
      "created_at": "2026-09-21T16:09:26.588362",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T16:09:26.588362",
      "value_type": "TEXT",
      "constraints": null,
      "field_label": "신청인(대표자)",
      "field_order": 43,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "inline_blank"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "                ",
        "target_location": {
          "type": "PARAGRAPH_INLINE",
          "row_index": 17,
          "native_ref": {
            "xml_id": "2147483648",
            "element_name": "p",
            "element_path": [
              2,
              0,
              0,
              21,
              0,
              0,
              0
            ],
            "inline_range": {
              "end": 26,
              "start": 10,
              "paragraph_text": "신청인(대표자) :                (서명, 인)"
            },
            "section_file": "Contents/section0.xml",
            "fragment_index": 0,
            "text_element_paths": [
              [
                2,
                0,
                0,
                21,
                0,
                0,
                0,
                0,
                0
              ],
              [
                2,
                0,
                0,
                21,
                0,
                0,
                0,
                1,
                0
              ]
            ]
          },
          "block_index": 0,
          "table_index": 2,
          "column_index": 0,
          "section_index": 0,
          "paragraph_index": 0
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3122,
      "required": false,
      "field_key": "application_month_3",
      "created_at": "2026-09-21T16:09:26.588362",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T16:09:26.588362",
      "value_type": "DATE",
      "constraints": null,
      "field_label": "월",
      "field_order": 44,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "date_part": "month",
          "fixed_year": 2026,
          "target_kind": "inline_blank"
        },
        "version": 1,
        "input_shape": "DATE",
        "current_text": "     ",
        "target_location": {
          "type": "PARAGRAPH_INLINE",
          "row_index": null,
          "native_ref": {
            "xml_id": "2147483648",
            "element_name": "p",
            "element_path": [
              5
            ],
            "inline_range": {
              "end": 12,
              "start": 7,
              "paragraph_text": "  2026년     월     일 "
            },
            "section_file": "Contents/section0.xml",
            "fragment_index": 0,
            "text_element_paths": [
              [
                5,
                0,
                0
              ],
              [
                5,
                1,
                0
              ],
              [
                5,
                2,
                0
              ]
            ]
          },
          "block_index": 6,
          "table_index": null,
          "column_index": null,
          "section_index": 0,
          "paragraph_index": 5
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3123,
      "required": false,
      "field_key": "application_day_3",
      "created_at": "2026-09-21T16:09:26.588362",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T16:09:26.588362",
      "value_type": "DATE",
      "constraints": null,
      "field_label": "일",
      "field_order": 45,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "date_part": "day",
          "fixed_year": 2026,
          "target_kind": "inline_blank"
        },
        "version": 1,
        "input_shape": "DATE",
        "current_text": "     ",
        "target_location": {
          "type": "PARAGRAPH_INLINE",
          "row_index": null,
          "native_ref": {
            "xml_id": "2147483648",
            "element_name": "p",
            "element_path": [
              5
            ],
            "inline_range": {
              "end": 18,
              "start": 13,
              "paragraph_text": "  2026년     월     일 "
            },
            "section_file": "Contents/section0.xml",
            "fragment_index": 0,
            "text_element_paths": [
              [
                5,
                0,
                0
              ],
              [
                5,
                1,
                0
              ],
              [
                5,
                2,
                0
              ]
            ]
          },
          "block_index": 6,
          "table_index": null,
          "column_index": null,
          "section_index": 0,
          "paragraph_index": 5
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3124,
      "required": false,
      "field_key": "application_name_3",
      "created_at": "2026-09-21T16:09:26.588362",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T16:09:26.588362",
      "value_type": "TEXT",
      "constraints": null,
      "field_label": "신청인(대표자)",
      "field_order": 46,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "inline_blank"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "                ",
        "target_location": {
          "type": "PARAGRAPH_INLINE",
          "row_index": null,
          "native_ref": {
            "xml_id": "2147483648",
            "element_name": "p",
            "element_path": [
              6
            ],
            "inline_range": {
              "end": 26,
              "start": 10,
              "paragraph_text": "신청인(대표자) :                (서명, 인)"
            },
            "section_file": "Contents/section0.xml",
            "fragment_index": 0,
            "text_element_paths": [
              [
                6,
                0,
                0
              ],
              [
                6,
                1,
                0
              ]
            ]
          },
          "block_index": 7,
          "table_index": null,
          "column_index": null,
          "section_index": 0,
          "paragraph_index": 6
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3125,
      "required": false,
      "field_key": "application_month_4",
      "created_at": "2026-09-21T16:09:26.588362",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T16:09:26.588362",
      "value_type": "DATE",
      "constraints": null,
      "field_label": "월",
      "field_order": 47,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "date_part": "month",
          "fixed_year": 2026,
          "target_kind": "inline_blank"
        },
        "version": 1,
        "input_shape": "DATE",
        "current_text": "     ",
        "target_location": {
          "type": "PARAGRAPH_INLINE",
          "row_index": null,
          "native_ref": {
            "xml_id": "0",
            "element_name": "p",
            "element_path": [
              19
            ],
            "inline_range": {
              "end": 12,
              "start": 7,
              "paragraph_text": "  2026년     월     일 "
            },
            "section_file": "Contents/section0.xml",
            "fragment_index": 0,
            "text_element_paths": [
              [
                19,
                0,
                0
              ],
              [
                19,
                1,
                0
              ],
              [
                19,
                2,
                0
              ]
            ]
          },
          "block_index": 20,
          "table_index": null,
          "column_index": null,
          "section_index": 0,
          "paragraph_index": 19
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3126,
      "required": false,
      "field_key": "application_day_4",
      "created_at": "2026-09-21T16:09:26.588362",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T16:09:26.588362",
      "value_type": "DATE",
      "constraints": null,
      "field_label": "일",
      "field_order": 48,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "date_part": "day",
          "fixed_year": 2026,
          "target_kind": "inline_blank"
        },
        "version": 1,
        "input_shape": "DATE",
        "current_text": "     ",
        "target_location": {
          "type": "PARAGRAPH_INLINE",
          "row_index": null,
          "native_ref": {
            "xml_id": "0",
            "element_name": "p",
            "element_path": [
              19
            ],
            "inline_range": {
              "end": 18,
              "start": 13,
              "paragraph_text": "  2026년     월     일 "
            },
            "section_file": "Contents/section0.xml",
            "fragment_index": 0,
            "text_element_paths": [
              [
                19,
                0,
                0
              ],
              [
                19,
                1,
                0
              ],
              [
                19,
                2,
                0
              ]
            ]
          },
          "block_index": 20,
          "table_index": null,
          "column_index": null,
          "section_index": 0,
          "paragraph_index": 19
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3127,
      "required": false,
      "field_key": "application_name_4",
      "created_at": "2026-09-21T16:09:26.588362",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T16:09:26.588362",
      "value_type": "TEXT",
      "constraints": null,
      "field_label": "신청인(대표자)",
      "field_order": 49,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "inline_blank"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "                ",
        "target_location": {
          "type": "PARAGRAPH_INLINE",
          "row_index": null,
          "native_ref": {
            "xml_id": "2147483648",
            "element_name": "p",
            "element_path": [
              20
            ],
            "inline_range": {
              "end": 26,
              "start": 10,
              "paragraph_text": "신청인(대표자) :                (서명, 인)"
            },
            "section_file": "Contents/section0.xml",
            "fragment_index": 0,
            "text_element_paths": [
              [
                20,
                0,
                0
              ],
              [
                20,
                1,
                0
              ]
            ]
          },
          "block_index": 21,
          "table_index": null,
          "column_index": null,
          "section_index": 0,
          "paragraph_index": 20
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3128,
      "required": false,
      "field_key": "application_month_5",
      "created_at": "2026-09-21T16:09:26.588362",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T16:09:26.588362",
      "value_type": "DATE",
      "constraints": null,
      "field_label": "월",
      "field_order": 50,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "date_part": "month",
          "fixed_year": 2026,
          "target_kind": "inline_blank"
        },
        "version": 1,
        "input_shape": "DATE",
        "current_text": "     ",
        "target_location": {
          "type": "PARAGRAPH_INLINE",
          "row_index": null,
          "native_ref": {
            "xml_id": "2147483648",
            "element_name": "p",
            "element_path": [
              39
            ],
            "inline_range": {
              "end": 11,
              "start": 6,
              "paragraph_text": " 2026년     월     일 "
            },
            "section_file": "Contents/section0.xml",
            "fragment_index": 0,
            "text_element_paths": [
              [
                39,
                0,
                0
              ],
              [
                39,
                1,
                0
              ]
            ]
          },
          "block_index": 45,
          "table_index": null,
          "column_index": null,
          "section_index": 0,
          "paragraph_index": 39
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3129,
      "required": false,
      "field_key": "application_day_5",
      "created_at": "2026-09-21T16:09:26.588362",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T16:09:26.588362",
      "value_type": "DATE",
      "constraints": null,
      "field_label": "일",
      "field_order": 51,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "date_part": "day",
          "fixed_year": 2026,
          "target_kind": "inline_blank"
        },
        "version": 1,
        "input_shape": "DATE",
        "current_text": "     ",
        "target_location": {
          "type": "PARAGRAPH_INLINE",
          "row_index": null,
          "native_ref": {
            "xml_id": "2147483648",
            "element_name": "p",
            "element_path": [
              39
            ],
            "inline_range": {
              "end": 17,
              "start": 12,
              "paragraph_text": " 2026년     월     일 "
            },
            "section_file": "Contents/section0.xml",
            "fragment_index": 0,
            "text_element_paths": [
              [
                39,
                0,
                0
              ],
              [
                39,
                1,
                0
              ]
            ]
          },
          "block_index": 45,
          "table_index": null,
          "column_index": null,
          "section_index": 0,
          "paragraph_index": 39
        }
      },
      "mapping_status": "RESOLVED"
    },
    {
      "id": 3130,
      "required": false,
      "field_key": "application_name_5",
      "created_at": "2026-09-21T16:09:26.588362",
      "field_type": "DIRECT",
      "max_length": null,
      "min_length": null,
      "updated_at": "2026-09-21T16:09:26.588362",
      "value_type": "TEXT",
      "constraints": null,
      "field_label": "신청인(대표자)",
      "field_order": 52,
      "instruction": null,
      "template_id": 9,
      "location_info": {
        "hints": {
          "target_kind": "inline_blank"
        },
        "version": 1,
        "input_shape": "SHORT_TEXT",
        "current_text": "                ",
        "target_location": {
          "type": "PARAGRAPH_INLINE",
          "row_index": null,
          "native_ref": {
            "xml_id": "2147483648",
            "element_name": "p",
            "element_path": [
              41
            ],
            "inline_range": {
              "end": 26,
              "start": 10,
              "paragraph_text": "신청인(대표자) :                (서명, 인)"
            },
            "section_file": "Contents/section0.xml",
            "fragment_index": 0,
            "text_element_paths": [
              [
                41,
                0,
                0
              ],
              [
                41,
                1,
                0
              ]
            ]
          },
          "block_index": 47,
          "table_index": null,
          "column_index": null,
          "section_index": 0,
          "paragraph_index": 41
        }
      },
      "mapping_status": "RESOLVED"
    }
  ],
  "sources": [
    {
      "id": 816,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T15:21:42.068892",
      "query_hint": null,
      "source_key": "BUSINESS_NAME",
      "source_type": "BUSINESS",
      "source_params": {},
      "field_schema_id": 3078
    },
    {
      "id": 817,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T15:21:42.068892",
      "query_hint": null,
      "source_key": "USER_NAME",
      "source_type": "USER",
      "source_params": {},
      "field_schema_id": 3079
    },
    {
      "id": 818,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T15:21:42.068892",
      "query_hint": null,
      "source_key": "BUSINESS_ADDRESS",
      "source_type": "BUSINESS",
      "source_params": {},
      "field_schema_id": 3080
    },
    {
      "id": 819,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T15:21:42.068892",
      "query_hint": null,
      "source_key": "USER_EMAIL",
      "source_type": "USER",
      "source_params": {},
      "field_schema_id": 3082
    },
    {
      "id": 820,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T15:21:42.068892",
      "query_hint": null,
      "source_key": "BUSINESS_NAME",
      "source_type": "BUSINESS",
      "source_params": {},
      "field_schema_id": 3094
    },
    {
      "id": 821,
      "priority": 2,
      "required": true,
      "created_at": "2026-09-21T15:21:42.068892",
      "query_hint": null,
      "source_key": "BUSINESS_CATEGORY",
      "source_type": "BUSINESS",
      "source_params": {},
      "field_schema_id": 3094
    },
    {
      "id": 822,
      "priority": 3,
      "required": true,
      "created_at": "2026-09-21T15:21:42.068892",
      "query_hint": null,
      "source_key": "BUSINESS_ADDRESS",
      "source_type": "BUSINESS",
      "source_params": {},
      "field_schema_id": 3094
    },
    {
      "id": 823,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T15:21:42.068892",
      "query_hint": null,
      "source_key": "BUSINESS_NAME",
      "source_type": "BUSINESS",
      "source_params": {},
      "field_schema_id": 3095
    },
    {
      "id": 824,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T15:21:42.068892",
      "query_hint": null,
      "source_key": "USER_NAME",
      "source_type": "USER",
      "source_params": {},
      "field_schema_id": 3096
    },
    {
      "id": 825,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T16:09:26.588362",
      "query_hint": null,
      "source_key": "PROGRAM_DRAFT_DATE",
      "source_type": "PROGRAM",
      "source_params": {},
      "field_schema_id": 3116
    },
    {
      "id": 826,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T16:09:26.588362",
      "query_hint": null,
      "source_key": "PROGRAM_DRAFT_DATE",
      "source_type": "PROGRAM",
      "source_params": {},
      "field_schema_id": 3117
    },
    {
      "id": 827,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T16:09:26.588362",
      "query_hint": null,
      "source_key": "USER_NAME",
      "source_type": "USER",
      "source_params": {},
      "field_schema_id": 3118
    },
    {
      "id": 828,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T16:09:26.588362",
      "query_hint": null,
      "source_key": "PROGRAM_DRAFT_DATE",
      "source_type": "PROGRAM",
      "source_params": {},
      "field_schema_id": 3119
    },
    {
      "id": 829,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T16:09:26.588362",
      "query_hint": null,
      "source_key": "PROGRAM_DRAFT_DATE",
      "source_type": "PROGRAM",
      "source_params": {},
      "field_schema_id": 3120
    },
    {
      "id": 830,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T16:09:26.588362",
      "query_hint": null,
      "source_key": "USER_NAME",
      "source_type": "USER",
      "source_params": {},
      "field_schema_id": 3121
    },
    {
      "id": 831,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T16:09:26.588362",
      "query_hint": null,
      "source_key": "PROGRAM_DRAFT_DATE",
      "source_type": "PROGRAM",
      "source_params": {},
      "field_schema_id": 3122
    },
    {
      "id": 832,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T16:09:26.588362",
      "query_hint": null,
      "source_key": "PROGRAM_DRAFT_DATE",
      "source_type": "PROGRAM",
      "source_params": {},
      "field_schema_id": 3123
    },
    {
      "id": 833,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T16:09:26.588362",
      "query_hint": null,
      "source_key": "USER_NAME",
      "source_type": "USER",
      "source_params": {},
      "field_schema_id": 3124
    },
    {
      "id": 834,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T16:09:26.588362",
      "query_hint": null,
      "source_key": "PROGRAM_DRAFT_DATE",
      "source_type": "PROGRAM",
      "source_params": {},
      "field_schema_id": 3125
    },
    {
      "id": 835,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T16:09:26.588362",
      "query_hint": null,
      "source_key": "PROGRAM_DRAFT_DATE",
      "source_type": "PROGRAM",
      "source_params": {},
      "field_schema_id": 3126
    },
    {
      "id": 836,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T16:09:26.588362",
      "query_hint": null,
      "source_key": "USER_NAME",
      "source_type": "USER",
      "source_params": {},
      "field_schema_id": 3127
    },
    {
      "id": 837,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T16:09:26.588362",
      "query_hint": null,
      "source_key": "PROGRAM_DRAFT_DATE",
      "source_type": "PROGRAM",
      "source_params": {},
      "field_schema_id": 3128
    },
    {
      "id": 838,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T16:09:26.588362",
      "query_hint": null,
      "source_key": "PROGRAM_DRAFT_DATE",
      "source_type": "PROGRAM",
      "source_params": {},
      "field_schema_id": 3129
    },
    {
      "id": 839,
      "priority": 1,
      "required": true,
      "created_at": "2026-09-21T16:09:26.588362",
      "query_hint": null,
      "source_key": "USER_NAME",
      "source_type": "USER",
      "source_params": {},
      "field_schema_id": 3130
    }
  ],
  "document": {
    "id": 40,
    "url": null,
    "type": "작성용",
    "doc_name": "붙임2.[2026+경북+소상공인+새바람체인지업]+서식1~6",
    "support_program_id": 17
  },
  "templates": [
    {
      "id": 9,
      "created_at": "2026-09-18T13:02:32.757617",
      "updated_at": "2026-09-18T13:02:54.136982",
      "parse_error": null,
      "parse_status": "COMPLETED",
      "schema_version": 1,
      "normalized_path": "/data/document-agent/normalized/40/normalized-dy7clhwk.hwpx",
      "original_format": "HWP",
      "normalized_format": "HWPX",
      "program_document_id": 40
    }
  ]
}
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

DO $check$
BEGIN
 IF (SELECT id FROM pg_temp.document_template WHERE program_document_id=40)<>900 THEN
  RAISE EXCEPTION 'Server ID not preserved'; END IF;
 IF (SELECT count(*) FROM pg_temp.document_field_schema WHERE template_id=900)<>53 THEN
  RAISE EXCEPTION 'Bad target relation'; END IF;
END $check$;
SELECT 'TEMP_TABLE_SYNC_OK' AS result;
ROLLBACK;
