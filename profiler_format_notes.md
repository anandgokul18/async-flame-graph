# Profiler Format Notes

## Two Serialization Modes

### to_dict() — True wall-clock
- Children show actual wall-clock tick counts (value field)
- Children sum > parent is expected (200+300+400=900 vs parent=400)
- concurrent=true on parent node (e.g., gather@asyncio)
- blocking=true/false on children
- For programmatic analysis with exact wall-clock values

### to_scaled_dict() — Proportionally scaled
- Children scaled to fit within parent: child_scale = parent.value / sum(children.value)
- Original values preserved in _wall_clock field
- value field contains the scaled value
- concurrent=true still present on parent

## Key Fields
- concurrent=true: divergence detection (multiple child symbols in same tick)
- blocking=true/false: whether child was actively awaited
- _wall_clock: original wall-clock value (only in to_scaled_dict)
- value: tick count (to_dict) or scaled tick count (to_scaled_dict)

## Rendering Approach
- Wall-Clock mode: show children in parallel lanes, true durations
- Scaled mode: children fit within parent width, tooltip shows _wall_clock
