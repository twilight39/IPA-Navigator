// Define the interface for the raw category data
interface Category {
  _creationTime: number;
  _id: string;
  created_at: number;
  name: string;
  sort_order: number;
  type: string;
  updated_at: number;
  parentId?: string; // Optional parentId for nested categories
  children?: Category[]; // Added during tree building
}

// Define the interface for the stripped/final category output
interface StrippedCategory {
  id: string;
  name: string;
  sort_order: number;
  children?: StrippedCategory[];
}

/**
 * Builds a hierarchical tree structure from a flat list of categories.
 * Categories are nested under their parents and sorted by 'sort_order'.
 * @param categories A flat array of category objects.
 * @returns An array of root category objects, each potentially containing a 'children' array.
 */
export function buildCategoryTree(categories: Category[]): Category[] {
  const categoryMap = new Map<string, Category>();
  const rootCategories: Category[] = [];

  // 1. Populate map and initialize 'children' array for each category
  //    Use a deep copy to ensure we're not modifying the original input array directly.
  categories.forEach((cat) => {
    categoryMap.set(cat._id, { ...cat, children: [] });
  });

  // 2. Assign children to their respective parents
  categoryMap.forEach((currentCat) => {
    if (currentCat.parentId) {
      const parent = categoryMap.get(currentCat.parentId);
      if (parent) {
        parent.children!.push(currentCat);
      }
      // Handle cases where a parentId exists but the parent itself is not found (e.g., filtered out)
      // For this scenario, we might just ignore it or add it to roots if desired.
      // Current implementation ignores it.
    } else {
      rootCategories.push(currentCat);
    }
  });

  // 3. Recursively sort children by 'sort_order'
  function sortAndRecurse(categoryList: Category[]) {
    categoryList.sort((a, b) => a.sort_order - b.sort_order);
    categoryList.forEach((cat) => {
      if (cat.children && cat.children.length > 0) {
        sortAndRecurse(cat.children);
      }
    });
  }

  sortAndRecurse(rootCategories);
  return rootCategories;
}

/**
 * Recursively strips internal fields from category objects,
 * preparing them for client-side consumption.
 * @param categories An array of category objects (potentially hierarchical).
 * @returns A new array of category objects with only essential fields.
 */
export function stripCategoryFields(
  categories: Category[],
): StrippedCategory[] {
  return categories.map((cat) => {
    const stripped: StrippedCategory = {
      id: cat._id,
      name: cat.name,
      sort_order: cat.sort_order,
    };
    if (cat.children && cat.children.length > 0) {
      stripped.children = stripCategoryFields(cat.children); // Recursively strip children
    }
    return stripped;
  });
}
