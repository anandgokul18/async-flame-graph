# Wall-Clock Mode Observations

The to_dict() sample data is rendering correctly in Wall-Clock mode:
- root@ (4.00s) spans the full width
- invoke_analect@confucius.py (4.00s) spans the full width
- gather@asyncio (4.00s, concurrent=true) spans the full width
- Three children are in SEPARATE PARALLEL LANES:
  - do_retrieval@tools.py (2.00s) - shorter bar, correctly proportional
  - do_llm_call@llm.py (3.00s) - medium bar
  - do_tool_exec@tools.py (4.00s) - full width bar
- All three children start at the same x position (0) - correct for parallel execution
- The total shows 4.000s (not 9s!) - correctly using wall-clock time
- Table shows correct self times and total times
- Wall-Clock toggle is highlighted in cyan, Scaled toggle is available

Next: Test switching to Scaled mode to verify children fit within parent
