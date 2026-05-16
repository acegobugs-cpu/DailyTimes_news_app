"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/app/lib/api";
import { Category } from "@/app/types/types";

interface CategoryFormData {
  name: string;
  slug: string;
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CategoryFormData>({ name: "", slug: "" });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const categoriesData = await apiClient.getCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setForm({ name: category.name, slug: category.slug });
  };

  const handleUpdate = async (id: number) => {
    try {
      await apiClient.updateCategory(id, form);
      const updated = categories.map((cat) =>
        cat.id === id ? { ...cat, ...form } : cat
      );
      setCategories(updated);
      setEditingId(null);
      setError(null);
    } catch (error) {
      console.error("Update failed:", error);
      setError("Failed to update category");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.deleteCategory(id);
      setCategories(categories.filter((cat) => cat.id !== id));
      setError(null);
    } catch (error) {
      console.error("Delete failed:", error);
      setError("Failed to delete category");
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const slug = name
      .toLowerCase()
      .split(/[\s-]/)[0]
      .replace(/[^a-z]/g, "");
    setForm({ name, slug });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.slug) {
      setError("Slug cannot be empty");
      return;
    }
    try {
      await apiClient.createCategory(form);
      setSuccess(true);
      setForm({ name: "", slug: "" });
      setError(null);
      // Refresh the category list
      fetchCategories();
    } catch (err) {
      setError("Failed to create category");
      setSuccess(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-serif font-bold mb-8 text-gray-800">
        Categories
      </h1>

      {/* Create Category Form */}
      <div className="mb-8 p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-serif font-bold mb-4 text-gray-800">
          Create Category
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Category Name"
            value={form.name}
            onChange={handleNameChange}
            className="border border-gray-300 p-3 rounded text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
          />
          <input
            type="text"
            placeholder="Slug"
            value={form.slug}
            readOnly
            className="border border-gray-300 p-3 rounded text-gray-800 bg-gray-100 focus:outline-none"
            required
          />
          <button
            type="submit"
            className="bg-purple-600 text-white p-3 rounded hover:bg-purple-700 transition-colors"
          >
            Add Category
          </button>
        </form>
        {success && (
          <p className="text-green-600 mt-2">Category created successfully!</p>
        )}
        {error && <p className="text-red-600 mt-2">{error}</p>}
      </div>

      {/* Category List */}
      <div className="p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-serif font-bold mb-4 text-gray-800">
          Category List
        </h2>
        {loading ? (
          <p className="text-gray-700">Loading...</p>
        ) : categories.length > 0 ? (
          <div className="space-y-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex flex-col md:flex-row justify-between items-center gap-3 border border-gray-200 p-4 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {editingId === category.id ? (
                  <div className="flex flex-col gap-2 w-full md:flex-row md:items-center md:gap-3">
                    <input
                      className="border border-gray-300 px-3 py-2 rounded text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-48"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                    />
                    <input
                      className="border border-gray-300 px-3 py-2 rounded text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-48"
                      value={form.slug}
                      onChange={(e) =>
                        setForm({ ...form, slug: e.target.value })
                      }
                    />
                    <button
                      onClick={() => handleUpdate(category.id)}
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-gray-600 border border-gray-300 rounded px-4 py-2 hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col md:flex-row items-center justify-between w-full gap-4">
                    <div className="flex flex-col md:flex-row gap-4 md:items-center">
                      <p className="text-sm text-gray-500">ID: {category.id}</p>
                      <p className="font-semibold text-gray-800">
                        {category.name}
                      </p>
                      <p className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        {category.slug}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(category)}
                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-700 text-center py-4">No categories found.</p>
        )}
      </div>
    </div>
  );
}
