# Wall-Clock mode with to_scaled_dict() data

I notice that when switching to Wall-Clock mode with to_scaled_dict() data, the rendering still shows the scaled values (880ms, 1.33s, 1.77s) side by side, not the wall-clock values (2s, 3s, 4s) in parallel lanes. 

This is because the to_scaled_dict() data has `value: 88, 133, 177` (scaled) and `_wall_clock: 200, 300, 400`. When Wall-Clock mode is selected, the engine should use the _wall_clock values instead of value for rendering, and show them in parallel lanes.

Need to check the flameEngine to see if it properly swaps value with _wall_clock when in wall-clock mode.
