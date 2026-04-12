export type Category = {
  id: number;
  name: string;
  sortOrder: number;
};

export type CatalogItemImage = {
  id: number;
  catalogItemId: number;
  url: string;
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
  images?: CatalogItemImage[];
};

export type SocialLink = {
  id: number;
  label: string;
  url: string;
  icon: string;
  sortOrder: number;
};
