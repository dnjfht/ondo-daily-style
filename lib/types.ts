export type Situation = "daily" | "work" | "date";

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
};
