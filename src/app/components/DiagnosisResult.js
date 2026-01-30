'use client';

import { useState } from 'react';
import { generatePrescriptionPDF, downloadPDF } from '../utils/pdfGenerator';

export default function DiagnosisResult({ diagnosis, onAddToSchedule, onBack }) {
    const [expandedMedicine, setExpandedMedicine] = useState(null);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    const data = diagnosis?.data;

    if (!data) {
        return (
            <div className="card p-10 text-center">
                <p className="text-gray-500">No diagnosis data available</p>
                <button onClick={onBack} className="btn btn-secondary mt-4">Go Back</button>
            </div>
        );
    }

    const handleDownloadPDF = async () => {
        setIsGeneratingPDF(true);
        try {
            const doc = await generatePrescriptionPDF(diagnosis);
            if (doc) {
                downloadPDF(doc, 'MediCare_Prescription');
            }
        } catch (error) {
            console.error('PDF generation failed:', error);
        }
        setIsGeneratingPDF(false);
    };

    const getUrgencyConfig = (level) => {
        switch (level?.toLowerCase()) {
            case 'emergency': return { badge: 'badge-danger', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: '🚨' };
            case 'high': return { badge: 'badge-danger', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', icon: '⚠️' };
            case 'medium': return { badge: 'badge-warning', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', icon: '⚡' };
            default: return { badge: 'badge-success', bg: 'bg-[#eef5e9]', border: 'border-[#d4e8c7]', text: 'text-[#5a8a3d]', icon: '✓' };
        }
    };

    const urgencyConfig = getUrgencyConfig(data.urgencyLevel);
    const analysisDetails = data.analysisDetails || {};

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex items-center justify-between">
                <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors text-sm font-medium">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Symptoms
                </button>

                {/* PDF Download Button */}
                <button onClick={handleDownloadPDF} disabled={isGeneratingPDF} className="btn btn-primary text-sm py-2.5 px-5 flex items-center gap-2">
                    {isGeneratingPDF ? (
                        <>
                            <svg className="w-4 h-4 spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            Generating...
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Download Prescription
                        </>
                    )}
                </button>
            </div>

            {/* Assessment Summary Card */}
            <div className={`card p-6 ${urgencyConfig.bg} ${urgencyConfig.border} border slide-up`}>
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{urgencyConfig.icon}</span>
                        <div>
                            <p className="text-sm text-gray-500">Assessment Level</p>
                            <p className={`text-lg font-semibold capitalize ${urgencyConfig.text}`}>{data.urgencyLevel}</p>
                        </div>
                    </div>
                    <span className={`badge ${urgencyConfig.badge}`}>{data.urgencyLevel?.toUpperCase()}</span>
                </div>

                {data.overallAssessment && (
                    <p className="text-gray-700 text-sm leading-relaxed border-t border-gray-200/50 pt-4 mt-2">
                        {data.overallAssessment}
                    </p>
                )}

                {/* Analysis Stats */}
                <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-200/50">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Symptoms Analyzed:</span>
                        <span className="number-highlight text-sm">{diagnosis.symptomCount || analysisDetails.symptomCount || '?'}</span>
                    </div>
                    {analysisDetails.patternsIdentified?.length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Patterns Found:</span>
                            <div className="flex gap-1">
                                {analysisDetails.patternsIdentified.map((p, i) => (
                                    <span key={i} className="badge badge-info text-xs capitalize">{p}</span>
                                ))}
                            </div>
                        </div>
                    )}
                    {analysisDetails.urgencyScore !== undefined && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Severity Score:</span>
                            <span className="number-highlight text-sm">{analysisDetails.urgencyScore}/10</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Conditions */}
            {data.possibleConditions?.length > 0 && (
                <div className="card p-6 slide-up slide-up-delay-1">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#93c572]"></span>
                        Possible Conditions
                    </h2>
                    <div className="space-y-3">
                        {data.possibleConditions.map((condition, index) => (
                            <div key={index} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="flex items-start justify-between gap-4 mb-2">
                                    <h3 className="font-medium text-gray-800">{condition.name}</h3>
                                    {condition.probability && (
                                        <span className={`badge ${condition.probability.toLowerCase() === 'high' ? 'badge-warning' :
                                                condition.probability.toLowerCase() === 'medium' ? 'badge-info' : 'badge-neutral'
                                            }`}>{condition.probability}</span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-600 mb-2">{condition.description}</p>
                                {condition.matchingSymptoms?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        <span className="text-xs text-gray-400">Matching:</span>
                                        {condition.matchingSymptoms.map((s, i) => (
                                            <span key={i} className="text-xs px-2 py-0.5 bg-[#eef5e9] text-[#5a8a3d] rounded-full">{s}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Medicines */}
            {data.suggestedMedicines?.length > 0 && (
                <div className="card p-6 slide-up slide-up-delay-2">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#93c572]"></span>
                        Suggested Medicines
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2">
                        {data.suggestedMedicines.map((med, index) => (
                            <div key={index} className="medicine-card cursor-pointer" onClick={() => setExpandedMedicine(expandedMedicine === index ? null : index)}>
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="icon-box icon-box-pistachio">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-gray-800 text-sm">{med.name}</h3>
                                            <div className="flex gap-1 mt-1">
                                                <span className={`badge text-xs ${med.type === 'OTC' ? 'badge-success' : 'badge-warning'}`}>{med.type}</span>
                                                {med.purpose && <span className="text-xs text-gray-400">• {med.purpose}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); onAddToSchedule(med); }} className="btn btn-icon btn-ghost hover:bg-[#eef5e9]" title="Add to Schedule">
                                        <svg className="w-5 h-5 text-[#93c572]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="space-y-1.5 text-sm">
                                    <div className="flex gap-2"><span className="text-gray-400 w-20">Dosage:</span><span className="text-gray-700">{med.dosage}</span></div>
                                    <div className="flex gap-2"><span className="text-gray-400 w-20">Frequency:</span><span className="text-gray-700">{med.frequency}</span></div>
                                    <div className="flex gap-2"><span className="text-gray-400 w-20">Duration:</span><span className="text-gray-700">{med.duration}</span></div>
                                </div>

                                {expandedMedicine === index && (
                                    <div className="mt-4 pt-4 border-t border-gray-100 fade-in">
                                        <div className="p-3 bg-amber-50 rounded-lg text-sm text-amber-700 flex items-start gap-2">
                                            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                            <span>{med.warnings}</span>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); onAddToSchedule(med); }} className="btn btn-primary w-full mt-3 text-sm">Add to Schedule</button>
                                    </div>
                                )}

                                <div className="mt-3 pt-3 border-t border-gray-100 text-center">
                                    <span className="text-xs text-gray-400">{expandedMedicine === index ? '▲ Collapse' : '▼ Details & Warnings'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Home Remedies */}
            {data.homeRemedies?.length > 0 && (
                <div className="card p-6 slide-up slide-up-delay-3">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#93c572]"></span>
                        Home Remedies
                    </h2>
                    <div className="grid gap-3 md:grid-cols-2">
                        {data.homeRemedies.map((remedy, index) => (
                            <div key={index} className="p-4 bg-[#eef5e9] rounded-xl border border-[#d4e8c7]">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-medium text-[#5a8a3d]">{remedy.remedy}</h3>
                                    {remedy.effectiveness && <span className={`badge text-xs ${remedy.effectiveness === 'High' ? 'badge-success' : 'badge-info'}`}>{remedy.effectiveness}</span>}
                                </div>
                                <p className="text-sm text-gray-600">{remedy.instructions}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Lifestyle */}
            {data.lifestyle?.length > 0 && (
                <div className="card p-6 slide-up slide-up-delay-4">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#93c572]"></span>
                        Lifestyle Recommendations
                    </h2>
                    <ul className="space-y-2">
                        {data.lifestyle.map((item, index) => (
                            <li key={index} className="flex items-start gap-3 text-sm">
                                <span className="number-highlight text-xs mt-0.5">{index + 1}</span>
                                <span className="text-gray-600">{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* When to See Doctor */}
            {data.whenToSeeDoctor && (
                <div className="card p-5 border-l-4 border-amber-400 slide-up">
                    <h2 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                        <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        When to Seek Medical Attention
                    </h2>
                    <p className="text-gray-600 text-sm leading-relaxed">{data.whenToSeeDoctor}</p>
                </div>
            )}

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button onClick={handleDownloadPDF} disabled={isGeneratingPDF} className="btn btn-secondary flex-1 py-3">
                    {isGeneratingPDF ? (
                        <>Generating PDF...</>
                    ) : (
                        <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Save as PDF
                        </>
                    )}
                </button>
                
            </div>

            {/* Disclaimer */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600">
                <p className="flex items-start gap-2">
                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {diagnosis.disclaimer}
                </p>
            </div>
        </div>
    );
}
