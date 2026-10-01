import { createClient } from "@supabase/supabase-js";
import { basename, extname, resolve } from "node:path";
import { readFile } from "node:fs/promises";

function readArgs(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || !value) throw new Error("인수가 올바르지 않습니다.");
    args.set(key.slice(2), value);
  }
  return args;
}

function required(args, name) {
  const value = args.get(name);
  if (!value) throw new Error(`--${name} 값이 필요합니다.`);
  return value;
}

function contentType(fileName) {
  const extension = extname(fileName).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  throw new Error("PNG, JPG, JPEG 또는 WEBP 결과만 업로드할 수 있습니다.");
}

async function main() {
  const args = readArgs(process.argv.slice(2));
  const file = resolve(required(args, "file"));
  const body = required(args, "body");
  const tone = required(args, "tone");
  const variantId = required(args, "variant-id");
  const productId = required(args, "product-id");
  const generator = args.get("generator") ?? "hf-zerogpu-catvton";
  const modelVersion = args.get("model-version") ?? "demo-v1";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) throw new Error("NEXT_PUBLIC_SUPABASE_URL 및 SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.");
  if (!new Set(["straight", "wave", "natural"]).has(body) || !new Set(["warm", "cool"]).has(tone)) throw new Error("body와 tone 값이 올바르지 않습니다.");

  const bytes = await readFile(file);
  const mimeType = contentType(file);
  const safeName = basename(file).replace(/[^a-zA-Z0-9._-]/g, "-");
  const objectPath = `${body}/${tone}/${variantId}/${Date.now()}-${safeName}`;
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error: uploadError } = await supabase.storage.from("fitting-results").upload(objectPath, bytes, { contentType: mimeType, upsert: false });
  if (uploadError) throw uploadError;

  const { data: publicUrl } = supabase.storage.from("fitting-results").getPublicUrl(objectPath);
  const { error: databaseError } = await supabase.from("fitting_results").upsert({
    body_type: body,
    tone,
    variant_id: variantId,
    product_id: productId,
    model_version: modelVersion,
    status: "ready",
    image_url: publicUrl.publicUrl,
    generator,
    generated_at: new Date().toISOString(),
  }, { onConflict: "body_type,tone,variant_id,model_version" });
  if (databaseError) throw databaseError;

  console.log(`피팅 캐시를 발행했습니다: ${publicUrl.publicUrl}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
