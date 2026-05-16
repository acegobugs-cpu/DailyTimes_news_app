"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useRef, useCallback } from "react";
import Select from "react-select";
import { EllipsisVerticalIcon } from "@heroicons/react/24/solid";
import { apiClient } from "@/app/lib/api";
import { useAuth } from "@/app/components/AuthContext";
import MediaBlock from "../../components/mediaBlock";
import MediaRenderer from "../../components/mediaRenderer";
import {
  Article,
  Category,
  ArticleTranslation,
  Media,
  ArticleUpdate,
} from "@/app/types/types";
import Link from "next/link";

const TextEditor = dynamic(() => import("../../components/textEditor"), {
  ssr: false,
  loading: () => <div>Loading editor...</div>,
});

export default function Articles() {
  const [articleAdd, setArticleAdd] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialogPos, setDialogPos] = useState({ x: 0, y: 0 });
  const [showLocaleModal, setShowLocaleModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentArticle, setCurrentArticle] = useState<Article | null>(null);
  const [lan, setLan] = useState("om");
  const articleRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const { user } = useAuth();

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const data = await apiClient.getArticles();
      setArticles(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching articles:", error);
      setLoading(false);
      setError("Failed to fetch articles");
    }
  };

  const refreshArticles = async () => {
    try {
      const data = await apiClient.getArticles();
      setArticles(data);
    } catch (error) {
      setError("Failed to refresh articles");
    }
  };

  const handleDelete = async () => {
    if (!selectedArticle) return;
    try {
      await apiClient.deleteArticle(selectedArticle.id);
      setArticles(
        articles.filter((article) => article.id !== selectedArticle.id),
      );
      setSelectedArticle(null);
      setError(null);
    } catch (error) {
      setError("Failed to delete article");
    }
  };

  const openDialog = (article: Article, event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setDialogPos({ x: rect.right, y: rect.bottom });
    setSelectedArticle(article);
  };

  const closeDialog = () => {
    setSelectedArticle(null);
    setError(null);
  };

  const openLocaleModal = (article: Article) => {
    setCurrentArticle(article);
    setShowLocaleModal(true);
  };

  const closeLocaleModal = () => {
    setShowLocaleModal(false);
    setCurrentArticle(null);
  };

  return (
    <>
      {currentArticle && showEditModal && (
        <EditArticleModal
          article={currentArticle}
          user={user}
          isOpen={true}
          onClose={() => setShowEditModal(false)}
          refreshArticles={refreshArticles}
        />
      )}

      {currentArticle && showLocaleModal && (
        <LocaleForm
          article={currentArticle}
          user={user}
          isOpen={true}
          onClose={closeLocaleModal}
          refreshArticles={refreshArticles}
        />
      )}

      <div className="w-full py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-serif font-bold">Articles</h1>
          <Link
            href="/articles/write"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            Write Article +
          </Link>
        </div>

        {loading ? (
          <p className="text-white">Loading...</p>
        ) : articles.length > 0 ? (
          <div className="grid md:grid-cols-3 grid-cols-1 gap-6 text-black">
            {articles.map((article) => (
              <div
                key={article.id}
                ref={(el) => {
                  articleRefs.current[article.id] = el;
                }}
                className="relative bg-white rounded-lg shadow-lg p-4 hover:shadow-xl transition-shadow"
              >
                <select
                  value={lan}
                  onChange={(e) => setLan(e.target.value)}
                  className="absolute top-2 right-12 p-1 rounded-md text-sm hidden sm:block"
                >
                  <option value="om">om</option>
                  <option value="am">am</option>
                  <option value="en">en</option>
                  <option value="sw">sw</option>
                </select>

                <button
                  onClick={(e) => openDialog(article, e)}
                  className="absolute top-2 right-2 text-gray-600 rounded p-1 hover:bg-gray-100 transition-colors"
                  aria-label="Open options"
                >
                  <EllipsisVerticalIcon className="h-5 w-5" />
                </button>

                <div className="mt-8">
                  {article.media && (
                    <MediaRenderer
                      media={
                        typeof article.media === "string"
                          ? JSON.parse(article.media)
                          : article.media
                      }
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  <p className="text-xs text-gray-600">
                    {article.categories?.map((cat) => cat.name).join(", ")}
                  </p>
                  {article.translations
                    ?.filter((tr) => tr.locale === lan)
                    .map((tr) => (
                      <div key={tr.slug} className="space-y-2">
                        <h2 className="text-lg font-serif font-bold line-clamp-2">
                          {tr.title}
                        </h2>
                        <p className="text-sm text-gray-800 line-clamp-3">
                          {tr.description}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-700 py-8">No articles found.</p>
        )}

        {selectedArticle && (
          <div className="fixed inset-0 z-50" onClick={closeDialog}>
            <div
              className="absolute bg-white p-4 rounded-lg shadow-xl w-48 border border-gray-200"
              style={{ top: dialogPos.y + 8, left: dialogPos.x - 160 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-sm font-semibold mb-2 text-gray-800">
                Options
              </h2>
              <div className="flex flex-col space-y-2">
                <button
                  onClick={() => openLocaleModal(selectedArticle)}
                  className="bg-green-600 text-white text-sm p-2 rounded hover:bg-green-700 transition-colors"
                >
                  + Add Locale
                </button>
                <button
                  onClick={() => {
                    setCurrentArticle(selectedArticle);
                    setShowEditModal(true);
                  }}
                  className="bg-yellow-500 text-blue-800 text-sm text-center p-2 rounded hover:bg-yellow-600 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="bg-red-600 text-white text-sm p-2 rounded hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
              {error && <p className="text-red-600 mt-2 text-sm">{error}</p>}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// LocaleForm Component
function LocaleForm({
  article,
  user,
  onClose,
  isOpen,
  refreshArticles,
}: {
  article: Article;
  user: any;
  onClose: () => void;
  isOpen: boolean;
  refreshArticles: () => void;
}) {
  if (!isOpen) return null;

  const [User] = useState(user);
  const [formData, setFormData] = useState({
    locale: "am",
    title: "",
    slug: "",
    editor_id: 0,
    article_id: 0,
    description: "",
    content: "",
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const defaultTranslation = article.translations[0];

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value.slice(0, 250);
    const slug = title
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^፡-፯\u1200-\u137F\w\s-]/gu, "")
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase();
    setFormData({ ...formData, title, slug });
  };

  useEffect(() => {
    if (defaultTranslation) {
      setFormData((prev) => ({
        ...prev,
        content: defaultTranslation.content || [],
      }));
    }
  }, [defaultTranslation]);

  const handleSubmit = async () => {
    try {
      await apiClient.addLocale({
        editor_id: User?.id || 0,
        article_id: article.id,
        locale: formData.locale,
        title: formData.title,
        slug: formData.slug,
        description: formData.description,
        content: formData.content ? formData.content : [],
      });
      setSuccess(true);
      await refreshArticles();
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to add locale");
      setSuccess(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black text-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-serif font-bold">
              Add Locale for:{" "}
              <span className="text-purple-600">
                {article.translations[0]?.title}
              </span>
              {User.id}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <select
              value={formData.locale}
              onChange={(e) =>
                setFormData({ ...formData, locale: e.target.value })
              }
              className="border border-gray-300 bg-white text-gray-800 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="am">Amharic</option>
              <option value="en">English</option>
              <option value="sw">Swahili</option>
              <option value="om">Afan Oromo</option>
            </select>

            <input
              type="text"
              placeholder="Title"
              value={formData.title}
              onChange={handleTitleChange}
              className="border border-gray-300 bg-white text-gray-800 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />

            <input
              type="text"
              placeholder="Slug"
              value={formData.slug}
              readOnly
              className="border border-gray-300 bg-white text-gray-800 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />

            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="border border-gray-300 bg-white text-gray-800 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />

            <h1 className="text-gray-800 font-semibold">Content</h1>
            <TextEditor
              onChange={(json) => setFormData({ ...formData, content: json })}
            />

            <button
              onClick={handleSubmit}
              className="bg-purple-600 text-white p-2 rounded hover:bg-purple-700 transition-colors"
            >
              Add Translation
            </button>
          </div>
          {success && (
            <p className="text-green-600 mt-2">Locale added successfully!</p>
          )}
          {error && <p className="text-red-600 mt-2">{error}</p>}
        </div>
      </div>
    </div>
  );
}

// EditArticleModal Component
function EditArticleModal({
  article,
  user,
  onClose,
  isOpen,
  refreshArticles,
}: {
  article: Article;
  user: any;
  onClose: () => void;
  isOpen: boolean;
  refreshArticles: () => void;
}) {
  if (!isOpen) return null;

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedLocale, setSelectedLocale] = useState("om");
  const [newLocale, setNewLocale] = useState("om");
  const [changingLocale, setChangingLocale] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    tag: article.tag || "",
    category_ids: article.categories?.map((c) => c.id) || [],
    media: article.media || {
      mediaType: "image",
      source: "external",
      url: "",
    },
    // translations is a map from locale -> translation object
    translations: {} as Record<string, Partial<ArticleTranslation>>,
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesData = await apiClient.getCategories();
        setCategories(categoriesData);
      } catch (err) {
        setError("Failed to load categories");
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const translations: { [key: string]: any } = {};
    article.translations.forEach((t) => {
      if (t.locale && typeof t.locale === "string") {
        translations[t.locale] = {
          id: t.id,
          locale: t.locale || "",
          title: t.title || "",
          slug: t.slug || "",
          description: t.description || "",
          content: t.content || [],
          updated_at: new Date().toISOString(),
        };
      }
      setSelectedLocale(article.translations[0]?.locale || "om");
    });
    setFormData((prev) => ({ ...prev, translations }));
  }, [article, user]);

  const updateTranslation = (locale: string, updates: any) => {
    setFormData((prev) => ({
      ...prev,
      translations: {
        ...prev.translations,
        [locale]: {
          ...prev.translations[locale],
          ...updates,
        },
      },
    }));
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value.slice(0, 250);
    const slug = title
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^፡-፯\u1200-\u137F\w\s-]/gu, "")
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase();
    updateTranslation(selectedLocale, { title, slug });
  };

  const handleDeleteTranslation = async (id: number) => {
    if (!id) return;
    try {
      await apiClient.deleteLocale(id);
      setFormData((prev) => {
        const { [selectedLocale]: _, ...restTranslations } = prev.translations;
        return { ...prev, translations: restTranslations };
      });
      setSelectedLocale(Object.keys(formData.translations)[0] || "om");
      await refreshArticles();
      setSuccess(true);
    } catch (error) {
      setError("Failed to delete translation");
    }
  };

  const categoryOptions = categories.map((category) => ({
    value: category.id,
    label: category.name,
  }));

  const handleContentChange = useCallback(
    (json: any) => {
      updateTranslation(selectedLocale, { content: json });
    },
    [selectedLocale],
  );

  const handleSubmit = async () => {
    try {
      const translationsDict: Record<string, any> = {};

      Object.entries(formData.translations).forEach(([locale, translation]) => {
        translationsDict[locale] = {
          id: translation.id,
          locale: translation.locale || locale,
          title: translation.title || "",
          slug: translation.slug || "",
          description: translation.description || "",
          content: translation.content || [],
          updated_at: new Date().toISOString(),
        };
      });
      const payload: Partial<ArticleUpdate> = {
        tag: formData.tag,
        category_ids: formData.category_ids,
        media: formData.media,
        updated_at: new Date().toISOString(),
        translations: translationsDict,
      };
      await apiClient.updateArticle(article.id, payload);
      setSuccess(true);
      await refreshArticles();
      onClose();
    } catch (err) {
      console.error("Update failed", err);
      setError("Failed to update article");
    }
  };

  const t = formData.translations[selectedLocale] || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-serif font-bold">
              Edit Article:{" "}
              <span className="text-purple-600">
                {article.translations[0]?.title}
              </span>
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <select
                value={selectedLocale}
                onChange={(e) => setSelectedLocale(e.target.value)}
                className="border border-gray-300 bg-white text-gray-800 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.keys(formData.translations).map((locale) => (
                  <option key={locale} value={locale}>
                    {locale.toUpperCase()}
                  </option>
                ))}
              </select>

              <div>
                <div>
                  {changingLocale ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={newLocale}
                        onChange={(e) => setNewLocale(e.target.value)}
                        className="border border-gray-300 bg-white text-gray-800 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="om">OM</option>
                        <option value="am">AM</option>
                        <option value="en">EN</option>
                        <option value="sw">SW</option>
                      </select>
                      <button
                        onClick={() => {
                          // If the new locale is the same as the currently selected one, just close the changer.
                          if (newLocale === selectedLocale) {
                            setChangingLocale(false);
                            return;
                          }

                          const currentTranslation =
                            formData.translations[selectedLocale];
                          if (!currentTranslation) {
                            setChangingLocale(false);
                            return;
                          }

                          // Move the translation to the new locale key and update its locale field.
                          setFormData((prev) => {
                            const { [selectedLocale]: _removed, ...rest } =
                              prev.translations;
                            return {
                              ...prev,
                              translations: {
                                ...rest,
                                [newLocale]: {
                                  ...currentTranslation,
                                  locale: newLocale,
                                },
                              },
                            };
                          });

                          // Switch the UI to the new locale and close the changer.
                          setSelectedLocale(newLocale);
                          setChangingLocale(false);
                        }}
                        className="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 transition-colors"
                      >
                        Confirm
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setChangingLocale(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors whitespace-nowrap"
                      title="Change locale of current translation"
                    >
                      Change Locale
                    </button>
                  )}
                </div>

                <button
                  onClick={() => {
                    const id = formData.translations[selectedLocale]?.id;
                    if (typeof id === "number") {
                      handleDeleteTranslation(id);
                    }
                  }}
                  className="bg-red-600 text-white text-sm p-2 rounded hover:bg-red-700 transition-colors"
                  disabled={!formData.translations[selectedLocale]?.id}
                >
                  Delete Translation
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 p-4 bg-gray-50 rounded-lg">
              <input
                type="text"
                placeholder="Slug"
                value={t.slug || ""}
                readOnly
                className="border border-gray-300 bg-white text-gray-800 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
                required
              />

              <select
                value={formData.tag || "primary"}
                onChange={(e) =>
                  setFormData({ ...formData, tag: e.target.value })
                }
                className="border border-gray-300 bg-white text-gray-800 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 flex-1"
                required
              >
                <option value="primary">primary</option>
                <option value="secondary">secondary</option>
                <option value="breaking news">breaking news</option>
                <option value="trending">trending</option>
                <option value="morestories">morestories</option>
              </select>

              <div className="flex-1">
                <Select
                  isMulti
                  options={categoryOptions}
                  value={categoryOptions.filter((opt) =>
                    formData.category_ids.includes(opt.value),
                  )}
                  onChange={(selected) =>
                    setFormData({
                      ...formData,
                      category_ids: selected
                        ? selected.map((opt) => opt.value)
                        : [],
                    })
                  }
                  className="text-black"
                  classNamePrefix="react-select"
                  placeholder="Select categories..."
                />
              </div>
            </div>

            <MediaBlock
              data={
                formData.media || {
                  mediaType: "image",
                  source: "external",
                  url: "",
                }
              }
              onChange={(updated) =>
                setFormData({ ...formData, media: updated })
              }
            />

            <hr className="border-gray-300" />

            <input
              type="text"
              placeholder="Title"
              value={t.title || ""}
              onChange={handleTitleChange}
              className="border border-gray-300 bg-white text-gray-800 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />

            <textarea
              placeholder="Description"
              value={t.description || ""}
              onChange={(e) =>
                updateTranslation(selectedLocale, {
                  description: e.target.value,
                })
              }
              className="border border-gray-300 bg-white text-gray-800 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />

            <h1 className="text-gray-800 font-semibold">Content</h1>
            {typeof t.content === "undefined" ? (
              <p className="text-gray-500">Loading content editor...</p>
            ) : (
              <TextEditor
                key={`${article.id}-${selectedLocale}`}
                initialValue={t.content}
                onChange={handleContentChange}
              />
            )}

            <button
              onClick={handleSubmit}
              className="bg-green-600 text-white p-2 rounded hover:bg-green-700 transition-colors"
            >
              Save Changes
            </button>
          </div>
          {success && (
            <p className="text-green-600 mt-2">Article updated successfully!</p>
          )}
          {error && <p className="text-red-600 mt-2">{error}</p>}
        </div>
      </div>
    </div>
  );
}
