import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../../store/store";
import { useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import { getUser, updateUser } from "../slices/userSlice";
import { Mail, UserCog, BadgeCheck, Edit3, Save, X, Calendar, Shield } from "lucide-react";

const Profile = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.user) as any;

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: "" });

  useEffect(() => {
    dispatch(getUser({ id: null }));
  }, [dispatch]);

  useEffect(() => {
    if (user) setFormData({ name: user.name || "" });
  }, [user]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    dispatch(updateUser(formData));
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({ name: user.name });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") handleCancel();
    };

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div className="h-[94vh] overflow-y-auto thin-scrollbar bg-[#F3F4FE] flex justify-center px-6 py-10">
      <div className="w-full max-w-xl flex flex-col gap-4">

        {/* Hero Card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Banner */}
          <div className="h-28 bg-gradient-to-r from-[#5A67D8] to-[#434190]" />

          {/* Avatar row — sits below banner, no negative margin tricks */}
          <div className="px-6 pt-0">
            <div className="flex items-end justify-between">
              {/* Avatar — pulled up with negative margin safely inside padding */}
              <div
                className="w-20 h-20 rounded-2xl bg-white shadow-lg flex items-center justify-center border-4 border-white -mt-10 z-10"
              >
                <span className="text-2xl font-bold text-[#5A67D8] select-none">
                  {initials}
                </span>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-3">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#5A67D8] text-white rounded-lg hover:bg-[#434190] transition-colors text-sm font-medium cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" /> Edit Profile
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleSave}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#48BB78] text-white rounded-lg hover:bg-[#38A169] transition-colors text-sm font-medium cursor-pointer"
                    >
                      <Save className="w-4 h-4" /> Save
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium cursor-pointer"
                    >
                      <X className="w-4 h-4" /> Cancel
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Name & username */}
            <div className="mt-3 pb-6">
              {isEditing ? (
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  className="text-xl font-bold text-gray-900 border-b-2 border-[#5A67D8] focus:outline-none bg-transparent pb-1 w-full"
                  placeholder="Enter your name"
                />
              ) : (
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                  {user.name}
                </h2>
              )}
              <p className="text-sm text-gray-400 mt-1">@{user.username}</p>
            </div>
          </div>
        </div>

        {/* Details Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Account Details
          </p>

          <div className="divide-y divide-gray-50">
            <DetailRow
              icon={<Mail className="w-4 h-4 text-[#5A67D8]" />}
              label="Email"
              value={user.email}
            />
            <DetailRow
              icon={<UserCog className="w-4 h-4 text-[#5A67D8]" />}
              label="Username"
              value={`@${user.username}`}
            />
            <DetailRow
              icon={<BadgeCheck className="w-4 h-4 text-[#5A67D8]" />}
              label="Role"
              value={
                <span className="capitalize inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-[#5A67D8]">
                  {user.user_type}
                </span>
              }
            />
            <DetailRow
              icon={<Shield className="w-4 h-4 text-[#5A67D8]" />}
              label="Account Status"
              value={
                user.isActive ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                    Inactive
                  </span>
                )
              }
            />
            <DetailRow
              icon={<Calendar className="w-4 h-4 text-[#5A67D8]" />}
              label="Member Since"
              value={new Date(user.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            />
          </div>
        </div>

      </div>
    </div>
  );
};

const DetailRow = ({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) => (
  <div className="flex items-center justify-between py-3.5">
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <span className="text-sm text-gray-500">{label}</span>
    </div>
    <span className="text-sm font-medium text-gray-800">{value}</span>
  </div>
);

export default Profile;