'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export default function MedicineSchedule({
    schedules,
    onRemove,
    onToggle,
    onUpdateTime,
    showNotification,
    notificationPermission,
}) {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [editingSchedule, setEditingSchedule] = useState(null);
    const checkedRemindersRef = useRef(new Set());

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    const checkReminders = useCallback(() => {
        const now = currentTime;
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        schedules.forEach(s => {
            if (!s.isActive) return;
            s.times.forEach(time => {
                const key = `${s.id}-${time}-${now.toDateString()}`;
                if (time === timeStr && !checkedRemindersRef.current.has(key)) {
                    checkedRemindersRef.current.add(key);
                    showNotification(`Time for ${s.medicine}`, `Take ${s.dosage}`, 'success');
                }
            });
        });
    }, [currentTime, schedules, showNotification]);

    useEffect(() => {
        if (notificationPermission === 'granted') checkReminders();
    }, [currentTime, notificationPermission, checkReminders]);

    const formatTime = (t) => {
        const [h, m] = t.split(':');
        const hr = parseInt(h);
        return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
    };

    const getNextDose = (s) => {
        if (!s.isActive) return null;
        const mins = currentTime.getHours() * 60 + currentTime.getMinutes();
        for (const t of s.times.sort()) {
            const [h, m] = t.split(':').map(Number);
            const tm = h * 60 + m;
            if (tm > mins) {
                const d = tm - mins;
                return d >= 60 ? `${Math.floor(d / 60)}h ${d % 60}m` : `${d}m`;
            }
        }
        return 'Tomorrow';
    };

    const getDayProgress = () => (currentTime.getHours() * 60 + currentTime.getMinutes()) / 1440 * 100;

    if (!schedules.length) {
        return (
            <div className="card p-16 empty-state">
                <div className="empty-state-icon float-gentle">
                    <svg className="w-10 h-10 text-[#93c572]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">No Schedules Yet</h2>
                <p className="text-gray-500 dark:text-gray-400">Add medicines from diagnosis to create reminders</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="card p-8 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">Current Time</p>
                <div className="timer-display dark:text-white">{currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                <div className="max-w-md mx-auto">
                    <div className="flex justify-between text-xs text-gray-400 mb-2"><span>12 AM</span><span>12 PM</span><span>12 AM</span></div>
                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${getDayProgress()}%` }} /></div>
                </div>
            </div>

            <div className="card p-6">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Your Medicines</h2>
                    <span className="badge badge-neutral">{schedules.length}</span>
                </div>
                <div className="space-y-4">
                    {schedules.map((s) => (
                        <div key={s.id} className={`schedule-item flex-col ${!s.isActive ? 'opacity-50' : ''}`}>
                            <div className="flex items-start gap-4 w-full">
                                <div onClick={() => onToggle(s.id)} className={`toggle ${s.isActive ? 'active' : ''}`} />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-medium text-gray-800 dark:text-white">{s.medicine}</h3>
                                        {s.isActive && getNextDose(s) && <span className="badge badge-success text-xs">Next: {getNextDose(s)}</span>}
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{s.dosage}</p>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => setEditingSchedule(editingSchedule === s.id ? null : s.id)} className="btn btn-icon btn-ghost">
                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </button>
                                    <button onClick={() => onRemove(s.id)} className="btn btn-icon btn-ghost hover:bg-red-50">
                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-4 ml-16">{s.times.map((t, i) => <div key={i} className="schedule-time">{formatTime(t)}</div>)}</div>
                            {editingSchedule === s.id && (
                                <div className="w-full mt-4 pt-4 border-t border-gray-100 ml-16 fade-in">
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Edit times:</p>
                                    <div className="flex flex-wrap gap-3">{s.times.map((t, i) => <input key={i} type="time" value={t} onChange={(e) => onUpdateTime(s.id, i, e.target.value)} className="time-picker" />)}</div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="card p-6">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">Today's Timeline</h2>
                <div className="relative pl-6">
                    <div className="timeline-line" />
                    <div className="space-y-5">
                        {schedules.filter(s => s.isActive).flatMap(s => s.times.map(t => ({ ...s, time: t, tv: t.split(':').reduce((a, b) => a * 60 + parseInt(b), 0) }))).sort((a, b) => a.tv - b.tv).map((item, i) => {
                            const mins = currentTime.getHours() * 60 + currentTime.getMinutes();
                            const past = item.tv < mins;
                            const current = Math.abs(item.tv - mins) < 30;
                            return (
                                <div key={`${item.id}-${item.time}-${i}`} className="relative flex items-center gap-4">
                                    <div className={`timeline-dot ${past ? 'timeline-dot-past' : ''} ${current ? 'pulse-soft' : ''} ${!past && !current ? 'timeline-dot-inactive' : ''}`} />
                                    <div className={`flex-1 p-4 rounded-xl ${current ? 'bg-[#eef5e9] dark:bg-[#1a2e1a] border border-[#d4e8c7] dark:border-[#2d4a2d]' : 'bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700'}`}>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className={`font-medium ${past ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-white'}`}>{item.medicine}</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">{item.dosage}</p>
                                            </div>
                                            <div className={`font-mono ${current ? 'text-[#7ab356]' : past ? 'text-gray-400' : 'text-gray-600 dark:text-gray-300'}`}>{formatTime(item.time)}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
