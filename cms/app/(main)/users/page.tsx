"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/app/lib/api";
import { useAuth } from "@/app/components/AuthContext";
import { User, Email } from "@/app/types/types";

interface UpdateFormData {
  fname: string;
  mname: string;
  lname: string;
  uname: string;
  email: string;
  password: string;
  is_superuser: boolean;
}

export default function AuthorizeEmail() {
  const { user } = useAuth();
  const router = useRouter();
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  return (
    <div className="max-w-6xl mx-auto p-6">
      {editingUser && (
        <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)}>
          <UpdateForm
            user={editingUser}
            onCancel={() => setEditingUser(null)}
            onSaved={() => {
              // Refresh will be handled by the component itself
            }}
          />
        </Modal>
      )}

      <UserList onEditUser={(user) => setEditingUser(user)} />
    </div>
  );
}

interface UserListProps {
  onEditUser: (user: User) => void;
}

function UserList({ onEditUser }: UserListProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { user: currentUser } = useAuth();

  const fetchUsers = async () => {
    try {
      const usersData = await apiClient.getUsers();
      setUsers(usersData);
    } catch {
      setError("Failed to fetch users");
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this user?")) {
      try {
        await apiClient.deleteUser(id);
        setUsers((prev) => prev.filter((user) => user.id !== id));
      } catch {
        setError("Failed to delete user");
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">User List</h1>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="p-3 font-semibold text-gray-700">Name</th>
              <th className="p-3 font-semibold text-gray-700">Username</th>
              <th className="p-3 font-semibold text-gray-700">Email</th>
              <th className="p-3 font-semibold text-gray-700">Superuser</th>
              <th className="p-3 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
    {users.length > 0 ? (
      users.map((u) => (
        <tr
          key={u.id}
          className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
        >
          <td className="p-3 text-gray-800">{`${u.name}`}</td>
          <td className="p-3 text-gray-800">{u.username || "N/A"}</td>
          <td className="p-3 text-gray-800">{u.email}</td>
          <td className="p-3">{u.is_superuser ? "✅" : "❌"}</td>
          <td className="p-3">
            <div className="flex gap-2">
              {currentUser?.id !== u.id && (
                <>
                  <button
                    onClick={() => onEditUser(u)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(u.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </td>
        </tr>
      ))
    ) : (
      /* Beautiful Empty State Row spanning all 5 columns */
      <tr>
        <td colSpan={5} className="p-8 text-center text-gray-400 font-medium">
          No users found in the system.
        </td>
      </tr>
    )}
  </tbody>
        </table>
      </div>
    </div>
  );
}

interface UpdateFormProps {
  user: User;
  onCancel: () => void;
  onSaved: () => void;
}

function UpdateForm({ user, onCancel, onSaved }: UpdateFormProps) {
  const [form, setForm] = useState<UpdateFormData>({
    fname: user.name.split(" ")[0] || "",
    mname: user.name.split(" ")[1] || "",
    lname: user.name.split(" ")[2] || "",
    uname: user.username || "",
    email: user.email,
    password: "",
    is_superuser: user.is_superuser || false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = { ...form };
    if (!submitData.password) {
      delete (submitData as any).password;
    }
    try {
      await apiClient.updateUser(user.id, submitData);
      onSaved();
      onCancel();
    } catch (err) {
      console.error(err);
      alert("Failed to update user");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-white">
      <h2 className="text-xl font-bold mb-4">Update User</h2>
      {["fname", "mname", "lname", "uname", "email"].map((field) => (
        <div key={field}>
          <label className="block text-sm font-medium mb-1 capitalize">
            {field}
          </label>
          <input
            type="text"
            name={field}
            value={form[field as keyof UpdateFormData] as string}
            onChange={handleChange}
            placeholder={field}
            className="w-full p-2 border border-gray-300 rounded text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      ))}
      <div>
        <label className="block text-sm font-medium mb-1">Password</label>
        <input
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          placeholder="New password (optional)"
          className="w-full p-2 border border-gray-300 rounded text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <label className="flex items-center">
        <input
          type="checkbox"
          name="is_superuser"
          checked={form.is_superuser}
          onChange={handleChange}
          className="mr-2"
        />
        Is Superuser
      </label>
      <div className="flex gap-2 justify-end pt-4">
        <button
          type="submit"
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

function Modal({ isOpen, onClose, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-xl"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
