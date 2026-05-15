import { useState, useEffect, type ChangeEvent } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { resetPassword, clearError } from "../slices/AuthSlice";
import type { RootState, AppDispatch } from "../../../store/store";
import { toast } from "react-toastify";
import { Mail, Lock, KeyRound } from "lucide-react";
import { Hash } from "../../../common/utils/Hash";
import { getStrictPasswordError } from "../../../common/validation/password";

interface ResetPasswordForm {
  emailOrUsername: string;
  tempPassword: string;
  newPassword: string;
}

const ResetPassword = () => {
  const [formData, setFormData] = useState<ResetPasswordForm>({
    emailOrUsername: "",
    tempPassword: "",
    newPassword: "",
  });

  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (error) {
      toast.error(error, { toastId: "reset-password-error" });
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>, key: keyof ResetPasswordForm) => {
    setFormData((prev) => ({
      ...prev,
      [key]: e.target.value,
    }));
  };

  const handleSubmit = async () => {
    const { emailOrUsername, tempPassword, newPassword } = formData;

    if (!emailOrUsername || !tempPassword || !newPassword) {
      toast.error("All fields are required.", { toastId: "reset-password-validation" });
      return;
    }

    const pwdErr = getStrictPasswordError(newPassword);
    if (pwdErr) {
      toast.error(pwdErr, { toastId: "reset-password-validation" });
      return;
    }

    // const hashedTemppassword = await Hash.hashPassword(tempPassword);
    const hashedNewPassword = await Hash.hashPassword(newPassword);

    const result = await dispatch(
      resetPassword({ emailOrUsername, tempPassword, newPassword: hashedNewPassword })
    );

    if (resetPassword.fulfilled.match(result)) {
      setFormData({ emailOrUsername: "", tempPassword: "", newPassword: "" });
      toast.success("Password reset successful! Please login.", {
        toastId: "reset-password-success",
      });
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl space-y-6">
        <h2 className="text-3xl font-bold text-center text-indigo-700">Reset Password</h2>

        {/* Email or Username */}
        <div className="space-y-1">
          <label htmlFor="emailOrUsername" className="block text-sm font-medium text-gray-700">
            Email or Username
          </label>
          <div className="flex items-center border border-gray-300 rounded-lg p-2 focus-within:ring-2 focus-within:ring-indigo-500">
            <Mail className="w-5 h-5 text-gray-500 mr-2" />
            <input
              id="emailOrUsername"
              type="text"
              value={formData.emailOrUsername}
              onChange={(e) => handleChange(e, "emailOrUsername")}
              className="w-full outline-none text-sm"
              placeholder="you@example.com"
            />
          </div>
        </div>

        {/* Temporary Password */}
        <div className="space-y-1">
          <label htmlFor="tempPassword" className="block text-sm font-medium text-gray-700">
            Temporary Password
          </label>
          <div className="flex items-center border border-gray-300 rounded-lg p-2 focus-within:ring-2 focus-within:ring-indigo-500">
            <KeyRound className="w-5 h-5 text-gray-500 mr-2" />
            <input
              id="tempPassword"
              type="password"
              value={formData.tempPassword}
              onChange={(e) => handleChange(e, "tempPassword")}
              className="w-full outline-none text-sm"
              placeholder="Temporary password"
            />
          </div>
        </div>

        {/* New Password */}
        <div className="space-y-1">
          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
            New Password
          </label>
          <div className="flex items-center border border-gray-300 rounded-lg p-2 focus-within:ring-2 focus-within:ring-indigo-500">
            <Lock className="w-5 h-5 text-gray-500 mr-2" />
            <input
              id="newPassword"
              type="password"
              value={formData.newPassword}
              onChange={(e) => handleChange(e, "newPassword")}
              className="w-full outline-none text-sm"
              placeholder="10+ chars with upper, lower, number & symbol"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className={`w-full text-white font-semibold py-3 rounded-lg transition shadow-md ${loading
            ? "bg-indigo-300 cursor-not-allowed"
            : "bg-indigo-600 hover:bg-indigo-700"
            }`}
        >
          {loading ? "Resetting..." : "Reset Password"}
        </button>

        {/* Link to Login */}
        <p className="text-center text-sm text-gray-600">
          Back to{" "}
          <Link to="/login" className="text-indigo-600 font-semibold hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
