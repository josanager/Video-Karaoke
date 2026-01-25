
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AbsoluteFill, useVideoConfig, useCurrentFrame, Audio, staticFile } from 'remotion';

// Load the raw lyrics to get the words
import lyricsDataJson from '../public/lyrics.json';

interface LyricWord {
    word: string;
    start: number;
    end: number;
    confidence: number;
}

// Memoized word component to prevent unnecessary re-renders
const WordItem = React.memo(({
    word,
    index,
    currentIndex,
    onRef
}: {
    word: string,
    index: number,
    currentIndex: number,
    onRef: (el: HTMLSpanElement | null) => void
}) => {
    const isPast = index < currentIndex;
    const isCurrent = index === currentIndex;

    return (
        <span
            ref={isCurrent ? onRef : null}
            style={{
                display: 'inline-block',
                margin: '0 8px',
                padding: '4px 10px',
                borderRadius: 6,
                color: isPast ? '#333' : (isCurrent ? '#000' : '#888'),
                backgroundColor: isCurrent ? '#00ff99' : 'transparent',
                fontWeight: isCurrent ? 'bold' : 'normal',
                transform: isCurrent ? 'scale(1.15)' : 'scale(1)',
                transition: 'all 0.05s ease', // Quick CSS transition
            }}
        >
            {word}
        </span>
    );
});

export const ManualSync: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const currentTime = frame / fps;

    // Use a ref for currentTime to avoid dependency issues/re-renders
    const timeRef = useRef(currentTime);
    useEffect(() => {
        timeRef.current = currentTime;
    }, [currentTime]);

    // Constant data
    const initialWords = useRef((lyricsDataJson.lyrics as LyricWord[]).map(l => l.word));

    // CRITICAL OPTIMIZATION: Use Ref for data storage instead of State
    // access to .current is instant and doesn't trigger re-renders
    const syncedWordsRef = useRef<LyricWord[]>([]);

    // State only for UI
    const [currentWordIndex, setCurrentWordIndex] = useState(-1);
    const [isComplete, setIsComplete] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [jsonPreview, setJsonPreview] = useState(''); // Update this less frequently

    // Refs for scrolling
    const currentWordRef = useRef<HTMLSpanElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Focus container on mount
    useEffect(() => {
        containerRef.current?.focus();
    }, []);

    // Scroll handling
    useEffect(() => {
        currentWordRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
        });
    }, [currentWordIndex]);

    // Update JSON preview lazily (e.g. when pausing or every X words) to avoid UI lag
    useEffect(() => {
        // Only update preview every 5 words or when complete/start
        if (currentWordIndex % 5 === 0 || isComplete || currentWordIndex === -1) {
            setJsonPreview(JSON.stringify({
                duration: lyricsDataJson.duration,
                lyrics: syncedWordsRef.current
            }, null, 2));
        }
    }, [currentWordIndex, isComplete]);

    // Optimized Key Handler
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'ArrowRight' && !isComplete) {
                e.preventDefault();

                const now = timeRef.current;
                const activeIndex = currentWordIndex;
                const nextIndex = activeIndex + 1;
                const words = initialWords.current;

                if (nextIndex > words.length) return;

                // 1. Close previous word
                if (activeIndex >= 0 && activeIndex < syncedWordsRef.current.length) {
                    syncedWordsRef.current[activeIndex].end = now;
                }

                // 2. Start next word
                if (nextIndex < words.length) {
                    syncedWordsRef.current.push({
                        word: words[nextIndex],
                        start: now,
                        end: now + 0.3, // Temp end
                        confidence: 1.0
                    });
                }

                // UI UPDATE (Triggers render)
                setCurrentWordIndex(nextIndex);

                if (nextIndex >= words.length) {
                    setIsComplete(true);
                    // Final JSON update
                    setJsonPreview(JSON.stringify({
                        duration: lyricsDataJson.duration,
                        lyrics: syncedWordsRef.current
                    }, null, 2));
                }

                setSaveStatus('idle');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentWordIndex, isComplete]); // Re-binding is fine now that the payload is light

    const handleSave = useCallback(async () => {
        const currentData = syncedWordsRef.current;
        if (currentData.length === 0) {
            alert("No words synced yet!");
            return;
        }

        setSaveStatus('saving');
        const payload = {
            duration: lyricsDataJson.duration,
            lyrics: currentData
        };

        try {
            const response = await fetch('http://localhost:3001/save-lyrics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload, null, 2),
            });

            if (response.ok) {
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus('idle'), 3000);
            } else {
                setSaveStatus('error');
            }
        } catch (e) {
            console.error(e);
            setSaveStatus('error');
        }
    }, []);

    const handleCopy = useCallback(() => {
        const payload = JSON.stringify({
            duration: lyricsDataJson.duration,
            lyrics: syncedWordsRef.current
        }, null, 2);
        navigator.clipboard.writeText(payload);
        alert('Copied to clipboard!');
    }, []);

    // Set Ref callback
    const setWordRef = useCallback((el: HTMLSpanElement | null) => {
        currentWordRef.current = el;
    }, []);

    return (
        <AbsoluteFill
            ref={containerRef}
            tabIndex={0}
            style={{
                backgroundColor: '#0f0f15',
                color: 'white',
                fontFamily: 'Inter, system-ui, sans-serif',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                overflow: 'hidden',
                outline: 'none'
            }}
        >
            <Audio src={staticFile('Na Na Na.wav')} />

            {/* Header */}
            <div style={{
                padding: '20px 40px',
                borderBottom: '1px solid #333',
                backgroundColor: '#1a1a20',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 10
            }}>
                <div>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#00ff99' }}>
                        MANUAL SYNC <span style={{ color: '#fff' }}>TOOL (TURBO MODE)</span>
                    </div>
                    {saveStatus === 'saved' && <span style={{ color: '#00ff99', fontSize: 12 }}>✓ FILE UPDATED</span>}
                    {saveStatus === 'error' && <span style={{ color: '#ff4444', fontSize: 12 }}>! SAVE FAILED</span>}
                </div>

                <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                    <div style={{ fontSize: 14, color: '#888' }}>
                        Press <code style={{ backgroundColor: '#333', padding: '2px 6px', borderRadius: 4, color: '#fff' }}>→</code> to sync
                    </div>
                    <div style={{
                        fontSize: 20,
                        fontWeight: 'bold',
                        color: isComplete ? '#0f0' : '#fff',
                        width: 120,
                        textAlign: 'right'
                    }}>
                        {Math.max(0, currentWordIndex)} / {initialWords.current.length}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'row',
                overflow: 'hidden'
            }}>
                {/* Lyrics Text Area */}
                <div style={{
                    flex: 2,
                    padding: '60px 40px',
                    overflowY: 'auto',
                    lineHeight: 1.8,
                    fontSize: 36,
                    textAlign: 'center'
                }}>
                    {initialWords.current.map((word, i) => {
                        if (word === '__BREAK__') {
                            return (
                                <div key={i} style={{
                                    width: '100%',
                                    height: 40, // Visual gap 
                                    display: 'block'
                                }} />
                            );
                        }

                        return (
                            <WordItem
                                key={i}
                                word={word}
                                index={i}
                                currentIndex={currentWordIndex}
                                onRef={setWordRef}
                            />
                        );
                    })}
                </div>

                {/* Sidebar Results */}
                <div style={{
                    width: 380,
                    borderLeft: '1px solid #333',
                    backgroundColor: '#0a0a0f',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 20
                }}>
                    <div style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 4 }}>DATA OPS</div>
                        <div style={{ fontSize: 11, color: '#555' }}>Times captured instantly. Preview updates periodically.</div>
                    </div>

                    <textarea
                        readOnly
                        value={jsonPreview}
                        style={{
                            flex: 1,
                            backgroundColor: '#000',
                            color: '#0f0',
                            fontFamily: 'monospace',
                            fontSize: 11,
                            border: '1px solid #222',
                            borderRadius: 4,
                            padding: 10,
                            resize: 'none',
                            outline: 'none',
                            opacity: 0.8
                        }}
                    />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
                        <button
                            disabled={currentWordIndex < 0 || saveStatus === 'saving'}
                            style={{
                                backgroundColor: saveStatus === 'saving' ? '#333' : (currentWordIndex < 0 ? '#222' : '#00ff99'),
                                color: '#000',
                                border: 'none',
                                padding: '16px',
                                fontWeight: 'bold',
                                borderRadius: 8,
                                cursor: currentWordIndex < 0 ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s ease',
                                fontSize: 16
                            }}
                            onClick={handleSave}
                        >
                            {saveStatus === 'saving' ? 'SAVING...' : 'SAVE TO FILE'}
                        </button>

                        <button
                            style={{
                                backgroundColor: 'transparent',
                                color: '#555',
                                border: '1px solid #333',
                                padding: '10px',
                                fontWeight: 'bold',
                                borderRadius: 8,
                                cursor: 'pointer',
                                fontSize: 12
                            }}
                            onClick={handleCopy}
                        >
                            COPY JSON TO CLIPBOARD
                        </button>
                    </div>

                    <div style={{ marginTop: 20, fontSize: 11, color: '#333' }}>
                        * The file <code>lyrics.json</code> will be overwritten on disk.
                    </div>
                </div>
            </div>
        </AbsoluteFill>
    );
};
