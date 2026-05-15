import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../../store/store";
import { useEffect, useState, type ChangeEvent } from "react";
import { getUser, updateUser } from "../slices/userSlice";
import { Mail, UserCircle, UserCog, BadgeCheck, ShieldCheck, Edit3, Save, X } from "lucide-react";

const Profile = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { user } = useSelector((state: RootState) => state.user) as any;

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: ""
    });

    useEffect(() => {
        dispatch(getUser({id: null}));
    }, [dispatch]);

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || ""
            });
        }
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
        setFormData({
            name: user.name
        });
    };

    return (
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-8 mt-12 mb-12 transition-all duration-300 hover:shadow-2xl">
            {/* Header Section */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <UserCircle className="w-20 h-20 text-indigo-600 transition-transform duration-300 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-100 to-transparent opacity-0 group-hover:opacity-20 rounded-full transition-opacity duration-300"></div>
                    </div>
                    <div>
                        {isEditing ? (
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="text-3xl font-bold text-gray-900 border-b-2 border-indigo-300 focus:outline-none focus:border-indigo-500 transition-colors duration-200 bg-transparent py-1"
                                placeholder="Enter your name"
                                aria-label="User name"
                            />
                        ) : (
                            <>
                                <h2 className="text-3xl font-bold text-gray-900 tracking-tight">{user.name}</h2>
                                <p className="text-gray-500 text-sm mt-1">@{user.username}</p>
                            </>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                    {!isEditing ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 text-sm font-medium cursor-pointer"
                            aria-label="Edit profile"
                        >
                            <Edit3 className="w-5 h-5 mr-2" /> Edit
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={handleSave}
                                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 text-sm font-medium cursor-pointer"
                                aria-label="Save profile"
                            >
                                <Save className="w-5 h-5 mr-2" /> Save
                            </button>
                            <button
                                onClick={handleCancel}
                                className="flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 text-sm font-medium cursor-pointer"
                                aria-label="Cancel editing"
                            >
                                <X className="w-5 h-5 mr-2" /> Cancel
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Profile Details */}
            <div className="space-y-6">
                {/* Email */}
                <div className="flex items-center text-gray-700 group">
                    <Mail className="w-6 h-6 mr-4 text-indigo-500 transition-transform duration-200 group-hover:scale-110" />
                    <span className="text-gray-900">{user.email}</span>
                </div>

                {/* Username */}
                <div className="flex items-center text-gray-700 group">
                    <UserCog className="w-6 h-6 mr-4 text-indigo-500 transition-transform duration-200 group-hover:scale-110" />
                    <span className="capitalize text-gray-900">Username: {user.username}</span>

                </div>

                {/* Role */}
                <div className="flex items-center text-gray-700 group">
                    <BadgeCheck className="w-6 h-6 mr-4 text-indigo-500 transition-transform duration-200 group-hover:scale-110" />
                    <span className="capitalize text-gray-900">Role: {user.user_type}</span>
                </div>

                {/* Account Status */}
                <div className="flex items-center text-gray-700 group">
                    <span className="mr-4 font-medium text-gray-900">Account Active:</span>
                    <span className={user.isActive ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                        {user.isActive ? "Yes" : "No"}
                    </span>
                </div>

                {/* Join Date */}
                <div className="flex items-center text-gray-700 group">
                    <span className="mr-4 font-medium text-gray-900">Joined:</span>
                    <span className="text-gray-900">{new Date(user.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}</span>
                </div>
            </div>
        </div>
    );
};

export default Profile;