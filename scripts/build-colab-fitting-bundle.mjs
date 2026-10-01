import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = process.cwd();
const bundleRoot = join(root, "output", "ondo-colab-fitting-inputs");
const selectedItems = [
  { category: "outer", productId: "b40ecde0-3107-481a-9ac3-e0d5919cbbc8", variantId: "316b39fe-d56a-48cd-bdcb-8affca442e54", sourceProductId: "cropped-short-trench", name: "크롭 숏 트렌치 자켓", colorName: "파우더 블루", imagePath: "/catalog-v3/outer/cropped-short-trench/161.webp" },
  { category: "outer", productId: "75afa000-6d04-4655-b1b6-990bea3535a3", variantId: "bea4ed66-9fda-470d-818b-3d4033e655ee", sourceProductId: "contrast-boucle-cropped-cardigan", name: "배색 부클 크롭 가디건", colorName: "세이지 그린", imagePath: "/catalog-v3/outer/contrast-boucle-cropped-cardigan/106.webp" },
  { category: "outer", productId: "1c909bd9-a92f-4162-8bc9-26c66468e120", variantId: "04856859-4e7f-456f-989a-f79fccc59927", sourceProductId: "cable-knit-button-cardigan", name: "꽈배기 니트 버튼 가디건", colorName: "카멜", imagePath: "/catalog-v3/outer/cable-knit-button-cardigan/092.webp" },
  { category: "top", productId: "f4c9ba09-8063-48ab-9684-3cf934c49bb6", variantId: "82a0c559-63e1-45e3-a0e6-dc02990355bf", sourceProductId: "off-shoulder-knit-top", name: "오프숄더 골지 니트 탑", colorName: "레몬 옐로우", imagePath: "/catalog-v3/top/off-shoulder-knit-top/224.webp" },
  { category: "top", productId: "2a4757a0-b855-4a7c-86a1-7907fab5dcb9", variantId: "14bef416-9800-49c4-9046-2424d28532b0", sourceProductId: "ribbed-turtleneck-knit", name: "골지 터틀넥 니트", colorName: "페일 블루", imagePath: "/catalog-v3/top/ribbed-turtleneck-knit/213.webp" },
  { category: "top", productId: "98f02309-b36a-4e26-b79c-a3fb36cbf8a6", variantId: "fc384376-ca90-4f23-8a27-d12503e49875", sourceProductId: "asymmetric-cowl-knit-top", name: "언밸런스 카울넥 니트 탑", colorName: "파우더 블루", imagePath: "/catalog-v3/top/asymmetric-cowl-knit-top/123.webp" },
  { category: "bottom", productId: "bea43667-dac2-4935-acc0-929ca42ddc78", variantId: "b87077ca-5e6a-47d1-be74-a67820e2bf1e", sourceProductId: "bottom-41", name: "레이스 레이어드 미디 스커트", colorName: "세이지", imagePath: "/catalog-v3/bottom/bottom-41/245.webp" },
  { category: "bottom", productId: "1d65f582-5ba9-4617-81a3-4b62d49ff289", variantId: "f7b60dd8-8156-46c1-97b7-532d46d74839", sourceProductId: "bottom-36", name: "랩 스타일 미디 스커트", colorName: "카키", imagePath: "/catalog-v3/bottom/bottom-36/213.webp" },
  { category: "bottom", productId: "3ff83183-e07e-4e2a-b960-7aeedbbefd3d", variantId: "f0f8c45d-c5aa-4afd-b61e-da1bcd906d17", sourceProductId: "bottom-39", name: "울 블렌드 A라인 미디 스커트", colorName: "차콜", imagePath: "/catalog-v3/bottom/bottom-39/230.webp" },
];

const avatars = ["straight_cool", "wave_cool", "natural_cool", "straight_warm", "wave_warm", "natural_warm"];

async function main() {
  await rm(bundleRoot, { recursive: true, force: true });
  await mkdir(join(bundleRoot, "avatars"), { recursive: true });
  await mkdir(join(bundleRoot, "garments"), { recursive: true });
  for (const avatar of avatars) await cp(join(root, "public", "fitting", "avatars", `${avatar}_front.png`), join(bundleRoot, "avatars", `${avatar}.png`));
  await cp(join(root, "public", "fitting", "backgrounds", "rose-cafe.png"), join(bundleRoot, "rose-cafe.png"));
  for (const item of selectedItems) await cp(join(root, "public", item.imagePath), join(bundleRoot, "garments", `${item.variantId}.webp`));
  await cp(join(root, "ondo_virtual_tryon_api", "colab", "ondo_batch_runner.py"), join(bundleRoot, "ondo_batch_runner.py"));
  const jobs = avatars.flatMap((avatar) => selectedItems.map((item) => ({ ...item, avatar, avatarPath: `avatars/${avatar}.png`, garmentPath: `garments/${item.variantId}.webp`, outputPath: `results/${avatar}_${item.variantId}.png` })));
  await writeFile(join(bundleRoot, "jobs.json"), JSON.stringify({ generatedAt: new Date().toISOString(), backgroundPath: "rose-cafe.png", jobs }, null, 2));
  await writeFile(join(bundleRoot, "README.txt"), "ONDO CatVTON 비상업 시연용 입력 묶음입니다. Colab에서 ondo_batch_runner.py를 실행한 뒤 results와 results-manifest.json을 내려받으세요.\n");
  console.log(`54개 CatVTON 작업 입력을 만들었습니다: ${resolve(bundleRoot)}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
