#!/usr/bin/env python3
"""Run a copy-only director baseline against canonical Focus Media shot scripts.

This is a retrospective gap benchmark, not proof of out-of-sample quality. The
prediction side reads only copy/category metadata. Canonical shot descriptions
remain isolated until evaluation.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from collections import Counter, defaultdict
from pathlib import Path


OPERATION_RULES = [
    ("rhythmization", ("【唱】", "唱段", "jingle", "节拍", "旋律")),
    ("standard_challenge", ("第一", "领先", "销量", "冠军", "认证", "标准", "项", "倍", "%", "％")),
    ("function_visible", ("智能", "抗菌", "保鲜", "清洁", "净烟", "除味", "防护", "安全", "保护", "缓震", "护腰", "续航", "智驾", "辅助驾驶", "锁鲜")),
    ("relationship_action", ("妈妈", "爸爸", "孩子", "宝宝", "老人", "全家", "一家", "陪伴", "送礼", "朋友", "亲子")),
    ("path_journey", ("古法", "非遗", "产地", "源头", "传承", "工艺", "百年", "长白山", "原产")),
    ("material_transformation", ("香", "鲜", "脆", "酥", "滑", "柔", "浓", "多汁", "冰爽", "醇")),
    ("causal_trigger", ("倒", "开", "按", "喷", "穿", "喝", "擦", "切", "抹", "贴", "放入", "一键")),
    ("symbol_replacement", ("代言人", "明星", "冠军同款", "IP", "品牌挚友")),
]

OPERATION_BLUEPRINTS = {
    "rhythmization": ["immediate_audio_visual_hook", "brand_or_product_beat", "benefit_or_sku_beat", "escalated_repeat", "choice_memory", "brand_close"],
    "function_visible": ["make_problem_visible", "product_intervenes", "show_function_path", "show_changed_result", "repeat_in_new_context", "brand_close"],
    "standard_challenge": ["state_visible_standard", "put_product_under_test", "show_proof_action", "show_result_difference", "bind_proof_to_product", "brand_close"],
    "causal_trigger": ["product_action_hook", "immediate_visible_change", "repeat_trigger", "escalate_result", "usage_payoff", "brand_close"],
    "material_transformation": ["material_macro_hook", "product_material_moves", "sensory_transformation", "human_or_usage_payoff", "repeat_sensory_cue", "brand_close"],
    "relationship_action": ["relationship_need_or_ritual", "product_mediated_action", "giving_or_shared_action", "reaction_and_handoff", "relationship_payoff", "brand_close"],
    "path_journey": ["origin_or_craft_hook", "craft_action", "movement_into_product", "present_day_use", "benefit_payoff", "brand_close"],
    "symbol_replacement": ["distinctive_character_entry", "character_uses_or_triggers_product", "repeat_owned_phrase_or_action", "product_proof", "return_memory_to_product", "brand_close"],
    "open_mechanism": ["immediate_hook", "product_entry", "visible_product_caused_event", "repeat_or_escalate", "payoff", "brand_close"],
}

FEATURE_TERMS = {
    "people": ("人物", "男士", "女士", "女性", "男性", "女孩", "男孩", "儿童", "老人", "妈妈", "爸爸", "演员", "代言人"),
    "interaction": ("递给", "看向", "对视", "拥抱", "分享", "交谈", "回应", "握手", "搂", "接过", "一起", "围坐", "碰杯"),
    "product": ("产品", "包装", "瓶", "罐", "袋", "盒", "车身", "鞋", "手机", "商品", "packshot", "logo", "LOGO"),
    "material": ("液体", "水滴", "油", "泡沫", "米粒", "果肉", "奶酪", "蒸汽", "食材", "纤维", "颗粒", "剖面"),
    "function_effect": ("光效", "粒子", "轨迹", "透明", "剖面", "数据", "气流", "水流", "路径", "前后对比", "分屏", "变化"),
    "proof": ("实验", "测试", "挑战", "对比", "数字", "证书", "奖杯", "认证", "排名", "第一"),
    "origin_craft": ("产地", "工厂", "作坊", "工艺", "非遗", "古法", "田野", "山脉", "源头", "历史"),
    "offer": ("价格", "元", "优惠", "补贴", "折", "促销", "权益", "到手价", "限时"),
    "text_led": ("大字", "字幕", "文字", "数字", "促销页", "信息页", "标题", "字样"),
    "brand_close": ("品牌定格", "产品定格", "packshot", "LOGO", "Logo", "logo", "收口", "落版", "品牌页", "产品全家福"),
    "camera_motion": ("推进", "拉远", "环绕", "跟拍", "横移", "摇镜", "快速切换", "转场", "升格"),
    "closeup": ("特写", "近景", "微距"),
    "audio_anchor": ("声音：", "【台词】", "【唱】", "旁白", "音乐", "音效"),
}

ACTION_TERMS = ("拿", "递", "倒", "打开", "按下", "喷", "穿", "喝", "吃", "擦", "切", "放入", "举起", "跑", "走", "跳", "转身", "伸手", "落下", "升起", "飞出", "涌出", "变成", "切换", "揭开")

CANONICAL_OPERATION_NAMES = {
    "节拍化": "rhythmization",
    "功能显形": "function_visible",
    "标准挑战": "standard_challenge",
    "因果触发": "causal_trigger",
    "材料变形": "material_transformation",
    "关系动作": "relationship_action",
    "路径旅行": "path_journey",
    "符号替换": "symbol_replacement",
}


def read_csv(path: Path) -> list[dict]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_jsonl(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows), encoding="utf-8")


def choose_operation(text: str, brand: str) -> tuple[str, list[str]]:
    scores: Counter[str] = Counter()
    reasons: dict[str, list[str]] = defaultdict(list)
    lowered = text.lower()
    for operation, terms in OPERATION_RULES:
        for term in terms:
            if term.lower() in lowered:
                scores[operation] += 2 if term in {"【唱】", "第一", "领先", "代言人"} else 1
                reasons[operation].append(term)
    if brand and text.count(brand) >= 3:
        scores["rhythmization"] += 3
        reasons["rhythmization"].append("brand_repetition")
    if re.search(r"\d", text):
        scores["standard_challenge"] += 1
        reasons["standard_challenge"].append("numeric_claim")
    if not scores:
        return "open_mechanism", ["no_confident_library_match"]
    priority = {name: i for i, (name, _) in enumerate(OPERATION_RULES)}
    selected = sorted(scores, key=lambda name: (-scores[name], priority.get(name, 99)))[0]
    return selected, reasons[selected]


def predict_case(row: dict) -> dict:
    text = "；".join([row.get("产品或Campaign", ""), row.get("VO（旁白）", ""), row.get("字幕", "")])
    operation, reasons = choose_operation(text, row.get("品牌", ""))
    return {
        "file": row["文件名"],
        "industry": row.get("行业", ""),
        "brand": row.get("品牌", ""),
        "campaign": row.get("产品或Campaign", ""),
        "input_scope": "copy_and_category_only",
        "mechanism_description": f"Use {operation} as a starting hypothesis; make the product cause a visible event, repeat or escalate it, then close attribution to the brand.",
        "known_operation": operation if operation != "open_mechanism" else None,
        "selection_evidence": reasons,
        "shot_functions": OPERATION_BLUEPRINTS[operation],
        "director_requirements": ["immediate_hook", "product_causality", "action_reaction_or_visible_change", "escalating_repetition", "brand_attribution"],
    }


def parse_end_seconds(value: str) -> float:
    match = re.search(r"-(\d{2}):(\d{2}(?:\.\d+)?)", value or "")
    return int(match.group(1)) * 60 + float(match.group(2)) if match else 0.0


def has_any(text: str, terms: tuple[str, ...]) -> bool:
    return any(term in text for term in terms)


def canonical_signature(copy_row: dict, shots: list[dict]) -> dict:
    texts = [shot.get("TVC生成提示词", "") for shot in shots]
    counts = {feature: sum(has_any(text, terms) for text in texts) for feature, terms in FEATURE_TERMS.items()}
    action_shots = sum(has_any(text, ACTION_TERMS) for text in texts)
    shot_count = max(1, len(texts))
    first = texts[0] if texts else ""
    last = texts[-1] if texts else ""
    brand = copy_row.get("品牌", "")
    campaign = copy_row.get("产品或Campaign", "")
    product_tokens = [token for token in re.split(r"[\s_/·，。]+", campaign) if len(token) >= 2]
    explicit_product_shots = sum(
        bool(brand and brand in text) or any(token in text for token in product_tokens[:4]) or has_any(text, FEATURE_TERMS["product"])
        for text in texts
    )
    return {
        "file": copy_row["文件名"],
        "shot_count": len(texts),
        "duration_seconds": max((parse_end_seconds(shot.get("时间段", "")) for shot in shots), default=0.0),
        "feature_shot_counts": counts,
        "action_density": round(action_shots / shot_count, 4),
        "interaction_density": round(counts["interaction"] / shot_count, 4),
        "text_dominance": round(counts["text_led"] / shot_count, 4),
        "product_presence": round(explicit_product_shots / shot_count, 4),
        "opening_features": [name for name, terms in FEATURE_TERMS.items() if has_any(first, terms)],
        "closing_features": [name for name, terms in FEATURE_TERMS.items() if has_any(last, terms)],
        "closing_has_brand": bool(brand and brand in last),
        "canonical_shots": texts,
    }


def evaluate(prediction: dict, truth: dict) -> dict:
    op = prediction.get("known_operation") or "open_mechanism"
    features = truth["feature_shot_counts"]
    original_strengths: list[str] = []
    pipeline_opportunities: list[str] = []
    if truth["interaction_density"] >= 0.25:
        original_strengths.append("performed_human_interaction")
    if features["material"] >= 2:
        original_strengths.append("material_or_sensory_specificity")
    if features["camera_motion"] >= 2 or features["closeup"] >= 3:
        original_strengths.append("cinematic_shot_variety")
    if features["offer"] >= 2:
        original_strengths.append("offer_information_density")
    if features["origin_craft"] >= 2:
        original_strengths.append("world_or_craft_specificity")
    if truth["product_presence"] < 0.25:
        pipeline_opportunities.append("stronger_product_causality_and_presence")
    if truth["action_density"] < 0.35:
        pipeline_opportunities.append("stronger_visible_action_progression")
    if truth["text_dominance"] > 0.60:
        pipeline_opportunities.append("reduce_text_dependency_with_visual_event")
    if not truth["closing_has_brand"] and "brand_close" not in truth["closing_features"]:
        pipeline_opportunities.append("stronger_brand_attribution")
    if features["people"] > 0 and truth["interaction_density"] < 0.10:
        pipeline_opportunities.append("replace_pose_with_action_reaction")
    expected_feature = {
        "rhythmization": "text_led",
        "function_visible": "function_effect",
        "standard_challenge": "proof",
        "causal_trigger": "product",
        "material_transformation": "material",
        "relationship_action": "interaction",
        "path_journey": "origin_craft",
        "symbol_replacement": "people",
    }.get(op)
    mechanism_alignment = None if not expected_feature else features[expected_feature] > 0
    return {
        "file": prediction["file"],
        "industry": prediction["industry"],
        "known_operation": prediction.get("known_operation"),
        "mechanism_alignment_proxy": mechanism_alignment,
        "original_execution_strengths": original_strengths,
        "pipeline_structural_advantage_candidates": pipeline_opportunities,
        "truth_summary": {key: truth[key] for key in ("shot_count", "duration_seconds", "action_density", "interaction_density", "text_dominance", "product_presence", "closing_has_brand")},
    }


def recurring_patterns(evaluations: list[dict], field: str) -> list[dict]:
    cases: dict[str, list[dict]] = defaultdict(list)
    for item in evaluations:
        for pattern in item[field]:
            cases[pattern].append(item)
    output = []
    for pattern, items in cases.items():
        industries = sorted({item["industry"] for item in items})
        output.append({
            "pattern": pattern,
            "case_count": len(items),
            "industry_count": len(industries),
            "industries": industries,
            "promotion_eligible": len(items) >= 5 and len(industries) >= 2,
        })
    return sorted(output, key=lambda item: (-item["case_count"], item["pattern"]))


def report_markdown(summary: dict) -> str:
    lines = [
        "# 333 Copy-to-Storyboard Replay Benchmark",
        "",
        "> Retrospective diagnostic only. The 333 films informed earlier method design, so this result does not prove out-of-sample generalization.",
        "",
        f"- Cases: {summary['case_count']}",
        f"- Canonical shots: {summary['canonical_shot_count']}",
        f"- Copy-only mechanism proxy alignment: {summary['alignment_rate']:.1%}",
        f"- Average canonical action density: {summary['averages']['action_density']:.1%}",
        f"- Average canonical interaction density: {summary['averages']['interaction_density']:.1%}",
        f"- Average canonical text dominance: {summary['averages']['text_dominance']:.1%}",
        f"- Average canonical product presence: {summary['averages']['product_presence']:.1%}",
        "",
        "## Repeated strengths in the delivered films",
        "",
        "| Pattern | Cases | Industries | Eligible to inform pipeline |",
        "|---|---:|---:|---|",
    ]
    for item in summary["original_strength_patterns"]:
        lines.append(f"| {item['pattern']} | {item['case_count']} | {item['industry_count']} | {'yes' if item['promotion_eligible'] else 'no'} |")
    lines.extend(["", "## Repeated structural opportunities for the pipeline", "", "| Pattern | Cases | Industries | Eligible to inform pipeline |", "|---|---:|---:|---|"])
    for item in summary["pipeline_opportunity_patterns"]:
        lines.append(f"| {item['pattern']} | {item['case_count']} | {item['industry_count']} | {'yes' if item['promotion_eligible'] else 'no'} |")
    lines.extend([
        "",
        "## Mechanism distribution gap",
        "",
        "| Operation | Copy-only baseline | Canonical library | Gap |",
        "|---|---:|---:|---:|",
    ])
    for item in summary["operation_distribution_gap"]:
        lines.append(f"| {item['operation']} | {item['predicted_count']} | {item['canonical_count']} | {item['count_gap']:+d} |")
    lines.extend([
        "",
        "## Interpretation rule",
        "",
        "Do not promote a single film or category into the common pipeline. A pattern must recur in at least five films across at least two industries, survive human review, and improve a separate blind brief before it becomes a shared rule.",
        "",
    ])
    return "\n".join(lines)


def run(copy_csv: Path, shot_csv: Path, out_dir: Path, pattern_json: Path | None = None) -> dict:
    copy_rows = read_csv(copy_csv)
    shot_rows = read_csv(shot_csv)
    shots_by_file: dict[str, list[dict]] = defaultdict(list)
    for shot in shot_rows:
        shots_by_file[shot["文件名"]].append(shot)
    for shots in shots_by_file.values():
        shots.sort(key=lambda row: float(row.get("镜头序号") or 0))

    cases = [{key: row.get(key, "") for key in ("文件名", "行业", "品牌", "产品或Campaign", "VO（旁白）", "字幕")} for row in copy_rows]
    predictions = [predict_case(row) for row in copy_rows]
    truths = [canonical_signature(row, shots_by_file.get(row["文件名"], [])) for row in copy_rows]
    evaluations = [evaluate(pred, truth) for pred, truth in zip(predictions, truths)]
    aligned = [item["mechanism_alignment_proxy"] for item in evaluations if item["mechanism_alignment_proxy"] is not None]
    averages = {
        key: sum(item["truth_summary"][key] for item in evaluations) / max(1, len(evaluations))
        for key in ("action_density", "interaction_density", "text_dominance", "product_presence")
    }
    predicted_operation_counts = Counter((item.get("known_operation") or "open_mechanism") for item in predictions)
    canonical_operation_counts: dict[str, int] = {}
    if pattern_json and pattern_json.exists():
        pattern_data = json.loads(pattern_json.read_text(encoding="utf-8"))
        canonical_operation_counts = {
            CANONICAL_OPERATION_NAMES.get(card.get("operation", ""), card.get("operation", "")): int(card.get("count") or 0)
            for card in pattern_data.get("operation_cards", [])
        }
    operation_distribution_gap = []
    for operation in sorted(set(predicted_operation_counts) | set(canonical_operation_counts)):
        predicted = predicted_operation_counts.get(operation, 0)
        canonical = canonical_operation_counts.get(operation, 0)
        operation_distribution_gap.append({
            "operation": operation,
            "predicted_count": predicted,
            "canonical_count": canonical,
            "count_gap": predicted - canonical,
        })

    summary = {
        "benchmark_type": "retrospective_copy_only_replay",
        "leakage_policy": "predictions use copy/category only; canonical shots are read only during evaluation",
        "generalization_claim": "none; requires separate blind briefs",
        "case_count": len(copy_rows),
        "canonical_shot_count": len(shot_rows),
        "alignment_rate": sum(bool(value) for value in aligned) / max(1, len(aligned)),
        "averages": averages,
        "predicted_operation_counts": dict(predicted_operation_counts),
        "canonical_operation_counts": canonical_operation_counts,
        "operation_distribution_gap": operation_distribution_gap,
        "original_strength_patterns": recurring_patterns(evaluations, "original_execution_strengths"),
        "pipeline_opportunity_patterns": recurring_patterns(evaluations, "pipeline_structural_advantage_candidates"),
    }

    write_jsonl(out_dir / "copy_only_cases.jsonl", cases)
    write_jsonl(out_dir / "baseline_predictions.jsonl", predictions)
    write_jsonl(out_dir / "canonical_signatures.jsonl", truths)
    write_jsonl(out_dir / "case_gap_evaluations.jsonl", evaluations)
    write_json(out_dir / "summary.json", summary)
    (out_dir / "summary.md").write_text(report_markdown(summary), encoding="utf-8")
    return summary


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--copy-csv", required=True)
    parser.add_argument("--shot-csv", required=True)
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--pattern-json")
    args = parser.parse_args()
    summary = run(
        Path(args.copy_csv),
        Path(args.shot_csv),
        Path(args.out_dir),
        Path(args.pattern_json) if args.pattern_json else None,
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
