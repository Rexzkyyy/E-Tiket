import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  Search, 
  Barcode as BarcodeIcon, 
  CheckCircle, 
  Download, 
  Plus, 
  Camera, 
  X,
  Users,
  LayoutDashboard,
  RefreshCw,
  ShieldCheck,
  Clock,
  Send,
  Filter,
  Database,
  Info,
  Settings,
  History
} from 'lucide-react';
import Barcode from 'react-barcode';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';

// Global singleton to prevent multiple GoTrueClient warnings
let globalSupabaseClient: any = null;
let currentUrl = '';
let currentKey = '';

// Supabase Configuration
const getSupabase = (url: string, key: string) => {
  if (!url || !key) return null;
  if (globalSupabaseClient && currentUrl === url && currentKey === key) {
    return globalSupabaseClient;
  }
  currentUrl = url;
  currentKey = key;
  globalSupabaseClient = createClient(url, key);
  return globalSupabaseClient;
};

interface Participant {
  id: string; 
  barcode: string;
  nama_lengkap: string;
  email: string;
  jenis_kelamin: string;
  usia: string;
  alamat: string;
  whatsapp: string;
  jenis_tiket: string;
  jumlah_tiket: string;
  metode_pembayaran: string;
  bukti_transfer: string;
  nama_pengirim: string;
  harapan_event: string;
  konfirmasi_data: boolean;
  validasi_bayar: 'Pending' | 'Approved' | 'Rejected';
  status_absen: 'Pending' | 'Attended';
  waktu_absen?: string;
  created_at?: string;
  [key: string]: any;
}

const App: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'dashboard' | 'list' | 'scanner'>('dashboard');
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState<{success: boolean, message: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Approved' | 'Attended'>('All');
  const [showConfig, setShowConfig] = useState(false);
  
  // Supabase Credentials
  const [sbUrl, setSbUrl] = useState('https://tydfbrcdvzeggrlzabfq.supabase.co');
  const [sbKey, setSbKey] = useState('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5ZGZicmNkdnplZ2dybHphYmZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NTUyMDEsImV4cCI6MjA5MzAzMTIwMX0.75_AK06B7aGjIbZk_rG6KBgD6yqDHygPRYg_GHeMJ6o');

  // Initialize Supabase only when URL or Key changes
  const supabase = useMemo(() => getSupabase(sbUrl, sbKey), [sbUrl, sbKey]);

  // Load Config
  useEffect(() => {
    const url = localStorage.getItem('sb_url');
    const key = localStorage.getItem('sb_key');
    if (url) setSbUrl(url);
    if (key) setSbKey(key);
  }, []);

  // Save Config
  useEffect(() => {
    localStorage.setItem('sb_url', sbUrl);
    localStorage.setItem('sb_key', sbKey);
  }, [sbUrl, sbKey]);

  const [dbError, setDbError] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);

  const fetchFromSupabase = async () => {
    if (!supabase) {
      setDbError('Supabase belum dikonfigurasi');
      return;
    }
    setLoading(true);
    setDbError(null);
    try {
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        setDbError(`Error: ${error.message} (Code: ${error.code})`);
        setConnected(false);
        throw error;
      }
      setParticipants(data || []);
      setConnected(true);
      setDbError(null);
    } catch (error: any) {
      console.error('Fetch error:', error);
      setConnected(false);
      setDbError(error.message || 'Gagal koneksi ke Supabase');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sbUrl && sbKey) {
      fetchFromSupabase();
    }
  }, [sbUrl, sbKey]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!supabase) {
      alert("Please configure Supabase first!");
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const json: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        const mapped = json.map((row) => {
          const barcode = row['Barcode'] || Math.floor(1000000000 + Math.random() * 9000000000).toString();
          return {
            barcode,
            nama_lengkap: row['Nama Lengkap'] || 'No Name',
            email: row['Email'] || '',
            jenis_kelamin: row['Jenis Kelamin'] || '',
            usia: row['Usia'] || '',
            alamat: row['Alamat'] || '',
            whatsapp: row['Nomor WhatsApp'] || '',
            jenis_tiket: row['Jenis Tiket'] || 'Regular',
            jumlah_tiket: row['Jumlah Tiket']?.toString() || '1',
            metode_pembayaran: row['Metode Pembayaran'] || '',
            bukti_transfer: row['Upload Bukti Transfer'] || '',
            nama_pengirim: row['Nama Pengirim'] || '',
            harapan_event: row['Apa yang ingin Anda dapatkan dari event ini?'] || '',
            konfirmasi_data: true,
            validasi_bayar: row['Validasi Bayar'] || 'Pending',
            status_absen: 'Pending'
          };
        });

        const { error } = await supabase.from('participants').insert(mapped);
        if (error) throw error;

        fetchFromSupabase();
        setScanResult({ success: true, message: `Successfully imported ${mapped.length} records!` });
      } catch (err: any) {
        setScanResult({ success: false, message: err.message });
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const updateStatus = async (barcode: string, column: string, value: any) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('participants')
        .update({ [column]: value })
        .eq('barcode', barcode);
      
      if (error) throw error;
      setParticipants(prev => prev.map(p => p.barcode === barcode ? { ...p, [column]: value } : p));
    } catch (err: any) {
      setScanResult({ success: false, message: err.message });
    }
  };

  const deleteParticipant = async (barcode: string) => {
    if (!supabase || !window.confirm("Hapus peserta ini?")) return;
    try {
      const { error } = await supabase
        .from('participants')
        .delete()
        .eq('barcode', barcode);
      
      if (error) throw error;
      setParticipants(prev => prev.filter(p => p.barcode !== barcode));
      setScanResult({ success: true, message: 'Peserta dihapus' });
    } catch (err: any) {
      setScanResult({ success: false, message: err.message });
    }
  };

  const clearAllData = async () => {
    if (!supabase || !window.confirm("Hapus SEMUA data peserta dari database?")) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('participants')
        .delete()
        .neq('barcode', 'explicitly_none');
      
      if (error) throw error;
      setParticipants([]);
      setScanResult({ success: true, message: 'Semua data telah dibersihkan' });
    } catch (err: any) {
      setScanResult({ success: false, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const markAttended = async (barcode: string) => {
    const time = new Date().toLocaleTimeString();
    await updateStatus(barcode, 'status_absen', 'Attended');
    await updateStatus(barcode, 'waktu_absen', time);
    setScanResult({ success: true, message: 'Check-in Successful!' });
    setTimeout(() => setScanResult(null), 3000);
  };

  const startScanner = () => {
    setShowScanner(true);
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        "reader", 
        { fps: 15, qrbox: { width: 280, height: 280 } }, 
        false
      );

      scanner.render((decodedText) => {
        const found = participants.find(p => p.barcode === decodedText);
        if (found) {
          if (found.validasi_bayar !== 'Approved') {
            setScanResult({ success: false, message: 'Payment Not Approved!' });
          } else if (found.status_absen === 'Attended') {
            setScanResult({ success: false, message: 'Already Checked In!' });
          } else {
            markAttended(found.barcode);
          }
        } else {
          setScanResult({ success: false, message: 'Ticket Not Found!' });
        }
        scanner.clear();
        setShowScanner(false);
      }, () => {});
    }, 100);
  };

  const filteredParticipants = participants.filter(p => {
    const matchesSearch = 
      p.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === 'All') return matchesSearch;
    if (filterStatus === 'Pending') return matchesSearch && p.validasi_bayar === 'Pending';
    if (filterStatus === 'Approved') return matchesSearch && p.validasi_bayar === 'Approved';
    if (filterStatus === 'Attended') return matchesSearch && p.status_absen === 'Attended';
    return matchesSearch;
  });

  const stats = {
    total: participants.length,
    approved: participants.filter(p => p.validasi_bayar === 'Approved').length,
    pending: participants.filter(p => p.validasi_bayar === 'Pending').length,
    attended: participants.filter(p => p.status_absen === 'Attended').length
  };

  const sendWhatsApp = (p: Participant) => {
    const barcodeImageUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${p.barcode}&scale=3&rotate=N&includetext=true`;
    const message = `Halo *${p.nama_lengkap}*,\n\nTerima kasih telah mendaftar di event kami. Berikut adalah E-Tiket Anda:\n\n*Nomor Barcode:* ${p.barcode}\n*Jenis Tiket:* ${p.jenis_tiket}\n\n*Link Barcode (Klik untuk melihat):* \n${barcodeImageUrl}\n\nMohon tunjukkan barcode tersebut kepada panitia saat registrasi ulang. Sampai jumpa di lokasi!`;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${p.whatsapp.replace(/\D/g, '')}?text=${encoded}`, '_blank');
  };

  const sendEmail = (p: Participant) => {
    const barcodeImageUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${p.barcode}&scale=3&rotate=N&includetext=true`;
    const subject = encodeURIComponent(`E-Tiket Event - ${p.nama_lengkap}`);
    const body = encodeURIComponent(`Halo ${p.nama_lengkap},\n\nTerima kasih telah mendaftar di event kami. Berikut adalah informasi E-Tiket Anda:\n\nNomor Barcode: ${p.barcode}\nJenis Tiket: ${p.jenis_tiket}\n\nLink Gambar Barcode:\n${barcodeImageUrl}\n\nSilakan klik link di atas untuk melihat gambar barcode Anda. Tunjukkan barcode tersebut kepada panitia saat kedatangan.\n\nTerima kasih,\nPanitia Event`);
    window.open(`mailto:${p.email}?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="app">
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="navbar-logo" onClick={() => setView('dashboard')}>
          <BarcodeIcon size={30} color="#4f46e5" />
          <h1>E-Tiket Pro</h1>
        </div>
        <div className="navbar-actions">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: connected === true ? '#34d399' : connected === false ? '#f87171' : '#9ca3af' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: connected === true ? '#34d399' : connected === false ? '#ef4444' : '#6b7280', boxShadow: connected === true ? '0 0 6px #34d399' : connected === false ? '0 0 6px #ef4444' : 'none' }} />
            {connected === true ? 'Terhubung' : connected === false ? 'Gagal' : 'Menghubungkan...'}
          </div>
          <button className={`btn btn-ghost ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>
            <LayoutDashboard size={18} /> <span>Dashboard</span>
          </button>
          <button className={`btn btn-ghost ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>
            <Users size={18} /> <span>Data Peserta</span>
          </button>
          <button className="btn btn-primary" onClick={startScanner}>
            <Camera size={18} /> Scan Barcode
          </button>
          <button className="btn-icon" onClick={() => setShowConfig(true)}>
            <Settings size={20} />
          </button>
        </div>
      </nav>

      {/* MAIN */}
      <main style={{ flex: 1 }}>
        {/* DASHBOARD VIEW */}
        {view === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* DB ERROR BANNER */}
            {dbError && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <X size={20} color="#f87171" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <p style={{ color: '#f87171', fontWeight: 700, marginBottom: '4px' }}>Gagal Terhubung ke Supabase</p>
                  <p style={{ color: '#fca5a5', fontSize: '0.85rem', marginBottom: '8px' }}>{dbError}</p>
                  <p style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Kemungkinan penyebab: Proyek Supabase di-pause (tier gratis otomatis pause jika tidak aktif 1 minggu), atau RLS (Row Level Security) aktif. Buka <a href="https://supabase.com/dashboard" target="_blank" style={{ color: '#818cf8' }}>supabase.com/dashboard</a> untuk memeriksa.</p>
                </div>
              </div>
            )}

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon blue"><Users size={24} /></div>
                <div>
                  <p className="stat-label">Total Peserta</p>
                  <p className="stat-value">{stats.total}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon green"><ShieldCheck size={24} /></div>
                <div>
                  <p className="stat-label">Validasi Bayar</p>
                  <p className="stat-value">{stats.approved}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon yellow"><Clock size={24} /></div>
                <div>
                  <p className="stat-label">Menunggu</p>
                  <p className="stat-value">{stats.pending}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon purple"><History size={24} /></div>
                <div>
                  <p className="stat-label">Sudah Absen</p>
                  <p className="stat-value">{stats.attended}</p>
                </div>
              </div>
            </div>

            <div className="card upload-box">
              <Database size={48} color="#4f46e5" style={{ marginBottom: '16px' }} />
              <h3>Kelola Database Event</h3>
              <p>Impor data peserta dari Excel atau bersihkan data lama</p>
              <div className="upload-actions">
                <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                  <Plus size={18} /> Impor Data Excel
                  <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>
                <button className="btn btn-danger" onClick={clearAllData}>
                  <X size={18} /> Bersihkan Database
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LIST VIEW */}
        {view === 'list' && (
          <div className="card table-wrapper">
            <div className="table-controls">
              <div className="search-input" style={{ flex: 1 }}>
                <Search size={18} color="#9ca3af" />
                <input
                  type="text"
                  placeholder="Cari nama, email, atau barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="filter-select">
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
                  <option value="All">Semua Status</option>
                  <option value="Pending">Menunggu</option>
                  <option value="Approved">Divalidasi</option>
                  <option value="Attended">Sudah Absen</option>
                </select>
              </div>
              <button className="btn btn-ghost" onClick={fetchFromSupabase} disabled={loading}>
                <RefreshCw size={18} className={loading ? 'spin' : ''} />
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Info Peserta</th>
                    <th className="hide-mobile">Tiket</th>
                    <th>Status Bayar</th>
                    <th>Absen</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParticipants.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>
                        Tidak ada data peserta
                      </td>
                    </tr>
                  ) : filteredParticipants.map((p) => (
                    <tr key={p.barcode}>
                      <td data-label="Info Peserta">
                        <div className="user-cell">
                          <div className="user-avatar">{p.nama_lengkap.charAt(0)}</div>
                          <div>
                            <div className="user-name">{p.nama_lengkap}</div>
                            <div className="user-email">{p.email}</div>
                          </div>
                        </div>
                      </td>
                      <td data-label="Tiket" className="hide-mobile">
                        <div className="ticket-type">{p.jenis_tiket}</div>
                        <div className="ticket-code">#{p.barcode}</div>
                      </td>
                      <td data-label="Status Bayar">
                        <span className={`pill ${p.validasi_bayar.toLowerCase()}`}>
                          {p.validasi_bayar}
                        </span>
                      </td>
                      <td data-label="Absen">
                        <span className={`pill ${p.status_absen.toLowerCase()}`}>
                          {p.status_absen}
                        </span>
                      </td>
                      <td data-label="Aksi">
                        <div className="action-btns">
                          <button className="btn-icon" title="Lihat Barcode" onClick={() => setSelectedParticipant(p)}>
                            <BarcodeIcon size={17} />
                          </button>
                          {p.validasi_bayar === 'Pending' && (
                            <button className="btn-icon success" title="Approve" onClick={() => updateStatus(p.barcode, 'validasi_bayar', 'Approved')}>
                              <ShieldCheck size={17} />
                            </button>
                          )}
                          <button className="btn-icon danger" title="Hapus" onClick={() => deleteParticipant(p.barcode)}>
                            <X size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* TICKET MODAL */}
      <AnimatePresence>
        {selectedParticipant && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="overlay" onClick={() => setSelectedParticipant(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="modal" onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2 className="gradient-text">E-TICKET EVENT</h2>
                <button className="btn-icon" onClick={() => setSelectedParticipant(null)}><X size={18} /></button>
              </div>

              <div className="ticket-barcode-box">
                <Barcode value={selectedParticipant.barcode} format="CODE128" width={2} height={75} background="#ffffff" />
              </div>

              <div className="ticket-details">
                <div>
                  <div className="ticket-detail-label">Nama Peserta</div>
                  <div className="ticket-detail-value">{selectedParticipant.nama_lengkap}</div>
                </div>
                <div>
                  <div className="ticket-detail-label">Nomor Barcode</div>
                  <div className="ticket-detail-value" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{selectedParticipant.barcode}</div>
                </div>
                <div>
                  <div className="ticket-detail-label">Jenis Tiket</div>
                  <div className="ticket-detail-value">{selectedParticipant.jenis_tiket}</div>
                </div>
                <div>
                  <div className="ticket-detail-label">Status Absen</div>
                  <span className={`pill ${selectedParticipant.status_absen.toLowerCase()}`}>{selectedParticipant.status_absen}</span>
                </div>
              </div>

              <div className="ticket-actions">
                <button className="btn btn-primary" style={{ background: '#25D366' }} onClick={() => sendWhatsApp(selectedParticipant)}>
                  <Send size={16} /> WhatsApp
                </button>
                <button className="btn btn-primary" style={{ background: '#EA4335' }} onClick={() => sendEmail(selectedParticipant)}>
                  <Send size={16} /> Email
                </button>
                <button className="btn btn-ghost" onClick={() => window.print()}>
                  <Download size={16} /> Cetak
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONFIG MODAL */}
      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="overlay" onClick={() => setShowConfig(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="modal" onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>Konfigurasi Supabase</h2>
                <button className="btn-icon" onClick={() => setShowConfig(false)}><X size={18} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="input-label">Project URL</label>
                  <input className="input-field" value={sbUrl} onChange={(e) => setSbUrl(e.target.value)} />
                </div>
                <div>
                  <label className="input-label">Anon Key</label>
                  <input className="input-field" type="password" value={sbKey} onChange={(e) => setSbKey(e.target.value)} />
                </div>
                <button className="btn btn-primary" style={{ marginTop: '8px' }} onClick={() => setShowConfig(false)}>
                  Simpan Konfigurasi
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SCANNER MODAL */}
      <AnimatePresence>
        {showScanner && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="overlay"
          >
            <div className="modal">
              <div className="modal-header">
                <h2>Scan Barcode</h2>
                <button className="btn-icon" onClick={() => setShowScanner(false)}><X size={18} /></button>
              </div>
              <div id="reader" style={{ borderRadius: '12px', overflow: 'hidden' }}></div>
              <p style={{ textAlign: 'center', color: '#9ca3af', marginTop: '14px', fontSize: '0.85rem' }}>
                Arahkan kamera ke barcode peserta
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOAST */}
      <AnimatePresence>
        {scanResult && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`toast ${scanResult.success ? 'success' : 'error'}`}
          >
            {scanResult.success ? <CheckCircle size={20} /> : <X size={20} />}
            <span>{scanResult.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
