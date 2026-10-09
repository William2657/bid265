"use client";

import React, { useState } from "react";
import {
  Loader2,
  LayoutGrid,
  ArrowRight,
  Hourglass,
  CalendarClock,
  Plus,
  UploadCloud,
  Trash2,
  DollarSign,
  Users,
  Power,
  Eye,
  RotateCcw,
} from "lucide-react";
import {
  getLiveKitToken,
  updateAuctionToLiveDirectly,
  closeLiveAuctionDirectly,
} from "@/app/actions/liveAuction";
import { scheduleNewAuction, scheduleAuction } from "@/app/actions/scheduleAuction";
import { useRouter } from "next/navigation";

const toLocalInputValue = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatSchedule = (iso) => {
  if (!iso) return "Not scheduled";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Not scheduled";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

/**
 * 🗓 AUCTIONS TAB (auctioneer)
 *
 * Auctioneers schedule auctions here — creating one, going live with it, and
 * RESCHEDULING it whenever it needs new times (rescheduling reopens a closed
 * auction, which is what replaced the old relaunch section).
 */
export default function AuctioneerLiveConsole({ auctionItems = [], onItemsUpdate }) {
  const router = useRouter();

  const [itemsList, setItemsList] = useState(auctionItems);
  const [isInitializingId, setIsInitializingId] = useState(null);
  const [isActionLoadingId, setIsActionLoadingId] = useState(null);

  // Schedule-new-auction form
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [isSchedulingNew, setIsSchedulingNew] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("VEHICLE");
  const [customCategory, setCustomCategory] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [dynamicAttributes, setDynamicAttributes] = useState([
    { key: "Condition", value: "Excellent" },
  ]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    documentUrl: "",
    startingBid: "",
    reservePrice: "",
    depositAmount: "",
    biddingFee: "",
    startTime: "",
    endTime: "",
  });

  // Inline reschedule state
  const [rescheduleId, setRescheduleId] = useState(null);
  const [rescheduleForm, setRescheduleForm] = useState({ startTime: "", endTime: "" });
  const [isResavingId, setIsResavingId] = useState(null);

  const syncItemsList = (updatedList) => {
    setItemsList(updatedList);
    if (onItemsUpdate) onItemsUpdate(updatedList);
  };

  const handleSpecChange = (index, event, field) => {
    const updated = [...dynamicAttributes];
    updated[index][field] = event.target.value;
    setDynamicAttributes(updated);
  };

  const addSpecificationRow = () =>
    setDynamicAttributes([...dynamicAttributes, { key: "", value: "" }]);

  const removeSpecificationRow = (index) => {
    const values = [...dynamicAttributes];
    values.splice(index, 1);
    setDynamicAttributes(values);
  };

  // ── SCHEDULE A BRAND-NEW AUCTION ──────────────────────────────────
  const handleScheduleNewAuction = async (e) => {
    e.preventDefault();
    try {
      setIsSchedulingNew(true);
      const finalCategory = selectedCategory === "OTHER" ? customCategory : selectedCategory;
      if (!finalCategory) throw new Error("Please specify your custom category name.");
      if (!uploadedFile) throw new Error("Please attach a primary display image photograph.");
      if (!form.startTime || !form.endTime) throw new Error("Please set the auction start and end time.");

      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("description", form.description);
      formData.append("location", form.location);
      formData.append("documentUrl", form.documentUrl);
      formData.append("category", finalCategory);
      formData.append("startingBid", form.startingBid);
      formData.append("reservePrice", form.reservePrice);
      formData.append("depositAmount", form.depositAmount);
      formData.append("biddingFee", form.biddingFee || "0");
      formData.append("startTime", form.startTime);
      formData.append("endTime", form.endTime);
      formData.append("dynamicAttributes", JSON.stringify(dynamicAttributes));
      formData.append("assetImageFile", uploadedFile);

      const res = await scheduleNewAuction(formData);
      if (!res.success) throw new Error(res.error);

      alert("🗓 Auction scheduled! It is now listed under your Auctions tab.");
      setForm({
        title: "",
        description: "",
        location: "",
        documentUrl: "",
        startingBid: "",
        reservePrice: "",
        depositAmount: "",
        biddingFee: "",
        startTime: "",
        endTime: "",
      });
      setDynamicAttributes([{ key: "Condition", value: "Excellent" }]);
      setUploadedFile(null);
      setSelectedCategory("VEHICLE");
      setCustomCategory("");
      setShowScheduleForm(false);

      const newItem = {
        id: res.data.id,
        assetId: res.data.assetId,
        status: res.data.status,
        startTime: res.data.startTime,
        endTime: res.data.endTime,
        liveRoomId: null,
        asset: {
          title: form.title,
          description: form.description,
          location: form.location,
          category: finalCategory,
        },
        startingBid: Number(form.startingBid),
        reservePrice: Number(form.reservePrice),
        depositAmount: Number(form.depositAmount),
        biddingFee: Number(form.biddingFee || 0),
      };
      syncItemsList([newItem, ...itemsList]);
      router.refresh();
    } catch (err) {
      alert(err.message || "Could not schedule the auction.");
    } finally {
      setIsSchedulingNew(false);
    }
  };

  // ── RESCHEDULE AN EXISTING AUCTION (also reopens closed ones) ─────
  const openReschedule = (item) => {
    if (rescheduleId === item.id) {
      setRescheduleId(null);
      return;
    }
    setRescheduleForm({
      startTime: toLocalInputValue(item.startTime),
      endTime: toLocalInputValue(item.endTime),
    });
    setRescheduleId(item.id);
  };

  const handleReschedule = async (item) => {
    try {
      setIsResavingId(item.id);
      const res = await scheduleAuction(item.id, rescheduleForm.startTime, rescheduleForm.endTime);
      if (!res.success) throw new Error(res.error);

      const updated = itemsList.map((it) =>
        it.id === item.id
          ? { ...it, status: res.data.status, startTime: res.data.startTime, endTime: res.data.endTime }
          : it
      );
      syncItemsList(updated);
      setRescheduleId(null);
      alert(
        res.reopened
          ? "✅ Auction rescheduled and reopened — it is live on your listings again."
          : "✅ Auction rescheduled."
      );
      router.refresh();
    } catch (err) {
      alert(err.message || "Could not reschedule the auction.");
    } finally {
      setIsResavingId(null);
    }
  };

  // ── GO LIVE / WATCH / END ─────────────────────────────────────────
  const handleDirectLiveInitialization = async (itemId) => {
    if (!itemId) return;
    try {
      setIsInitializingId(itemId);
      const computedRoomId = `room-lot-${itemId}-${Date.now()}`;
      await updateAuctionToLiveDirectly(itemId, computedRoomId);

      const tokenPromise = getLiveKitToken(computedRoomId, itemId);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Signal timeout during WebRTC handshake")), 8000)
      );
      const tokenPayload = await Promise.race([tokenPromise, timeoutPromise]);

      const updated = itemsList.map((item) =>
        item.id === Number(itemId)
          ? { ...item, status: "ACTIVE", liveRoomId: computedRoomId }
          : item
      );
      syncItemsList(updated);
      router.push(`/auctions/live/${computedRoomId}?token=${tokenPayload.token}&id=${itemId}`);
    } catch (err) {
      alert("Database initialization rejected: " + err.message);
    } finally {
      setIsInitializingId(null);
    }
  };

  const handleWatchLiveRoom = async (item) => {
    try {
      setIsActionLoadingId(item.id);
      const targetRoomId = item.liveRoomId || `room-lot-${item.id}-active`;
      const tokenPromise = getLiveKitToken(targetRoomId, item.id);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Signal timeout")), 8000)
      );
      const tokenPayload = await Promise.race([tokenPromise, timeoutPromise]);
      router.push(`/auctions/live/${targetRoomId}?token=${tokenPayload.token}&id=${item.id}`);
    } catch (err) {
      alert("Could not pull connection pass token parameters: " + err.message);
    } finally {
      setIsActionLoadingId(null);
    }
  };

  const handleTerminateLiveSession = async (itemId) => {
    const confirmation = confirm(
      "End this live auction session? You can bring it back at any time by rescheduling it."
    );
    if (!confirmation) return;

    try {
      setIsActionLoadingId(itemId);
      await closeLiveAuctionDirectly(itemId);
      const updated = itemsList.map((item) =>
        item.id === itemId ? { ...item, status: "CLOSED" } : item
      );
      syncItemsList(updated);
      alert(`🛑 Lot #${itemId} is now CLOSED — reschedule it whenever you want it back.`);
    } catch (err) {
      alert("Failed to close remote instance block: " + err.message);
    } finally {
      setIsActionLoadingId(null);
    }
  };

  const inputClass =
    "w-full bg-[var(--color-input)] border border-[var(--color-border)] px-3 py-2.5 text-xs rounded-xl focus:outline-none focus:border-[var(--color-primary)]/40 focus:ring-1 focus:ring-[var(--color-primary)]/20 transition-all";

  return (
    <div className="space-y-6 md:space-y-8 pb-10">
      {/* 🗓 SCHEDULE HEADER */}
      <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-secondary)]/20 flex items-center justify-center shrink-0">
            <CalendarClock className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--color-text)]">Your Scheduled Auctions</h2>
            <p className="text-[11px] text-[var(--color-muted)] mt-0.5 max-w-xl leading-relaxed">
              Schedule an auction for goods or assets consigned by a client. Ended auctions come back
              simply by rescheduling them — there is no separate relaunch step.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowScheduleForm((v) => !v)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white text-xs font-bold rounded-xl transition-all active:scale-95 shadow-md shadow-[var(--color-primary)]/20 shrink-0"
        >
          <Plus className="w-4 h-4" /> {showScheduleForm ? "Close Form" : "Schedule Auction"}
        </button>
      </div>

      {/* 📝 SCHEDULE NEW AUCTION FORM */}
      {showScheduleForm && (
        <form onSubmit={handleScheduleNewAuction} className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-input)]/30 flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-[var(--color-primary)]" />
            <h3 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">
              Schedule New Auction
            </h3>
          </div>

          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-[var(--color-muted)] uppercase mb-1">
                  Asset / Lot Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2022 Toyota Hilux D-4D"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--color-muted)] uppercase mb-1">
                  Client Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chimwemwe Banda"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[var(--color-muted)] uppercase mb-1">
                Description
              </label>
              <textarea
                required
                placeholder="Outline condition, provenance, documents included..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full bg-[var(--color-input)] border border-[var(--color-border)] px-3 py-2.5 text-xs rounded-xl h-20 resize-none focus:outline-none focus:border-[var(--color-primary)]/40 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-[var(--color-muted)] uppercase mb-1">
                  Category
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className={inputClass}
                  >
                    <option value="VEHICLE">🚗 Vehicles &amp; Cars</option>
                    <option value="ELECTRONICS">💻 Tech &amp; Electronics</option>
                    <option value="MACHINERY">⚙️ Heavy Machinery</option>
                    <option value="FURNITURE">🪑 Furniture</option>
                    <option value="OTHER">✨ OTHER / CUSTOM CATEGORY</option>
                  </select>
                  {selectedCategory === "OTHER" && (
                    <input
                      type="text"
                      placeholder="Type Custom Category..."
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value.toUpperCase())}
                      required
                      className="bg-[var(--color-secondary)]/10 border border-[var(--color-primary)]/20 text-xs font-bold text-[var(--color-primary)] px-3 py-2 rounded-xl focus:outline-none"
                    />
                  )}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--color-muted)] uppercase mb-1">
                  Display Image Upload
                </label>
                <div className="relative border-2 border-dashed border-[var(--color-border)] rounded-xl p-3 bg-[var(--color-input)]/30 flex items-center justify-center hover:bg-[var(--color-input)] transition-all">
                  <UploadCloud className="w-5 h-5 text-[var(--color-muted)] mr-2" />
                  <span className="text-[10px] font-semibold text-[var(--color-muted)] max-w-[220px] truncate">
                    {uploadedFile ? `Selected: ${uploadedFile.name}` : "Click to select a photo"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
              </div>
            </div>

            {/* Schedule */}
            <div className="bg-[var(--color-secondary)]/5 p-4 border border-[var(--color-primary)]/10 rounded-xl">
              <div className="flex items-center gap-1.5 border-b border-[var(--color-primary)]/10 pb-2 mb-3">
                <CalendarClock className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                <span className="text-[10px] font-bold text-[var(--color-text)] uppercase tracking-wider">
                  Auction Schedule
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--color-muted)] uppercase mb-1">
                    Starts At
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--color-muted)] uppercase mb-1">
                    Ends At
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-[var(--color-input)]/40 p-4 border border-[var(--color-border)] rounded-xl">
              <div className="flex items-center gap-1.5 border-b border-[var(--color-border)] pb-2 mb-3">
                <DollarSign className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                <span className="text-[10px] font-bold text-[var(--color-text)] uppercase tracking-wider">
                  Financial Framework
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--color-muted)] uppercase mb-1">
                    Starting Bid (MWK)
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="5000000"
                    value={form.startingBid}
                    onChange={(e) => setForm({ ...form, startingBid: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--color-muted)] uppercase mb-1">
                    Reserve Price (MWK)
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="7500000"
                    value={form.reservePrice}
                    onChange={(e) => setForm({ ...form, reservePrice: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--color-muted)] uppercase mb-1">
                    Entry Fee (MWK)
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="250000"
                    value={form.depositAmount}
                    onChange={(e) => setForm({ ...form, depositAmount: e.target.value })}
                    className={inputClass}
                  />
                  <p className="text-[9px] text-[var(--color-muted)] mt-1">
                    Actual fee a bidder pays to participate in this auction.
                  </p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--color-muted)] uppercase mb-1">
                    Bidding Fee (MWK)
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="10000"
                    value={form.biddingFee}
                    onChange={(e) => setForm({ ...form, biddingFee: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Dynamic specs */}
            <div className="bg-[var(--color-input)]/30 p-4 rounded-xl border border-[var(--color-border)] space-y-3">
              <div className="flex justify-between items-center border-b border-[var(--color-border)] pb-2">
                <span className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider">
                  Dynamic Specifications
                </span>
                <button
                  type="button"
                  onClick={addSpecificationRow}
                  className="px-3 py-1 bg-[var(--color-primary)] text-white text-[10px] font-bold rounded-lg hover:bg-[var(--color-primary)]/90 transition-all"
                >
                  + Add Dynamic Field
                </button>
              </div>
              {dynamicAttributes.map((element, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Label (e.g. Mileage)"
                    value={element.key}
                    onChange={(e) => handleSpecChange(index, e, "key")}
                    className={inputClass}
                  />
                  <input
                    type="text"
                    placeholder="Value (e.g. 45,000 km)"
                    value={element.value}
                    onChange={(e) => handleSpecChange(index, e, "value")}
                    className={inputClass}
                  />
                  {dynamicAttributes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSpecificationRow(index)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSchedulingNew}
                className="px-6 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50 transition-all active:scale-95"
              >
                {isSchedulingNew ? "Scheduling..." : "Schedule Auction"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 📋 SCHEDULED AUCTIONS LIST */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-[var(--color-muted)]" />
          <h3 className="text-xs font-black tracking-wider uppercase text-[var(--color-muted)]">
            Auctions ({itemsList.length})
          </h3>
        </div>

        {itemsList.length === 0 ? (
          <div className="bg-[var(--color-card)] border border-dashed border-[var(--color-border)] rounded-2xl p-10 text-center">
            <CalendarClock className="w-10 h-10 text-[var(--color-muted)] mx-auto mb-3 opacity-40" />
            <p className="text-xs text-[var(--color-muted)]">
              No auctions scheduled yet. Use the form above to schedule your first auction.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {itemsList.map((item) => {
              const isLive = item.status === "LIVE" || item.status === "ACTIVE";
              const isClosed = item.status === "CLOSED";

              return (
                <div
                  key={item.id}
                  className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-4 md:p-5 shadow-sm flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[10px] font-bold text-[var(--color-muted)] bg-[var(--color-input)] px-2 py-0.5 rounded-md">
                        Lot #{item.id}
                      </span>
                      {isLive ? (
                        <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Live
                        </span>
                      ) : isClosed ? (
                        <span className="bg-[var(--color-input)] text-[var(--color-muted)] border border-[var(--color-border)] text-[9px] font-bold uppercase px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Hourglass className="w-3 h-3" /> Ended
                        </span>
                      ) : (
                        <span className="bg-[var(--color-secondary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 text-[9px] font-bold uppercase px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Hourglass className="w-3 h-3" /> {item.status || "UPCOMING"}
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-[var(--color-text)] tracking-tight">
                        {item.asset?.title || "Unnamed Asset"}
                      </h4>
                      <p className="text-xs text-[var(--color-muted)] line-clamp-2 mt-0.5">
                        {item.asset?.description}
                      </p>
                    </div>

                    <div className="text-[11px] text-[var(--color-muted)] space-y-0.5 pt-1 border-t border-[var(--color-border)] mt-2">
                      <div className="flex items-center gap-1.5">
                        <CalendarClock className="w-3 h-3 text-[var(--color-primary)]" />
                        <span>
                          Starts: <span className="font-bold text-[var(--color-text)]">{formatSchedule(item.startTime)}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CalendarClock className="w-3 h-3 text-[var(--color-primary)]" />
                        <span>
                          Ends: <span className="font-bold text-[var(--color-text)]">{formatSchedule(item.endTime)}</span>
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] font-medium text-[var(--color-muted)] grid grid-cols-1 gap-1 pt-1">
                      <div>
                        Starting Bid:{" "}
                        <span className="font-bold text-[var(--color-text)]">
                          MWK {Number(item.startingBid || 0).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        Reserve price:{" "}
                        <span className="font-bold text-[var(--color-primary)]">
                          MWK {Number(item.reservePrice || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[var(--color-border)] flex flex-col gap-2">
                    {/* Reschedule control — replaces the old relaunch terminal */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openReschedule(item)}
                        className={`flex-1 text-center px-3 py-2 rounded-xl text-[11px] font-bold border transition-all flex items-center justify-center gap-1.5 ${
                          rescheduleId === item.id
                            ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/30"
                            : "bg-[var(--color-input)] text-[var(--color-text)] border-[var(--color-border)] hover:border-[var(--color-primary)]/40"
                        }`}
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Reschedule
                      </button>

                      {!isLive && (
                        <button
                          type="button"
                          onClick={() => handleDirectLiveInitialization(item.id)}
                          disabled={isInitializingId !== null}
                          className="flex-1 text-center px-3 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                        >
                          {isInitializingId === item.id ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" /> Starting...
                            </>
                          ) : (
                            <>
                              <ArrowRight className="w-3.5 h-3.5" /> Start Live Bidding
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {rescheduleId === item.id && (
                      <div className="bg-[var(--color-input)]/60 border border-[var(--color-border)] rounded-xl p-3 space-y-2">
                        <p className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider">
                          {isClosed ? "Reschedule to relaunch this auction" : "Update auction times"}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="datetime-local"
                            value={rescheduleForm.startTime}
                            onChange={(e) =>
                              setRescheduleForm({ ...rescheduleForm, startTime: e.target.value })
                            }
                            className={inputClass}
                          />
                          <input
                            type="datetime-local"
                            value={rescheduleForm.endTime}
                            onChange={(e) =>
                              setRescheduleForm({ ...rescheduleForm, endTime: e.target.value })
                            }
                            className={inputClass}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleReschedule(item)}
                            disabled={isResavingId === item.id}
                            className="flex-1 px-3 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all"
                          >
                            {isResavingId === item.id ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                              </>
                            ) : (
                              <>Save Schedule</>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setRescheduleId(null)}
                            className="px-3 py-2 bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-muted)] text-[11px] font-bold rounded-lg hover:text-[var(--color-text)] transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {isLive && (
                      <div className="space-y-2 w-full">
                        <div className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 w-full rounded-xl py-2 px-3 flex items-center justify-between border border-emerald-500/20">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 animate-pulse" /> Lobby Live
                          </span>
                          <span className="text-[10px] text-[var(--color-muted)] font-medium">
                            Bidders Live
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleWatchLiveRoom(item)}
                            disabled={isActionLoadingId !== null}
                            className="flex-1 text-center px-3 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white text-[11px] font-bold rounded-xl flex items-center justify-center gap-1 transition-all disabled:opacity-50"
                          >
                            {isActionLoadingId === item.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <Eye className="w-3.5 h-3.5" /> Enter
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleTerminateLiveSession(item.id)}
                            disabled={isActionLoadingId !== null}
                            className="flex-1 text-center px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-xl flex items-center justify-center gap-1 transition-all disabled:opacity-50"
                          >
                            <Power className="w-3.5 h-3.5" /> End
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
