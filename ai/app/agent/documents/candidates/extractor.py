"""ParsedDocument → FieldCandidate[]. 외부 호출/입력 객체 변경 없이 동작한다."""

import json

from ..parser.models import ParsedDocument, ParsedTable
from .enums import CandidateRelation as Relation
from .models import FieldCandidate
from .normalizer import normalize_label
from . import rules


def location_key(location):
    native = location.native_ref
    path = native.get("element_path")
    if isinstance(path, list) and all(isinstance(i, int) for i in path):
        return (location.section_index, location.table_index,
                native.get("section_file"), tuple(path))
    # DOCX 등에서 native 경로가 아직 없을 때도 공통 위치를 사용한다.
    return (location.section_index, location.table_index, location.row_index,
            location.column_index, location.block_index)


def tables_in(blocks):
    for block in blocks:
        if isinstance(block, ParsedTable):
            yield block
            for row in block.rows:
                for cell in row.cells:
                    yield from tables_in(cell.blocks)


class FieldCandidateExtractor:
    def extract(self, parsed: ParsedDocument) -> list[FieldCandidate]:
        winners = {}
        for section in parsed.sections:
            for table in tables_in(section.blocks):
                cells = [cell for row in table.rows for cell in row.cells]
                targets = [(cell, kind) for cell in cells if (kind := rules.target_kind(cell))]
                for label in filter(rules.is_label, cells):
                    right = [(cell, kind) for cell, kind in targets if rules.right_of(label, cell)]
                    scan = None if right else rules.forward_target(label, cells)
                    if scan:
                        right = [(scan[0], scan[1])]
                    matches = right or [(cell, kind) for cell, kind in targets if kind != "unit_suffix" and rules.below(label, cell)]
                    relation = Relation.RIGHT if right else Relation.BELOW
                    for target, kind in matches:
                        candidate = self._candidate(label, target, kind, relation, cells)
                        if scan and relation == Relation.RIGHT:
                            # 직접 인접한 다른 label이 소유한 target에는 scan 후보를 만들지 않는다.
                            if any(other is not label and rules.is_label(other)
                                   and rules.right_of(other, target) for other in cells):
                                continue
                            candidate.hints["scan_cells"] = scan[2]
                            candidate.confidence = max(0, candidate.confidence - rules.SCAN_PENALTY)
                        key = location_key(target.location)
                        previous = winners.get(key)
                        if previous is None or self._rank(candidate) > self._rank(previous):
                            winners[key] = candidate
        # 표/셀 위치순으로 ID를 부여한다. 같은 입력의 반복 추출 결과는 동일하다.
        ordered = sorted(winners.values(), key=self._order)
        return [candidate.model_copy(update={"candidate_id": f"candidate_{index:03d}"})
                for index, candidate in enumerate(ordered, start=1)]

    @staticmethod
    def _rank(candidate):
        return candidate.confidence, rules.RELATION_PRIORITY[candidate.relation]

    @staticmethod
    def _order(candidate):
        loc = candidate.target_location
        return (loc.section_index, loc.table_index if loc.table_index is not None else -1,
                loc.row_index if loc.row_index is not None else -1,
                loc.column_index if loc.column_index is not None else -1,
                json.dumps(loc.native_ref, sort_keys=True, ensure_ascii=False))

    def _candidate(self, label, target, kind, relation, cells):
        shape = rules.input_shape(target, relation, cells)
        context = self._context(label, target, cells)
        unit = rules.linked_unit(target, cells)
        hints = {"target_kind": kind}
        if kind == "unit_suffix":
            hints["insertion_mode"] = "BEFORE_SUFFIX"
        if kind == "helper":
            hints["helper_text"] = target.text
        if kind == "placeholder":
            parts = rules.placeholder_parts(target.text)
            hints["placeholder_text"] = parts[0]
            if parts[1]:
                hints["helper_text"] = parts[1]
        score = rules.confidence(relation, kind, shape)
        if rules.likely_instruction(label.text):
            hints["likely_instruction"] = True
            score = max(0, score - rules.INSTRUCTION_PENALTY)
        if unit:
            hints["unit"] = unit
        return FieldCandidate(
            candidate_id="pending", label=label.text, normalized_label=normalize_label(label.text),
            relation=relation,
            label_location=label.location.model_copy(deep=True),
            target_location=target.location.model_copy(deep=True),
            current_text=target.text, input_shape=shape, context=context,
            confidence=score, hints=hints,
        )

    @staticmethod
    def _context(label, target, cells):
        neighbors = sorted(
            (cell for cell in cells if cell is not label and cell is not target
             and (rules.adjacent(label, cell) or rules.adjacent(target, cell))),
            key=lambda cell: (cell.row_index, cell.column_index),
        )
        pieces = []
        seen = {normalize_label(label.text)}
        # 타깃의 helper/placeholder를 먼저 남긴다. 전체 문서/표를 붙이지 않는다.
        for cell in [target, *neighbors]:
            text = cell.text.strip()
            compact = normalize_label(text)
            if (not compact or compact in seen or len(text) > rules.MAX_CONTEXT_ITEM_LENGTH
                    or rules.nested_tables(cell) or rules.has_objects(cell)):
                continue
            seen.add(compact)
            if len(pieces) < rules.MAX_CONTEXT_ITEMS:
                pieces.append(text)
        context = " / ".join(pieces)[:rules.MAX_CONTEXT_LENGTH]
        return context or None

