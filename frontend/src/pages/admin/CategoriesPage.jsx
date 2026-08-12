import React, { useEffect, useState, useRef } from "react";
import api, { imageUrl } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, Save, Upload, Eye, EyeOff, RefreshCw, Layers } from "lucide-react";

/** Categories admin — create / edit / delete / image upload. */
export default function CategoriesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // null=new, else id
  const [form, setForm] = useState({ name: "", description: "", visible: true });
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const fileRefs = useRef({});

 const load = async () => {
  setLoading(true);

  try {
    const { data } = await api.get("/categories");

    const categoryList = Array.isArray(data)
      ? data
      : Array.isArray(data?.categories)
        ? data.categories
        : Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.data)
            ? data.data
            : [];

    setItems(categoryList);
  } catch {
    toast.error("Failed to load categories");
  } finally {
    setLoading(false);
  }
};
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", description: "", visible: true });
    setShowForm(true);
  };
  const openEdit = (c) => {
    setEditing(c.id);
    setForm({ name: c.name || "", description: c.description || "", visible: c.visible !== false });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditing(null); setSaving(false); };

  const submit = async () => {
    const name = (form.name || "").trim();
    if (!name) { toast.error("Category name is required"); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/categories/${editing}`, { name, description: form.description, visible: form.visible });
        toast.success(`Updated "${name}"`);
      } else {
        await api.post("/categories", { name, description: form.description, visible: form.visible });
        toast.success(`Created "${name}"`);
      }
      closeForm();
      load();
    } catch (e) {
      const msg = e?.response?.data?.detail || "Save failed";
      toast.error(typeof msg === "string" ? msg : "Save failed");
      setSaving(false);
    }
  };

  const onDelete = async (c) => {
    if (!window.confirm(`Delete category "${c.name}"? Products linked to it will be unlinked (not deleted).`)) return;
    try {
      await api.delete(`/categories/${c.id}`);
      toast.success(`Deleted "${c.name}"`);
      load();
    } catch {
      toast.error("Delete failed");
    }
  };

  const onToggleVis = async (c) => {
    try {
      await api.put(`/categories/${c.id}`, { visible: !c.visible });
      setItems(prev => prev.map(x => x.id === c.id ? { ...x, visible: !c.visible } : x));
    } catch { toast.error("Failed"); }
  };

  const onUpload = async (c, file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image"); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("Image too large (max 8MB)"); return; }
    setUploadingId(c.id);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await api.post(`/categories/${c.id}/image`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(`Image updated for ${c.name}`);
      load();
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
        <div>
          <p className="overline">Catalog</p>
          <h1 className="font-display text-4xl font-light mt-1 tracking-tight">Categories</h1>
          <p className="text-sm text-zinc-500 mt-2">Group products under categories (e.g., Drinkware, Stationery, Tech, Festive). Each category can have a banner image and description.</p>
        </div>
        <button
          onClick={openNew}
          data-testid="category-add-btn"
          className="text-xs px-3 py-1.5 bg-[#002FA7] hover:bg-[#002277] text-white flex items-center gap-1.5"
        >
          <Plus size={12} /> + Add Category
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : items.length === 0 ? (
        <div className="border border-dashed border-zinc-300 p-12 text-center">
          <Layers size={28} className="mx-auto text-zinc-400 mb-3" />
          <p className="text-sm text-zinc-600">No categories yet.</p>
          <button
            onClick={openNew}
            className="mt-4 text-xs px-3 py-1.5 bg-[#002FA7] text-white"
          >
            Create your first category
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {items.map((c) => (
            <div key={c.id} data-testid={`category-row-${c.name}`} className="bg-white border border-zinc-200 p-3 flex gap-3">
              <div className="relative w-24 h-24 shrink-0 border border-zinc-200 bg-white">
                {c.image
                  ? <img src={imageUrl(c.image) + `?v=${c.image}`} alt={c.name} className="w-full h-full object-contain" />
                  : <div className="w-full h-full flex items-center justify-center text-zinc-300"><Layers size={20} /></div>}
                {uploadingId === c.id && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <RefreshCw size={16} className="animate-spin text-[#002FA7]" />
                  </div>
                )}
                <input
                  type="file" accept="image/*"
                  ref={(el) => (fileRefs.current[c.id] = el)}
                  className="hidden"
                  onChange={(e) => onUpload(c, e.target.files?.[0])}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg font-medium truncate">{c.name}</h3>
                  {!c.visible && <span className="text-[10px] uppercase tracking-wider border border-zinc-300 text-zinc-500 px-1.5">hidden</span>}
                </div>
                <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{c.description || "—"}</p>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <button
                    onClick={() => fileRefs.current[c.id]?.click()}
                    data-testid={`category-upload-${c.name}`}
                    className="text-xs px-2.5 py-1 border border-zinc-300 hover:border-[#002FA7] hover:text-[#002FA7] flex items-center gap-1.5"
                  >
                    <Upload size={11} /> Image
                  </button>
                  <button
                    onClick={() => openEdit(c)}
                    data-testid={`category-edit-${c.name}`}
                    className="text-xs px-2.5 py-1 border border-[#002FA7] text-[#002FA7] hover:bg-[#002FA7] hover:text-white flex items-center gap-1.5"
                  >
                    <Pencil size={11} /> Edit
                  </button>
                  <button
                    onClick={() => onToggleVis(c)}
                    className="w-7 h-7 border border-zinc-300 flex items-center justify-center hover:border-zinc-900"
                    title={c.visible ? "Hide" : "Show"}
                  >
                    {c.visible ? <Eye size={11} /> : <EyeOff size={11} className="text-zinc-400" />}
                  </button>
                  <button
                    onClick={() => onDelete(c)}
                    data-testid={`category-delete-${c.name}`}
                    className="w-7 h-7 border border-zinc-300 text-red-600 hover:border-red-600 flex items-center justify-center"
                    title="Delete"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeForm} data-testid="category-modal">
          <div className="bg-white max-w-md w-full border border-zinc-200 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
              <div>
                <p className="overline text-[10px]">{editing ? "Edit" : "New"} Category</p>
                <h3 className="font-display text-xl font-medium mt-1">{form.name || "Untitled"}</h3>
              </div>
              <button onClick={closeForm} className="p-2 hover:bg-zinc-100"><X size={16} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="overline text-[10px]">Name</label>
                <input
                  data-testid="category-name-input"
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  className="mt-2 w-full px-3 py-2 border border-zinc-300 text-sm focus:border-[#002FA7] outline-none"
                  placeholder="e.g. Drinkware, Stationery, Tech, Festive"
                />
              </div>
              <div>
                <label className="overline text-[10px]">Description</label>
                <textarea
                  data-testid="category-description-input"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  className="mt-2 w-full px-3 py-2 border border-zinc-300 text-sm focus:border-[#002FA7] outline-none resize-y"
                  placeholder="Short text shown on the public catalog"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.visible}
                  onChange={(e) => setForm(f => ({ ...f, visible: e.target.checked }))}
                  data-testid="category-visible-input"
                />
                Visible on public catalog
              </label>
              {editing && (
                <p className="text-[11px] text-zinc-500">After creating, click <b>Image</b> on the card to upload a banner.</p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-zinc-200 flex items-center justify-end gap-2 bg-zinc-50">
              <button onClick={closeForm} className="px-4 py-2 border border-zinc-300 text-sm hover:border-zinc-900">Cancel</button>
              <button
                onClick={submit}
                disabled={saving}
                data-testid="category-save-btn"
                className="px-4 py-2 bg-[#002FA7] hover:bg-[#002277] text-white text-sm flex items-center gap-2 disabled:opacity-50"
              >
                <Save size={14} /> {saving ? "Saving…" : (editing ? "Save changes" : "Create category")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
