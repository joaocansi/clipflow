/** The active section shown in the left sidebar. */
export type Section = "history" | "saved" | "settings";

/** An overlay shown over the main area (covers the list/detail). */
export type Overlay = null | "save" | "result" | "editTool";

/** Keyboard focus zone: left nav ← list ← tools. */
export type Zone = "nav" | "list" | "tools";
