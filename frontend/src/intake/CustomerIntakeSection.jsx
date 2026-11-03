import React, { useState } from 'react';
import { api } from '@/services/api';
import {
  Upload,
  X,
  FileAudio,
  Image,
  Video,
  AlertCircle,
  CheckCircle2,
  Loader2,
  DollarSign,
  HelpCircle
} from 'lucide-react';

export function CustomerIntakeSection({
  businesses = [],
  currentUser,
  selectedBusinessId,
  onCaseSubmitted,
}) {
  const [customerName, setCustomerName] = useState(currentUser?.name || '');
  const [customerPhone, setCustomerPhone] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [businessId, setBusinessId] = useState(selectedBusinessId || (businesses[0]?.id || ''));
  const [productCost, setProductCost] = useState('');
  const [writtenComplaint, setWrittenComplaint] = useState('');
  
  // Staged files (Client-side ONLY until Submit Ticket is clicked!)
  const [mediaFiles, setMediaFiles] = useState([]);
  const [voiceFile, setVoiceFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle Photo/Video Upload
  const handleMediaUpload = (e) => {
    const files = Array.from(e.target.files || []);
    const valid = [];
    for (const f of files) {
      if (f.type.startsWith('image/') || f.type.startsWith('video/')) {
        valid.push(f);
      } else {
        setErrorMsg(`Unsupported file type: ${f.name}. Only images and videos are accepted.`);
      }
    }
    setMediaFiles((prev) => [...prev, ...valid].slice(0, 8));
  };

  const removeMediaItem = (idx) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // Handle Audio Note Upload (Audio only!)
  const handleAudioUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|m4a|ogg)$/i)) {
      setVoiceFile(file);
      setErrorMsg('');
    } else {
      setErrorMsg('Voice note field accepts audio files only (e.g. .mp3, .wav, .m4a).');
    }
  };

  // Submit Ticket (THE ONLY PERSISTENCE POINT!)
  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!customerName.trim() || !customerPhone.trim() || !postalCode.trim()) {
      setErrorMsg('Full name, contact phone, and postal/location code are required.');
      return;
    }

    if (!businessId) {
      setErrorMsg('Please select the registered product merchant/provider.');
      return;
    }

    if (!writtenComplaint.trim() || writtenComplaint.trim().length < 5) {
      setErrorMsg('Please describe your damage concern (at least 5 characters).');
      return;
    }

    if (mediaFiles.length === 0) {
      setErrorMsg('At least one photo or video evidence file of the product/parcel is required.');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('customerName', customerName.trim());
      formData.append('customerPhone', customerPhone.trim());
      formData.append('postalCode', postalCode.trim());
      formData.append('businessId', businessId);
      if (productCost) formData.append('productCost', productCost);
      formData.append('writtenComplaint', writtenComplaint.trim());
      if (currentUser?.id) formData.append('customerId', currentUser.id);

      // Append media files
      mediaFiles.forEach((file) => {
        formData.append('media', file);
      });

      // Append voice file if present
      if (voiceFile) {
        formData.append('voice', voiceFile);
      }

      const res = await api.submitTicket(formData);
      if (res.success) {
        onCaseSubmitted(res.caseId, res.caseNumber, res.businessName);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Ticket submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="customer-intake" className="py-12 px-4 sm:px-6 lg:px-8 relative z-20">
      <div className="max-w-4xl mx-auto bg-g1 border border-gold/40 rounded-2xl shadow-2xl p-6 sm:p-10 relative overflow-hidden">
        
        {/* Section Header */}
        <div className="mb-8 border-b border-g3/60 pb-6">
          <div className="flex items-center space-x-2 text-gold text-xs font-mono uppercase tracking-widest mb-1.5">
            <span>Section 1 • Dispute Intake</span>
          </div>
          <h2 className="font-serif font-bold text-2xl sm:text-4xl text-light">
            Raise a Product Damage Claim
          </h2>
          <p className="text-g6 text-xs sm:text-sm mt-2 max-w-2xl">
            Provide the details and media evidence of your parcel or item. SnapDesk applies Meta SAM 3.1 computer-vision to inspect damage strictly against the selected merchant's verified policy.
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start space-x-3">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Intake Form */}
        <form onSubmit={handleSubmitTicket} className="space-y-6 text-xs">
          
          {/* Row 1: Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-g7 font-medium mb-1">Customer Full Name *</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Elena Rostova"
                className="w-full bg-dark border border-g3 rounded-lg px-3 py-2.5 text-light placeholder-g6 focus:outline-none focus:border-gold"
              />
            </div>

            <div>
              <label className="block text-g7 font-medium mb-1">Contact Phone *</label>
              <input
                type="tel"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="e.g. +1-555-0199"
                className="w-full bg-dark border border-g3 rounded-lg px-3 py-2.5 text-light placeholder-g6 focus:outline-none focus:border-gold"
              />
            </div>

            <div>
              <label className="block text-g7 font-medium mb-1">Postal / Location Code *</label>
              <input
                type="text"
                required
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="e.g. 94103 / SW1A"
                className="w-full bg-dark border border-g3 rounded-lg px-3 py-2.5 text-light placeholder-g6 focus:outline-none focus:border-gold"
              />
            </div>
          </div>

          {/* Row 2: Product Provider Selection & Cost */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-g7 font-medium mb-1 flex items-center justify-between">
                <span>Select Product Provider / Merchant *</span>
                <span className="text-[10px] text-gold font-mono">Bound to Merchant Policy</span>
              </label>
              <select
                required
                value={businessId}
                onChange={(e) => setBusinessId(e.target.value)}
                className="w-full bg-dark border border-g3 rounded-lg px-3 py-2.5 text-light focus:outline-none focus:border-gold"
              >
                {businesses.map((biz) => (
                  <option key={biz.id} value={biz.id}>
                    {biz.name} ({biz.category || 'General'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-g7 font-medium mb-1 flex items-center justify-between">
                <span>Reported Item Cost</span>
                <span className="text-[10px] text-g6 font-mono">Optional</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-g6">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={productCost}
                  onChange={(e) => setProductCost(e.target.value)}
                  placeholder="e.g. 149.00"
                  className="w-full bg-dark border border-g3 rounded-lg pl-7 pr-3 py-2.5 text-light placeholder-g6 focus:outline-none focus:border-gold font-mono"
                />
              </div>
            </div>
          </div>

          {/* Photo & Video Media Upload Dropzone */}
          <div>
            <label className="block text-g7 font-medium mb-1.5 flex items-center justify-between">
              <span>Product &amp; Parcel Visual Evidence (Photos / Videos) *</span>
              <span className="text-[10px] text-g6 font-mono">Up to 8 files • PNG, JPG, MP4</span>
            </label>

            <div className="border-2 border-dashed border-g3 hover:border-gold/60 rounded-xl p-6 text-center bg-dark/40 transition-colors relative group">
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleMediaUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="Select parcel photos or unboxing videos"
              />
              <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-light font-medium">Click or Drag parcel photos / videos here</div>
                <p className="text-[11px] text-g6 max-w-sm">
                  Upload clear photos of damaged packaging, crushed corners, or fractured contents for SAM 3.1 analysis.
                </p>
              </div>
            </div>

            {/* Thumbnail previews of staged media with removal control */}
            {mediaFiles.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {mediaFiles.map((file, idx) => {
                  const isVid = file.type.startsWith('video/');
                  const url = URL.createObjectURL(file);
                  return (
                    <div
                      key={idx}
                      className="relative bg-dark border border-g3 rounded-lg overflow-hidden group p-1"
                    >
                      <div className="h-24 w-full bg-g2 rounded flex items-center justify-center overflow-hidden">
                        {isVid ? (
                          <div className="flex flex-col items-center text-gold">
                            <Video className="w-6 h-6 mb-1" />
                            <span className="text-[9px] font-mono">Video Clip</span>
                          </div>
                        ) : (
                          <img
                            src={url}
                            alt={`Evidence ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      
                      <div className="p-1.5 text-[10px] truncate text-g6 flex items-center justify-between">
                        <span className="truncate max-w-[80%]">{file.name}</span>
                        <span className="font-mono text-[9px] text-g6">{(file.size / 1024).toFixed(0)}KB</span>
                      </div>

                      {/* Small Remove Control */}
                      <button
                        type="button"
                        onClick={() => removeMediaItem(idx)}
                        className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/80 hover:bg-red-600 text-light flex items-center justify-center text-xs transition-colors"
                        title="Remove evidence file"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Written Complaint */}
          <div>
            <label className="block text-g7 font-medium mb-1">
              Written Explanation of Concern *
            </label>
            <textarea
              required
              rows={4}
              value={writtenComplaint}
              onChange={(e) => setWrittenComplaint(e.target.value)}
              placeholder="Describe the condition upon arrival (e.g. 'Outer packaging was severely crushed upon delivery. The delicate item inside was cracked along the base and unusable. Requesting full refund or replacement.')."
              className="w-full bg-dark border border-g3 rounded-lg p-3 text-light placeholder-g6 focus:outline-none focus:border-gold leading-relaxed"
            />
          </div>

          {/* Audio Voice Note Upload */}
          <div>
            <label className="block text-g7 font-medium mb-1 flex items-center justify-between">
              <span>Optional Audio Voice Note</span>
              <span className="text-[10px] text-g6 font-mono">Audio files only (.mp3, .wav, .m4a)</span>
            </label>

            <div className="flex items-center space-x-3 bg-dark border border-g3 rounded-lg p-3">
              <FileAudio className="w-5 h-5 text-gold flex-shrink-0" />
              <input
                type="file"
                accept="audio/*,.wav,.mp3,.m4a,.ogg"
                onChange={handleAudioUpload}
                className="text-xs text-g6 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-g2 file:text-light hover:file:bg-g3"
              />
              {voiceFile && (
                <button
                  type="button"
                  onClick={() => setVoiceFile(null)}
                  className="text-g6 hover:text-red-400 p-1"
                  title="Remove audio"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {voiceFile && (
              <p className="mt-1 text-[11px] text-gold font-mono">
                ✓ Attached: {voiceFile.name} ({(voiceFile.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </div>

          {/* Persistence Notice */}
          <div className="p-3 rounded-lg bg-g2/50 border border-g3/80 text-[11px] text-g6 flex items-start space-x-2">
            <HelpCircle className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
            <span>
              <strong>Persistence Guarantee:</strong> No claim record or database entry is created until you click "Submit Ticket". You can safely review or adjust your inputs.
            </span>
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-g3/60 flex items-center justify-between">
            <span className="text-[11px] text-g6 font-mono">
              Ready for SAM 3.1 Vision Triage
            </span>

            <button
              type="submit"
              disabled={loading}
              className="bg-gold hover:bg-white disabled:opacity-50 text-dark font-semibold px-8 py-3 rounded-xl text-sm transition-all shadow-lg shadow-gold/25 flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Ticket...</span>
                </>
              ) : (
                <span>Submit Ticket</span>
              )}
            </button>
          </div>

        </form>
      </div>
    </section>
  );
}

