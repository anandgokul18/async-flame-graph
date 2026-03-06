# Real Data Analysis

- **Total spans**: 3397
- **Concurrent nodes**: 3 (at depths 3, 7, 8)
- **No `_wall_clock` fields** — this is `to_dict()` format (wall-clock mode)
- **Root**: `root@` with value=1772
- **Format**: Sample tree with `name`, `value`, `children` fields
- **Concurrent node 1** (depth 3): `run@/runtime/lib/python3.12/threading.py` with 3 children
- **Concurrent node 2** (depth 7): `_run@/runtime/lib/python3.12/asyncio/events.py` with 18 children
- **Concurrent node 3** (depth 8): `_execute_update_with_batching@...` with 2 children

## Issues to verify:
1. Wall-Clock mode should show paper-stacks for these 3 concurrent nodes
2. Scaled mode should also show paper-stacks
3. Canvas should be crisp (DPR fix)
4. 3397 spans is a large trace — need to verify performance
