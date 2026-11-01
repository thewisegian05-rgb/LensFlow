// Every call-to-action button goes to the login page.
// Plain link by default; pass onLogin={() => navigate("/login")} to use your router instead.
export default function LoginButton({ href, onLogin, className = "", children }) {
  return onLogin ? (
    <button type="button" onClick={onLogin} className={className}>{children}</button>
  ) : (
    <a href={href} className={className}>{children}</a>
  );
}