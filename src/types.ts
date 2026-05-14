export interface GroceryProduct {
  id: string;
  name: string;
  price?: number;
  measureCode?: string;
  tags?: { name: string; value: string }[];
}