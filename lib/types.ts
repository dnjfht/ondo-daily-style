export type Situation = "daily" | "work" | "date";
export type ProductCategory = "outer" | "top" | "bottom" | "shoes" | "accessory";

export type ProductLink = {
  label: string;
  merchant: string;
  url: string;
  category?: ProductCategory;
};

export type Outfit = {
  id: string;
  title: string;
  subtitle: string;
  styleTag: string;
  situation: Situation;
  minTemp: number;
  maxTemp: number;
  imageUrl: string;
  colors: string[];
  reason: string;
  items: string[];
  products?: ProductLink[];
};
