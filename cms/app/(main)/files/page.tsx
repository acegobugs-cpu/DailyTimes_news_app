"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/app/lib/api";

export default function Media() {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-serif font-bold mb-6 text-gray-800">
        Media Library
      </h1>
      <UploadsEditor />
    </div>
  );
}

function UploadsEditor() {
  const [uploadedFiles, setUploadedFiles] = useState<
    { url: string; filename: string; size?: number }[]
  >([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await apiClient.getMedia(); // This should return {files: string[]}
        console.log("Fetched media response:", response);

        // Convert the array of URLs to objects
        const filesWithMetadata = response.files.map((fileUrl: string) => {
          // Extract filename from URL
          const filename = fileUrl.split("/").pop() || fileUrl;
          return {
            url: fileUrl,
            filename: filename,
            // Note: Size is not available from the current API response
          };
        });

        setUploadedFiles(filesWithMetadata);
      } catch (error) {
        console.error("Error fetching media:", error);
      }
    };
    fetchFiles();
  }, []);

  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", "filename");
    formData.append("type", "image");
    formData.append("source", "user");

    try {
      setUploading(true);
      const result = await apiClient.uploadFile(formData);
      alert("Upload successful: " + result);

      // Refresh the files list
      const response = await apiClient.getMedia();
      const filesWithMetadata = response.files.map((fileUrl: string) => {
        const filename = fileUrl.split("/").pop() || fileUrl;
        return {
          url: fileUrl,
          filename: filename,
        };
      });
      setUploadedFiles(filesWithMetadata);
    } catch (err) {
      alert("Uploadkkkk failed: " + (err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const toggleSelect = (fileUrl: string) => {
    setSelectedFiles((prev) =>
      prev.includes(fileUrl)
        ? prev.filter((f) => f !== fileUrl)
        : [...prev, fileUrl],
    );
  };

  const handleDeleteSelected = async () => {
    for (const fileUrl of selectedFiles) {
      try {
        // Extract filename from URL for deletion
        const filename = fileUrl.split("/").pop();
        if (filename) {
          await apiClient.delMedia(filename);
          console.log("Deleted", filename);
        }
        // Remove from local state
        setUploadedFiles((prev) => prev.filter((f) => f.url !== fileUrl));
      } catch (err) {
        alert("Failed to delete " + fileUrl + ": " + (err as Error).message);
        console.error("Failed to delete", fileUrl, err);
      }
    }
    setSelectedFiles([]);
    setShowModal(false);
  };

  return (
    <>
      <div className="flex justify-end gap-3 mb-6">
        <label className="cursor-pointer bg-blue-600 text-white border border-blue-600 rounded-lg px-4 py-2 hover:bg-blue-700 transition-colors">
          {uploading ? "Uploading..." : "+ Upload"}
          <input
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
            className="hidden"
            disabled={uploading}
          />
        </label>
        <button
          onClick={() => {
            if (selectedFiles.length === 0) return alert("No media selected");
            setShowModal(true);
          }}
          className="bg-red-600 text-white border border-red-600 rounded-lg px-4 py-2 hover:bg-red-700 transition-colors"
          disabled={selectedFiles.length === 0}
        >
          Delete Selected ({selectedFiles.length})
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {uploadedFiles.length > 0 ? (
            uploadedFiles.map((file, index) => {
              const isImage = /\.(png|jpe?g|gif|bmp|webp)$/i.test(
                file.filename,
              );
              const isVideo = /\.(mp4|webm|ogg|mov|avi)$/i.test(file.filename);
              const isSelected = selectedFiles.includes(file.url);

              return (
                <div
                  key={index} // Use index as key since we don't have an ID
                  onClick={() => toggleSelect(file.url)}
                  className={`border-2 border-gray-200 rounded-lg p-2 cursor-pointer transition-all hover:shadow-md relative ${
                    isSelected
                      ? "ring-2 ring-blue-500 border-blue-500"
                      : "hover:border-gray-300"
                  }`}
                >
                  {isImage && (
                    <img
                      src={file.url}
                      className="w-full h-32 object-cover rounded"
                      alt={file.filename}
                      onError={(e) => {
                        // Fallback if image fails to load
                        (e.target as HTMLImageElement).src =
                          "/placeholder-image.png";
                      }}
                    />
                  )}
                  {isVideo && (
                    <video
                      src={`${process.env.NEXT_PUBLIC_API_BASE_URL || ""}${
                        file.url
                      }`}
                      className="w-full h-32 object-cover rounded"
                      controls={false}
                      muted
                      autoPlay={false}
                    />
                  )}
                  {!isImage && !isVideo && (
                    <div className="w-full h-32 bg-gray-100 rounded flex items-center justify-center">
                      <span className="text-gray-500 text-sm">File</span>
                    </div>
                  )}
                  <div className="mt-2">
                    <p
                      className="text-xs text-gray-600 truncate"
                      title={file.filename}
                    >
                      {file.filename}
                    </p>
                    {/* Removed size display since it's not in the API response */}
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                      ✓
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-8 text-gray-500">
              No files uploaded yet
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <SelectedMedia
          files={selectedFiles}
          uploadedFiles={uploadedFiles}
          onClose={() => setShowModal(false)}
          onConfirm={handleDeleteSelected}
        />
      )}
    </>
  );
}

interface SelectedMediaProps {
  files: string[];
  uploadedFiles: { url: string; filename: string; size?: number }[];
  onClose: () => void;
  onConfirm: () => void;
}

function SelectedMedia({
  files,
  uploadedFiles,
  onClose,
  onConfirm,
}: SelectedMediaProps) {
  const selectedFileData = uploadedFiles.filter((file) =>
    files.includes(file.url),
  );

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl shadow-xl">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          Confirm Deletion
        </h2>
        <p className="text-red-600 mb-4">
          Are you sure you want to delete {files.length} file
          {files.length > 1 ? "s" : ""}? This action cannot be undone.
        </p>

        <div className="max-h-60 overflow-y-auto mb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {selectedFileData.map((file, index) => {
              const isImage = /\.(png|jpe?g|gif|bmp|webp)$/i.test(
                file.filename,
              );
              const isVideo = /\.(mp4|webm|ogg|mov|avi)$/i.test(file.filename);

              return (
                <div key={index} className="border border-gray-200 rounded p-2">
                  {isImage && (
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_BASE_URL || ""}${
                        file.url
                      }`}
                      className="w-full h-20 object-cover rounded"
                      alt={file.filename}
                    />
                  )}
                  {isVideo && (
                    <video
                      src={`${process.env.NEXT_PUBLIC_API_BASE_URL || ""}${
                        file.url
                      }`}
                      className="w-full h-20 object-cover rounded"
                      controls={false}
                      muted
                    />
                  )}
                  {!isImage && !isVideo && (
                    <div className="w-full h-20 bg-gray-100 rounded flex items-center justify-center">
                      <span className="text-gray-500 text-xs">File</span>
                    </div>
                  )}
                  <p
                    className="text-xs text-gray-600 truncate mt-1"
                    title={file.filename}
                  >
                    {file.filename}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Delete {files.length} File{files.length > 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
