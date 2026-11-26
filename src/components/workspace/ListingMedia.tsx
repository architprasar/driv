"use client";
import { useState, type ChangeEvent } from "react";
import Image from "next/image";
import { apiClient } from "@/lib/api-client";
import { getMediaUrl } from "@/lib/runtime-config";
import {
  Panel,
  Modal,
  LoadState,
  useResource,
  errorMessage,
} from "./WorkspaceUI";
type Photo = { id: number; image: string; is_primary: boolean };
export default function ListingMedia({
  type,
  id,
}: {
  type: "cars" | "parts";
  id: string;
}) {
  const resource = useResource<{ images: Photo[] }>(`/${type}/${id}/`);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [removing, setRemoving] = useState<Photo | null>(null);
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length + (resource.data?.images.length || 0) > 10) {
      setError("Choose up to ten listing photos in total.");
      return;
    }
    if (
      files.some(
        (f) => f.size > 10 * 1024 * 1024 || !f.type.startsWith("image/"),
      )
    ) {
      setError("Choose image files up to 10 MB each.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      for (const file of files) {
        const form = new FormData();
        form.append("image", file);
        await apiClient.post(`/${type}/${id}/images/`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
      resource.reload();
    }
  }
  async function primary(photo: Photo) {
    setBusy(true);
    setError("");
    try {
      await apiClient.patch(`/${type}/${id}/images/${photo.id}/`, {
        is_primary: true,
      });
      resource.reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!removing) return;
    setBusy(true);
    setError("");
    try {
      await apiClient.delete(`/${type}/${id}/images/${removing.id}/`);
      setRemoving(null);
      resource.reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel title="Listing photos">
      <div className="ws-panel-body">
        {error && !removing && (
          <p role="alert" className="ws-notice error mb-5">
            {error}
          </p>
        )}
        {resource.loading || resource.error ? (
          <LoadState
            loading={resource.loading}
            error={resource.error}
            retry={resource.reload}
          />
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-5">
              Use up to ten accurate photos. The primary photo appears in the
              catalogue.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {resource.data?.images.map((photo, index) => (
                <div key={photo.id} className="rounded-lg border p-3">
                  <Image
                    src={getMediaUrl(photo.image)}
                    alt={`Listing photo ${index + 1}`}
                    width={240}
                    height={160}
                    className="w-full h-32 rounded object-cover"
                  />
                  <div className="flex flex-wrap gap-3 mt-3">
                    <button
                      className="ws-text-link text-xs"
                      disabled={busy || photo.is_primary}
                      onClick={() => primary(photo)}
                    >
                      {photo.is_primary ? "Primary photo" : "Make primary"}
                    </button>
                    <button
                      className="ws-text-link text-xs"
                      disabled={busy}
                      onClick={() => {
                        setError("");
                        setRemoving(photo);
                      }}
                    >
                      Remove photo {index + 1}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <label className="ws-field mt-5">
              Add photos
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={busy || (resource.data?.images.length || 0) >= 10}
                onChange={upload}
              />
            </label>
            {busy && <p role="status">Updating photos…</p>}
          </>
        )}
        {removing && (
          <Modal
            title="Remove this photo?"
            onClose={() => {
              if (!busy) setRemoving(null);
            }}
          >
            <div className="ws-form">
              {error && (
                <p role="alert" className="ws-notice error">
                  {error}
                </p>
              )}
              <p>
                The photo will be removed from your listing. You can upload a
                replacement.
              </p>
              <div className="ws-form-actions">
                <button
                  className="ws-button secondary"
                  disabled={busy}
                  onClick={() => setRemoving(null)}
                >
                  Keep photo
                </button>
                <button
                  className="ws-button danger"
                  disabled={busy}
                  onClick={remove}
                >
                  {busy ? "Removing…" : "Remove photo"}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </Panel>
  );
}
