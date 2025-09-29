import React from "react";
import { XIcon } from "@phosphor-icons/react";
import { CategoryWithAssignment } from "./types.tsx";

interface CategoryBadgeProps {
  category: CategoryWithAssignment;
  auto_assigned?: boolean;
  showType?: boolean;
  size?: "sm" | "md" | "lg";
  onRemove?: () => void;
}

export function CategoryBadge({
  category,
  auto_assigned = false,
  showType = false,
  size = "md",
  onRemove,
}: CategoryBadgeProps) {
  const sizeClasses = {
    sm: "badge-sm text-xs",
    md: "badge-md text-sm",
    lg: "badge-lg text-base",
  };

  const badgeClass = auto_assigned ? "badge-primary" : "badge-secondary";

  return (
    <div className={`badge ${badgeClass} ${sizeClasses[size]} gap-2`}>
      {auto_assigned && (
        <div
          className="w-2 h-2 bg-current rounded-full opacity-60"
          title="AI Suggested"
        />
      )}

      <span>{category.name}</span>

      {category.confidence && (
        <span className="opacity-70 text-xs">
          ({Math.round(category.confidence * 100)}%)
        </span>
      )}

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="btn btn-ghost btn-xs btn-circle ml-1 hover:bg-error hover:text-error-content"
        >
          <XIcon size={12} />
        </button>
      )}
    </div>
  );
}
