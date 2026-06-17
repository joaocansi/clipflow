import { useState } from "react";
import { LuX } from "react-icons/lu";
import { splitTags } from "../lib/format";

/**
 * Badge-based tag editor. Stores/returns a comma-separated string (the format
 * the backend expects) but presents tags as removable chips. Add a tag with
 * Enter or a comma; Backspace on an empty input removes the last tag.
 */
export function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const tags = splitTags(value);
  const [draft, setDraft] = useState("");

  function addTag(raw: string) {
    const t = raw.trim().replace(/,+$/, "").trim();
    setDraft("");
    if (!t || tags.includes(t)) return;
    onChange([...tags, t].join(", "));
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag).join(", "));
  }

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[var(--cf-border)] bg-[var(--cf-surface)] px-2 py-1.5 focus-within:border-[var(--cf-accent)]">
      {tags.map((t) => (
        <span
          key={t}
          className="flex items-center gap-1 rounded-md bg-[var(--cf-accent-soft)] px-1.5 py-0.5 text-[11px] text-[var(--cf-accent-text)]"
        >
          #{t}
          <button
            type="button"
            onClick={() => removeTag(t)}
            className="opacity-70 hover:opacity-100"
            title="Remover tag"
          >
            <LuX className="size-2.5" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => {
          const v = e.target.value;
          if (v.endsWith(",")) addTag(v);
          else setDraft(v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addTag(draft);
          } else if (e.key === "Backspace" && !draft && tags.length) {
            removeTag(tags[tags.length - 1]);
          }
        }}
        onBlur={() => addTag(draft)}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="min-w-[6ch] flex-1 bg-transparent text-sm text-[var(--cf-text)] outline-none placeholder:text-[var(--cf-text-dim)]"
      />
    </div>
  );
}
