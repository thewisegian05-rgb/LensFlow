import { FaStar, FaRegStar } from "react-icons/fa";

export default function Stars({ value = 0, size = "text-sm" }) {
  const filled = Math.round(Number(value) || 0);
  return (
    <span className={`inline-flex items-center gap-0.5 text-amber-400 ${size}`}>
      {[1, 2, 3, 4, 5].map((n) =>
        n <= filled ? <FaStar key={n} /> : <FaRegStar key={n} className="text-slate-600" />
      )}
    </span>
  );
}