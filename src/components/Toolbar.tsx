"use client";

interface ToolbarProps {
  canUndo: boolean;
  canAdd: boolean;
  onUndo: () => void;
  onAdd: () => void;
  onNew: () => void;
  onHint: () => void;
  onRestart: () => void;
}

export default function Toolbar({ canUndo, canAdd, onUndo, onAdd, onNew, onHint, onRestart }: ToolbarProps) {
  const tools = [
    { icon: "↩", label: "Undo", onClick: onUndo, disabled: !canUndo },
    { icon: "＋", label: "Add tube", onClick: onAdd, disabled: !canAdd },
    { icon: "⟳", label: "New deal", onClick: onNew, disabled: false },
    { icon: "💡", label: "Hint", onClick: onHint, disabled: false },
    { icon: "⏮", label: "Level 1", onClick: onRestart, disabled: false },
  ];

  return (
    <div className="w-full max-w-[900px] flex flex-wrap justify-center gap-[14px] px-3 pt-[6px] pb-[26px]">
      {tools.map(t => (
        <button
          key={t.label}
          onClick={t.onClick}
          disabled={t.disabled}
          className="border-none bg-[#1a2142] text-[#e8ecfa] rounded-[18px] pt-3 px-[10px] pb-[9px] min-w-[86px] cursor-pointer font-medium text-[15px] flex flex-col items-center gap-[3px] active:scale-[0.96] disabled:opacity-[0.38] disabled:cursor-default"
        >
          <span className="text-[25px] leading-none">{t.icon}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
}
