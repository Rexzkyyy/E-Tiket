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
  Database,
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

const AdminDashboard: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'dashboard' | 'list'>('dashboard');
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
        setDbError(`Error: ${error.message} (Code: ${error.code})`);
        setConnected(false);
        throw error;
      }
      setParticipants(data || []);
      setConnected(true);
      setDbError(null);
    } catch (error: any) {
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
    if (!supabase) return;
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

  const markAttended = async (barcode: string) => {
    const time = new Date().toLocaleTimeString();
    await updateStatus(barcode, 'status_absen', 'Attended');
    await updateStatus(barcode, 'waktu_absen', time);
    setScanResult({ success: true, message: 'Check-in Berhasil!' });
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
            setScanResult({ success: false, message: 'Pembayaran Belum Disetujui!' });
          } else if (found.status_absen === 'Attended') {
            setScanResult({ success: false, message: 'Sudah Check-in Sebelumnya!' });
          } else {
            markAttended(found.barcode);
          }
        } else {
          setScanResult({ success: false, message: 'Tiket Tidak Ditemukan!' });
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
    const baseUrl = window.location.origin;
    const ticketUrl = `${baseUrl}/t/${p.barcode}`;
    const message = `Halo *${p.nama_lengkap}*,\n\nTerima kasih telah mendaftar. Berikut adalah E-Tiket Anda:\n\n*Nomor Tiket:* 000${p.barcode.slice(-1)}\n*Jenis Tiket:* ${p.jenis_tiket}\n\n*Lihat E-Tiket Resmi:* \n${ticketUrl}\n\nMohon tunjukkan barcode di link tersebut kepada panitia saat registrasi ulang. Sampai jumpa!`;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${p.whatsapp.replace(/\D/g, '')}?text=${encoded}`, '_blank');
  };

  return (
    <div className="app">
      <nav className="navbar">
        <div className="navbar-logo" onClick={() => setView('dashboard')}>
          <BarcodeIcon size={30} color="#4f46e5" />
          <h1>E-Tiket <span style={{color: '#ef4444'}}>Admin</span></h1>
        </div>
        <div className="navbar-actions">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: connected === true ? '#34d399' : connected === false ? '#f87171' : '#9ca3af' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: connected === true ? '#34d399' : connected === false ? '#ef4444' : '#6b7280', boxShadow: connected === true ? '0 0 6px #34d399' : connected === false ? '0 0 6px #ef4444' : 'none' }} />
            {connected === true ? 'Connected' : connected === false ? 'Error' : 'Connecting...'}
          </div>
          <button className={`btn btn-ghost ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>
            <LayoutDashboard size={18} /> <span className="hide-mobile">Dashboard</span>
          </button>
          <button className={`btn btn-ghost ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>
            <Users size={18} /> <span className="hide-mobile">Data Peserta</span>
          </button>
          <button className="btn btn-primary" onClick={startScanner}>
            <Camera size={18} /> Scan Barcode
          </button>
          <button className="btn-icon" onClick={() => setShowConfig(true)}>
            <Settings size={20} />
          </button>
        </div>
      </nav>

      <main style={{ flex: 1 }}>
        {view === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon blue"><Users size={24} /></div>
                <div><p className="stat-label">Total Peserta</p><p className="stat-value">{stats.total}</p></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon green"><ShieldCheck size={24} /></div>
                <div><p className="stat-label">Terverifikasi</p><p className="stat-value">{stats.approved}</p></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon yellow"><Clock size={24} /></div>
                <div><p className="stat-label">Menunggu</p><p className="stat-value">{stats.pending}</p></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon purple"><History size={24} /></div>
                <div><p className="stat-label">Check-in</p><p className="stat-value">{stats.attended}</p></div>
              </div>
            </div>

            <div className="card upload-box">
              <Database size={48} color="#4f46e5" style={{ marginBottom: '16px' }} />
              <h3>Manajemen Data</h3>
              <p>Impor data dari Excel atau bersihkan database</p>
              <div className="upload-actions">
                <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                  <Plus size={18} /> Impor Excel
                  <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>
              </div>
            </div>
          </div>
        )}

        {view === 'list' && (
          <div className="card table-wrapper">
            <div className="table-controls">
              <div className="search-input" style={{ flex: 1 }}>
                <Search size={18} color="#9ca3af" />
                <input placeholder="Cari..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
                <option value="All">Semua</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Attended">Attended</option>
              </select>
              <button className="btn btn-ghost" onClick={fetchFromSupabase} disabled={loading}>
                <RefreshCw size={18} className={loading ? 'spin' : ''} />
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Peserta</th>
                    <th className="hide-mobile">Tiket</th>
                    <th>Bayar</th>
                    <th>Absen</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParticipants.map((p) => (
                    <tr key={p.barcode}>
                      <td>{p.nama_lengkap}</td>
                      <td className="hide-mobile">#{p.barcode}</td>
                      <td><span className={`pill ${p.validasi_bayar.toLowerCase()}`}>{p.validasi_bayar}</span></td>
                      <td><span className={`pill ${p.status_absen.toLowerCase()}`}>{p.status_absen}</span></td>
                      <td>
                        <div className="action-btns">
                          <button className="btn-icon" onClick={() => sendWhatsApp(p)} title="Kirim Link Tiket"><Send size={16} /></button>
                          {p.validasi_bayar === 'Pending' && (
                            <button className="btn-icon success" onClick={() => updateStatus(p.barcode, 'validasi_bayar', 'Approved')}><ShieldCheck size={16} /></button>
                          )}
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

      {/* SCANNER MODAL */}
      <AnimatePresence>
        {showScanner && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="overlay">
            <div className="modal">
              <div className="modal-header">
                <h2>Scan Barcode Panitia</h2>
                <button className="btn-icon" onClick={() => setShowScanner(false)}><X size={18} /></button>
              </div>
              <div id="reader" style={{ borderRadius: '12px', overflow: 'hidden' }}></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONFIG MODAL */}
      <AnimatePresence>
        {showConfig && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="overlay" onClick={() => setShowConfig(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Settings</h2>
                <button className="btn-icon" onClick={() => setShowConfig(false)}><X size={18} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input className="input-field" placeholder="Supabase URL" value={sbUrl} onChange={e => setSbUrl(e.target.value)} />
                <input className="input-field" type="password" placeholder="Anon Key" value={sbKey} onChange={e => setSbKey(e.target.value)} />
                <button className="btn btn-primary" onClick={() => setShowConfig(false)}>Simpan</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {scanResult && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`toast ${scanResult.success ? 'success' : 'error'}`}>
            {scanResult.success ? <CheckCircle size={20} /> : <X size={20} />}
            <span>{scanResult.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
