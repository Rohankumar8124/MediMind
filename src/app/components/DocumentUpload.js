'use client';

import { useState, useRef } from 'react';

export default function DocumentUpload({ documents, setDocuments }) {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        addFiles(files);
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        addFiles(files);
    };

    const addFiles = (files) => {
        const validFiles = files.filter(file => {
            const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
            const maxSize = 10 * 1024 * 1024; // 10MB
            return validTypes.includes(file.type) && file.size <= maxSize;
        });

        const newDocs = validFiles.map(file => ({
            id: Date.now() + Math.random(),
            name: file.name,
            size: file.size,
            type: file.type,
            file: file,
            preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
        }));

        setDocuments(prev => [...prev, ...newDocs]);
    };

    const removeDocument = (id) => {
        setDocuments(prev => {
            const doc = prev.find(d => d.id === id);
            if (doc?.preview) URL.revokeObjectURL(doc.preview);
            return prev.filter(d => d.id !== id);
        });
    };

    const formatSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const getFileIcon = (type) => {
        if (type === 'application/pdf') {
            return (
                <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 13a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-1 0v-3a.5.5 0 0 1 .5-.5zm2.5.5a.5.5 0 0 0-1 0v3a.5.5 0 0 0 1 0v-1h.5a1.5 1.5 0 0 0 0-3H11v1zm.5 1h.5a.5.5 0 0 1 0 1H11.5v-1zm3 0a.5.5 0 0 0-.5.5v2a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 0-1h-.5v-.5h.5a.5.5 0 0 0 0-1h-.5v-.5z" />
                </svg>
            );
        }
        return (
            <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        );
    };

    return (
        <div className="space-y-4">
            {/* Upload Area */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDragging
                    ? 'border-[#93c572] bg-[#eef5e9] dark:bg-[#1a2e1a]'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileSelect}
                    className="hidden"
                />

                <div className="flex flex-col items-center gap-2">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isDragging ? 'bg-[#93c572] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                        }`}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            {isDragging ? 'Drop files here' : 'Upload medical documents'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            PDF, JPG, PNG up to 10MB
                        </p>
                    </div>
                </div>
            </div>

            {/* Uploaded Documents */}
            {documents.length > 0 && (
                <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Uploaded Documents ({documents.length})
                    </p>
                    <div className="space-y-2">
                        {documents.map((doc) => (
                            <div
                                key={doc.id}
                                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700"
                            >
                                {doc.preview ? (
                                    <img
                                        src={doc.preview}
                                        alt={doc.name}
                                        className="w-10 h-10 rounded-lg object-cover"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center">
                                        {getFileIcon(doc.type)}
                                    </div>
                                )}

                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{doc.name}</p>
                                    <p className="text-xs text-gray-400">{formatSize(doc.size)}</p>
                                </div>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeDocument(doc.id);
                                    }}
                                    className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <svg className="w-4 h-4 text-gray-400 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
