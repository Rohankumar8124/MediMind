'use client';

import { useState, useEffect, useCallback } from 'react';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import Header from './components/Header';
import SymptomChecker from './components/SymptomChecker';
import DiagnosisResult from './components/DiagnosisResult';
import MedicineSchedule from './components/MedicineSchedule';
import NearbyHospitals from './components/NearbyHospitals';
import PreviousReports from './components/PreviousReports';
import NotificationToast from './components/NotificationToast';

export default function Home() {
  const [activeTab, setActiveTab] = useState('symptoms');
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [documents, setDocuments] = useState([]);
  const [diagnosis, setDiagnosis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [notification, setNotification] = useState(null);
  const [notificationPermission, setNotificationPermission] = useState('default');

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
    const saved = localStorage.getItem('medicineSchedules');
    if (saved) setSchedules(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (schedules.length > 0) {
      localStorage.setItem('medicineSchedules', JSON.stringify(schedules));
    }
  }, [schedules]);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        showNotification('Notifications Enabled', 'You will receive medicine reminders', 'success');
      }
    }
  };

  const showNotification = useCallback((title, message, type = 'success') => {
    setNotification({ title, message, type });
    setTimeout(() => setNotification(null), 4000);
    if (notificationPermission === 'granted' && 'Notification' in window) {
      new Notification(title, { body: message, icon: '/favicon.ico' });
    }
  }, [notificationPermission]);

  const handleDiagnose = async () => {
    if (selectedSymptoms.length === 0) {
      showNotification('Select Symptoms', 'Please select at least one symptom', 'warning');
      return;
    }
    setIsLoading(true);
    try {
      // Prepare document info for context (just metadata, not full files)
      const documentInfo = documents.map(d => ({
        name: d.name,
        type: d.type.includes('pdf') ? 'PDF' : 'Image',
      }));

      const response = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms: selectedSymptoms,
          additionalInfo,
          hasDocuments: documents.length > 0,
          documentCount: documents.length,
        }),
      });
      const result = await response.json();
      if (result.success) {
        // Log which system was used in browser console
        if (result.source === 'gemini') {
          console.log('%c✅ GEMINI AI - Diagnosis powered by Google Gemini API', 'color: #22c55e; font-weight: bold; font-size: 14px;');
        } else {
          console.log('%c⚠️ FALLBACK - Diagnosis powered by rule-based system (No API Key)', 'color: #f59e0b; font-weight: bold; font-size: 14px;');
        }
        setDiagnosis(result);
        setActiveTab('results');
        showNotification('Analysis Complete', 'Your health insights are ready', 'success');
      } else {
        showNotification('Error', result.message || 'Analysis failed', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      showNotification('Connection Error', 'Please try again', 'error');
    }
    setIsLoading(false);
  };

  const addToSchedule = (medicine) => {
    const newSchedule = {
      id: Date.now(),
      medicine: medicine.name,
      dosage: medicine.dosage,
      frequency: medicine.frequency,
      times: generateDefaultTimes(medicine.frequency),
      duration: medicine.duration,
      isActive: true,
    };
    setSchedules(prev => [...prev, newSchedule]);
    showNotification('Added to Schedule', `${medicine.name} reminder set`, 'success');
  };

  const generateDefaultTimes = (frequency) => {
    const f = frequency.toLowerCase();
    if (f.includes('once') || f.includes('1')) return ['09:00'];
    if (f.includes('twice') || f.includes('2')) return ['09:00', '21:00'];
    if (f.includes('three') || f.includes('3')) return ['08:00', '14:00', '20:00'];
    return ['09:00', '21:00'];
  };

  return (
    <>
      <Header />
      <NotificationToast notification={notification} onClose={() => setNotification(null)} />

      <main className="min-h-screen pt-24 pb-10 px-4 md:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Hero for signed out users */}
          <SignedOut>
            <div className="text-center py-20 slide-up">
              <div className="inline-flex items-center gap-3 mb-6">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[#93c572] to-[#7ab356] flex items-center justify-center shadow-lg float-gentle">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-semibold text-gray-800 dark:text-white mb-4">
                Your AI <span className="gradient-text">Health Assistant</span>
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-lg max-w-xl mx-auto mb-8">
                Describe your symptoms, get personalized health insights, medicine suggestions, and manage your health schedule—all powered by AI.
              </p>
              <div className="flex justify-center">
                <SignInButton mode="modal">
                  <button className="group text-base px-6 py-3 sm:text-lg sm:px-8 sm:py-3.5 inline-flex items-center gap-3 bg-[#93c572] text-white font-medium rounded-xl shadow-lg hover:shadow-[0_8px_30px_rgba(147,197,114,0.4)] hover:bg-[#85b865] hover:scale-[1.03] active:scale-100 transition-all duration-300 ease-out cursor-pointer">
                    <svg className="w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:rotate-[360deg]" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span>Continue with Google</span>
                  </button>
                </SignInButton>
              </div>

              <div className="mt-16 grid md:grid-cols-3 gap-6 text-left">
                {[
                  { icon: '🔍', title: 'Symptom Analysis', desc: 'AI analyzes your symptoms to identify possible conditions' },
                  { icon: '💊', title: 'Medicine Suggestions', desc: 'Get dosage, frequency, and important warnings' },
                  { icon: '⏰', title: 'Smart Reminders', desc: 'Set medicine schedules with browser notifications' },
                ].map((f, i) => (
                  <div key={i} className="card p-6 slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
                    <span className="text-3xl mb-3 block">{f.icon}</span>
                    <h3 className="font-semibold text-gray-800 dark:text-white mb-1">{f.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </SignedOut>

          {/* Main app for signed in users */}
          <SignedIn>
            <header className="text-center mb-10 slide-up">
              <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 dark:text-white mb-2">
                Healmate<span className="gradient-text">AI</span>
              </h1>
              <p className="text-gray-500 dark:text-gray-400">Describe your symptoms and receive personalized health insights</p>
            </header>

            {/* Tab Navigation */}
            <div className="flex justify-center mb-8 slide-up slide-up-delay-1">
              <div className="tab-nav">
                {['symptoms', 'results', 'schedule', 'reports', 'hospitals'].map((tab) => (
                  <button
                    key={tab}
                    className={`tab-item ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                    disabled={tab === 'results' && !diagnosis}
                  >
                    <span className="flex items-center gap-2 capitalize">
                      {tab === 'symptoms' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
                      {tab === 'results' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                      {tab === 'schedule' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                      {tab === 'reports' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                      {tab === 'hospitals' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                      {tab}
                      {tab === 'schedule' && schedules.length > 0 && (
                        <span className="bg-white/30 px-2 py-0.5 rounded-full text-xs">{schedules.length}</span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Notification Permission */}
            {notificationPermission === 'default' && (
              <div className="card p-5 mb-6 flex items-center justify-between gap-4 slide-up slide-up-delay-2">
                <div className="flex items-center gap-4">
                  <div className="icon-box icon-box-warning">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">Enable Reminders</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Get notified for your medicine schedule</p>
                  </div>
                </div>
                <button onClick={requestNotificationPermission} className="btn btn-primary text-sm py-2.5 px-5">Enable</button>
              </div>
            )}

            {/* Content */}
            <div className="slide-up slide-up-delay-3">
              {activeTab === 'symptoms' && (
                <SymptomChecker
                  selectedSymptoms={selectedSymptoms}
                  setSelectedSymptoms={setSelectedSymptoms}
                  additionalInfo={additionalInfo}
                  setAdditionalInfo={setAdditionalInfo}
                  documents={documents}
                  setDocuments={setDocuments}
                  onDiagnose={handleDiagnose}
                  isLoading={isLoading}
                />
              )}
              {activeTab === 'results' && diagnosis && (
                <DiagnosisResult
                  diagnosis={diagnosis}
                  onAddToSchedule={addToSchedule}
                  onBack={() => setActiveTab('symptoms')}
                />
              )}
              {activeTab === 'schedule' && (
                <MedicineSchedule
                  schedules={schedules}
                  onRemove={(id) => setSchedules(prev => prev.filter(s => s.id !== id))}
                  onToggle={(id) => setSchedules(prev => prev.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s))}
                  onUpdateTime={(id, idx, time) => setSchedules(prev => prev.map(s => {
                    if (s.id === id) { const t = [...s.times]; t[idx] = time; return { ...s, times: t }; }
                    return s;
                  }))}
                  showNotification={showNotification}
                  notificationPermission={notificationPermission}
                />
              )}
              {activeTab === 'reports' && (
                <PreviousReports />
              )}
              {activeTab === 'hospitals' && (
                <NearbyHospitals />
              )}
            </div>

            {/* Footer - hide on results tab since DiagnosisResult has its own disclaimer */}
            {activeTab !== 'results' && (
              <footer className="mt-12">
                <div className="card p-5 max-w-2xl mx-auto">
                  <div className="flex items-start gap-4">
                    <div className="icon-box icon-box-warning flex-shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-medium text-gray-700 dark:text-gray-300">Disclaimer:</span> This AI provides general health information only. Always consult a qualified healthcare provider for diagnosis and treatment.
                    </p>
                  </div>
                </div>
              </footer>
            )}
          </SignedIn>
        </div>
      </main>
    </>
  );
}
