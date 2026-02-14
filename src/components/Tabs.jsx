import React from "react";

export function Tabs({ tabs, activeId, onChange }) {
  return (
    <div className="tabs">
      {tabs.map((t) => {
        const active = t.id === activeId;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`tab ${active ? "tab-active" : ""}`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
