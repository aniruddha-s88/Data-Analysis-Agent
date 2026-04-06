import React from "react";
import axios from "axios";

function Upload({ chatId, onUploaded }) {
  const uploadFile = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const suffix = chatId ? `?chat_id=${encodeURIComponent(chatId)}` : "";
    const res = await axios.post(`http://localhost:8000/upload-${type}/${suffix}`, formData);
    if (onUploaded) {
      onUploaded({
        filename: file.name,
        type,
        message: res.data?.message || "Uploaded",
      });
    }
    alert("Uploaded!");
  };

  return (
    <div className="upload-card">
      <div className="upload-header">
        <h3 className="h5 fw-bold mb-2">Upload Your Data</h3>
        <p className="text-muted mb-0">
          Add a CSV for structured data or a PDF for unstructured reports.
        </p>
      </div>

      <div className="upload-grid">
        <label className="upload-tile">
          <input
            type="file"
            className="visually-hidden"
            onChange={(e) => uploadFile(e, "csv")}
            accept=".csv"
          />
          <div className="tile-icon">CSV</div>
          <div className="tile-title">Upload CSV</div>
          <div className="tile-subtitle">Sales tables, KPIs, or exports.</div>
        </label>

        <label className="upload-tile">
          <input
            type="file"
            className="visually-hidden"
            onChange={(e) => uploadFile(e, "pdf")}
            accept=".pdf"
          />
          <div className="tile-icon">PDF</div>
          <div className="tile-title">Upload PDF</div>
          <div className="tile-subtitle">Reports, decks, invoices.</div>
        </label>
      </div>
    </div>
  );
}

export default Upload;
