import { useEffect, useState } from "react";
import {
  CaretDownIcon,
  CaretRightIcon,
  SparkleIcon,
  StackIcon,
  TagIcon,
  TargetIcon,
} from "@phosphor-icons/react";
import { Category } from "./types.tsx";
import { CategoryTree } from "./CategoryTree.tsx";
import { CategoryBadge } from "./CategoryBadge.tsx";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api.js";
import { useChapterOptions } from "../../hooks/useChapterOptions.tsx";

interface CategorySelectorProps {
  chapter: any;
  handleChange: (field: string, value: any) => Promise<void>;
}

export function CategorySelector(
  { chapter, handleChange }: CategorySelectorProps,
) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const { categories, difficulties } = useChapterOptions();
  const [selectedDifficultyId, setSelectedDifficultyId] = useState<
    string | null
  >(chapter?.difficulty?.[0]?._id || null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<
    string[]
  >(
    chapter?.categories.map((c) => c._id) || [],
  );

  // console.log(chapter);
  // console.log(selectedDifficultyId);

  useEffect(() => {
    setSelectedDifficultyId(chapter?.difficulty?.[0]?._id || null);
    setSelectedCategoryIds(
      chapter?.categories.map((c) => c._id) || [],
    );
  }, [chapter?.difficulty]);

  const onChange = (field: string, id: string | string[]) => {
    const difficultyId = field === "difficulty" ? id : selectedDifficultyId;
    const categoryIds = field === "categoryIds" ? id : selectedCategoryIds;
    handleChange("categoryIds", [difficultyId, ...categoryIds]);
  };

  if (
    categories === undefined || difficulties === undefined ||
    chapter === undefined
  ) {
    return <div className="loading loading-spinner loading-lg"></div>;
  }

  return (
    <div className={`space-y-4`}>
      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <div className="card bg-base-100 border border-primary/20">
          <div className="card-body p-4">
            <h4 className="card-title text-sm flex items-center gap-2">
              <SparkleIcon size={16} className="text-primary" />
              AI Suggestions ({suggestions.length})
            </h4>

            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-2 bg-base-200/50 rounded-lg"
                >
                  <div className="flex-1 text-xs text-base-content/70">
                    {suggestion}
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary btn-xs"
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>

            {onGenerateSuggestions && (
              <button
                type="button"
                onClick={onGenerateSuggestions}
                className="btn btn-outline btn-sm w-full mt-2"
              >
                Generate More Suggestions
              </button>
            )}
          </div>
        </div>
      )}

      {/* Category Selection */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body p-4">
          <div className="tabs tabs-box">
            <label className="tab gap-2">
              <input type="radio" name="categories" defaultChecked />
              <TargetIcon size={16} />
              Difficulty
            </label>
            <DifficultySelector
              difficulties={difficulties}
              selectedId={selectedDifficultyId}
              onSelect={(id) => {
                setSelectedDifficultyId(id);
                onChange("difficulty", id);
              }}
              className="tab-content bg-base-100 p-2"
            />
            <label className="tab gap-2">
              <input type="radio" name="categories" />
              <StackIcon size={16} />
              Phonemes
            </label>
            <PhonemeSelector
              categories={categories}
              selectedIds={selectedCategoryIds}
              onSelect={(ids) => {
                setSelectedCategoryIds(ids);
                onChange("categoryIds", ids);
              }}
              className="tab-content bg-base-100 p-2"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface Difficulty {
  _id: string;
  name: string;
}

interface DifficultySelectorProps {
  difficulties: Difficulty[];
  selectedId: string | null;
  onSelect: (difficultyId: string) => void;
  className?: string;
}

export function DifficultySelector({
  difficulties,
  selectedId,
  onSelect,
  className = "",
}: DifficultySelectorProps) {
  return (
    <div className={`space-y-1 ${className}`}>
      {difficulties.map((difficulty) => (
        <div
          key={difficulty._id}
          className={`flex items-center gap-2 p-2 rounded-lg hover:bg-base-200 cursor-pointer transition-colors ${
            selectedId === difficulty._id
              ? "bg-primary/20 border border-primary/30"
              : ""
          }`}
          onClick={() => onSelect(difficulty._id)}
        >
          <span className="flex-1 text-sm">
            {difficulty.name}
          </span>
          <input
            type="radio"
            className="radio radio-sm"
            checked={selectedId === difficulty._id}
            onChange={() => onSelect(difficulty._id)}
            name="difficulty"
          />
        </div>
      ))}
    </div>
  );
}

interface PhonemeSelectorProps {
  categories: Category[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  className?: string;
}

function isLeaf(category: Category): boolean {
  return !category.children || category.children.length === 0;
}

export function PhonemeSelector({
  categories,
  selectedIds,
  onSelect,
  className = "",
}: PhonemeSelectorProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function findParentIds(
    tree: Category[],
    id: string,
    path: string[] = [],
  ): string[] {
    for (const node of tree) {
      if (node.id === id) return path;
      if (node.children) {
        const found = findParentIds(node.children, id, [...path, node.id]);
        if (found.length) return found;
      }
    }
    return [];
  }

  function findDescendantIds(category: Category): string[] {
    let ids: string[] = [];
    if (category.children && category.children.length > 0) {
      for (const child of category.children) {
        ids.push(child.id, ...findDescendantIds(child));
      }
    }
    return ids;
  }

  const toggleExpand = (categoryId: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedIds(newExpanded);
  };

  const handleSelect = (e: React.MouseEvent, category: Category) => {
    e.stopPropagation();
    const isSelected = selectedIds.includes(category.id);

    if (isSelected) {
      const descendants = findDescendantIds(category);
      const idsToRemove = new Set([category.id, ...descendants]);
      onSelect(selectedIds.filter((id) => !idsToRemove.has(id)));
    } else {
      // Select this node and all its parents
      const parentIds = findParentIds(categories, category.id);
      const newSelected = Array.from(
        new Set([...selectedIds, ...parentIds, category.id]),
      );
      onSelect(newSelected);
    }
  };
  const renderCategory = (category: Category, level = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedIds.has(category.id);
    const isSelected = selectedIds.includes(category.id);

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
            } else {
              handleSelect(
                {
                  stopPropagation: () => {},
                  preventDefault: () => {},
                } as unknown as React.MouseEvent,
                category,
              );
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
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={isSelected}
              onClick={(e) => handleSelect(e, category)}
              readOnly
            />
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
