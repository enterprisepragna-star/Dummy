import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
} from "react";

import api, { imageUrl, formatINR } from "@/lib/api";
import { ADMIN } from "@/constants/testIds";
import { toast } from "sonner";

import {
  Search,
  Eye,
  EyeOff,
  Upload,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Pencil,
  X,
  Check,
  FileText,
  FileUp,
  Plus,
} from "lucide-react";

import ImportPdfModal from "@/components/ImportPdfModal";


/**
 * Products Page
 * --------------------------------------------------
 * Product management page for admin.
 *
 * Includes:
 * - Product listing
 * - Search
 * - Category filter
 * - Price sorting
 * - Edit price
 * - Edit product details
 * - Upload product image
 * - Drag & drop image upload
 * - Visibility toggle
 * - Add product
 * - Import PDF
 */
export default function ProductsPage() {

  /* =========================================================
     STATE
  ========================================================= */

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [sort, setSort] = useState("code");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Price editing
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");

  // Image upload
  const [uploadingId, setUploadingId] = useState(null);
  const [dragId, setDragId] = useState(null);

  // Details modal
  const [detailsId, setDetailsId] = useState(null);

  const [detailsForm, setDetailsForm] = useState({
    code: "",
    set_type: "",
    items: "",
    moq: 50,
    category_id: "",
  });

  const [savingDetails, setSavingDetails] = useState(false);

  // PDF import
  const [showImport, setShowImport] = useState(false);

  // Add product
  const [showAdd, setShowAdd] = useState(false);

  const [addForm, setAddForm] = useState({
    code: "",
    set_type: "",
    items: "",
    sg_price: "",
    moq: 50,
    category_id: "",
    imageFile: null,
  });

  const [addingProduct, setAddingProduct] = useState(false);

  const fileRefs = useRef({});


  /* =========================================================
     LOAD PRODUCTS
  ========================================================= */

  const load = async () => {
    setLoading(true);

    try {
      const [
        { data: prods },
        { data: cats },
      ] = await Promise.all([
        api.get("/products"),
        api.get("/categories"),
      ]);

      /*
       * IMPORTANT:
       * API response may sometimes not be an array.
       * This prevents:
       * "map is not a function"
       */
      setProducts(
        Array.isArray(prods) ? prods : []
      );

      setCategories(
        Array.isArray(cats) ? cats : []
      );

    } catch (error) {

      console.error("Products load error:", error);

      toast.error("Failed to load products");

      setProducts([]);
      setCategories([]);

    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    load();
  }, []);


  /* =========================================================
     CATEGORY NAME
  ========================================================= */

  const catName = (id) => {

    const safeCategories = Array.isArray(categories)
      ? categories
      : [];

    return (
      safeCategories.find(
        (c) => c?.id === id
      )?.name || ""
    );
  };


  /* =========================================================
     FILTER + SORT
  ========================================================= */

  const filtered = useMemo(() => {

    const s = (q || "")
      .trim()
      .toLowerCase();

    /*
     * IMPORTANT:
     * Always make sure products is an array.
     */
    let arr = Array.isArray(products)
      ? products
      : [];


    /* Search */

    if (s) {

      arr = arr.filter((p) => {

        const code = String(
          p?.code ?? ""
        ).toLowerCase();

        const items = String(
          p?.items ?? ""
        ).toLowerCase();

        const setType = String(
          p?.set_type ?? ""
        ).toLowerCase();

        return (
          code.includes(s) ||
          items.includes(s) ||
          setType.includes(s)
        );
      });
    }


    /* Category */

    if (categoryFilter) {

      arr = arr.filter(
        (p) =>
          String(p?.category_id ?? "") ===
          String(categoryFilter)
      );
    }


    /*
     * Make a copy before sorting.
     */
    arr = [...arr];


    /* Price ascending */

    if (sort === "price_asc") {

      arr.sort(
        (a, b) =>
          Number(a?.oncost_price || 0) -
          Number(b?.oncost_price || 0)
      );

    }


    /* Price descending */

    else if (sort === "price_desc") {

      arr.sort(
        (a, b) =>
          Number(b?.oncost_price || 0) -
          Number(a?.oncost_price || 0)
      );

    }


    /* Code sorting */

    else {

      arr.sort(
        (a, b) =>
          String(a?.code ?? "").localeCompare(
            String(b?.code ?? "")
          )
      );
    }

    return arr;

  }, [
    products,
    q,
    sort,
    categoryFilter,
    categories,
  ]);


  /* =========================================================
     PRICE EDIT
  ========================================================= */

  const startEdit = (p) => {

    setEditingId(p.id);

    setEditValue(
      p.override_price ??
      p.oncost_price ??
      ""
    );
  };


  const cancelEdit = () => {

    setEditingId(null);
    setEditValue("");
  };


  const saveEdit = async (p) => {

    const val = String(
      editValue ?? ""
    ).trim();

    const body = {
      override_price:
        val === ""
          ? null
          : Number(val),
    };


    if (
      body.override_price !== null &&
      (
        Number.isNaN(body.override_price) ||
        body.override_price < 0
      )
    ) {

      toast.error(
        "Enter a valid price (or leave empty to clear)"
      );

      return;
    }


    try {

      await api.put(
        `/products/${p.id}`,
        body
      );


      if (
        body.override_price === null
      ) {

        toast.success(
          `Price reset to rule for ${p.code}`
        );

      } else {

        toast.success(
          `Price set to ₹${body.override_price} for ${p.code}`
        );
      }


      setEditingId(null);
      setEditValue("");

      await load();

    } catch (error) {

      console.error(
        "Save price error:",
        error
      );

      toast.error(
        "Could not save price"
      );
    }
  };


  /* =========================================================
     RESET PRICE
  ========================================================= */

  const resetToRule = async (p) => {

    try {

      await api.put(
        `/products/${p.id}`,
        {
          override_price: null,
        }
      );

      toast.success(
        `Reset to auto for ${p.code}`
      );

      await load();

    } catch (error) {

      console.error(
        "Reset price error:",
        error
      );

      toast.error(
        "Failed"
      );
    }
  };


  /* =========================================================
     VISIBILITY
  ========================================================= */

  const onToggleVis = async (p) => {

    try {

      const newVisible =
        !Boolean(p.visible);

      await api.put(
        `/products/${p.id}`,
        {
          visible: newVisible,
        }
      );


      setProducts((prev) => {

        if (!Array.isArray(prev)) {
          return [];
        }

        return prev.map((x) =>
          x.id === p.id
            ? {
                ...x,
                visible: newVisible,
              }
            : x
        );
      });

    } catch (error) {

      console.error(
        "Visibility error:",
        error
      );

      toast.error(
        "Failed"
      );
    }
  };


  /* =========================================================
     DETAILS
  ========================================================= */

  const openDetails = (p) => {

    setDetailsId(p.id);

    setDetailsForm({

      code: p?.code || "",

      set_type:
        p?.set_type || "",

      items:
        p?.items || "",

      moq:
        p?.moq ?? 50,

      category_id:
        p?.category_id || "",
    });
  };


  const closeDetails = () => {

    setDetailsId(null);
    setSavingDetails(false);
  };


  const saveDetails = async () => {

    if (!detailsId) {
      return;
    }


    const body = {

      code:
        String(
          detailsForm.code || ""
        ).trim(),

      set_type:
        String(
          detailsForm.set_type || ""
        ).trim(),

      items:
        String(
          detailsForm.items || ""
        ).trim(),

      moq:
        Number(detailsForm.moq) || 0,

      category_id:
        detailsForm.category_id || null,
    };


    if (!body.code) {

      toast.error(
        "Code is required"
      );

      return;
    }


    if (body.moq < 1) {

      toast.error(
        "MOQ must be at least 1"
      );

      return;
    }


    setSavingDetails(true);


    try {

      await api.put(
        `/products/${detailsId}`,
        body
      );


      toast.success(
        `Updated ${body.code}`
      );


      closeDetails();

      await load();

    } catch (error) {

      console.error(
        "Save details error:",
        error
      );


      const msg =
        error?.response?.data?.detail ||
        "Could not save details";


      toast.error(
        typeof msg === "string"
          ? msg
          : "Save failed"
      );


      setSavingDetails(false);
    }
  };


  /* =========================================================
     ADD PRODUCT
  ========================================================= */

  const openAdd = () => {

    setAddForm({

      code: "",
      set_type: "",
      items: "",
      sg_price: "",
      moq: 50,
      category_id: "",
      imageFile: null,

    });

    setShowAdd(true);
  };


  const closeAdd = () => {

    setShowAdd(false);
    setAddingProduct(false);
  };


  const submitAdd = async () => {

    const body = {

      code:
        String(
          addForm.code || ""
        ).trim(),

      set_type:
        String(
          addForm.set_type || ""
        ).trim(),

      items:
        String(
          addForm.items || ""
        ).trim(),

      sg_price:
        Number(addForm.sg_price),

      moq:
        Number(addForm.moq) || 50,

      category_id:
        addForm.category_id || null,

      visible: true,
    };


    if (!body.code) {

      toast.error(
        "Product code is required"
      );

      return;
    }


    if (
      Number.isNaN(body.sg_price) ||
      body.sg_price < 0
    ) {

      toast.error(
        "Enter a valid supplier price"
      );

      return;
    }


    if (body.moq < 1) {

      toast.error(
        "MOQ must be at least 1"
      );

      return;
    }


    setAddingProduct(true);


    try {

      const {
        data: created,
      } = await api.post(
        "/products",
        body
      );


      /* Optional image */

      if (
        addForm.imageFile &&
        created?.id
      ) {

        const fd =
          new FormData();

        fd.append(
          "file",
          addForm.imageFile
        );


        try {

          await api.post(
            `/products/${created.id}/image`,
            fd,
            {
              headers: {
                "Content-Type":
                  "multipart/form-data",
              },
            }
          );

        } catch (imageError) {

          console.error(
            "Image upload error:",
            imageError
          );

          toast.warning(
            `Product ${body.code} created, but image upload failed`
          );
        }
      }


      toast.success(
        `Added ${body.code}`
      );


      closeAdd();

      await load();

    } catch (error) {

      console.error(
        "Create product error:",
        error
      );


      const msg =
        error?.response?.data?.detail ||
        "Could not create product";


      toast.error(
        typeof msg === "string"
          ? msg
          : "Create failed"
      );


      setAddingProduct(false);
    }
  };


  /* =========================================================
     IMAGE UPLOAD
  ========================================================= */

  const onUpload = async (
    p,
    file
  ) => {

    if (!file) {
      return;
    }


    if (
      !file.type.startsWith(
        "image/"
      )
    ) {

      toast.error(
        "Please choose an image file"
      );

      return;
    }


    if (
      file.size >
      8 * 1024 * 1024
    ) {

      toast.error(
        "Image too large (max 8MB)"
      );

      return;
    }


    setUploadingId(p.id);


    try {

      const fd =
        new FormData();

      fd.append(
        "file",
        file
      );


      await api.post(
        `/products/${p.id}/image`,
        fd,
        {
          headers: {
            "Content-Type":
              "multipart/form-data",
          },
        }
      );


      toast.success(
        `Image updated for ${p.code}`
      );


      await load();

    } catch (error) {

      console.error(
        "Upload error:",
        error
      );

      toast.error(
        "Upload failed"
      );

    } finally {

      setUploadingId(null);
    }
  };


  /* =========================================================
     DRAG & DROP
  ========================================================= */

  const onDrop = (
    p,
    e
  ) => {

    e.preventDefault();

    setDragId(null);

    const f =
      e.dataTransfer?.files?.[0];

    if (f) {
      onUpload(p, f);
    }
  };


  /* =========================================================
     SORT BUTTON
  ========================================================= */

  const SortBtn = ({
    value,
    label,
    icon: Icon,
  }) => (

    <button
      onClick={() =>
        setSort(value)
      }

      data-testid={
        `sort-${value}`
      }

      className={`
        text-xs px-3 py-1.5
        border transition-all
        flex items-center gap-1.5
        ${
          sort === value
            ? "border-[#002FA7] text-[#002FA7] bg-[#002FA7]/5"
            : "border-zinc-300 text-zinc-600 hover:border-zinc-900"
        }
      `}
    >

      <Icon size={11} />

      {label}

    </button>
  );


  /* =========================================================
     RENDER
  ========================================================= */

  return (

    <div>

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div
        className="
          flex flex-col
          lg:flex-row
          lg:items-end
          lg:justify-between
          gap-4 mb-6
        "
      >

        <div>

          <p className="overline">
            Catalog
          </p>

          <h1
            className="
              font-display
              text-4xl
              font-light
              mt-1
              tracking-tight
            "
          >
            Products
          </h1>

          <p
            className="
              text-sm
              text-zinc-500
              mt-2
            "
          >
            {Array.isArray(products)
              ? products.length
              : 0}{" "}
            items. Click{" "}

            <b className="text-zinc-900">
              Edit Price
            </b>{" "}

            to override a price or{" "}

            <b className="text-zinc-900">
              Upload Image
            </b>{" "}

            to replace the supplier photo.
          </p>

        </div>


        {/* Controls */}

        <div
          className="
            flex flex-wrap
            items-center
            gap-2
          "
        >

          {/* Add */}

          <button
            onClick={openAdd}
            data-testid="add-product-btn"
            className="
              text-xs
              px-3
              py-1.5
              bg-[#FF3B30]
              hover:bg-[#cc2f26]
              text-white
              flex
              items-center
              gap-1.5
            "
          >

            <Plus size={12} />

            + Add Product

          </button>


          {/* Import */}

          <button
            onClick={() =>
              setShowImport(true)
            }

            data-testid="open-import-pdf"

            className="
              text-xs
              px-3
              py-1.5
              bg-[#002FA7]
              hover:bg-[#002277]
              text-white
              flex
              items-center
              gap-1.5
            "
          >

            <FileUp size={12} />

            + Import from PDF

          </button>


          {/* Category */}

          {Array.isArray(categories) &&
            categories.length > 0 && (

              <select
                value={categoryFilter}

                onChange={(e) =>
                  setCategoryFilter(
                    e.target.value
                  )
                }

                data-testid="category-filter"

                className="
                  text-xs
                  px-2
                  py-1.5
                  border
                  border-zinc-300
                  bg-white
                  focus:border-[#002FA7]
                  outline-none
                "
              >

                <option value="">
                  All categories
                </option>


                {Array.isArray(categories) &&
                  categories.map((c) => (

                    <option
                      key={c.id}
                      value={c.id}
                    >
                      {c.name}
                    </option>

                  ))}

              </select>
            )}


          {/* Sort */}

          <SortBtn
            value="code"
            label="Code"
            icon={ArrowUpDown}
          />

          <SortBtn
            value="price_asc"
            label="Price ↑"
            icon={ArrowUp}
          />

          <SortBtn
            value="price_desc"
            label="Price ↓"
            icon={ArrowDown}
          />


          {/* Search */}

          <div className="relative">

            <Search
              size={14}
              className="
                absolute
                left-3
                top-1/2
                -translate-y-1/2
                text-zinc-400
              "
            />

            <input
              value={q}
              onChange={(e) =>
                setQ(e.target.value)
              }

              placeholder="Search…"

              className="
                pl-9
                pr-3
                py-2
                border
                border-zinc-300
                text-sm
                w-60
                focus:border-[#002FA7]
                outline-none
              "

              data-testid="products-search"
            />

          </div>

        </div>

      </div>


      {/* =====================================================
          PRODUCTS
      ===================================================== */}

      {loading ? (

        <p className="text-sm text-zinc-500">
          Loading…
        </p>

      ) : (

        <div
          className="
            grid
            grid-cols-1
            gap-3
          "
        >

          {Array.isArray(filtered) &&
            filtered.map((p) => {

              const isEditing =
                editingId === p.id;

              const isUploading =
                uploadingId === p.id;

              const hasOverride =
                p.override_price !== null &&
                p.override_price !== undefined;


              return (

                <div
                  key={p.id}

                  data-testid={
                    ADMIN.productRow(
                      p.code || ""
                    )
                  }

                  onDragOver={(e) => {

                    e.preventDefault();

                    setDragId(p.id);
                  }}

                  onDragLeave={() =>
                    setDragId(null)
                  }

                  onDrop={(e) =>
                    onDrop(p, e)
                  }

                  className={`
                    bg-white
                    border
                    ${
                      dragId === p.id
                        ? "border-[#002FA7] border-dashed bg-[#002FA7]/5"
                        : "border-zinc-200"
                    }
                    p-3
                    flex
                    items-stretch
                    gap-4
                    transition-all
                  `}
                >

                  {/* =================================================
                      IMAGE
                  ================================================= */}

                  <div
                    className="
                      relative
                      w-20
                      h-20
                      shrink-0
                      border
                      border-zinc-200
                      bg-white
                    "
                  >

                    {p.image && (

                      <img
                        src={
                          imageUrl(
                            p.image
                          ) +
                          `?v=${encodeURIComponent(
                            p.image
                          )}`
                        }

                        alt={
                          p.code || "Product"
                        }

                        className="
                          w-full
                          h-full
                          object-contain
                        "
                      />

                    )}


                    {isUploading && (

                      <div
                        className="
                          absolute
                          inset-0
                          bg-white/80
                          flex
                          items-center
                          justify-center
                        "
                      >

                        <RefreshCw
                          size={16}
                          className="
                            animate-spin
                            text-[#002FA7]
                          "
                        />

                      </div>

                    )}


                    <input
                      type="file"
                      accept="image/*"

                      ref={(el) => {

                        fileRefs.current[
                          p.id
                        ] = el;
                      }}

                      className="hidden"

                      onChange={(e) =>
                        onUpload(
                          p,
                          e.target.files?.[0]
                        )
                      }
                    />

                  </div>


                  {/* =================================================
                      INFO
                  ================================================= */}

                  <div
                    className="
                      flex-1
                      min-w-0
                    "
                  >

                    <div
                      className="
                        flex
                        items-center
                        gap-2
                        flex-wrap
                      "
                    >

                      <p
                        className="
                          font-mono
                          text-[12px]
                          font-bold
                          tracking-wider
                        "
                      >
                        {p.code || "—"}
                      </p>


                      {p.category_id &&
                        catName(
                          p.category_id
                        ) && (

                          <span
                            className="
                              text-[10px]
                              uppercase
                              tracking-wider
                              bg-zinc-100
                              text-zinc-700
                              px-1.5
                              py-0.5
                            "
                          >
                            {catName(
                              p.category_id
                            )}
                          </span>

                        )}


                      {!p.visible && (

                        <span
                          className="
                            text-[10px]
                            uppercase
                            tracking-wider
                            border
                            border-zinc-300
                            text-zinc-500
                            px-1.5
                          "
                        >
                          hidden
                        </span>

                      )}


                      {hasOverride && (

                        <span
                          className="
                            text-[10px]
                            uppercase
                            tracking-wider
                            bg-[#002FA7]
                            text-white
                            px-1.5
                          "
                        >
                          custom price
                        </span>

                      )}

                    </div>


                    <p
                      className="
                        font-display
                        text-base
                        font-medium
                        mt-0.5
                        truncate
                      "
                    >
                      {p.set_type || "—"}
                    </p>


                    <p
                      className="
                        text-xs
                        text-zinc-500
                        mt-0.5
                        line-clamp-1
                      "
                    >
                      {p.items || ""}
                    </p>


                    <p
                      className="
                        overline
                        text-[10px]
                        mt-2
                      "
                    >
                      MOQ {p.moq ?? 0}
                      {" • "}
                      SG cost{" "}

                      <span className="font-mono">
                        {formatINR(
                          p.sg_price || 0
                        )}
                      </span>

                    </p>

                  </div>


                  {/* =================================================
                      PRICE + ACTIONS
                  ================================================= */}

                  <div
                    className="
                      flex
                      flex-col
                      items-end
                      gap-2
                      shrink-0
                    "
                  >

                    {isEditing ? (

                      <div
                        className="
                          flex
                          items-center
                          gap-1.5
                        "
                      >

                        <span
                          className="
                            text-zinc-500
                            font-mono
                            text-sm
                          "
                        >
                          ₹
                        </span>


                        <input
                          data-testid={
                            `price-input-${p.code}`
                          }

                          autoFocus

                          type="number"

                          value={editValue}

                          onChange={(e) =>
                            setEditValue(
                              e.target.value
                            )
                          }

                          onKeyDown={(e) => {

                            if (
                              e.key ===
                              "Enter"
                            ) {
                              saveEdit(p);
                            }

                            if (
                              e.key ===
                              "Escape"
                            ) {
                              cancelEdit();
                            }
                          }}

                          placeholder="auto"

                          className="
                            w-28
                            px-2
                            py-1.5
                            border
                            border-[#002FA7]
                            text-right
                            font-mono
                            text-base
                            outline-none
                            focus:ring-2
                            focus:ring-[#002FA7]/20
                          "
                        />


                        <button
                          data-testid={
                            `price-save-${p.code}`
                          }

                          onClick={() =>
                            saveEdit(p)
                          }

                          className="
                            w-8
                            h-8
                            bg-[#002FA7]
                            text-white
                            flex
                            items-center
                            justify-center
                            hover:bg-[#002277]
                          "

                          title="Save"
                        >

                          <Check
                            size={14}
                          />

                        </button>


                        <button
                          data-testid={
                            `price-cancel-${p.code}`
                          }

                          onClick={
                            cancelEdit
                          }

                          className="
                            w-8
                            h-8
                            border
                            border-zinc-300
                            text-zinc-600
                            flex
                            items-center
                            justify-center
                            hover:border-zinc-900
                          "

                          title="Cancel"
                        >

                          <X
                            size={14}
                          />

                        </button>

                      </div>

                    ) : (

                      <p
                        className="
                          font-display
                          text-2xl
                          font-medium
                          leading-none
                        "
                      >
                        {formatINR(
                          p.oncost_price || 0
                        )}
                      </p>

                    )}


                    {!isEditing && (

                      <div
                        className="
                          flex
                          items-center
                          gap-2
                          flex-wrap
                          justify-end
                        "
                      >

                        {/* Edit Price */}

                        <button
                          data-testid={
                            `edit-price-${p.code}`
                          }

                          onClick={() =>
                            startEdit(p)
                          }

                          className="
                            text-xs
                            px-3
                            py-1.5
                            border
                            border-[#002FA7]
                            text-[#002FA7]
                            hover:bg-[#002FA7]
                            hover:text-white
                            flex
                            items-center
                            gap-1.5
                            transition-all
                          "
                        >

                          <Pencil
                            size={12}
                          />

                          Edit Price

                        </button>


                        {/* Edit Details */}

                        <button
                          data-testid={
                            `edit-details-${p.code}`
                          }

                          onClick={() =>
                            openDetails(p)
                          }

                          className="
                            text-xs
                            px-3
                            py-1.5
                            border
                            border-zinc-300
                            hover:border-[#002FA7]
                            hover:text-[#002FA7]
                            flex
                            items-center
                            gap-1.5
                          "
                        >

                          <FileText
                            size={12}
                          />

                          Edit Details

                        </button>


                        {/* Upload */}

                        <button
                          data-testid={
                            `product-upload-${p.code}`
                          }

                          onClick={() =>
                            fileRefs.current[
                              p.id
                            ]?.click()
                          }

                          disabled={
                            isUploading
                          }

                          className="
                            text-xs
                            px-3
                            py-1.5
                            border
                            border-zinc-300
                            hover:border-[#002FA7]
                            hover:text-[#002FA7]
                            flex
                            items-center
                            gap-1.5
                          "
                        >

                          <Upload
                            size={12}
                          />

                          Upload Image

                        </button>


                        {/* Visibility */}

                        <button
                          onClick={() =>
                            onToggleVis(p)
                          }

                          data-testid={
                            ADMIN.productVisibility(
                              p.code || ""
                            )
                          }

                          className="
                            w-8
                            h-8
                            border
                            border-zinc-300
                            flex
                            items-center
                            justify-center
                            hover:border-zinc-900
                          "

                          title={
                            p.visible
                              ? "Hide from catalog"
                              : "Show in catalog"
                          }
                        >

                          {p.visible ? (

                            <Eye
                              size={12}
                            />

                          ) : (

                            <EyeOff
                              size={12}
                              className="
                                text-zinc-400
                              "
                            />

                          )}

                        </button>


                        {/* Reset price */}

                        {hasOverride && (

                          <button
                            data-testid={
                              `reset-price-${p.code}`
                            }

                            onClick={() =>
                              resetToRule(p)
                            }

                            className="
                              text-[10px]
                              uppercase
                              tracking-wider
                              text-zinc-500
                              hover:text-zinc-900
                              underline-offset-2
                              hover:underline
                            "

                            title="
                              Remove custom price,
                              use rule
                            "
                          >
                            reset
                          </button>

                        )}

                      </div>

                    )}

                  </div>

                </div>
              );
            })}


          {/* No products */}

          {!loading &&
            Array.isArray(filtered) &&
            filtered.length === 0 && (

              <div
                className="
                  border
                  border-zinc-200
                  bg-white
                  p-10
                  text-center
                "
              >

                <p
                  className="
                    text-sm
                    text-zinc-500
                  "
                >
                  No products found.
                </p>

              </div>

            )}

        </div>
      )}


      {/* =====================================================
          TIPS
      ===================================================== */}

      <div
        className="
          mt-8
          p-4
          bg-zinc-50
          border
          border-zinc-200
          text-xs
          text-zinc-600
          leading-relaxed
        "
      >

        <p
          className="
            overline
            text-[10px]
            mb-1
          "
        >
          Tips
        </p>

        <ul
          className="
            space-y-1
            list-disc
            list-inside
          "
        >

          <li>
            <b>Edit Price</b> sets a
            custom price for this item
            and overrides the global
            markup rule.
          </li>

          <li>
            <b>Edit Details</b> changes
            the code, set type,
            description and MOQ.
          </li>

          <li>
            Click <b>reset</b> next to
            a row to remove the custom
            price and follow the rule
            again.
          </li>

          <li>
            <b>Upload Image</b> replaces
            the supplier photo. You can
            also drag and drop an image
            file onto any row.
          </li>

          <li>
            Allowed: JPG, PNG, WEBP —
            up to 8 MB. Images are
            auto-resized and centered
            on a white background.
          </li>

        </ul>

      </div>


      {/* =====================================================
          EDIT DETAILS MODAL
      ===================================================== */}

      {detailsId && (

        <div
          className="
            fixed
            inset-0
            z-50
            flex
            items-center
            justify-center
            bg-black/50
            p-4
          "

          onClick={closeDetails}

          data-testid="details-modal"
        >

          <div
            className="
              bg-white
              max-w-xl
              w-full
              border
              border-zinc-200
              shadow-xl
              max-h-[90vh]
              overflow-y-auto
            "

            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* Header */}

            <div
              className="
                px-6
                py-4
                border-b
                border-zinc-200
                flex
                items-center
                justify-between
              "
            >

              <div>

                <p
                  className="
                    overline
                    text-[10px]
                  "
                >
                  Edit Product Details
                </p>

                <h3
                  className="
                    font-display
                    text-xl
                    font-medium
                    mt-1
                  "
                >
                  {detailsForm.code ||
                    "—"}
                </h3>

              </div>


              <button
                onClick={closeDetails}
                className="
                  p-2
                  hover:bg-zinc-100
                "

                data-testid="details-close"
              >

                <X size={16} />

              </button>

            </div>


            {/* Form */}

            <div
              className="
                px-6
                py-5
                space-y-4
              "
            >

              {/* Code */}

              <div>

                <label
                  className="
                    overline
                    text-[10px]
                  "
                >
                  Code (SKU)
                </label>

                <input
                  data-testid="details-code"

                  value={
                    detailsForm.code
                  }

                  onChange={(e) =>
                    setDetailsForm(
                      (f) => ({
                        ...f,
                        code:
                          e.target.value,
                      })
                    )
                  }

                  className="
                    mt-2
                    w-full
                    px-3
                    py-2
                    border
                    border-zinc-300
                    font-mono
                    text-sm
                    focus:border-[#002FA7]
                    outline-none
                  "

                  placeholder="e.g. SG 501"
                />

              </div>


              {/* Set type */}

              <div>

                <label
                  className="
                    overline
                    text-[10px]
                  "
                >
                  Set Type
                </label>

                <input
                  value={
                    detailsForm.set_type
                  }

                  onChange={(e) =>
                    setDetailsForm(
                      (f) => ({
                        ...f,
                        set_type:
                          e.target.value,
                      })
                    )
                  }

                  className="
                    mt-2
                    w-full
                    px-3
                    py-2
                    border
                    border-zinc-300
                    text-sm
                    focus:border-[#002FA7]
                    outline-none
                  "

                  placeholder="Set type"
                />

              </div>


              {/* Items */}

              <div>

                <label
                  className="
                    overline
                    text-[10px]
                  "
                >
                  Items / Description
                </label>

                <textarea
                  value={
                    detailsForm.items
                  }

                  onChange={(e) =>
                    setDetailsForm(
                      (f) => ({
                        ...f,
                        items:
                          e.target.value,
                      })
                    )
                  }

                  rows={4}

                  className="
                    mt-2
                    w-full
                    px-3
                    py-2
                    border
                    border-zinc-300
                    text-sm
                    focus:border-[#002FA7]
                    outline-none
                    resize-y
                  "

                  placeholder="
                    Product description
                  "
                />

              </div>


              {/* MOQ */}

              <div>

                <label
                  className="
                    overline
                    text-[10px]
                  "
                >
                  MOQ
                </label>

                <input
                  type="number"
                  min="1"

                  value={
                    detailsForm.moq
                  }

                  onChange={(e) =>
                    setDetailsForm(
                      (f) => ({
                        ...f,
                        moq:
                          e.target.value,
                      })
                    )
                  }

                  className="
                    mt-2
                    w-full
                    px-3
                    py-2
                    border
                    border-zinc-300
                    text-sm
                    focus:border-[#002FA7]
                    outline-none
                  "
                />

              </div>


              {/* Category */}

              <div>

                <label
                  className="
                    overline
                    text-[10px]
                  "
                >
                  Category
                </label>

                <select
                  value={
                    detailsForm.category_id
                  }

                  onChange={(e) =>
                    setDetailsForm(
                      (f) => ({
                        ...f,
                        category_id:
                          e.target.value,
                      })
                    )
                  }

                  className="
                    mt-2
                    w-full
                    px-3
                    py-2
                    border
                    border-zinc-300
                    text-sm
                    bg-white
                    focus:border-[#002FA7]
                    outline-none
                  "
                >

                  <option value="">
                    No category
                  </option>

                  {Array.isArray(
                    categories
                  ) &&
                    categories.map(
                      (c) => (

                        <option
                          key={c.id}
                          value={c.id}
                        >
                          {c.name}
                        </option>

                      )
                    )}

                </select>

              </div>


              {/* Buttons */}

              <div
                className="
                  pt-3
                  flex
                  justify-end
                  gap-2
                "
              >

                <button
                  onClick={
                    closeDetails
                  }

                  disabled={
                    savingDetails
                  }

                  className="
                    px-4
                    py-2
                    text-sm
                    border
                    border-zinc-300
                    hover:border-zinc-900
                  "
                >
                  Cancel
                </button>


                <button
                  onClick={
                    saveDetails
                  }

                  disabled={
                    savingDetails
                  }

                  className="
                    px-4
                    py-2
                    text-sm
                    bg-[#002FA7]
                    text-white
                    hover:bg-[#002277]
                    disabled:opacity-50
                  "
                >

                  {savingDetails
                    ? "Saving..."
                    : "Save Details"}

                </button>

              </div>

            </div>

          </div>

        </div>

      )}


      {/* =====================================================
          ADD PRODUCT MODAL
      ===================================================== */}

      {showAdd && (

        <div
          className="
            fixed
            inset-0
            z-50
            flex
            items-center
            justify-center
            bg-black/50
            p-4
          "

          onClick={closeAdd}
        >

          <div
            className="
              bg-white
              max-w-xl
              w-full
              border
              border-zinc-200
              shadow-xl
              max-h-[90vh]
              overflow-y-auto
            "

            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* Header */}

            <div
              className="
                px-6
                py-4
                border-b
                border-zinc-200
                flex
                items-center
                justify-between
              "
            >

              <div>

                <p
                  className="
                    overline
                    text-[10px]
                  "
                >
                  Catalog
                </p>

                <h3
                  className="
                    font-display
                    text-xl
                    font-medium
                    mt-1
                  "
                >
                  Add Product
                </h3>

              </div>


              <button
                onClick={closeAdd}
                className="
                  p-2
                  hover:bg-zinc-100
                "
              >

                <X size={16} />

              </button>

            </div>


            {/* Form */}

            <div
              className="
                px-6
                py-5
                space-y-4
              "
            >

              {/* Code */}

              <div>

                <label
                  className="
                    overline
                    text-[10px]
                  "
                >
                  Product Code
                </label>

                <input
                  value={
                    addForm.code
                  }

                  onChange={(e) =>
                    setAddForm(
                      (f) => ({
                        ...f,
                        code:
                          e.target.value,
                      })
                    )
                  }

                  className="
                    mt-2
                    w-full
                    px-3
                    py-2
                    border
                    border-zinc-300
                    font-mono
                    text-sm
                    focus:border-[#002FA7]
                    outline-none
                  "

                  placeholder="e.g. SG 501"
                />

              </div>


              {/* Set type */}

              <div>

                <label
                  className="
                    overline
                    text-[10px]
                  "
                >
                  Set Type
                </label>

                <input
                  value={
                    addForm.set_type
                  }

                  onChange={(e) =>
                    setAddForm(
                      (f) => ({
                        ...f,
                        set_type:
                          e.target.value,
                      })
                    )
                  }

                  className="
                    mt-2
                    w-full
                    px-3
                    py-2
                    border
                    border-zinc-300
                    text-sm
                    focus:border-[#002FA7]
                    outline-none
                  "
                />

              </div>


              {/* Items */}

              <div>

                <label
                  className="
                    overline
                    text-[10px]
                  "
                >
                  Items / Description
                </label>

                <textarea
                  value={
                    addForm.items
                  }

                  onChange={(e) =>
                    setAddForm(
                      (f) => ({
                        ...f,
                        items:
                          e.target.value,
                      })
                    )
                  }

                  rows={3}

                  className="
                    mt-2
                    w-full
                    px-3
                    py-2
                    border
                    border-zinc-300
                    text-sm
                    focus:border-[#002FA7]
                    outline-none
                  "
                />

              </div>


              {/* Supplier price */}

              <div>

                <label
                  className="
                    overline
                    text-[10px]
                  "
                >
                  Supplier Price
                </label>

                <input
                  type="number"
                  min="0"

                  value={
                    addForm.sg_price
                  }

                  onChange={(e) =>
                    setAddForm(
                      (f) => ({
                        ...f,
                        sg_price:
                          e.target.value,
                      })
                    )
                  }

                  className="
                    mt-2
                    w-full
                    px-3
                    py-2
                    border
                    border-zinc-300
                    text-sm
                    focus:border-[#002FA7]
                    outline-none
                  "

                  placeholder="0"
                />

              </div>


              {/* MOQ */}

              <div>

                <label
                  className="
                    overline
                    text-[10px]
                  "
                >
                  MOQ
                </label>

                <input
                  type="number"
                  min="1"

                  value={
                    addForm.moq
                  }

                  onChange={(e) =>
                    setAddForm(
                      (f) => ({
                        ...f,
                        moq:
                          e.target.value,
                      })
                    )
                  }

                  className="
                    mt-2
                    w-full
                    px-3
                    py-2
                    border
                    border-zinc-300
                    text-sm
                    focus:border-[#002FA7]
                    outline-none
                  "
                />

              </div>


              {/* Category */}

              <div>

                <label
                  className="
                    overline
                    text-[10px]
                  "
                >
                  Category
                </label>

                <select
                  value={
                    addForm.category_id
                  }

                  onChange={(e) =>
                    setAddForm(
                      (f) => ({
                        ...f,
                        category_id:
                          e.target.value,
                      })
                    )
                  }

                  className="
                    mt-2
                    w-full
                    px-3
                    py-2
                    border
                    border-zinc-300
                    bg-white
                    text-sm
                    focus:border-[#002FA7]
                    outline-none
                  "
                >

                  <option value="">
                    No category
                  </option>

                  {Array.isArray(
                    categories
                  ) &&
                    categories.map(
                      (c) => (

                        <option
                          key={c.id}
                          value={c.id}
                        >
                          {c.name}
                        </option>

                      )
                    )}

                </select>

              </div>


              {/* Image */}

              <div>

                <label
                  className="
                    overline
                    text-[10px]
                  "
                >
                  Product Image
                </label>

                <input
                  type="file"
                  accept="image/*"

                  onChange={(e) =>
                    setAddForm(
                      (f) => ({
                        ...f,
                        imageFile:
                          e.target.files?.[0] ||
                          null,
                      })
                    )
                  }

                  className="
                    mt-2
                    block
                    w-full
                    text-sm
                  "
                />

              </div>


              {/* Buttons */}

              <div
                className="
                  pt-3
                  flex
                  justify-end
                  gap-2
                "
              >

                <button
                  onClick={closeAdd}
                  disabled={
                    addingProduct
                  }

                  className="
                    px-4
                    py-2
                    text-sm
                    border
                    border-zinc-300
                    hover:border-zinc-900
                  "
                >
                  Cancel
                </button>


                <button
                  onClick={submitAdd}
                  disabled={
                    addingProduct
                  }

                  className="
                    px-4
                    py-2
                    text-sm
                    bg-[#FF3B30]
                    text-white
                    hover:bg-[#cc2f26]
                    disabled:opacity-50
                  "
                >

                  {addingProduct
                    ? "Adding..."
                    : "Add Product"}

                </button>

              </div>

            </div>

          </div>

        </div>

      )}


      {/* =====================================================
          IMPORT PDF
      ===================================================== */}

      {showImport && (

        <ImportPdfModal
          open={showImport}
          onClose={() =>
            setShowImport(false)
          }
          onImported={() => {
            setShowImport(false);
            load();
          }}
        />

      )}

    </div>
  );
}
