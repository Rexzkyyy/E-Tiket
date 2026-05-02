import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { supabase } from '../supabaseClient';
import { formatTicketCode } from '../utils';
import { Participant } from '../types';
import { Html5QrcodeScanner } from 'html5-qrcode';

const AdminDashboard: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean, message: string } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const fetchParticipants = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .order('created_at', { ascending: false }); // Urutan data terbaru di atas

    if (!error && data) {
      setParticipants(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  const handleImportExcel = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
  }, [fetchParticipants]);

  const handleAddOrEdit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      nama_lengkap: formData.get('nama_lengkap') as string,
      jenis_tiket: formData.get('jenis_tiket') as string,
      validasi_bayar: formData.get('validasi_bayar') as any,
      whatsapp: formData.get('whatsapp') as string,
    };

    let result;
    if (editingParticipant) {
      result = await supabase.from('participants').update(data).eq('barcode', editingParticipant.barcode);
    } else {
      result = await supabase.from('participants').insert([{ 
        ...data, 
        barcode: formData.get('barcode') as string || Math.floor(Math.random() * 1000000000).toString(), 
        status_absen: 'BELUM' 
      }]);
    }

    if (result.error) {
      setScanResult({ success: false, message: 'Gagal menyimpan data!' });
    } else {
      setScanResult({ success: true, message: editingParticipant ? 'Data berhasil diupdate' : 'Peserta berhasil ditambahkan' });
      setShowAddModal(false);
      setEditingParticipant(null);
      fetchParticipants();
    }
    setTimeout(() => setScanResult(null), 3000);
  }, [editingParticipant, fetchParticipants]);

  const updateParticipantStatus = useCallback(async (barcode: string, status: 'SUDAH' | 'BELUM') => {
    const { error } = await supabase
      .from('participants')
      .update({ validasi_bayar: status })
      .eq('barcode', barcode);

    if (error) {
      setScanResult({ success: false, message: 'Gagal memperbarui status!' });
    } else {
      setScanResult({ success: true, message: `Status diperbarui ke ${status === 'SUDAH' ? 'LUNAS' : 'BELUM LUNAS'}` });
      fetchParticipants();
    }
    setTimeout(() => setScanResult(null), 3000);
  }, [fetchParticipants]);

  const deleteParticipant = useCallback(async (barcode: string) => {
    if (window.confirm('Hapus peserta ini?')) {
      const { error } = await supabase.from('participants').delete().eq('barcode', barcode);
      if (error) {
        setScanResult({ success: false, message: 'Gagal menghapus data!' });
      } else {
        setScanResult({ success: true, message: 'Data berhasil dihapus' });
        fetchParticipants();
      }
      setTimeout(() => setScanResult(null), 3000);
    }
  }, [fetchParticipants]);

  const sendWhatsApp = useCallback((p: Participant) => {
    const ticketUrl = `${window.location.origin}/t/${p.barcode}`;
    const message = `Halo *${p.nama_lengkap}*,\n\nTerima kasih telah mendaftar. Berikut adalah E-Tiket Anda:\n\n*Nomor Tiket:* ${formatTicketCode(p.barcode)}\n*Jenis Tiket:* ${p.jenis_tiket}\n\n*Lihat E-Tiket Resmi:* \n${ticketUrl}\n\nMohon tunjukkan barcode di link tersebut kepada panitia saat registrasi ulang. Sampai jumpa!`;
    window.open(`https://wa.me/${p.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  }, []);

  const startScanner = useCallback(() => {
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
  }, [fetchParticipants]);

  const stats = useMemo(() => ({
    total: participants.length,
    verified: participants.filter(p => p.validasi_bayar === 'SUDAH').length,
    pending: participants.filter(p => p.validasi_bayar === 'BELUM').length,
    attended: participants.filter(p => p.status_absen === 'SUDAH').length,
  }), [participants]);

  const filteredParticipants = useMemo(() => {
    return participants.filter(p => 
      p.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [participants, searchTerm]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredParticipants.length / itemsPerPage);
  const paginatedParticipants = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredParticipants.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredParticipants, currentPage, itemsPerPage]);

  return (
    <div className="admin-layout">
      {/* Sidebar Branding */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand-premium">
          <div className="avatar-wrapper desktop-only">
            <img src="/coach zul3.png" alt="Coach Zul" className="avatar-img" />
            <div className="avatar-overlay"></div>
          </div>
          <div className="logo-wrapper">
             <h2 className="brand-title-premium">Ruang<span>Tenang</span></h2>
          </div>
          <p className="brand-subtitle">Official Event Management</p>
        </div>
        
        <nav className="sidebar-nav">
          <button className="nav-item active" title="Dashboard">
            <LayoutDashboard size={20} /> <span>Dashboard</span>
          </button>
          <button className="nav-item" onClick={startScanner} title="Scan Tiket QR">
            <Camera size={20} /> <span>Scan Tiket</span>
          </button>
          <button className="nav-item" onClick={() => setShowAddModal(true)} title="Tambah Peserta Manual">
            <Plus size={20} /> <span>Tambah Data</span>
          </button>
          <button className="nav-item" onClick={fetchParticipants} title="Refresh Data Peserta">
            <RefreshCw size={20} /> <span>Refresh</span>
          </button>
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
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset to first page on search
              }}
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
            <div className="stat-card-premium blue">
              <div className="stat-icon-box"><Users /></div>
              <div className="stat-text">
                <span className="label">Total Peserta</span>
                <span className="value">{stats.total}</span>
              </div>
            </div>
            <div className="stat-card-premium green">
              <div className="stat-icon-box"><ShieldCheck /></div>
              <div className="stat-text">
                <span className="label">Terverifikasi</span>
                <span className="value">{stats.verified}</span>
              </div>
            </div>
            <div className="stat-card-premium gold">
              <div className="stat-icon-box"><Clock /></div>
              <div className="stat-text">
                <span className="label">Pending</span>
                <span className="value">{stats.pending}</span>
              </div>
            </div>
            <div className="stat-card-premium purple">
              <div className="stat-icon-box"><History /></div>
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
                <button 
                  className={viewMode === 'table' ? 'active' : ''} 
                  onClick={() => setViewMode('table')}
                  title="Tampilan Tabel"
                >
                  <TableIcon size={18} />
                </button>
                <button 
                  className={viewMode === 'grid' ? 'active' : ''} 
                  onClick={() => setViewMode('grid')}
                  title="Tampilan Grid"
                >
                  <LayoutGrid size={18} />
                </button>
              </div>
              <label className="btn-action-outline">
                <FileDown size={18} /> Import Excel
                <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} className="hidden" />
              </label>
            </div>
          </div>

          {viewMode === 'table' ? (
              <div className="table-glass">
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
                    {paginatedParticipants.map((p, index) => (
                      <tr key={p.id || `p-${index}`}>
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
                            {p.validasi_bayar === 'BELUM' && (
                              <button 
                                className="action-circle success" 
                                onClick={() => updateParticipantStatus(p.barcode, 'SUDAH')} 
                                title="Set Lunas"
                              >
                                <CheckCircle size={14} />
                              </button>
                            )}
                            <button className="action-circle wa" onClick={() => sendWhatsApp(p)} title="Kirim WA"><MessageCircle size={14} /></button>
                            <button className="action-circle edit" onClick={() => { setEditingParticipant(p); setShowAddModal(true); }} title="Edit Data"><Edit size={14} /></button>
                            <button className="action-circle view" onClick={() => window.open(`/t/${p.barcode}`, '_blank')} title="Lihat Tiket"><ExternalLink size={14} /></button>
                            <button className="action-circle delete" onClick={() => deleteParticipant(p.barcode)} title="Hapus Data"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="participant-grid">
                {paginatedParticipants.map((p, index) => (
                  <div key={p.id || `g-${index}`} className="user-card-premium">
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
                      {p.validasi_bayar === 'BELUM' && (
                        <button onClick={() => updateParticipantStatus(p.barcode, 'SUDAH')} className="verify">Verify</button>
                      )}
                      <button onClick={() => sendWhatsApp(p)} className="wa">WhatsApp</button>
                      <button onClick={() => { setEditingParticipant(p); setShowAddModal(true); }}>Edit</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pagination-container">
              <button 
                className="btn-pagination" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
              >
                Previous
              </button>
              <div className="pagination-info">
                Halaman <span>{currentPage}</span> dari {totalPages}
              </div>
              <button 
                className="btn-pagination" 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </main>


      {/* MODALS */}
        {showAddModal && (
          <div className="modal-overlay-glass">
            <div className="modal-card">
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
            </div>
          </div>
        )}

        {showScanner && (
          <div className="modal-overlay-glass">
            <div className="scanner-container">
              <div className="scanner-header">
                <h3>Scan Barcode Peserta</h3>
                <button onClick={() => setShowScanner(false)} className="close-btn"><X /></button>
              </div>
              <div id="reader"></div>
              <p className="scanner-hint">Arahkan kamera ke barcode pada tiket peserta</p>
            </div>
          </div>
        )}

        {scanResult && (
          <div 
            className={`toast-notification ${scanResult.success ? 'success' : 'error'}`}
          >
            {scanResult.success ? <CheckCircle size={20} /> : <X size={20} />}
            <span>{scanResult.message}</span>
          </div>
        )}
    </div>
  );
};

export default AdminDashboard;
