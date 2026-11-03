import { publicUrl } from "../../utils/portalUrls";

export default function Avatar({ path, name, className = "h-20 w-20" }) {
  const url = publicUrl(path);
  const initials = (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return url ? (
    <img src={url} alt={name} className={`${className} rounded-2xl object-cover`} />
  ) : (
    <div
      className={`${className} flex items-center justify-center rounded-2xl bg-sky-500/10 text-xl font-bold text-sky-400`}
    >
      {initials}
    </div>
  );
}