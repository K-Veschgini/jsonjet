import { createToken } from 'chevrotain';

// =============================================================================
// QUERY OPERATION KEYWORDS
// =============================================================================

// Source and pipeline operations
export const Where = createToken({ name: "Where", pattern: /where\b/i });
export const Select = createToken({ name: "Select", pattern: /select\b/i });
export const Scan = createToken({ name: "Scan", pattern: /scan\b/i });
export const Summarize = createToken({ name: "Summarize", pattern: /summarize\b/i });
export const InsertInto = createToken({ name: "InsertInto", pattern: /insert_into\b/i });
export const WriteToFile = createToken({ name: "WriteToFile", pattern: /write_to_file\b/i });
export const AssertOrSaveExpected = createToken({ name: "AssertOrSaveExpected", pattern: /assert_or_save_expected\b/i });
export const Collect = createToken({ name: "Collect", pattern: /collect\b/i });

// Grouping and windowing
export const By = createToken({ name: "By", pattern: /by\b/i });
export const Over = createToken({ name: "Over", pattern: /over\b/i });
export const Step = createToken({ name: "Step", pattern: /step\b/i });

// =============================================================================
// FUNCTION KEYWORDS
// =============================================================================

// Control flow functions
export const Iff = createToken({ name: "Iff", pattern: /iff\b/i });
export const Emit = createToken({ name: "Emit", pattern: /emit\b/i });

// Emit clause keywords
export const Every = createToken({ name: "Every", pattern: /every\b/i });
export const When = createToken({ name: "When", pattern: /when\b/i });
export const On = createToken({ name: "On", pattern: /on\b/i });
export const Change = createToken({ name: "Change", pattern: /change\b/i });
export const Group = createToken({ name: "Group", pattern: /group\b/i });
export const Update = createToken({ name: "Update", pattern: /update\b/i });
export const Using = createToken({ name: "Using", pattern: /using\b/i });

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

// Flow creation keywords
export const As = createToken({ name: "As", pattern: /as\b/i });

// Statement keywords
export const Create = createToken({ name: "Create", pattern: /create\b/i });
export const Or = createToken({ name: "Or", pattern: /or\b/i });
export const Replace = createToken({ name: "Replace", pattern: /replace\b/i });
export const If = createToken({ name: "If", pattern: /if\b/i });
export const Not = createToken({ name: "Not", pattern: /not\b/i });
export const Exists = createToken({ name: "Exists", pattern: /exists\b/i });
export const Stream = createToken({ name: "Stream", pattern: /stream\b/i });
export const Flow = createToken({ name: "Flow", pattern: /flow\b/i });
export const Lookup = createToken({ name: "Lookup", pattern: /lookup\b/i });
export const Delete = createToken({ name: "Delete", pattern: /delete\b/i });
export const Insert = createToken({ name: "Insert", pattern: /insert\b/i });
export const Into = createToken({ name: "Into", pattern: /into\b/i });
export const Flush = createToken({ name: "Flush", pattern: /flush\b/i });
export const List = createToken({ name: "List", pattern: /list\b/i });
export const Info = createToken({ name: "Info", pattern: /info\b/i });
export const Subscribe = createToken({ name: "Subscribe", pattern: /subscribe\b/i });
export const Unsubscribe = createToken({ name: "Unsubscribe", pattern: /unsubscribe\b/i });
export const Ttl = createToken({ name: "Ttl", pattern: /ttl\b/i });

