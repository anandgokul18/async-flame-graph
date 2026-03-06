# Observations - Render Mode Update

## Current State
- The empty state page looks great with the updated format cards (to_dict, to_scaled_dict)
- The left panel shows updated placeholder text with all supported formats
- The Samples dropdown now has 4 options: time-based, sample-based, to_dict(), to_scaled_dict()
- No TypeScript errors, no build errors
- Need to test: Load sample data, check render mode toggle, test wall-clock vs scaled

## Next Steps
- Load sample data and verify the Wall-Clock / Scaled toggle works
- Test with the to_dict() and to_scaled_dict() sample data
- Verify tooltip shows wall-clock values in scaled mode
