import React from "react";

export function Card({ title, children, className = "", action }) {
  return (
    <div className={`card-block ${className}`}>
      <div className="card-title">
        {title}
        {action != null && <span className="card-title-action">{action}</span>}
      </div>
      {children}
    </div>
  );
}
