import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { ArrowLeft, Camera, CheckCircle, X, Image as ImageIcon, RefreshCcw, Keyboard } from 'lucide-react';
import { supabase } from '../supabaseClient';

type ScanResult = {
  success: boolean;
  message: string;
  name?: string;
  jenis_kelamin?: string | null;
  usia?: string | null;
  alamat?: string | null;
  jenis_tiket?: string | null;
  waktu_absen?: string | null;
} | null;

const ScannerPage: React.FC = () => {
  const navigate = useNavigate();
  const [scanResult, setScanResult] = useState<ScanResult>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasInitialized = useRef(false);
  // Use a ref for isProcessing to avoid stale closure inside the scan callback
  const isProcessingRef = useRef(false);
  // Debounce: timestamp of last scan
  const lastScanTimestamp = useRef(0);
  const SCAN_DEBOUNCE_MS = 2000; // 2 second cooldown between scans

  const processBarcode = useCallback(async (decodedText: string) => {
    const now = Date.now();
    // Guard: debounce + in-progress check using ref (not stale state)
    if (isProcessingRef.current || now - lastScanTimestamp.current < SCAN_DEBOUNCE_MS) return;

    isProcessingRef.current = true;
    lastScanTimestamp.current = now;
    setIsProcessing(true);

    // Pause camera while processing result
    try {
      if (scannerRef.current?.getState() === 2) {
        scannerRef.current.pause(true);
      }
    } catch (_) {}

    try {
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .eq('barcode', decodedText.trim())
        .single();

      const extraInfo = {
        jenis_kelamin: data?.jenis_kelamin || null,
        usia: data?.usia || null,
        alamat: data?.alamat || null,
        jenis_tiket: data?.jenis_tiket || null,
      };

      if (error || !data) {
        setScanResult({ success: false, message: 'Tiket Tidak Valid / Tidak Ditemukan!' });
      } else {
        // --- SMART QUOTA & AUTO APPROVE LOGIC ---
        const baseName = (data.nama_lengkap || '').replace(/\\s*\\(Tiket \\d+\\)\\s*$/i, '').trim().toLowerCase();
        const whatsapp = data.whatsapp || '';

        // Fetch all rows matching this whatsapp to group them
        const { data: groupData } = await supabase
          .from('participants')
          .select('*')
          .eq('whatsapp', whatsapp);

        // Ambil semua data dalam 1 rombongan (termasuk yang belum lunas)
        let fullGroupRows = groupData || [data];
        fullGroupRows = fullGroupRows.filter(r => (r.nama_lengkap || '').toLowerCase().includes(baseName));

        // AUTO APPROVE: Jika ada MINIMAL 1 tiket yang LUNAS di rombongan ini, anggap rombongan ini valid!
        const isGroupPaid = fullGroupRows.some(r => r.validasi_bayar === 'SUDAH');

        if (!isGroupPaid) {
          // Jika tidak ada satu pun yang lunas di rombongan ini, tolak
          setScanResult({ success: false, message: 'Pembayaran Belum Diverifikasi!', name: data.nama_lengkap, ...extraInfo });
        } else {
          // Hanya hitung kuota dari tiket-tiket yang berstatus LUNAS
          const paidGroupRows = fullGroupRows.filter(r => r.validasi_bayar === 'SUDAH');

          // Calculate True Quota
          let totalQuota = 0;
          const hasSplitTickets = paidGroupRows.some(r => /\\(Tiket \\d+\\)/i.test(r.nama_lengkap || ''));

          const getRowCapacity = (r: any) => {
            const isSplit = /\\(Tiket \\d+\\)/i.test(r.nama_lengkap || '');
            if (isSplit) return 1;
            if (hasSplitTickets) return 1;
            return r.jumlah_tiket || 1;
          };

          paidGroupRows.forEach(r => {
            totalQuota += getRowCapacity(r);
          });

          // Calculate Total Checked-in
          const totalCheckedIn = paidGroupRows.reduce((sum, r) => sum + (r.jumlah_checkin || 0), 0);

          if (totalCheckedIn >= totalQuota) {
            setScanResult({ 
              success: false, 
              message: `Kuota Rombongan Habis! (${totalCheckedIn} dari ${totalQuota} terpakai)`, 
              name: data.nama_lengkap, 
              ...extraInfo 
            });
          } else {
            // --- AUTO PASSING (LEMPAR DATA) LOGIC ---
            // Cari target row dari pool tiket yang LUNAS
            let targetRow = data;
            let targetCapacity = getRowCapacity(data);

            // Jika tiket yang discan BELUM lunas ATAU kuotanya sudah habis, lempar ke tiket LUNAS yang masih ada kuota
            if (data.validasi_bayar !== 'SUDAH' || (data.jumlah_checkin || 0) >= targetCapacity) {
               targetRow = paidGroupRows.find(r => (r.jumlah_checkin || 0) < getRowCapacity(r)) || paidGroupRows[0];
            }

            const waktuCheckin = new Date().toISOString();
            const newCheckinCount = (targetRow.jumlah_checkin || 0) + 1;
            
            await supabase
              .from('participants')
              .update({ 
                status_absen: 'SUDAH',
                waktu_absen: waktuCheckin,
                jumlah_checkin: newCheckinCount
              })
              .eq('barcode', targetRow.barcode); // Update the TARGET row, not necessarily the scanned row!
              
            setScanResult({ 
              success: true, 
              message: `Berhasil! (Masuk: ${totalCheckedIn + 1} dari ${totalQuota})`, 
              name: targetRow.nama_lengkap, // Show the name of the ticket that was actually updated
              waktu_absen: waktuCheckin, 
              ...extraInfo 
            });
          }
        }
      }
    } catch (_) {
      setScanResult({ success: false, message: 'Terjadi kesalahan jaringan. Coba lagi.' });
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, []);

  const startCamera = useCallback(async () => {
    // If already scanning, stop first
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop();
      }
    } catch (_) {}

    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode('reader', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
        ],
        verbose: false,
      });
    }

    setCameraError(null);
    setScanResult(null);
    isProcessingRef.current = false;
    lastScanTimestamp.current = 0;

    const minDim = Math.min(window.innerWidth, window.innerHeight);
    const qrboxSize = Math.min(Math.floor(minDim * 0.8), 380);

    const onScan = (decodedText: string) => processBarcode(decodedText);

    try {
      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 20, // ⬆️ dinaikkan dari 15 ke 20 untuk deteksi lebih cepat
          qrbox: { width: qrboxSize, height: qrboxSize },
          aspectRatio: window.innerHeight / window.innerWidth,
          disableFlip: false, // coba kedua orientasi
        },
        onScan,
        () => {} // ignore per-frame decode errors
      );
    } catch (err) {
      // Fallback: try any available camera
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          await scannerRef.current.start(
            devices[devices.length - 1].id, // last = rear camera on most phones
            { fps: 20, qrbox: { width: qrboxSize, height: qrboxSize } },
            onScan,
            () => {}
          );
        } else {
          setCameraError('Tidak ada kamera yang terdeteksi di perangkat Anda.');
        }
      } catch (_) {
        setCameraError('Akses kamera ditolak. Berikan izin kamera di pengaturan browser Anda, lalu klik tombol di bawah.');
      }
    }
  }, [processBarcode]);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    startCamera();

    return () => {
      (async () => {
        try {
          if (scannerRef.current?.isScanning) {
            await scannerRef.current.stop();
            scannerRef.current.clear();
          }
        } catch (_) {}
      })();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resumeScanning = () => {
    setScanResult(null);
    isProcessingRef.current = false;
    lastScanTimestamp.current = 0;
    try {
      if (scannerRef.current?.getState() === 3) { // PAUSED
        scannerRef.current.resume();
      }
    } catch (_) {}
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !scannerRef.current) return;

    isProcessingRef.current = true;
    setIsProcessing(true);
    try {
      const decodedText = await scannerRef.current.scanFile(file, false);
      await processBarcode(decodedText);
    } catch {
      setScanResult({ success: false, message: 'QR Code tidak terdeteksi pada gambar.' });
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleManualSubmit = () => {
    const code = manualBarcode.trim();
    if (!code || isProcessingRef.current) return;
    setShowManualInput(false);
    setManualBarcode('');
    // Reset debounce so manual entry always goes through
    lastScanTimestamp.current = 0;
    processBarcode(code);
  };

  // ── JSX ─────────────────────────────────────────────────────────────────────

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100dvh', // dynamic viewport height — avoids mobile browser chrome issues
      width: '100vw', overflow: 'hidden', background: '#000',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>

      {/* ── Header ── */}
      <header style={{
        height: '60px', padding: '0 16px',
        display: 'flex', alignItems: 'center', gap: '12px',
        background: '#0f172a', flexShrink: 0,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        zIndex: 50,
      }}>
        <button
          onClick={() => navigate('/admin')}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '40px', height: '40px', background: 'rgba(255,255,255,0.07)',
            color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer',
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'white' }}>
            Scanner Tiket
          </h2>
          <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8' }}>
            Arahkan kamera ke barcode tiket
          </p>
        </div>
        {isProcessing && (
          <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600, animation: 'pulse 1s infinite' }}>
            ⏳ Memproses...
          </span>
        )}
      </header>

      {/* ── Scanner Viewport ── */}
      <div style={{ flex: 1, position: 'relative', width: '100%', background: '#000', overflow: 'hidden' }}>

        {/* The html5-qrcode container */}
        <div
          id="reader"
          style={{ width: '100%', height: '100%', border: 'none', background: '#000' }}
        />

        {/* Corners overlay — visible when scanning */}
        {!scanResult && !cameraError && (
          <div style={{ position: 'absolute', inset: '20px', pointerEvents: 'none', zIndex: 10 }}>
            {[
              { top: 0, left: 0, borderTop: '4px solid #ec4899', borderLeft: '4px solid #ec4899', borderTopLeftRadius: '16px' },
              { top: 0, right: 0, borderTop: '4px solid #ec4899', borderRight: '4px solid #ec4899', borderTopRightRadius: '16px' },
              { bottom: 0, left: 0, borderBottom: '4px solid #ec4899', borderLeft: '4px solid #ec4899', borderBottomLeftRadius: '16px' },
              { bottom: 0, right: 0, borderBottom: '4px solid #ec4899', borderRight: '4px solid #ec4899', borderBottomRightRadius: '16px' },
            ].map((s, i) => (
              <span key={i} style={{ position: 'absolute', width: '36px', height: '36px', ...s }} />
            ))}
          </div>
        )}

        {/* ── Camera Error Overlay ── */}
        {cameraError && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', zIndex: 20,
            padding: '24px', textAlign: 'center', background: '#0f172a',
          }}>
            <div style={{ width: '72px', height: '72px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <Camera size={36} color="#64748b" />
            </div>
            <h3 style={{ color: 'white', margin: '0 0 8px', fontSize: '1.15rem', fontWeight: 700 }}>Kamera Tidak Tersedia</h3>
            <p style={{ color: '#94a3b8', marginBottom: '24px', fontSize: '0.9rem', lineHeight: 1.5, maxWidth: '280px' }}>{cameraError}</p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={() => startCamera()}
                style={{ background: '#be185d', color: 'white', border: 'none', padding: '12px 22px', borderRadius: '50px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}
              >
                <Camera size={17} /> Minta Izin Kamera
              </button>
              <button
                onClick={() => setShowManualInput(true)}
                style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: '12px 22px', borderRadius: '50px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}
              >
                <Keyboard size={17} /> Input Manual
              </button>
            </div>
          </div>
        )}

        {/* ── Bottom Action Buttons ── */}
        {!scanResult && !cameraError && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '20px 16px 32px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
            zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
          }}>
            <button
              onClick={() => startCamera()}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'rgba(0,0,0,0.3)', color: 'rgba(255,255,255,0.7)',
                border: '1px solid rgba(255,255,255,0.15)', padding: '8px 18px',
                borderRadius: '50px', backdropFilter: 'blur(5px)',
                fontWeight: 500, cursor: 'pointer', fontSize: '0.85rem',
              }}
            >
              <RefreshCcw size={15} /> Restart Kamera
            </button>

            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowManualInput(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: 'rgba(15,23,42,0.9)', color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)', padding: '13px 20px',
                  borderRadius: '50px', backdropFilter: 'blur(10px)',
                  fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                }}
              >
                <Keyboard size={19} /> Input Manual
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: '#be185d', color: 'white',
                  border: 'none', padding: '13px 20px', borderRadius: '50px',
                  fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem',
                  boxShadow: '0 4px 20px rgba(190,24,93,0.45)',
                }}
              >
                <ImageIcon size={19} /> Scan Galeri
              </button>
            </div>
          </div>
        )}

        {/* ── Manual Input Modal ── */}
        {showManualInput && (
          <div
            onClick={(e) => e.target === e.currentTarget && setShowManualInput(false)}
            style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(8px)', zIndex: 50,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
              padding: '0 0 env(safe-area-inset-bottom, 0)', // iOS safe area
            }}
          >
            {/* Bottom sheet style */}
            <div style={{
              background: 'white', padding: '28px 24px 32px', borderRadius: '24px 24px 0 0',
              width: '100%', maxWidth: '480px',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.3)',
              animation: 'slideUp 0.25s ease',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: 700 }}>Input Barcode Manual</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Ketik kode tiket peserta</p>
                </div>
                <button
                  onClick={() => setShowManualInput(false)}
                  style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={20} />
                </button>
              </div>

              <input
                type="text"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                placeholder="Contoh: TKT-20240001"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleManualSubmit(); }}
                style={{
                  width: '100%', padding: '16px 18px', borderRadius: '14px',
                  border: '2px solid #e2e8f0', fontSize: '1.05rem',
                  marginBottom: '16px', outline: 'none', boxSizing: 'border-box',
                  fontFamily: 'inherit', color: '#0f172a', letterSpacing: '0.5px',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#be185d')}
                onBlur={(e) => (e.target.style.borderColor = '#e2e8f0')}
              />

              <button
                onClick={handleManualSubmit}
                disabled={!manualBarcode.trim() || isProcessing}
                style={{
                  width: '100%', background: manualBarcode.trim() ? '#be185d' : '#e2e8f0',
                  color: manualBarcode.trim() ? 'white' : '#94a3b8',
                  border: 'none', padding: '16px', borderRadius: '14px',
                  fontSize: '1.05rem', fontWeight: 700, cursor: manualBarcode.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  boxShadow: manualBarcode.trim() ? '0 6px 20px rgba(190,24,93,0.35)' : 'none',
                }}
              >
                {isProcessing ? 'Memproses...' : 'Cek Tiket'}
              </button>
            </div>
          </div>
        )}

        {/* ── Scan Result Overlay ── */}
        {scanResult && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.88)',
            backdropFilter: 'blur(6px)',
            zIndex: 40,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '20px',
            overflowY: 'auto',
          }}>
            <div style={{
              width: '100%', maxWidth: '400px',
              borderRadius: '28px', overflow: 'hidden',
              boxShadow: scanResult.success
                ? '0 24px 60px rgba(16,185,129,0.35)'
                : '0 24px 60px rgba(239,68,68,0.35)',
            }}>

              {/* Header card */}
              <div style={{
                background: scanResult.success
                  ? 'linear-gradient(135deg, #065f46, #059669)'
                  : 'linear-gradient(135deg, #7f1d1d, #dc2626)',
                padding: '28px 24px 20px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                textAlign: 'center',
              }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  background: 'rgba(255,255,255,0.18)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '4px',
                }}>
                  {scanResult.success
                    ? <CheckCircle size={38} color="#6ee7b7" />
                    : <X size={38} color="#fca5a5" />
                  }
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {scanResult.success ? 'Check-in Berhasil' : 'Gagal'}
                </p>
                <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'white', lineHeight: 1.2 }}>
                  {scanResult.name || '—'}
                </h3>
                {scanResult.jenis_tiket && (
                  <span style={{
                    background: 'rgba(255,255,255,0.2)', color: 'white',
                    padding: '4px 14px', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 600,
                  }}>
                    🎫 {scanResult.jenis_tiket}
                  </span>
                )}
              </div>

              {/* Info grid */}
              <div style={{ background: 'white', padding: '20px 20px 0' }}>
                {/* Status message */}
                <div style={{
                  background: scanResult.success ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${scanResult.success ? '#bbf7d0' : '#fecaca'}`,
                  borderRadius: '12px', padding: '10px 14px',
                  marginBottom: '16px', textAlign: 'center',
                  fontSize: '0.88rem', fontWeight: 600,
                  color: scanResult.success ? '#166534' : '#991b1b',
                }}>
                  {scanResult.message}
                </div>

                {/* Detail rows */}
                {[
                  { label: 'Jenis Kelamin', icon: '👤', value: scanResult.jenis_kelamin },
                  { label: 'Usia', icon: '🎂', value: scanResult.usia ? `${scanResult.usia} tahun` : null },
                  { label: 'Domisili', icon: '📍', value: scanResult.alamat },
                  ...(scanResult.success && scanResult.waktu_absen ? [{
                    label: 'Waktu Check-in',
                    icon: '🕐',
                    value: new Date(scanResult.waktu_absen).toLocaleString('id-ID', {
                      dateStyle: 'medium', timeStyle: 'short'
                    }),
                  }] : []),
                ].map(({ label, icon, value }) => (
                  <div key={label} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '12px',
                    padding: '12px 0',
                    borderBottom: '1px solid #f1f5f9',
                  }}>
                    <span style={{ fontSize: '1.1rem', marginTop: '1px' }}>{icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                      <p style={{
                        margin: '3px 0 0', fontSize: '0.95rem', fontWeight: 500,
                        color: value ? '#0f172a' : '#cbd5e1',
                        fontStyle: value ? 'normal' : 'italic',
                      }}>
                        {value || 'Tidak Tercantum'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action button */}
              <div style={{ background: 'white', padding: '16px 20px 20px' }}>
                <button
                  onClick={resumeScanning}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    background: scanResult.success ? '#059669' : '#dc2626',
                    color: 'white', border: 'none', padding: '15px',
                    borderRadius: '14px', fontWeight: 700, cursor: 'pointer',
                    fontSize: '1rem', boxShadow: scanResult.success
                      ? '0 6px 20px rgba(5,150,105,0.35)'
                      : '0 6px 20px rgba(220,38,38,0.35)',
                  }}
                >
                  <RefreshCcw size={18} /> Lanjut Scan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
        #reader > div { border: none !important; box-shadow: none !important; }
        #reader video { object-fit: cover !important; }
        #reader__scan_region { min-height: 0 !important; }
        #reader__dashboard { display: none !important; }
      `}</style>
    </div>
  );
};

export default ScannerPage;
