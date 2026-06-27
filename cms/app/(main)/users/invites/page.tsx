'use client';

import { apiClient } from "@/app/lib/api";
import { Email } from "@/app/types/types";
import { useEffect, useState } from "react";

const Roles = [
  { id: "00000000-0000-0000-0000-000000000000", name: "editor" },
  { id: "11111111-1111-1111-1111-111111111111", name: "HR" }
];

export default function EmailList() {
  // Grouped form state for scalability
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    phone: "",
    roleIds: [] as string[],
  });

  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slug, setSlug] = useState("");
  const [emails, setEmails] = useState<Email[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchEmails = async () => {
    try {
      const emailsData = await apiClient.getInvites();
      setEmails(emailsData);
    } catch {
      setError("Failed to fetch emails");
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Toggles the selection state of a specific role ID
  const handleRoleToggle = (roleId: string) => {
    setFormData((prev) => {
      const isSelected = prev.roleIds.includes(roleId);
      const newRoleIds = isSelected
        ? prev.roleIds.filter((id) => id !== roleId)
        : [...prev.roleIds, roleId];
      return { ...prev, roleIds: newRoleIds };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.roleIds.length === 0) {
      setError("Please select at least one role.");
      return;
    }

    setSuccess(null);
    setError(null);
    setIsSubmitting(true);
    
    try {
      // Sending payload matching your backend expectations
      const res = await apiClient.invite(formData);
      setSlug(res.slug);
      setSuccess("Email authorized successfully.");
      
      // Reset form fields completely
      setFormData({
        firstName: "",
        middleName: "",
        lastName: "",
        email: "",
        phone: "",
        roleIds: [],
      });
      fetchEmails();
    } catch (err) {
      setError("Failed to authorize email.");
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const closeModal = () => {
    setIsModalOpen(false);
    setSuccess(null);
    setError(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* List Card Section */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              Authorized Editors
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage and invite internal content editors into the CMS ecosystem.
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-4 py-2.5 rounded-lg shadow-sm transition-all hover:shadow focus:ring-4 focus:ring-blue-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Invite
            </button>
          </div>
        </div>

        {error && !isModalOpen && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <th className="p-4 pl-6">ID</th>
                <th className="p-4">Slug</th>
                <th className="p-4">Email Address</th>
                <th className="p-4">Inviter ID</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-600">
              {emails.length ? (
                emails.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 pl-6 font-mono text-xs text-gray-400">#{e.id}</td>
                    <td className="p-4 font-mono text-xs max-w-[120px] truncate text-gray-500">{e.slug}</td>
                    <td className="p-4 font-medium text-gray-900">{e.email}</td>
                    <td className="p-4 text-gray-500">{e.inviter_id || <span className="text-gray-300">—</span>}</td>
                    <td className="p-4 text-center">
                      {e.used ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                          Registered
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 font-medium text-xs px-2.5 py-1.5 rounded-md transition-colors"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-400 font-medium">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-300">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                      </svg>
                      No authorized editor invitations found in the system.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Overlay Window Layer */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={closeModal}></div>

          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md transform overflow-hidden p-6 transition-all border border-gray-100 z-10">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Authorize New Editor</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-500 p-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-3">
                {/* Name Fields */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Full Name</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      name="firstName"
                      placeholder="First"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      disabled={success !== null || isSubmitting}
                      className="w-full border border-gray-200 bg-gray-50/50 p-2.5 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-60"
                    />
                    <input
                      type="text"
                      name="middleName"
                      placeholder="Middle"
                      value={formData.middleName}
                      onChange={handleInputChange}
                      disabled={success !== null || isSubmitting}
                      className="w-full border border-gray-200 bg-gray-50/50 p-2.5 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-60"
                    />
                    <input
                      type="text"
                      name="lastName"
                      placeholder="Last"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      disabled={success !== null || isSubmitting}
                      className="w-full border border-gray-200 bg-gray-50/50 p-2.5 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Contact Fields */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="name@company.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    disabled={success !== null || isSubmitting}
                    className="w-full border border-gray-200 bg-gray-50/50 p-2.5 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    disabled={success !== null || isSubmitting}
                    className="w-full border border-gray-200 bg-gray-50/50 p-2.5 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-60"
                  />
                </div>

                {/* Assign Roles Multi-Select */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Assign System Roles</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Roles.map((role) => {
                      const isChecked = formData.roleIds.includes(role.id);
                      return (
                        <button
                          type="button"
                          key={role.id}
                          disabled={success !== null || isSubmitting}
                          onClick={() => handleRoleToggle(role.id)}
                          className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-all text-left ${
                            isChecked
                              ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm"
                              : "bg-gray-50/50 border-gray-200 text-gray-600 hover:bg-gray-50"
                          } disabled:opacity-60`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                            isChecked ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300 bg-white"
                          }`}>
                            {isChecked && (
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <span className="capitalize">{role.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {success && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg text-sm">
                  <div className="flex items-start gap-2.5 text-emerald-800">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <div>
                      <p className="font-semibold">Authorization generated.</p>
                      <p className="mt-1 text-xs text-emerald-700">Copy and provide this unique secure target address path directly to the registration profile form claimant:</p>
                      <div className="mt-2 flex items-center bg-white border border-emerald-200 rounded-md px-2 py-1.5 font-mono text-xs select-all text-emerald-900 shadow-inner">
                        /register/{slug}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-lg font-medium">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {success ? 'Done' : 'Cancel'}
                </button>
                {!success && (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium text-sm px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    {isSubmitting && (
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <circle className="opacity-75" fill="currentColor" cx="12" cy="12" r="10" />
                      </svg>
                    )}
                    Generate Link
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}