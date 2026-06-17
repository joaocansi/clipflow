/** A keyboard key rendered as a styled chip. */
export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}

/** A hint: one or more keys followed by a label. */
export function Hint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <span className="flex shrink-0 items-center gap-1">
      {keys.map((k, i) => (
        <Kbd key={i}>{k}</Kbd>
      ))}
      <span>{label}</span>
    </span>
  );
}
