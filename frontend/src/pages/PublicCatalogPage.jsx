import React, { useEffect, useState, useMemo } from "react";
import api, { imageUrl, formatINR } from "@/lib/api";
import { PUBLIC } from "@/constants/testIds";
import { Search, ArrowUp, ArrowDown, ArrowUpDown, ZoomIn } from "lucide-react";
import { Link } from "react-router-dom";
import ImageLightbox from "@/components/ImageLightbox";

export default function PublicCatalogPage() {
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("code");
  const [zoom, setZoom] = useState(null); // { src, alt, caption } | null

  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/public/products")
      .then(({ data }) => {
        let prods = [];
        if (Array.isArray(data)) {
          prods = data;
        } else if (data && Array.isArray(data.products)) {
          prods = data.products;
        } else if (data && Array.isArray(data.items)) {
          prods = data.items;
        } else if (data && Array.isArray(data.data)) {
          prods = data.data;
        }
        setProducts(prods);
      })
      .catch((err) => {
        console.error("Failed to load public catalog products:", err);
        setError("Failed to load catalog products. Please refresh or try again later.");
      });

    // Persist a referral tag if the visitor arrived via /refer or ?ref=
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref) localStorage.setItem("oncost_ref", ref.toUpperCase());
    } catch { /* noop */ }
  }, []);

 const filtered = useMemo(() => {
  const s = q.trim().toLowerCase();
  let arr = products;

  if (s) {
    arr = arr.filter(
      p =>
        String(p.code ?? "").toLowerCase().includes(s) ||
        String(p.items ?? "").toLowerCase().includes(s)
    );
  }

  arr = [...arr];

  if (sort === "price_asc") {
    arr.sort(
      (a, b) => (a.oncost_price || 0) - (b.oncost_price || 0)
    );
  } else if (sort === "price_desc") {
    arr.sort(
      (a, b) => (b.oncost_price || 0) - (a.oncost_price || 0)
    );
  } else {
  arr.sort((a, b) =>
    String(a?.code ?? "").localeCompare(
      String(b?.code ?? "")
    )
  );
}

  return arr;
}, [products, q, sort]);

const SortBtn = ({ value, label, icon: Icon }) => (
  <button
    onClick={() => setSort(value)}
    data-testid={`cat-sort-${value}`}
    className={`text-xs px-3 py-1.5 border transition-all flex items-center gap-1.5 ${
      sort === value
        ? "border-[#002FA7] text-[#002FA7] bg-[#002FA7]/5"
        : "border-zinc-300 text-zinc-600 hover:border-zinc-900"
    }`}
  >
    <Icon size={11} />
    {label}
  </button>
);
  return (
    <div data-testid={PUBLIC.catalogContainer} className="min-h-screen bg-white">
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-baseline gap-2">
            <Link to="/" className="logo-mark text-2xl">ONCOST</Link>
            <span className="overline text-[10px]">catalog 2026</span>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="pl-9 pr-3 py-2 border border-zinc-300 text-sm w-48 sm:w-64 focus:border-[#002FA7] outline-none" />
          </div>
        </div>
      </div>

      <section className="max-w-6xl mx-auto px-6 py-14 lg:py-20">
        <p className="overline">Corporate Gifting · 2026</p>
        <h1 className="font-display text-4xl sm:text-5xl lg:text-7xl font-light tracking-tight mt-3 max-w-3xl">
          Premium Corporate Gifting <span className="text-[#002FA7]">Made Simple.</span>
        </h1>
        <p className="text-zinc-500 mt-6 max-w-2xl">
          Discover {products.length} thoughtfully curated gift sets for every business occasion. Compare options, customize selections, and generate professional quotations instantly.
        </p>
      </section>

      <div className="sticky top-[57px] z-20 bg-white/90 backdrop-blur border-t border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-2 flex-wrap">
          <p className="text-xs text-zinc-500"><span className="font-mono font-bold text-zinc-900">{filtered.length}</span> result{filtered.length !== 1 ? "s" : ""}</p>
          <div className="flex items-center gap-2">
            <span className="overline text-[10px] hidden sm:inline mr-1">Sort by</span>
            <SortBtn value="code" label="Code" icon={ArrowUpDown} />
            <SortBtn value="price_asc" label="Price low→high" icon={ArrowUp} />
            <SortBtn value="price_desc" label="Price high→low" icon={ArrowDown} />
          </div>
        </div>
      </div>

      <section className="max-w-6xl mx-auto px-6 py-10 pb-24">
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
          {filtered.map(p => (
            <article key={p.id} className="group">
              {p.image && (
                <button
                  type="button"
                  onClick={() => setZoom({ src: imageUrl(p.image), alt: p.code, caption: `${p.code} · ${p.set_type || ""}` })}
                  className="relative block w-full aspect-[4/3] overflow-hidden bg-white border border-zinc-200 cursor-zoom-in group/img"
                  data-testid={`product-image-${p.code}`}
                  aria-label={`Enlarge image of ${p.code}`}
                >
                  <img src={imageUrl(p.image) + `?v=${p.image}`} alt={p.code} className="w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-105" />
                  <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] uppercase tracking-wider font-mono px-2 py-1 flex items-center gap-1 opacity-0 group-hover/img:opacity-100 transition-opacity">
                    <ZoomIn size={11} /> Click to enlarge
                  </span>
                </button>
              )}
              <div className="mt-3 flex items-center justify-between">
                <p className="font-mono text-[11px] font-bold">{p.code}</p>
                <p className="overline text-[10px]">MOQ {p.moq}</p>
              </div>
              <p className="font-display text-xl font-medium mt-1">{p.set_type}</p>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed line-clamp-2">{p.items}</p>
              <p className="font-display text-2xl font-medium mt-3">{formatINR(p.oncost_price)}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-zinc-200 py-10">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-xs text-zinc-500">
          <p className="font-mono">© ONCOST {new Date().getFullYear()}</p>
          <p>Bengaluru · India</p>
        </div>
      </footer>

      {zoom && <ImageLightbox {...zoom} onClose={() => setZoom(null)} />}
    </div>
  );
}
