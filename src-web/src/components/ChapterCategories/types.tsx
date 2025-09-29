export interface Category {
  id: string;
  name: string;
  sort_order: number;
  children?: Category[];
  parent_id?: string;
}

export interface CategoryWithAssignment extends Category {
  auto_assigned?: boolean;
  confidence?: number;
}

export interface CategorySuggestion {
  category: Category;
  reason: string;
  confidence: number;
}

export interface CategoryTreeNode extends Category {
  level: number;
  expanded?: boolean;
}

// Mock data for development - replace with actual API data
export const mockCategories: Category[] = [
  {
    id: "k972gn9x9htemq1rbdqq0rf9cd7r96gj",
    name: "Vowels",
    sort_order: 0,
    children: [
      {
        id: "k970m3mwr3xv1aa086nar7v96h7rg6n1",
        name: "Front Vowels",
        sort_order: 0,
        parent_id: "k972gn9x9htemq1rbdqq0rf9cd7r96gj",
      },
      {
        id: "k9721ka66w2sgwkz0v83hn8yqd7rgwvv",
        name: "Central Vowels",
        sort_order: 1,
        parent_id: "k972gn9x9htemq1rbdqq0rf9cd7r96gj",
      },
      {
        id: "k977yrt7hwgngac3qg6svpt7217rgd0f",
        name: "Back Vowels",
        sort_order: 2,
        parent_id: "k972gn9x9htemq1rbdqq0rf9cd7r96gj",
      },
    ],
  },
  {
    id: "k979q2m6z046z2vy68qk5j2yhn7r8973",
    name: "Consonants",
    sort_order: 1,
    children: [
      // ... other consonant subcategories
    ],
  },
];
