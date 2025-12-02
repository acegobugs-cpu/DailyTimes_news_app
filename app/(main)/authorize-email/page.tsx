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
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slug, setSlug] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    if (!user?.is_superuser) {
      router.push("/(main)");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);
    try {
      const res = await apiClient.authorizeEmail({ email });
      setSlug(res.slug);
      setSuccess("Email authorized successfully.");
    } catch (err) {
      setError("Failed to authorize email.");
    }
  };

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

      <div className="mt-8 p-6 bg-white rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">
          Authorize New Editor
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Editor Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-gray-300 p-3 rounded text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700 transition-colors"
          >
            Authorize Email
          </button>
        </form>

        {success && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">
              {success} — share this link:
              <code className="bg-green-100 px-3 py-1 rounded ml-2 font-mono">
                /register/{slug}
              </code>
            </p>
          </div>
        )}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}
      </div>

      <EmailList />
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
            {users.map((u) => (
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmailList() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchEmails = async () => {
    try {
      const emailsData = await apiClient.getEmails();
      setEmails(emailsData);
    } catch {
      setError("Failed to fetch emails");
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this email?")) {
      try {
        await apiClient.deleteEmails(id);
        setEmails((prev) => prev.filter((email) => email.id !== id));
      } catch {
        setError("Failed to delete email");
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">
        Authorized Emails List
      </h1>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="p-3 font-semibold text-gray-700">ID</th>
              <th className="p-3 font-semibold text-gray-700">Slug</th>
              <th className="p-3 font-semibold text-gray-700">Email</th>
              <th className="p-3 font-semibold text-gray-700">Inviter ID</th>
              <th className="p-3 font-semibold text-gray-700">Used</th>
              <th className="p-3 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {emails.map((e) => (
              <tr
                key={e.id}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="p-3 text-gray-800">{e.id}</td>
                <td className="p-3 text-gray-800">{e.slug}</td>
                <td className="p-3 text-gray-800">{e.email}</td>
                <td className="p-3 text-gray-800">{e.inviter_id || "N/A"}</td>
                <td className="p-3">{e.used ? "✅" : "❌"}</td>
                <td className="p-3">
                  <button
                    onClick={() => handleDelete(e.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
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
