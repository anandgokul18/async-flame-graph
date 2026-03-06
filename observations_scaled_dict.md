# to_scaled_dict() Sample Data Observations

The to_scaled_dict() sample data is rendering correctly in Scaled mode:
- JSON shows _wall_clock fields: 200, 300, 400 alongside scaled values: 88, 133, 177
- Children render side-by-side within parent width (correctly scaled)
- do_retrieval@tools.py (880.0ms) - scaled from 200 ticks
- do_llm_call@llm.py (1.33s) - scaled from 300 ticks
- do_tool_exec@tools.py (1.77s) - scaled from 400 ticks
- gather@asyncio shows self time of 2.23s (the remaining time after children)
- The Scaled button is highlighted
- Auto-detected the scaled format correctly

Now let me test switching to Wall-Clock mode with this data to see if it uses _wall_clock values.
