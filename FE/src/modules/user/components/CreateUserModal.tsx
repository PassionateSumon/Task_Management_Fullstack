import { useEffect, useRef, useState, type FormEvent } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AlertTriangle, UserPlus, X } from "lucide-react";
import type { AppDispatch, RootState } from "../../../store/store";
import { createUser, getWorkspaceUsers } from "../slices/userSlice";
import { getStrictPasswordError } from "../../../common/validation/password";

/**
 * Admin-created user form.
 *
 * There is deliberately no workspace selector and no privilege-tier field: the
 * workspace comes from the caller's session on the server, and privilege is
 * conveyed purely by the chosen role. Omitting a role assigns the workspace's
 * default member role, which is what the backend does as well.
 */
const CreateUserModal = ({
  isOpen,
  handleClose,
}: {
  isOpen: boolean;
  handleClose: () => void;
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const roles = useSelector((state: RootState) => state.role.roles);
  const error = useSelector((state: RootState) => state.user.error);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState<string>("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const reset = () => {
    setName("");
    setEmail("");
    setPassword("");
    setRoleId("");
    setLocalError(null);
    setSubmitting(false);
  };

  useEffect(() => {
    if (!isOpen) reset();
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        reset();
        handleClose();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleClose]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!name.trim()) return setLocalError("Name is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return setLocalError("Enter a valid email address.");

    // Mirrors the backend's strict password rules so the user gets the
    // requirement immediately rather than a round-trip 400.
    const passwordProblem = getStrictPasswordError(password);
    if (passwordProblem) return setLocalError(passwordProblem);

    setSubmitting(true);
    const result = await dispatch(
      createUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        ...(roleId ? { role_id: Number(roleId) } : {}),
      })
    );

    setSubmitting(false);

    if (createUser.fulfilled.match(result)) {
      await dispatch(getWorkspaceUsers());
      reset();
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center px-4">
      <div
        ref={ref}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-[#5A67D8]" />
            </div>
            <h2 className="text-sm font-bold text-gray-800">Add User</h2>
          </div>
          <button
            onClick={() => {
              reset();
              handleClose();
            }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Cooper"
              className="w-full px-3 py-2.5 bg-[#F3F4FE] border border-transparent rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5A67D8]/20 focus:border-[#5A67D8] transition-all"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@company.com"
              className="w-full px-3 py-2.5 bg-[#F3F4FE] border border-transparent rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5A67D8]/20 focus:border-[#5A67D8] transition-all"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Temporary Password
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 10 characters"
              className="w-full px-3 py-2.5 bg-[#F3F4FE] border border-transparent rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5A67D8]/20 focus:border-[#5A67D8] transition-all"
              required
            />
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Needs an uppercase letter, a lowercase letter, a number and a
              symbol. Share it securely; the user should change it after their
              first sign-in.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Role
            </label>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#F3F4FE] border border-transparent rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#5A67D8]/20 focus:border-[#5A67D8] transition-all"
            >
              <option value="">Default member role</option>
              {roles?.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                  {role.is_system ? " (system)" : ""}
                </option>
              ))}
            </select>
          </div>

          {(localError || error) && (
            <div className="flex items-start gap-2 text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2.5">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              <p className="text-xs font-medium">{localError || error}</p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-[#5A67D8] hover:bg-[#434190] disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer active:scale-95"
            >
              {submitting ? "Creating..." : "Create User"}
            </button>
            <button
              type="button"
              onClick={() => {
                reset();
                handleClose();
              }}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUserModal;
