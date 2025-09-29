import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api.js";

export interface CategoryOption {
  name: string;
  _id: string;
}

export interface DifficultyOption {
  name: string;
  _id: string;
}

export interface ChapterOptions {
  categories: CategoryOption[];
  difficulties: DifficultyOption[];
}

export function useChapterOptions(): ChapterOptions {
  const categories = useQuery(api.functions.chapters.getCategories);
  const difficulties = useQuery(api.functions.chapters.getDifficulties);

  return {
    categories: categories,
    difficulties: difficulties,
  };
}
