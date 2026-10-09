"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Trash2,
  LayoutGrid,
  DollarSign,
  UploadCloud,
  ArrowLeft,
} from "lucide-react";
import { createDailySaleListing } from "@/app/actions/createDailySale";
import { createPropertyListing } from "@/app/actions/createPropertyListing";

/**
 * 📝 ADD LISTING FORM — one dedicated form per listing section.
 *
 * The Daily Sales section's Add button opens mode="daily-sale" (commodity
 * listing with a fixed buy-now price); the Properties section's Add button
 * opens mode="property" (land/building listed for sale). There is no shared
 * form and no type switcher — the nav bar already separates the sections.
 */
export default function AuctioneerAddListing({ initialMode = "property" }) {
  const router = useRouter();
  const [mode] = useState(initialMode === "daily-sale" ? "daily-sale" : "property");
  const [isPublishing, setIsPublishing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(
    initialMode === "daily-sale" ? "VEHICLE" : "REAL_ESTATE"
  );
  const [customCategory, setCustomCategory] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);

  const [dynamicAttributes, setDynamicAttributes] = useState([
    { key: "Condition", value: "Excellent" },
  ]);

  const [form, setForm] = useState({
    title: "", description: "", location: "", documentUrl: "",
    salePrice: "", listingType: "SALE", leasePrice: "",
    biddingFee: "", price: "", stockCount: "1",
  });

  const addSpecificationRow = () => setDynamicAttributes([...dynamicAttributes, { key: "", value: "" }]);
  const removeSpecificationRow = (index) => {
    const values = [...dynamicAttributes];
    values.splice(index, 1);
    setDynamicAttributes(values);
  };

  const handleSpecChange = (index, event, field) => {
    const updatedSpecs = [...dynamicAttributes];
    updatedSpecs[index][field] = event.target.value;
    setDynamicAttributes(updatedSpecs);
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    try {
      setIsPublishing(true);
      const finalCategory = selectedCategory === "OTHER" ? customCategory : selectedCategory;
      if (!finalCategory) throw new Error("Please specify your custom category name.");

      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("description", form.description);
      formData.append("location", form.location);
      formData.append("documentUrl", form.documentUrl);
      formData.append("category", finalCategory);
      formData.append("dynamicAttributes", JSON.stringify(dynamicAttributes));

      if (uploadedFile) {
        formData.append("assetImageFile", uploadedFile);
      } else {
        throw new Error("Please attach a primary display image photograph.");
      }

      if (mode === "daily-sale") {
        formData.append("price", form.price);
        formData.append("stockCount", form.stockCount || "1");
        const res = await createDailySaleListing(formData);
        if (!res.success) throw new Error(res.error);
        alert("🎉 Daily sale listing published!");
      } else {
        formData.append("listingType", form.listingType === "LEASE" ? "LEASE" : "SALE");
        if (form.listingType === "LEASE") {
          formData.append("leasePrice", form.leasePrice);
        } else {
          formData.append("salePrice", form.salePrice);
        }
        const res = await createPropertyListing(formData);
        if (!res.success) throw new Error(res.error || "Failed to publish the property listing.");
        alert(form.listingType === "LEASE" ? "🏠 Property listed for lease!" : "🎉 Property listed for sale!");
      }

      router.push("/dashboard?tab=manage-listings");
      router.refresh();
    } catch (err) {
      alert(err.message || "Publishing failed.");
    } finally {
      setIsPublishing(false);
    }
  };

  const inputClass = "w-full bg-[var(--color-input)] border border-[var(--color-border)] px-3 py-2.5 text-xs rounded-xl focus:outline-none focus:border-[var(--color-primary)]/40 focus:ring-1 focus:ring-[var(--color-primary)]/20 transition-all";

  return (
    <form onSubmit={handlePublish} className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden">
      <div className="p-5 border-b border-[var(--color-border)] bg-[var(--color-input)]/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard?tab=manage-listings"
            className="p-2 rounded-xl bg-[var(--color-input)] border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors"
            title="Back to Manage Listings"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-[var(--color-primary)]" />
            <h3 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">
              {mode === "daily-sale" ? "Add Daily Sale Listing" : "Add Property Listing"}
            </h3>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-[var(--color-muted)] uppercase mb-1">
              {mode === "daily-sale" ? "Item Name / Title" : "Asset Name / Title"}
            </label>
            <input type="text" required placeholder={mode === "daily-sale" ? "e.g. Toyota Hilux 2022 — 4,500km" : "e.g. 3 Bedroom Residential Property - Area 47"} value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} className={inputClass} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[var(--color-muted)] uppercase mb-1">Physical Location</label>
            <input type="text" required placeholder="e.g. Lilongwe City Centre" value={form.location} onChange={(e) => setForm({...form, location: e.target.value})} className={inputClass} />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-[var(--color-muted)] uppercase mb-1">Comprehensive Description</label>
          <textarea required placeholder={mode === "daily-sale" ? "Describe the item condition, specs, and what is included..." : "Outline legal descriptors, physical attributes, title deed statuses..."} value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} className="w-full bg-[var(--color-input)] border border-[var(--color-border)] px-3 py-2.5 text-xs rounded-xl h-24 resize-none focus:outline-none focus:border-[var(--color-primary)]/40 focus:ring-1 focus:ring-[var(--color-primary)]/20 transition-all" />
        </div>

        {/* Dynamic Specifications */}
        <div className="bg-[var(--color-input)]/30 p-4 rounded-xl border border-[var(--color-border)] space-y-3">
          <div className="flex justify-between items-center border-b border-[var(--color-border)] pb-2">
            <span className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider">Dynamic Specifications</span>
            <button type="button" onClick={addSpecificationRow} className="px-3 py-1 bg-[var(--color-primary)] text-white text-[10px] font-bold rounded-lg hover:bg-[var(--color-primary)]/90 transition-all">
              + Add Dynamic Field
            </button>
          </div>
          {dynamicAttributes.map((element, index) => (
            <div key={index} className="flex gap-2 items-center">
              <input type="text" placeholder="Label (e.g. Plot Size)" value={element.key} onChange={(e) => handleSpecChange(index, e, "key")} className={inputClass} />
              <input type="text" placeholder="Value (e.g. 0.25 Hectares)" value={element.value} onChange={(e) => handleSpecChange(index, e, "value")} className={inputClass} />
              {dynamicAttributes.length > 1 && (
                <button type="button" onClick={() => removeSpecificationRow(index)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-[var(--color-muted)] uppercase mb-1">Display Image Upload</label>
            <div className="relative border-2 border-dashed border-[var(--color-border)] rounded-xl p-4 bg-[var(--color-input)]/30 flex flex-col items-center justify-center hover:bg-[var(--color-input)] transition-all">
              <UploadCloud className="w-6 h-6 text-[var(--color-muted)] mb-1" />
              <span className="text-[10px] font-semibold text-[var(--color-muted)] max-w-[250px] truncate">
                {uploadedFile ? `Selected: ${uploadedFile.name}` : "Click to select a photo"}
              </span>
              <input type="file" accept="image/*" onChange={(e) => setUploadedFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
            </div>
          </div>
          {/* Document: daily sale listings no longer collect a legal document link */}
          {mode !== "daily-sale" && (
            <div>
              <label className="block text-[10px] font-bold text-[var(--color-muted)] uppercase mb-1">Legal Document Link</label>
              <input type="url" placeholder="https://your-host-cdn.com/file.pdf" value={form.documentUrl} onChange={(e) => setForm({...form, documentUrl: e.target.value})} className={inputClass} />
            </div>
          )}
        </div>

        {/* Category */}
        <div>
          <label className="block text-[10px] font-bold text-[var(--color-muted)] uppercase mb-1">Category</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className={inputClass}>
              {mode === "daily-sale" ? (
                <>
                  <option value="VEHICLE">🚗 Vehicles & Cars</option>
                  <option value="ELECTRONICS">💻 Tech & Electronics</option>
                  <option value="FURNITURE">🪑 Furniture</option>
                  <option value="MACHINERY">⚙️ Heavy Machinery</option>
                  <option value="OTHER">✨ OTHER / CUSTOM CATEGORY</option>
                </>
              ) : (
                <>
                  <option value="REAL_ESTATE">🏠 Real Estate Property</option>
                  <option value="LAND">🌍 Land / Plot</option>
                  <option value="COMMERCIAL">🏢 Commercial Building</option>
                  <option value="OTHER">✨ OTHER / CUSTOM CATEGORY</option>
                </>
              )}
            </select>
            {selectedCategory === "OTHER" && (
              <input type="text" placeholder="Type Custom Category..." value={customCategory} onChange={(e) => setCustomCategory(e.target.value.toUpperCase())} required className="bg-[var(--color-secondary)]/10 border border-[var(--color-primary)]/20 text-xs font-bold text-[var(--color-primary)] px-3 py-2 rounded-xl focus:outline-none" />
            )}
          </div>
        </div>

        {/* Pricing — daily sales carry a buy-now price; properties carry a sale price */}
        {mode === "daily-sale" ? (
          <div className="bg-[var(--color-secondary)]/5 p-4 border border-[var(--color-primary)]/10 rounded-xl">
            <div className="flex items-center gap-1.5 border-b border-[var(--color-primary)]/10 pb-2 mb-3">
              <DollarSign className="w-3.5 h-3.5 text-[var(--color-primary)]" />
              <span className="text-[10px] font-bold text-[var(--color-text)] uppercase tracking-wider">Daily Sale Pricing</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-[var(--color-muted)] uppercase mb-1">Buy Now Price (MWK)</label>
                <input type="number" required placeholder="15000000" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} className={inputClass} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--color-muted)] uppercase mb-1">Units Available</label>
                <input type="number" min="1" placeholder="1" value={form.stockCount} onChange={(e) => setForm({...form, stockCount: e.target.value})} className={inputClass} />
              </div>
            </div>
          </div>        ) : (
          <div className="bg-[var(--color-secondary)]/5 p-4 border border-[var(--color-primary)]/10 rounded-xl space-y-4">
            <div className="flex items-center gap-1.5 border-b border-[var(--color-primary)]/10 pb-2">
              <DollarSign className="w-3.5 h-3.5 text-[var(--color-primary)]" />
              <span className="text-[10px] font-bold text-[var(--color-text)] uppercase tracking-wider">Listing Type & Pricing</span>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[var(--color-muted)] uppercase mb-1.5">Property Listing Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, listingType: "SALE" })}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    form.listingType !== "LEASE"
                      ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-md"
                      : "bg-[var(--color-input)] text-[var(--color-muted)] border-[var(--color-border)] hover:border-[var(--color-primary)]/40"
                  }`}
                >
                  💰 For Sale
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, listingType: "LEASE" })}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    form.listingType === "LEASE"
                      ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-md"
                      : "bg-[var(--color-input)] text-[var(--color-muted)] border-[var(--color-border)] hover:border-[var(--color-primary)]/40"
                  }`}
                >
                  🏠 For Lease
                </button>
              </div>
            </div>

            {form.listingType === "LEASE" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--color-muted)] uppercase mb-1">Rent Per Month (MWK)</label>
                  <input type="number" required placeholder="850000" value={form.leasePrice} onChange={(e) => setForm({ ...form, leasePrice: e.target.value })} className={inputClass} />
                </div>
                <div className="flex items-end">
                  <p className="text-[11px] text-[var(--color-muted)] leading-relaxed">
                    Leased properties display as <span className="font-bold text-[var(--color-text)]">For Lease</span>{" "}
                    with the monthly charge, and tenants receive automatic reminders when rent is due the following month.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--color-muted)] uppercase mb-1">Sale Price (MWK)</label>
                  <input type="number" required placeholder="45000000" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} className={inputClass} />
                </div>
                <div className="flex items-end">
                  <p className="text-[11px] text-[var(--color-muted)] leading-relaxed">
                    Properties for sale are purchased directly from the Properties tab and the buyer receives a receipt by email.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button type="submit" disabled={isPublishing} className="px-6 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95">
            {isPublishing ? "Publishing..." : mode === "daily-sale" ? "Publish Daily Sale" : "Publish Property Listing"}
          </button>
        </div>
      </div>
    </form>
  );
}
