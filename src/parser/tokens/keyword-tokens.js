import { createToken } from 'chevrotain';

// =============================================================================
// QUERY OPERATION KEYWORDS
// =============================================================================

// Source and pipeline operations
export const Where = createToken({ name: "Where", pattern: /where/i });
export const Select = createToken({ name: "Select", pattern: /select/i });
export const Scan = createToken({ name: "Scan", pattern: /scan/i });
export const Summarize = createToken({ name: "Summarize", pattern: /summarize/i });
export const InsertInto = createToken({ name: "InsertInto", pattern: /insert_into/i });
export const Collect = createToken({ name: "Collect", pattern: /collect/i });

// Grouping and windowing
export const By = createToken({ name: "By", pattern: /by/i });
export const Over = createToken({ name: "Over", pattern: /over/i });
export const Step = createToken({ name: "Step", pattern: /step/i });

// =============================================================================
// FUNCTION KEYWORDS
// =============================================================================

// Control flow functions
export const Iff = createToken({ name: "Iff", pattern: /iff/i });
export const Emit = createToken({ name: "Emit", pattern: /emit/i });

// Emit clause keywords
export const Every = createToken({ name: "Every", pattern: /every/i });
export const When = createToken({ name: "When", pattern: /when/i });
export const On = createToken({ name: "On", pattern: /on/i });
export const Change = createToken({ name: "Change", pattern: /change/i });
export const Group = createToken({ name: "Group", pattern: /group/i });
export const Update = createToken({ name: "Update", pattern: /update/i });
export const Using = createToken({ name: "Using", pattern: /using/i });

// Aggregation functions - removed Count and Sum to allow them as regular function calls

// Window functions - count-based
export const HoppingWindow = createToken({ name: "HoppingWindow", pattern: /hopping_window/i });
export const TumblingWindow = createToken({ name: "TumblingWindow", pattern: /tumbling_window/i });
export const SlidingWindow = createToken({ name: "SlidingWindow", pattern: /sliding_window/i });
export const CountWindow = createToken({ name: "CountWindow", pattern: /count_window/i });

// Window functions - value-based (with _by suffix)
export const HoppingWindowBy = createToken({ name: "HoppingWindowBy", pattern: /hopping_window_by/i });
export const TumblingWindowBy = createToken({ name: "TumblingWindowBy", pattern: /tumbling_window_by/i });
export const SlidingWindowBy = createToken({ name: "SlidingWindowBy", pattern: /sliding_window_by/i });
export const SessionWindow = createToken({ name: "SessionWindow", pattern: /session_window/i });

// =============================================================================
// COMMAND KEYWORDS
// =============================================================================

// Dot commands
export const Print = createToken({ name: "Print", pattern: /\.print/i });

