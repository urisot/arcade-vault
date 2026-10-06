import Link from "next/link";
import type { Category } from "@/lib/data/games";
import type { GlobalRow } from "@/lib/data/scores";

const FILTERS: { value: Category | null; label: string }[] = [
  { value: null, label: "TODAS" },
  { value: "ARCADE", label: "ARCADE" },
  { value: "PUZZLE", label: "PUZZLE" },
  { value: "SHOOTER", label: "SHOOTER" },
  { value: "VERSUS", label: "VERSUS" },
];

// Ranking global por jugador: suma de mejores scores por juego. El filtro cambia la URL (?cat=).
export default function HallOfFame({
  category,
  rows,
}: {
  category: Category | null;
  rows: GlobalRow[];
}) {
  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA</p>
      </div>

      <div className="hall-tabs">
        {FILTERS.map((f) => (
          <Link
            key={f.label}
            href={f.value ? `/salon?cat=${f.value}` : "/salon"}
            className={"chip" + (category === f.value ? " active" : "")}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="mono" style={{ textAlign: "center", padding: 60, color: "var(--ink-faint)", letterSpacing: "0.16em" }}>
          SIN PUNTUACIONES AÚN
        </div>
      ) : (
        <div className="hall-table global">
          <div className="th">
            <div>RANGO</div>
            <div>JUGADOR</div>
            <div>PUNTUACIÓN TOTAL</div>
          </div>
          {rows.map((r, i) => (
            <div
              key={r.name}
              className={"tr" + (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
              <div className="pl">{r.name}</div>
              <div className="sc">{r.total.toLocaleString("es-ES")}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/" className="btn lg">VOLVER A LA BIBLIOTECA</Link>
      </div>
    </div>
  );
}
