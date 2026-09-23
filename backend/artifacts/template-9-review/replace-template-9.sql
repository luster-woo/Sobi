-- Reviewed HWPX: SHA256 dd44772c3c9932121ce06f228bfa5035ce4c2c38a7063176bd0eb59083837d84
-- Run backup-template-9.sql first. This replaces field IDs, as the existing persistence service does.
-- PostgreSQL only. Run the entire file on one connection; any error requires ROLLBACK.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $replace_template9$
DECLARE
    target record;
    field_data jsonb;
    source_data jsonb;
    new_field_id bigint;
    actual_count integer;
    payload jsonb := $template9_payload$
[
  {
    "field_key": "business_name",
    "field_label": "업체명",
    "field_order": 0,
    "field_type": "DIRECT",
    "value_type": "TEXT",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "TABLE_CELL",
        "section_index": 0,
        "block_index": 0,
        "table_index": 0,
        "row_index": 2,
        "column_index": 1,
        "paragraph_index": null,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            0,
            0,
            2,
            6,
            1
          ],
          "element_name": "tc",
          "row_order": 2,
          "cell_order": 1
        }
      },
      "current_text": "       ",
      "input_shape": "SHORT_TEXT",
      "hints": {
        "target_kind": "empty"
      }
    },
    "max_length": null,
    "sources": [
      {
        "source_type": "BUSINESS",
        "source_key": "BUSINESS_NAME",
        "required": true,
        "priority": 1,
        "query_hint": null,
        "source_params": {}
      }
    ]
  },
  {
    "field_key": "applicant_name",
    "field_label": "신청인 (대표자)",
    "field_order": 1,
    "field_type": "DIRECT",
    "value_type": "TEXT",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "TABLE_CELL",
        "section_index": 0,
        "block_index": 0,
        "table_index": 0,
        "row_index": 2,
        "column_index": 10,
        "paragraph_index": null,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            0,
            0,
            2,
            6,
            3
          ],
          "element_name": "tc",
          "row_order": 2,
          "cell_order": 3
        }
      },
      "current_text": "             ",
      "input_shape": "SHORT_TEXT",
      "hints": {
        "target_kind": "empty"
      }
    },
    "max_length": null,
    "sources": [
      {
        "source_type": "USER",
        "source_key": "USER_NAME",
        "required": true,
        "priority": 1,
        "query_hint": null,
        "source_params": {}
      }
    ]
  },
  {
    "field_key": "business_address",
    "field_label": "주소지",
    "field_order": 2,
    "field_type": "DIRECT",
    "value_type": "TEXT",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "TABLE_CELL",
        "section_index": 0,
        "block_index": 0,
        "table_index": 0,
        "row_index": 3,
        "column_index": 1,
        "paragraph_index": null,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            0,
            0,
            2,
            7,
            1
          ],
          "element_name": "tc",
          "row_order": 3,
          "cell_order": 1
        }
      },
      "current_text": "(사업자등록증상)",
      "input_shape": "UNKNOWN",
      "hints": {
        "target_kind": "helper",
        "helper_text": "(사업자등록증상)"
      }
    },
    "max_length": null,
    "sources": [
      {
        "source_type": "BUSINESS",
        "source_key": "BUSINESS_ADDRESS",
        "required": true,
        "priority": 1,
        "query_hint": null,
        "source_params": {}
      }
    ]
  },
  {
    "field_key": "applicant_mobile",
    "field_label": "휴대전화",
    "field_order": 3,
    "field_type": "USER_INPUT",
    "value_type": "TEXT",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "TABLE_CELL",
        "section_index": 0,
        "block_index": 0,
        "table_index": 0,
        "row_index": 3,
        "column_index": 10,
        "paragraph_index": null,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            0,
            0,
            2,
            7,
            3
          ],
          "element_name": "tc",
          "row_order": 3,
          "cell_order": 3
        }
      },
      "current_text": "",
      "input_shape": "SHORT_TEXT",
      "hints": {
        "target_kind": "empty"
      }
    },
    "max_length": null,
    "sources": []
  },
  {
    "field_key": "applicant_email",
    "field_label": "e메일",
    "field_order": 4,
    "field_type": "DIRECT",
    "value_type": "TEXT",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "TABLE_CELL",
        "section_index": 0,
        "block_index": 0,
        "table_index": 0,
        "row_index": 4,
        "column_index": 10,
        "paragraph_index": null,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            0,
            0,
            2,
            8,
            2
          ],
          "element_name": "tc",
          "row_order": 4,
          "cell_order": 2
        }
      },
      "current_text": "",
      "input_shape": "SHORT_TEXT",
      "hints": {
        "target_kind": "empty"
      }
    },
    "max_length": null,
    "sources": [
      {
        "source_type": "USER",
        "source_key": "USER_EMAIL",
        "required": true,
        "priority": 1,
        "query_hint": null,
        "source_params": {}
      }
    ]
  },
  {
    "field_key": "outdoor_sign_change",
    "field_label": "신청분야(☑)",
    "field_order": 5,
    "field_type": "USER_INPUT",
    "value_type": "BOOLEAN",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "TABLE_CELL",
        "section_index": 0,
        "block_index": 0,
        "table_index": 0,
        "row_index": 7,
        "column_index": 0,
        "paragraph_index": null,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            0,
            0,
            2,
            11,
            0
          ],
          "element_name": "tc",
          "row_order": 7,
          "cell_order": 0
        }
      },
      "current_text": "□ 옥외 간판교체",
      "input_shape": "CHECKBOX",
      "hints": {
        "target_kind": "placeholder",
        "placeholder_text": "□ 옥외 간판교체"
      }
    },
    "max_length": null,
    "sources": []
  },
  {
    "field_key": "new_sign_install",
    "field_label": "(공급가 80% \n최대 300만원)",
    "field_order": 6,
    "field_type": "USER_INPUT",
    "value_type": "BOOLEAN",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "TABLE_CELL",
        "section_index": 0,
        "block_index": 0,
        "table_index": 0,
        "row_index": 7,
        "column_index": 4,
        "paragraph_index": null,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            0,
            0,
            2,
            11,
            2
          ],
          "element_name": "tc",
          "row_order": 7,
          "cell_order": 2
        }
      },
      "current_text": "□ 신규 간판 설치",
      "input_shape": "CHECKBOX",
      "hints": {
        "target_kind": "placeholder",
        "placeholder_text": "□ 신규 간판 설치"
      }
    },
    "max_length": null,
    "sources": []
  },
  {
    "field_key": "sign_replacement",
    "field_label": "세부개선내용(☑)",
    "field_order": 7,
    "field_type": "USER_INPUT",
    "value_type": "BOOLEAN",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "TABLE_CELL",
        "section_index": 0,
        "block_index": 0,
        "table_index": 0,
        "row_index": 7,
        "column_index": 7,
        "paragraph_index": null,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            0,
            0,
            2,
            11,
            3
          ],
          "element_name": "tc",
          "row_order": 7,
          "cell_order": 3
        }
      },
      "current_text": "□ 간판 교체 ",
      "input_shape": "CHECKBOX",
      "hints": {
        "target_kind": "placeholder",
        "placeholder_text": "□ 간판 교체"
      }
    },
    "max_length": null,
    "sources": []
  },
  {
    "field_key": "sign_equipment_replacement",
    "field_label": "세부개선내용(☑)",
    "field_order": 8,
    "field_type": "USER_INPUT",
    "value_type": "BOOLEAN",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "TABLE_CELL",
        "section_index": 0,
        "block_index": 0,
        "table_index": 0,
        "row_index": 7,
        "column_index": 12,
        "paragraph_index": null,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            0,
            0,
            2,
            11,
            4
          ],
          "element_name": "tc",
          "row_order": 7,
          "cell_order": 4
        }
      },
      "current_text": "□ 간판 내부설비 교체",
      "input_shape": "CHECKBOX",
      "hints": {
        "target_kind": "placeholder",
        "placeholder_text": "□ 간판 내부설비 교체"
      }
    },
    "max_length": null,
    "sources": []
  },
  {
    "field_key": "interior_renovation",
    "field_label": "(공급가 80% \n최대 500만원)",
    "field_order": 9,
    "field_type": "USER_INPUT",
    "value_type": "BOOLEAN",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "TABLE_CELL",
        "section_index": 0,
        "block_index": 0,
        "table_index": 0,
        "row_index": 9,
        "column_index": 4,
        "paragraph_index": null,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            0,
            0,
            2,
            13,
            2
          ],
          "element_name": "tc",
          "row_order": 9,
          "cell_order": 2
        }
      },
      "current_text": "□ 내부인테리어",
      "input_shape": "CHECKBOX",
      "hints": {
        "target_kind": "placeholder",
        "placeholder_text": "□ 내부인테리어"
      }
    },
    "max_length": null,
    "sources": []
  },
  {
    "field_key": "led_electrical_work",
    "field_label": "(공급가 80% \n최대 500만원)",
    "field_order": 10,
    "field_type": "USER_INPUT",
    "value_type": "BOOLEAN",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "TABLE_CELL",
        "section_index": 0,
        "block_index": 0,
        "table_index": 0,
        "row_index": 10,
        "column_index": 4,
        "paragraph_index": null,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            0,
            0,
            2,
            14,
            0
          ],
          "element_name": "tc",
          "row_order": 10,
          "cell_order": 0
        }
      },
      "current_text": "□ LED 조명 및 전기공사",
      "input_shape": "CHECKBOX",
      "hints": {
        "target_kind": "placeholder",
        "placeholder_text": "□ LED 조명 및 전기공사"
      }
    },
    "max_length": null,
    "sources": []
  },
  {
    "field_key": "dining_table_replacement",
    "field_label": "(공급가 80% \n최대 500만원)",
    "field_order": 11,
    "field_type": "USER_INPUT",
    "value_type": "BOOLEAN",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "TABLE_CELL",
        "section_index": 0,
        "block_index": 0,
        "table_index": 0,
        "row_index": 11,
        "column_index": 4,
        "paragraph_index": null,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            0,
            0,
            2,
            15,
            0
          ],
          "element_name": "tc",
          "row_order": 11,
          "cell_order": 0
        }
      },
      "current_text": "□ (식당) 입식 테이블로 교체",
      "input_shape": "CHECKBOX",
      "hints": {
        "target_kind": "placeholder",
        "placeholder_text": "□ (식당) 입식 테이블로 교체"
      }
    },
    "max_length": null,
    "sources": []
  },
  {
    "field_key": "pos_system",
    "field_label": "(공급가 80%\n최대 200만원)",
    "field_order": 12,
    "field_type": "USER_INPUT",
    "value_type": "BOOLEAN",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "TABLE_CELL",
        "section_index": 0,
        "block_index": 0,
        "table_index": 0,
        "row_index": 13,
        "column_index": 4,
        "paragraph_index": null,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            0,
            0,
            2,
            17,
            2
          ],
          "element_name": "tc",
          "row_order": 13,
          "cell_order": 2
        }
      },
      "current_text": "□ POS시스템",
      "input_shape": "CHECKBOX",
      "hints": {
        "target_kind": "placeholder",
        "placeholder_text": "□ POS시스템"
      }
    },
    "max_length": null,
    "sources": []
  },
  {
    "field_key": "table_order",
    "field_label": "(공급가 80%\n최대 200만원)",
    "field_order": 13,
    "field_type": "USER_INPUT",
    "value_type": "BOOLEAN",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "TABLE_CELL",
        "section_index": 0,
        "block_index": 0,
        "table_index": 0,
        "row_index": 14,
        "column_index": 4,
        "paragraph_index": null,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            0,
            0,
            2,
            18,
            0
          ],
          "element_name": "tc",
          "row_order": 14,
          "cell_order": 0
        }
      },
      "current_text": "□ 테이블오더 ",
      "input_shape": "CHECKBOX",
      "hints": {
        "target_kind": "placeholder",
        "placeholder_text": "□ 테이블오더"
      }
    },
    "max_length": null,
    "sources": []
  },
  {
    "field_key": "consulting_service",
    "field_label": "컨설팅 분야 선택(☑)",
    "field_order": 14,
    "field_type": "USER_INPUT",
    "value_type": "BOOLEAN",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "TABLE_CELL",
        "section_index": 0,
        "block_index": 0,
        "table_index": 0,
        "row_index": 17,
        "column_index": 0,
        "paragraph_index": null,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            0,
            0,
            2,
            21,
            0
          ],
          "element_name": "tc",
          "row_order": 17,
          "cell_order": 0
        }
      },
      "current_text": "□ 서비스 개선",
      "input_shape": "CHECKBOX",
      "hints": {
        "target_kind": "placeholder",
        "placeholder_text": "□ 서비스 개선"
      }
    },
    "max_length": null,
    "sources": []
  },
  {
    "field_key": "consulting_finance",
    "field_label": "컨설팅 분야 선택(☑)",
    "field_order": 15,
    "field_type": "USER_INPUT",
    "value_type": "BOOLEAN",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "TABLE_CELL",
        "section_index": 0,
        "block_index": 0,
        "table_index": 0,
        "row_index": 17,
        "column_index": 5,
        "paragraph_index": null,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            0,
            0,
            2,
            21,
            1
          ],
          "element_name": "tc",
          "row_order": 17,
          "cell_order": 1
        }
      },
      "current_text": "□ 재무관리",
      "input_shape": "CHECKBOX",
      "hints": {
        "target_kind": "placeholder",
        "placeholder_text": "□ 재무관리"
      }
    },
    "max_length": null,
    "sources": []
  },
  {
    "field_key": "business_plan_detail",
    "field_label": "점포 소개, 점포개선할 내용, 필요성 등 자율 기재 (300자 이내 간략 기술)",
    "field_order": 16,
    "field_type": "GENERATED",
    "value_type": "TEXT",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": "2026 경북 소상공인 새바람 체인지업 사업의 사업 추진계획을 공백 포함 300자 이내로 작성한다. 제공된 업체명·업종·사업장 주소만 사실로 사용한다. 점포 소개와 개선 목적을 간략히 기술하되, 신청자가 선택한 개선 품목·시공업체·견적·매출·현장 결함·성과를 추측하거나 확정 사실처럼 만들지 않는다. 구체적인 개선 내용이나 필요성을 작성하기에 정보가 부족하면 성공 문장으로 꾸미지 말고 INPUT_REQUIRED로 필요한 정보를 요청한다.",
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "TABLE_CELL",
        "section_index": 0,
        "block_index": 1,
        "table_index": 1,
        "row_index": 3,
        "column_index": 0,
        "paragraph_index": null,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            1,
            0,
            0,
            7,
            0
          ],
          "element_name": "tc",
          "row_order": 3,
          "cell_order": 0
        }
      },
      "current_text": "\n\n\n\n\n\n\n\n ",
      "input_shape": "LONG_TEXT",
      "hints": {
        "target_kind": "empty"
      }
    },
    "max_length": 300,
    "sources": [
      {
        "source_type": "BUSINESS",
        "source_key": "BUSINESS_NAME",
        "required": true,
        "priority": 1,
        "query_hint": null,
        "source_params": {}
      },
      {
        "source_type": "BUSINESS",
        "source_key": "BUSINESS_CATEGORY",
        "required": true,
        "priority": 2,
        "query_hint": null,
        "source_params": {}
      },
      {
        "source_type": "BUSINESS",
        "source_key": "BUSINESS_ADDRESS",
        "required": true,
        "priority": 3,
        "query_hint": null,
        "source_params": {}
      }
    ]
  },
  {
    "field_key": "estimate_business_name",
    "field_label": "업체명",
    "field_order": 17,
    "field_type": "DIRECT",
    "value_type": "TEXT",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "TABLE_CELL",
        "section_index": 0,
        "block_index": 3,
        "table_index": 2,
        "row_index": 2,
        "column_index": 2,
        "paragraph_index": null,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            2,
            0,
            0,
            6,
            1
          ],
          "element_name": "tc",
          "row_order": 2,
          "cell_order": 1
        }
      },
      "current_text": "",
      "input_shape": "SHORT_TEXT",
      "hints": {
        "target_kind": "empty"
      }
    },
    "max_length": null,
    "sources": [
      {
        "source_type": "BUSINESS",
        "source_key": "BUSINESS_NAME",
        "required": true,
        "priority": 1,
        "query_hint": null,
        "source_params": {}
      }
    ]
  },
  {
    "field_key": "estimate_applicant_name",
    "field_label": "신청인 (대표자)",
    "field_order": 18,
    "field_type": "DIRECT",
    "value_type": "TEXT",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "TABLE_CELL",
        "section_index": 0,
        "block_index": 3,
        "table_index": 2,
        "row_index": 2,
        "column_index": 8,
        "paragraph_index": null,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            2,
            0,
            0,
            6,
            3
          ],
          "element_name": "tc",
          "row_order": 2,
          "cell_order": 3
        }
      },
      "current_text": "",
      "input_shape": "SHORT_TEXT",
      "hints": {
        "target_kind": "empty"
      }
    },
    "max_length": null,
    "sources": [
      {
        "source_type": "USER",
        "source_key": "USER_NAME",
        "required": true,
        "priority": 1,
        "query_hint": null,
        "source_params": {}
      }
    ]
  },
  {
    "field_key": "planned_application_category",
    "field_label": "신청분야",
    "field_order": 19,
    "field_type": "USER_INPUT",
    "value_type": "TEXT",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "TABLE_CELL",
        "section_index": 0,
        "block_index": 3,
        "table_index": 2,
        "row_index": 6,
        "column_index": 0,
        "paragraph_index": null,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            2,
            0,
            0,
            10,
            0
          ],
          "element_name": "tc",
          "row_order": 6,
          "cell_order": 0
        }
      },
      "current_text": "",
      "input_shape": "SHORT_TEXT",
      "hints": {
        "target_kind": "empty"
      }
    },
    "max_length": null,
    "sources": []
  },
  {
    "field_key": "contractor_name",
    "field_label": "외주업체명",
    "field_order": 20,
    "field_type": "USER_INPUT",
    "value_type": "TEXT",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "TABLE_CELL",
        "section_index": 0,
        "block_index": 3,
        "table_index": 2,
        "row_index": 6,
        "column_index": 2,
        "paragraph_index": null,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            2,
            0,
            0,
            10,
            1
          ],
          "element_name": "tc",
          "row_order": 6,
          "cell_order": 1
        }
      },
      "current_text": "",
      "input_shape": "SHORT_TEXT",
      "hints": {
        "target_kind": "empty"
      }
    },
    "max_length": null,
    "sources": []
  },
  {
    "field_key": "planned_improvement_item",
    "field_label": "세부개선내용\n(개선예정 품목)",
    "field_order": 21,
    "field_type": "USER_INPUT",
    "value_type": "TEXT",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "TABLE_CELL",
        "section_index": 0,
        "block_index": 3,
        "table_index": 2,
        "row_index": 6,
        "column_index": 3,
        "paragraph_index": null,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            2,
            0,
            0,
            10,
            2
          ],
          "element_name": "tc",
          "row_order": 6,
          "cell_order": 2
        }
      },
      "current_text": "",
      "input_shape": "SHORT_TEXT",
      "hints": {
        "target_kind": "empty"
      }
    },
    "max_length": null,
    "sources": []
  },
  {
    "field_key": "planned_quantity",
    "field_label": "수량 ",
    "field_order": 22,
    "field_type": "USER_INPUT",
    "value_type": "NUMBER",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "TABLE_CELL",
        "section_index": 0,
        "block_index": 3,
        "table_index": 2,
        "row_index": 6,
        "column_index": 4,
        "paragraph_index": null,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            2,
            0,
            0,
            10,
            3
          ],
          "element_name": "tc",
          "row_order": 6,
          "cell_order": 3
        }
      },
      "current_text": "",
      "input_shape": "SHORT_TEXT",
      "hints": {
        "target_kind": "empty"
      }
    },
    "max_length": null,
    "sources": []
  },
  {
    "field_key": "planned_specification",
    "field_label": "규격",
    "field_order": 23,
    "field_type": "USER_INPUT",
    "value_type": "TEXT",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "TABLE_CELL",
        "section_index": 0,
        "block_index": 3,
        "table_index": 2,
        "row_index": 6,
        "column_index": 5,
        "paragraph_index": null,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            2,
            0,
            0,
            10,
            4
          ],
          "element_name": "tc",
          "row_order": 6,
          "cell_order": 4
        }
      },
      "current_text": "",
      "input_shape": "SHORT_TEXT",
      "hints": {
        "target_kind": "empty"
      }
    },
    "max_length": null,
    "sources": []
  },
  {
    "field_key": "quoted_supply_price",
    "field_label": "공급가",
    "field_order": 24,
    "field_type": "DIRECT",
    "value_type": "NUMBER",
    "mapping_status": "UNSUPPORTED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "TABLE_CELL",
        "section_index": 0,
        "block_index": 3,
        "table_index": 2,
        "row_index": 6,
        "column_index": 7,
        "paragraph_index": null,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            2,
            0,
            0,
            10,
            5
          ],
          "element_name": "tc",
          "row_order": 6,
          "cell_order": 5
        }
      },
      "current_text": "",
      "input_shape": "SHORT_TEXT",
      "hints": {
        "target_kind": "empty"
      }
    },
    "max_length": null,
    "sources": []
  },
  {
    "field_key": "quoted_vat",
    "field_label": "부가세",
    "field_order": 25,
    "field_type": "DIRECT",
    "value_type": "NUMBER",
    "mapping_status": "UNSUPPORTED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "TABLE_CELL",
        "section_index": 0,
        "block_index": 3,
        "table_index": 2,
        "row_index": 6,
        "column_index": 9,
        "paragraph_index": null,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            2,
            0,
            0,
            10,
            6
          ],
          "element_name": "tc",
          "row_order": 6,
          "cell_order": 6
        }
      },
      "current_text": "",
      "input_shape": "SHORT_TEXT",
      "hints": {
        "target_kind": "empty"
      }
    },
    "max_length": null,
    "sources": []
  },
  {
    "field_key": "total_supply_price",
    "field_label": "합 계",
    "field_order": 26,
    "field_type": "COMPUTED",
    "value_type": "NUMBER",
    "mapping_status": "UNSUPPORTED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "TABLE_CELL",
        "section_index": 0,
        "block_index": 3,
        "table_index": 2,
        "row_index": 15,
        "column_index": 7,
        "paragraph_index": null,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            2,
            0,
            0,
            19,
            1
          ],
          "element_name": "tc",
          "row_order": 15,
          "cell_order": 1
        }
      },
      "current_text": "",
      "input_shape": "SHORT_TEXT",
      "hints": {
        "target_kind": "empty"
      }
    },
    "max_length": null,
    "sources": []
  },
  {
    "field_key": "previous_application_yes",
    "field_label": "2021년 ~ 2025년 본 사업에 신청하신 적이 있습니까?",
    "field_order": 27,
    "field_type": "USER_INPUT",
    "value_type": "BOOLEAN",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "TABLE_CELL",
        "section_index": 0,
        "block_index": 12,
        "table_index": 6,
        "row_index": 2,
        "column_index": 1,
        "paragraph_index": null,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            11,
            0,
            0,
            6,
            1
          ],
          "element_name": "tc",
          "row_order": 2,
          "cell_order": 1
        }
      },
      "current_text": "",
      "input_shape": "SHORT_TEXT",
      "hints": {
        "target_kind": "empty"
      }
    },
    "max_length": null,
    "sources": []
  },
  {
    "field_key": "previous_application_no",
    "field_label": "아니오",
    "field_order": 28,
    "field_type": "USER_INPUT",
    "value_type": "BOOLEAN",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "TABLE_CELL",
        "section_index": 0,
        "block_index": 12,
        "table_index": 6,
        "row_index": 2,
        "column_index": 2,
        "paragraph_index": null,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            11,
            0,
            0,
            6,
            2
          ],
          "element_name": "tc",
          "row_order": 2,
          "cell_order": 2
        }
      },
      "current_text": "",
      "input_shape": "SHORT_TEXT",
      "hints": {
        "target_kind": "empty"
      }
    },
    "max_length": null,
    "sources": []
  },
  {
    "field_key": "anti_kickback_acknowledgement",
    "field_label": "확인",
    "field_order": 29,
    "field_type": "USER_INPUT",
    "value_type": "BOOLEAN",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "TABLE_CELL",
        "section_index": 0,
        "block_index": 17,
        "table_index": 7,
        "row_index": 1,
        "column_index": 1,
        "paragraph_index": null,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            16,
            0,
            0,
            5,
            1
          ],
          "element_name": "tc",
          "row_order": 1,
          "cell_order": 1
        }
      },
      "current_text": "",
      "input_shape": "SHORT_TEXT",
      "hints": {
        "target_kind": "empty"
      }
    },
    "max_length": null,
    "sources": []
  },
  {
    "field_key": "bonus_evidence_acknowledgement",
    "field_label": "가점사항에 대한 증빙을 제출하지 않은 경우, 점수 부여 불가합니다.",
    "field_order": 30,
    "field_type": "USER_INPUT",
    "value_type": "BOOLEAN",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "TABLE_CELL",
        "section_index": 0,
        "block_index": 17,
        "table_index": 7,
        "row_index": 5,
        "column_index": 1,
        "paragraph_index": null,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            16,
            0,
            0,
            9,
            1
          ],
          "element_name": "tc",
          "row_order": 5,
          "cell_order": 1
        }
      },
      "current_text": "",
      "input_shape": "SHORT_TEXT",
      "hints": {
        "target_kind": "empty"
      }
    },
    "max_length": null,
    "sources": []
  },
  {
    "field_key": "evidence_deadline_acknowledgement",
    "field_label": "사업 신청기간 내에 접수되지 않은 증빙서류에 대해 추가 보완 불가하며 이의를 제기하지않습니다",
    "field_order": 31,
    "field_type": "USER_INPUT",
    "value_type": "BOOLEAN",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "TABLE_CELL",
        "section_index": 0,
        "block_index": 17,
        "table_index": 7,
        "row_index": 6,
        "column_index": 1,
        "paragraph_index": null,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            16,
            0,
            0,
            10,
            1
          ],
          "element_name": "tc",
          "row_order": 6,
          "cell_order": 1
        }
      },
      "current_text": "",
      "input_shape": "SHORT_TEXT",
      "hints": {
        "target_kind": "empty"
      }
    },
    "max_length": null,
    "sources": []
  },
  {
    "field_key": "privacy_collection_consent",
    "field_label": "동의",
    "field_order": 32,
    "field_type": "USER_INPUT",
    "value_type": "BOOLEAN",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "TABLE_CELL",
        "section_index": 0,
        "block_index": 32,
        "table_index": 10,
        "row_index": 0,
        "column_index": 1,
        "paragraph_index": null,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            30,
            0,
            1,
            4,
            1
          ],
          "element_name": "tc",
          "row_order": 0,
          "cell_order": 1
        }
      },
      "current_text": "",
      "input_shape": "SHORT_TEXT",
      "hints": {
        "target_kind": "empty"
      }
    },
    "max_length": null,
    "sources": []
  },
  {
    "field_key": "privacy_collection_refusal",
    "field_label": "미동의",
    "field_order": 33,
    "field_type": "USER_INPUT",
    "value_type": "BOOLEAN",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "TABLE_CELL",
        "section_index": 0,
        "block_index": 32,
        "table_index": 10,
        "row_index": 0,
        "column_index": 4,
        "paragraph_index": null,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            30,
            0,
            1,
            4,
            4
          ],
          "element_name": "tc",
          "row_order": 0,
          "cell_order": 4
        }
      },
      "current_text": "",
      "input_shape": "SHORT_TEXT",
      "hints": {
        "target_kind": "empty"
      }
    },
    "max_length": null,
    "sources": []
  },
  {
    "field_key": "province_sharing_consent",
    "field_label": "동의",
    "field_order": 34,
    "field_type": "USER_INPUT",
    "value_type": "BOOLEAN",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "TABLE_CELL",
        "section_index": 0,
        "block_index": 39,
        "table_index": 12,
        "row_index": 0,
        "column_index": 1,
        "paragraph_index": null,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            36,
            0,
            1,
            4,
            1
          ],
          "element_name": "tc",
          "row_order": 0,
          "cell_order": 1
        }
      },
      "current_text": "",
      "input_shape": "SHORT_TEXT",
      "hints": {
        "target_kind": "empty"
      }
    },
    "max_length": null,
    "sources": []
  },
  {
    "field_key": "province_sharing_refusal",
    "field_label": "미동의",
    "field_order": 35,
    "field_type": "USER_INPUT",
    "value_type": "BOOLEAN",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "TABLE_CELL",
        "section_index": 0,
        "block_index": 39,
        "table_index": 12,
        "row_index": 0,
        "column_index": 4,
        "paragraph_index": null,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            36,
            0,
            1,
            4,
            4
          ],
          "element_name": "tc",
          "row_order": 0,
          "cell_order": 4
        }
      },
      "current_text": "",
      "input_shape": "SHORT_TEXT",
      "hints": {
        "target_kind": "empty"
      }
    },
    "max_length": null,
    "sources": []
  },
  {
    "field_key": "external_sharing_consent",
    "field_label": "동의",
    "field_order": 36,
    "field_type": "USER_INPUT",
    "value_type": "BOOLEAN",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "TABLE_CELL",
        "section_index": 0,
        "block_index": 43,
        "table_index": 13,
        "row_index": 0,
        "column_index": 1,
        "paragraph_index": null,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            38,
            0,
            1,
            4,
            1
          ],
          "element_name": "tc",
          "row_order": 0,
          "cell_order": 1
        }
      },
      "current_text": "",
      "input_shape": "SHORT_TEXT",
      "hints": {
        "target_kind": "empty"
      }
    },
    "max_length": null,
    "sources": []
  },
  {
    "field_key": "external_sharing_refusal",
    "field_label": "미동의",
    "field_order": 37,
    "field_type": "USER_INPUT",
    "value_type": "BOOLEAN",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "TABLE_CELL",
        "section_index": 0,
        "block_index": 43,
        "table_index": 13,
        "row_index": 0,
        "column_index": 4,
        "paragraph_index": null,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            38,
            0,
            1,
            4,
            4
          ],
          "element_name": "tc",
          "row_order": 0,
          "cell_order": 4
        }
      },
      "current_text": "",
      "input_shape": "SHORT_TEXT",
      "hints": {
        "target_kind": "empty"
      }
    },
    "max_length": null,
    "sources": []
  }
]
$template9_payload$::jsonb;
BEGIN
    SELECT dt.id, dt.program_document_id, dt.normalized_path,
           dt.normalized_format, dt.parse_status, pd.type AS document_type
      INTO target
      FROM document_template dt
      JOIN program_document pd ON pd.id = dt.program_document_id
     WHERE dt.id = 9
     FOR UPDATE OF dt, pd;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Template 9 or its program_document does not exist';
    END IF;
    IF target.program_document_id IS DISTINCT FROM 40
       OR target.normalized_path IS DISTINCT FROM '/data/document-agent/normalized/40/normalized-dy7clhwk.hwpx'
       OR target.normalized_format IS DISTINCT FROM 'HWPX'
       OR target.parse_status IS DISTINCT FROM 'COMPLETED'
       OR target.document_type IS DISTINCT FROM '작성용' THEN
        RAISE EXCEPTION 'Template 9 identity, format, status or document type mismatch; no replacement performed';
    END IF;
    IF jsonb_array_length(payload) <> 38 THEN
        RAISE EXCEPTION 'Unexpected replacement field count';
    END IF;

    -- V19: document_field_source FK ON DELETE CASCADE.
    DELETE FROM document_field_schema WHERE template_id = 9;
    FOR field_data IN SELECT value FROM jsonb_array_elements(payload) LOOP
        INSERT INTO document_field_schema
            (template_id, field_key, field_label, field_order, field_type, value_type,
             mapping_status, required, instruction, max_length, location_info)
        VALUES
            (9, field_data->>'field_key', field_data->>'field_label',
             (field_data->>'field_order')::integer, field_data->>'field_type',
             field_data->>'value_type', field_data->>'mapping_status',
             (field_data->>'required')::boolean, field_data->>'instruction',
             (field_data->>'max_length')::integer, field_data->'location_info')
        RETURNING id INTO new_field_id;
        FOR source_data IN SELECT value FROM jsonb_array_elements(field_data->'sources') LOOP
            INSERT INTO document_field_source
                (field_schema_id, source_type, source_key, required, priority, query_hint, source_params)
            VALUES
                (new_field_id, source_data->>'source_type', source_data->>'source_key',
                 (source_data->>'required')::boolean, (source_data->>'priority')::integer,
                 source_data->>'query_hint', source_data->'source_params');
        END LOOP;
    END LOOP;
    SELECT count(*) INTO actual_count FROM document_field_schema WHERE template_id = 9;
    IF actual_count <> 38 THEN
        RAISE EXCEPTION 'Replacement field count mismatch';
    END IF;
    SELECT count(*) INTO actual_count
      FROM document_field_source s JOIN document_field_schema f ON f.id = s.field_schema_id
     WHERE f.template_id = 9;
    IF actual_count <> 9 THEN
        RAISE EXCEPTION 'Replacement source count mismatch';
    END IF;
END
$replace_template9$;
COMMIT;

SELECT id, field_order, field_key, field_type, value_type, mapping_status, max_length
FROM document_field_schema WHERE template_id = 9 ORDER BY field_order;
