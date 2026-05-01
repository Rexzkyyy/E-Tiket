import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  Search,
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
  History,
  LayoutGrid,
  Table as TableIcon,
  Trash2,
  Edit,
  MessageCircle,
  ExternalLink,
  Tag,
  FileDown
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5QrcodeScanner } from 'html5-qrcode';

// Supabase Configuration
const SB_URL = 'https://tydfbrcdvzeggrlzabfq.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5ZGZicmNkdnplZ2dybHphYmZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NTUyMDEsImV4cCI6MjA5MzAzMTIwMX0.75_AK06B7aGjIbZk_rG6KBgD6yqDHygPRYg_GHeMJ6o';
const supabase = createClient(SB_URL, SB_KEY);

interface Participant {
  id: string;
  barcode: string;
  nama_lengkap: string;
  whatsapp: string;
  jenis_tiket: string;
  validasi_bayar: 'BELUM' | 'SUDAH';
  status_absen: 'BELUM' | 'SUDAH';
  created_at?: string;
  [key: string]: any;
}

const formatTicketCode = (code: string) => {
  if (!code) return '';
  if (code.startsWith('RTJP')) return code;
  if (!isNaN(Number(code)) && code.length > 5) return `RTJP${code.slice(-3)}`;
  return `RTJP${code.padStart(3, '0')}`;
};

const AdminDashboard: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean, message: string } | null>(null);

  const fetchParticipants = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setParticipants(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchParticipants();
  }, []);

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const json: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

      const mapped = json.map(row => ({
        barcode: row['Barcode'] || row['Nomor HP'] || Math.floor(Math.random() * 1000000).toString(),
        nama_lengkap: row['Nama'] || row['Nama Lengkap'],
        whatsapp: row['WhatsApp'] || row['Nomor HP'],
        jenis_tiket: row['Jenis Tiket'] || row['Kategori'] || 'VIP GOLD 200K',
        validasi_bayar: 'BELUM',
        status_absen: 'BELUM'
      }));

      await supabase.from('participants').insert(mapped);
      fetchParticipants();
    };
    reader.readAsArrayBuffer(file);
  };

  const handleAddOrEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      nama_lengkap: formData.get('nama_lengkap') as string,
      jenis_tiket: formData.get('jenis_tiket') as string,
      validasi_bayar: formData.get('validasi_bayar') as any,
      whatsapp: formData.get('whatsapp') as string,
    };

    if (editingParticipant) {
      await supabase.from('participants').update(data).eq('id', editingParticipant.id);
    } else {
      await supabase.from('participants').insert([{ ...data, barcode: formData.get('barcode') as string, status_absen: 'BELUM' }]);
    }

    setShowAddModal(false);
    setEditingParticipant(null);
    fetchParticipants();
  };

  const deleteParticipant = async (id: string) => {
    if (window.confirm('Hapus peserta ini?')) {
      await supabase.from('participants').delete().eq('id', id);
      fetchParticipants();
    }
  };

  const sendWhatsApp = (p: Participant) => {
    const ticketUrl = `${window.location.origin}/t/${p.barcode}`;
    const message = `Halo *${p.nama_lengkap}*,\n\nTerima kasih telah mendaftar. Berikut adalah E-Tiket Anda:\n\n*Nomor Tiket:* ${formatTicketCode(p.barcode)}\n*Jenis Tiket:* ${p.jenis_tiket}\n\n*Lihat E-Tiket Resmi:* \n${ticketUrl}\n\nMohon tunjukkan barcode di link tersebut kepada panitia saat registrasi ulang. Sampai jumpa!`;
    window.open(`https://wa.me/${p.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const startScanner = () => {
    setShowScanner(true);
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner("reader", { fps: 15, qrbox: 250 }, false);
      scanner.render(async (decodedText) => {
        const { data } = await supabase.from('participants').select('*').eq('barcode', decodedText).single();
        if (data) {
          if (data.validasi_bayar === 'SUDAH') {
            await supabase.from('participants').update({ status_absen: 'SUDAH' }).eq('barcode', decodedText);
            setScanResult({ success: true, message: `Check-in Berhasil: ${data.nama_lengkap}` });
            fetchParticipants();
          } else {
            setScanResult({ success: false, message: 'Pembayaran Belum Diverifikasi!' });
          }
        } else {
          setScanResult({ success: false, message: 'Tiket Tidak Valid!' });
        }
        scanner.clear();
        setShowScanner(false);
        setTimeout(() => setScanResult(null), 3000);
      }, () => {});
    }, 100);
  };

  const stats = useMemo(() => ({
    total: participants.length,
    verified: participants.filter(p => p.validasi_bayar === 'SUDAH').length,
    pending: participants.filter(p => p.validasi_bayar === 'BELUM').length,
    attended: participants.filter(p => p.status_absen === 'SUDAH').length,
  }), [participants]);

  const filteredParticipants = participants.filter(p => 
    p.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barcode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="admin-layout">
      {/* Sidebar Branding */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">
            <img src="/coach zul3.png" alt="Coach Zul" className="coach-avatar" />
          </div>
          <h2>Ruang Tenang</h2>
          <p>Official Event Management</p>
        </div>
        
        <nav className="sidebar-nav">
          <button className="nav-item active"><LayoutDashboard size={20} /> Dashboard</button>
          <button className="nav-item" onClick={startScanner}><Camera size={20} /> Scan Tiket</button>
          <button className="nav-item" onClick={() => setShowAddModal(true)}><Plus size={20} /> Tambah Data</button>
          <button className="nav-item" onClick={fetchParticipants}><RefreshCw size={20} /> Refresh</button>
        </nav>

        <div className="sidebar-coach-info">
          <p>"Menemukan Diri, Menata Hati"</p>
          <span>Jalan Pulang 2026</span>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-content">
        <header className="content-header">
          <div className="header-search">
            <Search size={20} />
            <input 
              type="text" 
              placeholder="Cari nama peserta atau kode tiket..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="header-profile">
            <span>Admin Panitia</span>
            <div className="admin-avatar">A</div>
          </div>
        </header>

        <div className="scroll-area">
          {/* Stats Bar */}
          <section className="stats-section">
            <div className="stat-card-premium">
              <div className="stat-icon-box blue"><Users /></div>
              <div className="stat-text">
                <span className="label">Total Peserta</span>
                <span className="value">{stats.total}</span>
              </div>
            </div>
            <div className="stat-card-premium">
              <div className="stat-icon-box green"><ShieldCheck /></div>
              <div className="stat-text">
                <span className="label">Terverifikasi</span>
                <span className="value">{stats.verified}</span>
              </div>
            </div>
            <div className="stat-card-premium">
              <div className="stat-icon-box yellow"><Clock /></div>
              <div className="stat-text">
                <span className="label">Pending</span>
                <span className="value">{stats.pending}</span>
              </div>
            </div>
            <div className="stat-card-premium">
              <div className="stat-icon-box purple"><History /></div>
              <div className="stat-text">
                <span className="label">Check-in</span>
                <span className="value">{stats.attended}</span>
              </div>
            </div>
          </section>

          {/* Table/Grid Actions */}
          <div className="content-toolbar">
            <div className="toolbar-left">
              <h3>Daftar Peserta <span className="count-tag">{filteredParticipants.length}</span></h3>
            </div>
            <div className="toolbar-right">
              <div className="view-switcher">
                <button className={viewMode === 'table' ? 'active' : ''} onClick={() => setViewMode('table')}>
                  <TableIcon size={18} />
                </button>
                <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}>
                  <LayoutGrid size={18} />
                </button>
              </div>
              <label className="btn-action-outline">
                <FileDown size={18} /> Import Excel
                <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} className="hidden" />
              </label>
            </div>
          </div>

          {/* Participant List */}
          <AnimatePresence mode="wait">
            {viewMode === 'table' ? (
              <motion.div 
                key="table" 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="table-glass"
              >
                <table>
                  <thead>
                    <tr>
                      <th>Nama Peserta</th>
                      <th>Kategori</th>
                      <th>Status</th>
                      <th>Check-in</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParticipants.map(p => (
                      <tr key={p.id}>
                        <td>
                          <div className="cell-user">
                            <div className="avatar-mini">{p.nama_lengkap.charAt(0)}</div>
                            <div className="user-details">
                              <span className="name">{p.nama_lengkap}</span>
                              <span className="code">{formatTicketCode(p.barcode)}</span>
                            </div>
                          </div>
                        </td>
                        <td><span className="category-tag">{p.jenis_tiket}</span></td>
                        <td>
                          <span className={`status-tag ${p.validasi_bayar === 'SUDAH' ? 'approved' : 'pending'}`}>
                            {p.validasi_bayar === 'SUDAH' ? 'Approved' : 'Pending'}
                          </span>
                        </td>
                        <td>
                          <span className={`status-tag ${p.status_absen === 'SUDAH' ? 'attended' : 'not-yet'}`}>
                            {p.status_absen === 'SUDAH' ? 'Attended' : 'Not Yet'}
                          </span>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button className="action-circle wa" onClick={() => sendWhatsApp(p)} title="Kirim WA"><MessageCircle size={14} /></button>
                            <button className="action-circle edit" onClick={() => { setEditingParticipant(p); setShowAddModal(true); }}><Edit size={14} /></button>
                            <button className="action-circle view" onClick={() => window.open(`/t/${p.barcode}`, '_blank')}><ExternalLink size={14} /></button>
                            <button className="action-circle delete" onClick={() => deleteParticipant(p.id)}><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>
            ) : (
              <motion.div 
                key="grid" 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="participant-grid"
              >
                {filteredParticipants.map(p => (
                  <div key={p.id} className="user-card-premium">
                    <div className="card-top">
                      <div className="card-avatar">{p.nama_lengkap.charAt(0)}</div>
                      <div className="card-status-dot" style={{ background: p.validasi_bayar === 'SUDAH' ? '#10b981' : '#f59e0b' }}></div>
                    </div>
                    <div className="card-content">
                      <h4>{p.nama_lengkap}</h4>
                      <p className="p-category">{p.jenis_tiket}</p>
                      <code className="p-code">{formatTicketCode(p.barcode)}</code>
                    </div>
                    <div className="card-actions">
                      <button onClick={() => sendWhatsApp(p)} className="wa">WhatsApp</button>
                      <button onClick={() => { setEditingParticipant(p); setShowAddModal(true); }}>Edit</button>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* MODALS */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay-glass">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="modal-card">
              <div className="modal-header">
                <h3>{editingParticipant ? 'Edit Data Peserta' : 'Tambah Peserta Baru'}</h3>
                <button onClick={() => { setShowAddModal(false); setEditingParticipant(null); }} className="close-btn"><X /></button>
              </div>
              <form onSubmit={handleAddOrEdit} className="modal-form">
                <div className="input-group">
                  <label>Nama Lengkap</label>
                  <input name="nama_lengkap" defaultValue={editingParticipant?.nama_lengkap} required placeholder="Nama sesuai KTP" />
                </div>
                <div className="input-group">
                  <label>Nomor WhatsApp</label>
                  <input name="whatsapp" defaultValue={editingParticipant?.whatsapp} required placeholder="Contoh: 0812345678" />
                </div>
                {!editingParticipant && (
                  <div className="input-group">
                    <label>Barcode / Kode Unik</label>
                    <input name="barcode" required placeholder="Generate otomatis jika kosong" />
                  </div>
                )}
                <div className="input-row">
                  <div className="input-group">
                    <label>Kategori Tiket</label>
                    <select name="jenis_tiket" defaultValue={editingParticipant?.jenis_tiket || 'VIP GOLD 200K'}>
                      <option value="VIP GOLD 200K">VIP GOLD 200K</option>
                      <option value="REGULER 100K">REGULER 100K</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Validasi Bayar</label>
                    <select name="validasi_bayar" defaultValue={editingParticipant?.validasi_bayar || 'BELUM'}>
                      <option value="BELUM">Belum Lunas</option>
                      <option value="SUDAH">Sudah Lunas</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="submit-btn">{editingParticipant ? 'Simpan Perubahan' : 'Tambah Peserta'}</button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {showScanner && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay-glass">
            <div className="scanner-container">
              <div className="scanner-header">
                <h3>Scan Barcode Peserta</h3>
                <button onClick={() => setShowScanner(false)} className="close-btn"><X /></button>
              </div>
              <div id="reader"></div>
              <p className="scanner-hint">Arahkan kamera ke barcode pada tiket peserta</p>
            </div>
          </motion.div>
        )}

        {scanResult && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 50 }} 
            className={`toast-notification ${scanResult.success ? 'success' : 'error'}`}
          >
            {scanResult.success ? <CheckCircle size={20} /> : <X size={20} />}
            <span>{scanResult.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
