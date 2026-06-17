import type { IconType } from "react-icons";
import { LuClock, LuStar, LuSettings } from "react-icons/lu";
import type { Tool } from "./api";
import type { Section } from "./types";

/** Left sidebar entries, in order. The index also drives the Ctrl+N shortcut. */
export const NAV: { id: Section; label: string; Icon: IconType }[] = [
  { id: "history", label: "Histórico", Icon: LuClock },
  { id: "saved", label: "Salvos", Icon: LuStar },
  { id: "settings", label: "Configuração", Icon: LuSettings },
];

/** A blank tool used to seed the tool editor for a new tool. */
export const BLANK_TOOL: Tool = {
  id: "",
  name: "",
  description: "",
  match: "",
  run: "python3 run.py",
  output_file: "output.json",
};

/** The global show/hide shortcut (display string only). */
export const SHORTCUT = "Ctrl+Shift+Space";
