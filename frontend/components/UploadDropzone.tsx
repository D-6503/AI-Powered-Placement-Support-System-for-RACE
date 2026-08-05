"use client";

import { useDropzone } from "react-dropzone";
import { Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface UploadDropzoneProps {
  onDrop: (files: File[]) => void;
  loading: boolean;
  success?: boolean;
  successMessage?: string;
  errorMessage?: string;
  title?: string;
  subtitle?: string;
  accept?: Record<string, string[]>;
  maxFiles?: number;
  className?: string;
}

export default function UploadDropzone({
  onDrop,
  loading,
  success = false,
  successMessage = "Upload Successful!",
  errorMessage,
  title = "Drag & drop your file here",
  subtitle = "Supports PDF, DOCX formats up to 5MB",
  accept = {
    "application/pdf": [".pdf"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"]
  },
  maxFiles = 1,
  className = ""
}: UploadDropzoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    disabled: loading
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[220px] ${
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-orange-200 hover:border-primary/80 hover:bg-orange-50/20"
      } ${loading ? "opacity-75 cursor-not-allowed" : ""} ${className}`}
    >
      <input {...getInputProps()} />
      {loading ? (
        <div className="space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-sm font-bold text-secondary-text">Analyzing upload metadata...</p>
        </div>
      ) : success ? (
        <div className="space-y-3">
          <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
          <p className="text-sm font-bold text-dark-text">{successMessage}</p>
          <p className="text-xs text-secondary-text">Click or drag another file to replace</p>
        </div>
      ) : errorMessage ? (
        <div className="space-y-3">
          <AlertCircle className="w-12 h-12 text-error-color mx-auto" />
          <p className="text-sm font-bold text-error-color">{errorMessage}</p>
          <p className="text-xs text-secondary-text">Click or drag to try again</p>
        </div>
      ) : (
        <div className="space-y-3">
          <Upload className="w-10 h-10 text-secondary-text mx-auto" />
          <p className="text-sm font-bold text-dark-text">{title}</p>
          <p className="text-xs text-secondary-text">{subtitle}</p>
        </div>
      )}
    </div>
  );
}
