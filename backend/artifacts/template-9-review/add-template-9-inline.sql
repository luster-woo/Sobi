-- Deploy updated ai code first. Verify normalized HWPX SHA256 from INLINE-README.md.
-- Add only 15 inline fields; preserve existing business_plan_detail instruction and sources.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $inline9$
DECLARE
    t record;
    f jsonb;
    s jsonb;
    payload jsonb := $inline_payload$
[
  {
    "field_key": "application_month_1",
    "field_label": "월",
    "field_type": "DIRECT",
    "value_type": "DATE",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "PARAGRAPH_INLINE",
        "section_index": 0,
        "block_index": 2,
        "table_index": 0,
        "row_index": 20,
        "column_index": 0,
        "paragraph_index": 2,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            0,
            0,
            2,
            24,
            0,
            0,
            2
          ],
          "element_name": "p",
          "xml_id": "2147483648",
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
          ],
          "inline_range": {
            "start": 7,
            "end": 12,
            "paragraph_text": "  2026년     월     일 "
          }
        }
      },
      "current_text": "     ",
      "input_shape": "DATE",
      "hints": {
        "target_kind": "inline_blank",
        "date_part": "month",
        "fixed_year": 2026
      }
    },
    "sources": [
      {
        "source_type": "PROGRAM",
        "source_key": "PROGRAM_DRAFT_DATE",
        "required": true,
        "priority": 1,
        "query_hint": null,
        "source_params": {}
      }
    ]
  },
  {
    "field_key": "application_day_1",
    "field_label": "일",
    "field_type": "DIRECT",
    "value_type": "DATE",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "PARAGRAPH_INLINE",
        "section_index": 0,
        "block_index": 2,
        "table_index": 0,
        "row_index": 20,
        "column_index": 0,
        "paragraph_index": 2,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            0,
            0,
            2,
            24,
            0,
            0,
            2
          ],
          "element_name": "p",
          "xml_id": "2147483648",
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
          ],
          "inline_range": {
            "start": 13,
            "end": 18,
            "paragraph_text": "  2026년     월     일 "
          }
        }
      },
      "current_text": "     ",
      "input_shape": "DATE",
      "hints": {
        "target_kind": "inline_blank",
        "date_part": "day",
        "fixed_year": 2026
      }
    },
    "sources": [
      {
        "source_type": "PROGRAM",
        "source_key": "PROGRAM_DRAFT_DATE",
        "required": true,
        "priority": 1,
        "query_hint": null,
        "source_params": {}
      }
    ]
  },
  {
    "field_key": "application_name_1",
    "field_label": "신청인(대표자)",
    "field_type": "DIRECT",
    "value_type": "TEXT",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "PARAGRAPH_INLINE",
        "section_index": 0,
        "block_index": 3,
        "table_index": 0,
        "row_index": 20,
        "column_index": 0,
        "paragraph_index": 3,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            0,
            0,
            2,
            24,
            0,
            0,
            3
          ],
          "element_name": "p",
          "xml_id": "2147483648",
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
          ],
          "inline_range": {
            "start": 10,
            "end": 26,
            "paragraph_text": "신청인(대표자) :                (서명, 인)"
          }
        }
      },
      "current_text": "                ",
      "input_shape": "SHORT_TEXT",
      "hints": {
        "target_kind": "inline_blank"
      }
    },
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
    "field_key": "application_month_2",
    "field_label": "월",
    "field_type": "DIRECT",
    "value_type": "DATE",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "PARAGRAPH_INLINE",
        "section_index": 0,
        "block_index": 7,
        "table_index": 2,
        "row_index": 16,
        "column_index": 0,
        "paragraph_index": 7,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            2,
            0,
            0,
            20,
            0,
            0,
            7
          ],
          "element_name": "p",
          "xml_id": "2147483648",
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
          ],
          "inline_range": {
            "start": 5,
            "end": 10,
            "paragraph_text": "2026년     월     일 "
          }
        }
      },
      "current_text": "     ",
      "input_shape": "DATE",
      "hints": {
        "target_kind": "inline_blank",
        "date_part": "month",
        "fixed_year": 2026
      }
    },
    "sources": [
      {
        "source_type": "PROGRAM",
        "source_key": "PROGRAM_DRAFT_DATE",
        "required": true,
        "priority": 1,
        "query_hint": null,
        "source_params": {}
      }
    ]
  },
  {
    "field_key": "application_day_2",
    "field_label": "일",
    "field_type": "DIRECT",
    "value_type": "DATE",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "PARAGRAPH_INLINE",
        "section_index": 0,
        "block_index": 7,
        "table_index": 2,
        "row_index": 16,
        "column_index": 0,
        "paragraph_index": 7,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            2,
            0,
            0,
            20,
            0,
            0,
            7
          ],
          "element_name": "p",
          "xml_id": "2147483648",
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
          ],
          "inline_range": {
            "start": 11,
            "end": 16,
            "paragraph_text": "2026년     월     일 "
          }
        }
      },
      "current_text": "     ",
      "input_shape": "DATE",
      "hints": {
        "target_kind": "inline_blank",
        "date_part": "day",
        "fixed_year": 2026
      }
    },
    "sources": [
      {
        "source_type": "PROGRAM",
        "source_key": "PROGRAM_DRAFT_DATE",
        "required": true,
        "priority": 1,
        "query_hint": null,
        "source_params": {}
      }
    ]
  },
  {
    "field_key": "application_name_2",
    "field_label": "신청인(대표자)",
    "field_type": "DIRECT",
    "value_type": "TEXT",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "PARAGRAPH_INLINE",
        "section_index": 0,
        "block_index": 0,
        "table_index": 2,
        "row_index": 17,
        "column_index": 0,
        "paragraph_index": 0,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            2,
            0,
            0,
            21,
            0,
            0,
            0
          ],
          "element_name": "p",
          "xml_id": "2147483648",
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
          ],
          "inline_range": {
            "start": 10,
            "end": 26,
            "paragraph_text": "신청인(대표자) :                (서명, 인)"
          }
        }
      },
      "current_text": "                ",
      "input_shape": "SHORT_TEXT",
      "hints": {
        "target_kind": "inline_blank"
      }
    },
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
    "field_key": "application_month_3",
    "field_label": "월",
    "field_type": "DIRECT",
    "value_type": "DATE",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "PARAGRAPH_INLINE",
        "section_index": 0,
        "block_index": 6,
        "table_index": null,
        "row_index": null,
        "column_index": null,
        "paragraph_index": 5,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            5
          ],
          "element_name": "p",
          "xml_id": "2147483648",
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
          ],
          "inline_range": {
            "start": 7,
            "end": 12,
            "paragraph_text": "  2026년     월     일 "
          }
        }
      },
      "current_text": "     ",
      "input_shape": "DATE",
      "hints": {
        "target_kind": "inline_blank",
        "date_part": "month",
        "fixed_year": 2026
      }
    },
    "sources": [
      {
        "source_type": "PROGRAM",
        "source_key": "PROGRAM_DRAFT_DATE",
        "required": true,
        "priority": 1,
        "query_hint": null,
        "source_params": {}
      }
    ]
  },
  {
    "field_key": "application_day_3",
    "field_label": "일",
    "field_type": "DIRECT",
    "value_type": "DATE",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "PARAGRAPH_INLINE",
        "section_index": 0,
        "block_index": 6,
        "table_index": null,
        "row_index": null,
        "column_index": null,
        "paragraph_index": 5,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            5
          ],
          "element_name": "p",
          "xml_id": "2147483648",
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
          ],
          "inline_range": {
            "start": 13,
            "end": 18,
            "paragraph_text": "  2026년     월     일 "
          }
        }
      },
      "current_text": "     ",
      "input_shape": "DATE",
      "hints": {
        "target_kind": "inline_blank",
        "date_part": "day",
        "fixed_year": 2026
      }
    },
    "sources": [
      {
        "source_type": "PROGRAM",
        "source_key": "PROGRAM_DRAFT_DATE",
        "required": true,
        "priority": 1,
        "query_hint": null,
        "source_params": {}
      }
    ]
  },
  {
    "field_key": "application_name_3",
    "field_label": "신청인(대표자)",
    "field_type": "DIRECT",
    "value_type": "TEXT",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "PARAGRAPH_INLINE",
        "section_index": 0,
        "block_index": 7,
        "table_index": null,
        "row_index": null,
        "column_index": null,
        "paragraph_index": 6,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            6
          ],
          "element_name": "p",
          "xml_id": "2147483648",
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
          ],
          "inline_range": {
            "start": 10,
            "end": 26,
            "paragraph_text": "신청인(대표자) :                (서명, 인)"
          }
        }
      },
      "current_text": "                ",
      "input_shape": "SHORT_TEXT",
      "hints": {
        "target_kind": "inline_blank"
      }
    },
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
    "field_key": "application_month_4",
    "field_label": "월",
    "field_type": "DIRECT",
    "value_type": "DATE",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "PARAGRAPH_INLINE",
        "section_index": 0,
        "block_index": 20,
        "table_index": null,
        "row_index": null,
        "column_index": null,
        "paragraph_index": 19,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            19
          ],
          "element_name": "p",
          "xml_id": "0",
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
          ],
          "inline_range": {
            "start": 7,
            "end": 12,
            "paragraph_text": "  2026년     월     일 "
          }
        }
      },
      "current_text": "     ",
      "input_shape": "DATE",
      "hints": {
        "target_kind": "inline_blank",
        "date_part": "month",
        "fixed_year": 2026
      }
    },
    "sources": [
      {
        "source_type": "PROGRAM",
        "source_key": "PROGRAM_DRAFT_DATE",
        "required": true,
        "priority": 1,
        "query_hint": null,
        "source_params": {}
      }
    ]
  },
  {
    "field_key": "application_day_4",
    "field_label": "일",
    "field_type": "DIRECT",
    "value_type": "DATE",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "PARAGRAPH_INLINE",
        "section_index": 0,
        "block_index": 20,
        "table_index": null,
        "row_index": null,
        "column_index": null,
        "paragraph_index": 19,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            19
          ],
          "element_name": "p",
          "xml_id": "0",
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
          ],
          "inline_range": {
            "start": 13,
            "end": 18,
            "paragraph_text": "  2026년     월     일 "
          }
        }
      },
      "current_text": "     ",
      "input_shape": "DATE",
      "hints": {
        "target_kind": "inline_blank",
        "date_part": "day",
        "fixed_year": 2026
      }
    },
    "sources": [
      {
        "source_type": "PROGRAM",
        "source_key": "PROGRAM_DRAFT_DATE",
        "required": true,
        "priority": 1,
        "query_hint": null,
        "source_params": {}
      }
    ]
  },
  {
    "field_key": "application_name_4",
    "field_label": "신청인(대표자)",
    "field_type": "DIRECT",
    "value_type": "TEXT",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "PARAGRAPH_INLINE",
        "section_index": 0,
        "block_index": 21,
        "table_index": null,
        "row_index": null,
        "column_index": null,
        "paragraph_index": 20,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            20
          ],
          "element_name": "p",
          "xml_id": "2147483648",
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
          ],
          "inline_range": {
            "start": 10,
            "end": 26,
            "paragraph_text": "신청인(대표자) :                (서명, 인)"
          }
        }
      },
      "current_text": "                ",
      "input_shape": "SHORT_TEXT",
      "hints": {
        "target_kind": "inline_blank"
      }
    },
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
    "field_key": "application_month_5",
    "field_label": "월",
    "field_type": "DIRECT",
    "value_type": "DATE",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "PARAGRAPH_INLINE",
        "section_index": 0,
        "block_index": 45,
        "table_index": null,
        "row_index": null,
        "column_index": null,
        "paragraph_index": 39,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            39
          ],
          "element_name": "p",
          "xml_id": "2147483648",
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
          ],
          "inline_range": {
            "start": 6,
            "end": 11,
            "paragraph_text": " 2026년     월     일 "
          }
        }
      },
      "current_text": "     ",
      "input_shape": "DATE",
      "hints": {
        "target_kind": "inline_blank",
        "date_part": "month",
        "fixed_year": 2026
      }
    },
    "sources": [
      {
        "source_type": "PROGRAM",
        "source_key": "PROGRAM_DRAFT_DATE",
        "required": true,
        "priority": 1,
        "query_hint": null,
        "source_params": {}
      }
    ]
  },
  {
    "field_key": "application_day_5",
    "field_label": "일",
    "field_type": "DIRECT",
    "value_type": "DATE",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "PARAGRAPH_INLINE",
        "section_index": 0,
        "block_index": 45,
        "table_index": null,
        "row_index": null,
        "column_index": null,
        "paragraph_index": 39,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            39
          ],
          "element_name": "p",
          "xml_id": "2147483648",
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
          ],
          "inline_range": {
            "start": 12,
            "end": 17,
            "paragraph_text": " 2026년     월     일 "
          }
        }
      },
      "current_text": "     ",
      "input_shape": "DATE",
      "hints": {
        "target_kind": "inline_blank",
        "date_part": "day",
        "fixed_year": 2026
      }
    },
    "sources": [
      {
        "source_type": "PROGRAM",
        "source_key": "PROGRAM_DRAFT_DATE",
        "required": true,
        "priority": 1,
        "query_hint": null,
        "source_params": {}
      }
    ]
  },
  {
    "field_key": "application_name_5",
    "field_label": "신청인(대표자)",
    "field_type": "DIRECT",
    "value_type": "TEXT",
    "mapping_status": "RESOLVED",
    "required": false,
    "instruction": null,
    "location_info": {
      "version": 1,
      "target_location": {
        "type": "PARAGRAPH_INLINE",
        "section_index": 0,
        "block_index": 47,
        "table_index": null,
        "row_index": null,
        "column_index": null,
        "paragraph_index": 41,
        "native_ref": {
          "section_file": "Contents/section0.xml",
          "element_path": [
            41
          ],
          "element_name": "p",
          "xml_id": "2147483648",
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
          ],
          "inline_range": {
            "start": 10,
            "end": 26,
            "paragraph_text": "신청인(대표자) :                (서명, 인)"
          }
        }
      },
      "current_text": "                ",
      "input_shape": "SHORT_TEXT",
      "hints": {
        "target_kind": "inline_blank"
      }
    },
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
  }
]
$inline_payload$::jsonb;
    new_id bigint;
    next_order integer;
BEGIN
    SELECT dt.*, pd.type AS document_type INTO t
    FROM document_template dt JOIN program_document pd ON pd.id=dt.program_document_id
    WHERE dt.id=9 FOR UPDATE OF dt,pd;
    IF NOT FOUND THEN RAISE EXCEPTION 'Template 9 not found'; END IF;
    IF t.program_document_id IS DISTINCT FROM 40
       OR t.normalized_path IS DISTINCT FROM '/data/document-agent/normalized/40/normalized-dy7clhwk.hwpx'
       OR t.normalized_format IS DISTINCT FROM 'HWPX'
       OR t.parse_status IS DISTINCT FROM 'COMPLETED'
       OR t.document_type IS DISTINCT FROM '작성용' THEN
        RAISE EXCEPTION 'Template identity/status mismatch';
    END IF;
    IF jsonb_array_length(payload) <> 15 THEN RAISE EXCEPTION 'Invalid payload'; END IF;
    FOR f IN SELECT value FROM jsonb_array_elements(payload) LOOP
        IF EXISTS (SELECT 1 FROM document_field_schema x WHERE x.template_id=9
            AND x.field_key=f->>'field_key' AND x.location_info IS DISTINCT FROM f->'location_info') THEN
            RAISE EXCEPTION 'Field key already used for another location';
        END IF;
        IF EXISTS (SELECT 1 FROM document_field_schema x WHERE x.template_id=9
            AND x.field_key<>f->>'field_key'
            AND x.location_info->'target_location'=f->'location_info'->'target_location') THEN
            RAISE EXCEPTION 'Target already mapped by another field';
        END IF;
    END LOOP;
    -- Idempotent for this reviewed addition set; other fields and their IDs are preserved.
    DELETE FROM document_field_schema WHERE template_id=9
        AND field_key IN (SELECT value->>'field_key' FROM jsonb_array_elements(payload));
    SELECT COALESCE(max(field_order),-1)+1 INTO next_order FROM document_field_schema WHERE template_id=9;
    FOR f IN SELECT value FROM jsonb_array_elements(payload) LOOP
        INSERT INTO document_field_schema(template_id,field_key,field_label,field_order,field_type,
            value_type,mapping_status,required,location_info)
        VALUES(9,f->>'field_key',f->>'field_label',next_order,'DIRECT',f->>'value_type','RESOLVED',false,f->'location_info')
        RETURNING id INTO new_id;
        FOR s IN SELECT value FROM jsonb_array_elements(f->'sources') LOOP
            INSERT INTO document_field_source(field_schema_id,source_type,source_key,required,priority,source_params)
            VALUES(new_id,s->>'source_type',s->>'source_key',true,1,'{}'::jsonb);
        END LOOP;
        next_order := next_order+1;
    END LOOP;
END
$inline9$;
COMMIT;
SELECT field_key,value_type,field_order FROM document_field_schema
WHERE template_id=9 AND field_key ~ '^application_(name|month|day)_[1-5]$' ORDER BY field_order;
