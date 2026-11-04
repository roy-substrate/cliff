import dotenv from "dotenv";
dotenv.config({ path: ".env.local", quiet: true });
import { CostMeter } from "../src/lib/llm";
import * as S from "../src/pipeline/stages";

const meter = new CostMeter();
const r = await S.discover({ name: "Notion", homepage: "https://www.notion.so" }, meter, (e) => console.log("tool event:", e.kind, e.kind === "search" ? e.query : e.url), undefined);
console.log(JSON.stringify(r, null, 2));
console.log("cost", meter.usd.toFixed(3));
