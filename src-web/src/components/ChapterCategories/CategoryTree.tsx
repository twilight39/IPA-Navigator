import { useState } from "react";
import { CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react";
import { Category } from "./types.tsx";

interface CategoryTreeProps {
  categories: Category[];
  selectedIds: Set<string>;
  onToggleSelection: (categoryId: string) => void;
  multiSelect?: boolean;
  className?: string;
}

export function CategoryTree({
  categories,
  selectedIds,
  onToggleSelection,
  multiSelect = true,
  className = "",
}: CategoryTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (categoryId: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedIds(newExpanded);
  };

  const renderCategory = (category: Category, level = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedIds.has(category.id);
    const isSelected = selectedIds.has(category.id);

    return (
      <div key={category.id} className="w-full">
        <div
          className={`flex items-center gap-2 p-2 rounded-lg hover:bg-base-200 cursor-pointer transition-colors ${
            isSelected ? "bg-primary/20 border border-primary/30" : ""
          }`}
          style={{ marginLeft: `${level * 20}px` }}
          onClick={() => {
            if (hasChildren) {
              toggleExpand(category.id);
            }
          }}
        >
          {hasChildren
            ? (
              <span className="btn btn-ghost btn-xs btn-circle">
                {isExpanded
                  ? <CaretDownIcon size={16} />
                  : <CaretRightIcon size={16} />}
              </span>
            )
            : <div className="w-6" />}

          <div className="flex-1 flex items-center justify-between">
            <span className={`text-sm ${isSelected ? "font-medium" : ""}`}>
              {category.name}
            </span>

            {multiSelect && (
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={isSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  onToggleSelection(category.id);
                }}
              />
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="ml-4">
            {category.children!.map((child) =>
              renderCategory(child, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`space-y-1 ${className}`}>
      {categories.map((category) => renderCategory(category))}
    </div>
  );
}
