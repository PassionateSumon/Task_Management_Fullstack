import { useEffect, useState, type FormEvent } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AlertTriangle, KeyRound, ShieldCheck } from "lucide-react";
import type { AppDispatch, RootState } from "../../../store/store";
import { changePassword } from "../slices/AuthSlice";
import { getStrictPasswordError } from "../../../common/validation/password";

const inputClass =
  "w-full px-3 py-2.5 bg-[#F3F4FE] border border-transparent rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5A67D8]/20 focus:border-[#5A67D8] transition-all";

const ChangePassword = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((state: RootState) => state.auth);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDone(false);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!currentPassword)
      return setLocalError("Enter your current password.");

    const passwordProblem = getStrictPasswordError(newPassword);
    if (passwordProblem) return setLocalError(passwordProblem);

    if (newPassword === currentPassword)
      return setLocalError("The new password must differ from the current one.");

    if (newPassword !== confirmNewPassword)
      return setLocalError("The new passwords do not match.");

    const result = await dispatch(
      changePassword({ currentPassword, newPassword, confirmNewPassword })
    );

    if (changePassword.fulfilled.match(result)) {
      // The server revoked every session for this account, so the store has
      // already dropped the session and the router will bounce to /login.
      setDone(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    }
  };

  return (
    <div className="h-[94vh] overflow-y-auto thin-scrollbar bg-[#F3F4FE] flex justify-center px-6 py-10">
      <div className="w-full max-w-xl flex flex-col gap-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-[#5A67D8] to-[#434190]" />

          <div className="px-6 pt-6 pb-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                <KeyRound className="w-4.5 h-4.5 text-[#5A67D8]" />
              </div>
              <h2 className="text-lg font-bold text-gray-800 tracking-tight">
                Change Password
              </h2>
            </div>
            <p className="text-xs text-gray-400 ml-12">
              You will be signed out of every device after changing it.
            </p>

            {done ? (
              <div className="mt-6 flex items-start gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-3">
                <ShieldCheck size={15} className="mt-0.5 flex-shrink-0" />
                <p className="text-xs font-medium leading-relaxed">
                  Password updated. All sessions were revoked, so sign in again
                  with your new password.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="mt-6 flex flex-col gap-4"
              >
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Your current password"
                    className={inputClass}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 10 characters"
                    className={inputClass}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Repeat the new password"
                    className={inputClass}
                    required
                  />
                </div>

                {(localError || error) && (
                  <div className="flex items-start gap-2 text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2.5">
                    <AlertTriangle
                      size={14}
                      className="mt-0.5 flex-shrink-0"
                    />
                    <p className="text-xs font-medium">
                      {localError || error}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#5A67D8] hover:bg-[#434190] disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer active:scale-[0.99]"
                >
                  {loading ? "Updating..." : "Update Password"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
