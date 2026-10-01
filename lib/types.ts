export type Situation = "daily" | "work" | "date";
export type ProductCategory = "outer" | "top" | "bottom" | "shoes" | "accessory";

export type ProductLink = {
  label: string;
  merchant: string;
  url: string;
  category?: ProductCategory;
};

export type CatalogProductCategory = "outer" | "top" | "bottom" | "shoes" | "bag";

export type CatalogProductRecommendation = {
  productId: string;
  sourceProductId: string;
  variantId: string;
  category: CatalogProductCategory;
  name: string;
  subtype: string;
  colorName: string;
  imagePath: string;
  score: number;
  reasons: string[];
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
  catalogProducts?: CatalogProductRecommendation[];
};

export type SavedLookSnapshot = Pick<Outfit, "id" | "title" | "subtitle" | "styleTag" | "situation" | "imageUrl" | "colors" | "reason" | "items"> & {
  lookKey: string;
  products: ProductLink[];
  stylePreferences: {
    mood: string;
    silhouette: string;
    colorDepth: string;
    activity: string;
  };
  savedAt: string;
  weather: {
    city: string;
    temperature: number;
    apparent: number;
    humidity: number;
    wind: number;
  };
};

export type SavedLookKeyEntry = { canonicalKey: string; storedKey: string };
export type SavedLookRecord = SavedLookSnapshot & { databaseKey: string };
