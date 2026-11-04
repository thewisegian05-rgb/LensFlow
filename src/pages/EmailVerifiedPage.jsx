import { Link } from "react-router-dom";
import { FaCameraRetro, FaCheck } from "react-icons/fa";

function EmailVerifiedPage() {
  return (
    <div className="login-page min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="login-card text-center">

          {/* LensFlow Branding */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <FaCameraRetro className="text-3xl text-sky-500" />
            <h1 className="text-2xl font-bold">
              LensFlow Studio
            </h1>
          </div>

          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
              <FaCheck className="text-4xl text-emerald-500" />
            </div>
          </div>

          {/* Confirmation Message */}
          <h2 className="text-2xl font-bold mb-3">
            Email Verified!
          </h2>

          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
            Your email address has been successfully verified.
            Your LensFlow account is now ready!
          </p>

          {/* Continue Button */}
          <Link
            to="/login"
            className="login-btn flex items-center justify-center w-full no-underline"
          >
            Continue to Sign In
          </Link>

          <p className="text-xs text-slate-400 mt-6">
            © 2026 LensFlow Studio Management
          </p>

        </div>
      </div>
    </div>
  );
}

export default EmailVerifiedPage;