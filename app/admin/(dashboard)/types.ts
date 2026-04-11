export type Category = {
  id: number;
  name: string;
  sortOrder: number;
};

export type CatalogItem = {
  id: number;
  name: string;
  description: string;
  image: string;
  createdAt: string;
  categoryId: number | null;
  category: { id: number; name: string } | null;
};

export type SocialLink = {
  id: number;
  label: string;
  url: string;
  icon: string;
  sortOrder: number;
};
