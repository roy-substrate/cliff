import { schedule, fmtDays } from "../src/lib/cliff";
const n = (id: string, est: number, wmin: number, wmax: number, deps: string[] = []) => ({ id, title: id, actor: "developer" as const, est_minutes: est, wait_days_min: wmin, wait_days_max: wmax, wait_unknown: false, depends_on: deps, claim_ids: [] });
const s = schedule([
  n("register", 60, 0, 0),
  n("privacy", 240, 0, 0, ["register"]),
  n("video", 480, 0, 0, ["register"]),
  n("submit", 30, 0, 0, ["privacy", "video"]),
  n("review", 0, 14, 42, ["submit"]),
  n("ship", 30, 0, 0, ["review"]),
  n("cycle", 10, 0, 0, ["ghost", "cycle"]),
]);
console.log(s.nodes.map((x) => `${x.id.padEnd(9)} start ${x.startMin.toFixed(2)}-${x.startMax.toFixed(2)} fin ${x.finishMin.toFixed(2)}-${x.finishMax.toFixed(2)} ${x.critical ? "CRIT" : ""}`).join("\n"));
console.log("total", fmtDays(s.totalMin), "to", fmtDays(s.totalMax), "| fmt:", fmtDays(0.2), fmtDays(3), fmtDays(30));
