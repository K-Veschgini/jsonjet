import { createToken } from 'chevrotain';

// =============================================================================
// QUERY OPERATION KEYWORDS
// =============================================================================

// Source and pipeline operations
export const Where = createToken({ name: "Where", pattern: /where/i });
export const Project = createToken({ name: "Project", pattern: /project/i });
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

// Aggregation functions
export const Count = createToken({ name: "Count", pattern: /count\b/i });
export const Sum = createToken({ name: "Sum", pattern: /sum\b/i });

// Window functions
export const HoppingWindow = createToken({ name: "HoppingWindow", pattern: /hopping_window/i });
export const TumblingWindow = createToken({ name: "TumblingWindow", pattern: /tumbling_window/i });
export const SessionWindow = createToken({ name: "SessionWindow", pattern: /session_window/i });

// =============================================================================
// COMMAND KEYWORDS
// =============================================================================

// Dot commands
export const Print = createToken({ name: "Print", pattern: /\.print/i });

// =============================================================================
// LOGICAL KEYWORDS (deprecated - prefer symbols)
// =============================================================================
// Note: Keeping these for backward compatibility, but || and && are preferred
export const And = createToken({ name: "And", pattern: /and/i });
export const Or = createToken({ name: "Or", pattern: /or/i });