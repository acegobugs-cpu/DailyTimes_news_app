import { useState, useEffect } from "react";
import { Media } from "@/app/types/types";
import { apiClient } from "@/app/lib/api";

interface MediaBlockProps {
  data: Media;
  onChange: (data: Media) => void;
}

interface SelectMediaProps {
  data: Media;
  onChange: (data: Media) => void;
  setShowModal: (show: boolean) => void;
  handleFileUpload: (file: File) => void;
}

export default function MediaBlock({ data, onChange }: MediaBlockProps) {
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      // Using our apiClient for upload
      const result: any = await apiClient.uploadFile(formData);
      onChange({ ...data, url: result.url, source: "local" });
      setShowModal(false);
    } catch (err) {
      alert("Upload failed: " + (err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      {showModal && (
        <SelectMedia
          data={data}
          onChange={onChange}
          setShowModal={setShowModal}
          handleFileUpload={handleFileUpload}
        />
      )}
      <div className="flex gap-2 items-center">
        <select
          value={data.mediaType}
          onChange={(e) =>
            onChange({
              ...data,
              mediaType: e.target.value as "image" | "video" | "embed",
              url: "",
            })
          }
          className="border border-gray-300 p-2 rounded bg-white text-gray-800"
        >
          <option value="image">Image</option>
          <option value="video">Video</option>
          <option value="embed">Embed Video</option>
        </select>

        {data.mediaType !== "embed" && (
          <select
            value={data.source}
            onChange={(e) => {
              onChange({
                ...data,
                source: e.target.value as "external" | "local",
                url: "",
              });
              if (e.target.value === "local") setShowModal(true);
            }}
            className="border border-gray-300 p-2 rounded bg-white text-gray-800"
          >
            <option value="external">External URL</option>
            <option value="local">Local Upload</option>
          </select>
        )}

        {data.source === "external" || data.mediaType === "embed" ? (
          <input
            type="text"
            value={data.url}
            onChange={(e) => onChange({ ...data, url: e.target.value })}
            placeholder={
              data.mediaType === "embed"
                ? "Enter embed URL (e.g., YouTube)"
                : "Enter URL"
            }
            className="border border-gray-300 p-2 rounded bg-white text-gray-800 flex-1"
          />
        ) : (
          <>
            <button
              onClick={() => setShowModal(!showModal)}
              className="border border-gray-300 p-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Browse"}
            </button>
            {data.url ? (
              <p className="border border-green-500 p-2 rounded bg-green-50 text-green-700 text-sm break-all">
                Selected: {data.url.split("/").pop()}
              </p>
            ) : (
              <p className="border border-red-500 p-2 rounded bg-red-50 text-red-700 text-sm">
                No file selected
              </p>
            )}
          </>
        )}
      </div>
    </>
  );
}

function SelectMedia({
  data,
  onChange,
  setShowModal,
  handleFileUpload,
}: SelectMediaProps) {
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUploadedFiles = async () => {
      try {
        const mediaFiles = await apiClient.getMedia();
        setUploadedFiles(mediaFiles.files.map((file) => file));
      } catch (error) {
        console.error("Failed to fetch uploaded files:", error);
        setUploadedFiles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUploadedFiles();
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Select a File</h2>
          <button
            onClick={() => setShowModal(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <p className="text-gray-600 text-center py-4">Loading files...</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="border border-gray-300 rounded-lg p-2 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all"
                onClick={() => {
                  onChange({ ...data, url: file, source: "local" });
                  setShowModal(false);
                }}
              >
                {data.mediaType === "image" ? (
                  <img
                    src={file}
                    className="w-full h-24 object-cover rounded"
                    alt="Uploaded media"
                  />
                ) : (
                  <video
                    src={file}
                    className="w-full h-24 object-cover rounded"
                  />
                )}
                <p className="text-xs text-gray-600 mt-2 truncate">
                  {file.split("/").pop()}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-between items-center border-t pt-4">
          <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
            + Upload New File
            <input
              type="file"
              accept={data.mediaType === "image" ? "image/*" : "video/*"}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
              className="hidden"
            />
          </label>
          <button
            onClick={() => setShowModal(false)}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
