"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";

export default function SellCaptureForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    brand: "",
    model: "",
    year: "",
    mileage: "",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.brand || formData.brand === "Select Brand") newErrors.brand = "Please select a brand";
    if (!formData.model.trim()) newErrors.model = "Model is required";
    if (!formData.year || isNaN(Number(formData.year)) || Number(formData.year) < 1980 || Number(formData.year) > new Date().getFullYear()) {
      newErrors.year = "Please enter a valid year";
    }
    if (!formData.mileage || isNaN(Number(formData.mileage.replace(/,/g, "")))) {
      newErrors.mileage = "Please enter valid mileage";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      const response = await apiClient.post("/valuations/", {
        brand: formData.brand,
        model: formData.model.trim(),
        year: Number(formData.year),
        mileage: Number(formData.mileage.replace(/,/g, "")),
      });
      const valuationId = response?.data?.id;
      if (!valuationId) {
        throw new Error("Missing valuation id in response.");
      }
      router.push(`/sell/details?valuationId=${valuationId}`);
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      const hasData = Boolean((error as { response?: { data?: unknown } })?.response?.data);
      if (status === 401) {
        setSubmitError("Please log in to get your valuation.");
      } else if (hasData) {
        setSubmitError("Please review your details and try again.");
      } else {
        setSubmitError("We could not generate your valuation right now. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-left">
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant block mb-2">
            Brand
          </label>
          <select 
            className={`w-full bg-surface-container-low px-4 py-3 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-primary ${errors.brand ? 'ring-2 ring-error' : ''}`}
            value={formData.brand}
            onChange={(e) => setFormData({...formData, brand: e.target.value})}
          >
            <option value="">Select Brand</option>
            <option value="BMW">BMW</option>
            <option value="Porsche">Porsche</option>
            <option value="Tesla">Tesla</option>
            <option value="Mercedes">Mercedes</option>
            <option value="Audi">Audi</option>
          </select>
          {errors.brand && <p className="text-error text-[10px] font-bold mt-1 uppercase">{errors.brand}</p>}
        </div>
        
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant block mb-2">
            Model
          </label>
          <input
            className={`w-full bg-surface-container-low px-4 py-3 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-primary ${errors.model ? 'ring-2 ring-error' : ''}`}
            placeholder="e.g. 911 Carrera"
            value={formData.model}
            onChange={(e) => setFormData({...formData, model: e.target.value})}
          />
          {errors.model && <p className="text-error text-[10px] font-bold mt-1 uppercase">{errors.model}</p>}
        </div>
        
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant block mb-2">
            Year
          </label>
          <input
            className={`w-full bg-surface-container-low px-4 py-3 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-primary ${errors.year ? 'ring-2 ring-error' : ''}`}
            placeholder="2020"
            type="number"
            value={formData.year}
            onChange={(e) => setFormData({...formData, year: e.target.value})}
          />
          {errors.year && <p className="text-error text-[10px] font-bold mt-1 uppercase">{errors.year}</p>}
        </div>
        
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant block mb-2">
            Mileage
          </label>
          <input
            className={`w-full bg-surface-container-low px-4 py-3 rounded-xl border-none font-bold outline-none focus:ring-2 focus:ring-primary ${errors.mileage ? 'ring-2 ring-error' : ''}`}
            placeholder="25,000"
            value={formData.mileage}
            onChange={(e) => setFormData({...formData, mileage: e.target.value})}
          />
          {errors.mileage && <p className="text-error text-[10px] font-bold mt-1 uppercase">{errors.mileage}</p>}
        </div>
      </div>
      
      <button 
        type="submit"
        disabled={isSubmitting}
        className="w-full py-4 bg-primary text-on-primary rounded-xl font-bold text-lg shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
            Processing...
          </>
        ) : "Start Your Valuation"}
      </button>
      <p className="text-xs text-on-surface-variant text-center mt-3 font-medium">
        Based on current comparable listings where available. You choose your final asking price.
      </p>
      {submitError && (
        <p className="text-error text-xs font-semibold text-center mt-3">{submitError}</p>
      )}
    </form>
  );
}
