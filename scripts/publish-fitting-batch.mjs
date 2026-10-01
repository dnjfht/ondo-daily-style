// Kaggle에서 만든 ondo_fitting_results.zip(압축 해제한 폴더)을 한 번에 발행합니다.
// 사용법 (PowerShell):
//   node --env-file=.env.local scripts/publish-fitting-batch.mjs --dir "C:\\Users\\...\\results"
// 필요한 환경변수: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (로컬에서만)
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, v, i, a) => (v.startsWith("--") ? [...acc, [v.slice(2), a[i + 1]]] : acc), []));
const dir = resolve(args.dir ?? "results");
const modelVersion = args["model-version"] ?? "catvton-kaggle-v1";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL 및 SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.");

function parseCsv(text) {
  const [head, ...lines] = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  const cols = head.split(",");
  return lines.map((line) => {
    const cells = []; let cur = ""; let quoted = false;
    for (const ch of line) { if (ch === '"') quoted = !quoted; else if (ch === "," && !quoted) { cells.push(cur); cur = ""; } else cur += ch; }
    cells.push(cur);
    return Object.fromEntries(cols.map((c, i) => [c, cells[i]]));
  });
}

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const rows = parseCsv(await readFile(join(dir, "manifest.csv"), "utf8"));
let ok = 0, fail = 0;
for (const row of rows) {
  try {
    const bytes = await readFile(join(dir, row.file));
    const objectPath = `${row.body}/${row.tone}/${row.variant_id}/${modelVersion}.png`;
    const { error: upErr } = await supabase.storage.from("fitting-results").upload(objectPath, bytes, { contentType: "image/png", upsert: true });
    if (upErr) throw upErr;
    const { data: pub } = supabase.storage.from("fitting-results").getPublicUrl(objectPath);
    const { error: dbErr } = await supabase.from("fitting_results").upsert({
      body_type: row.body, tone: row.tone, variant_id: row.variant_id, product_id: row.product_id,
      model_version: modelVersion, status: "ready", image_url: pub.publicUrl, generator: "kaggle-catvton", generated_at: new Date().toISOString(),
    }, { onConflict: "body_type,tone,variant_id,model_version" });
    if (dbErr) throw dbErr;
    ok++; if (ok % 25 === 0) console.log(`${ok}/${rows.length} 발행`);
  } catch (error) { fail++; console.error("실패", row.job_id, error instanceof Error ? error.message : error); }
}
console.log(`완료: 성공 ${ok}장, 실패 ${fail}장`);
