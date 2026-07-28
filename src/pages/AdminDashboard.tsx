import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  FileDown,
  Filter,
  MessageSquareOff,
  LogOut
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { formatTicketCode, normalizeJenisTiket } from '../utils';
import { Participant } from '../types';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { jsPDF } from 'jspdf';

interface SalesAnalysisProps {
  participants: Participant[];
}

const SalesAnalysis: React.FC<SalesAnalysisProps> = ({ participants }) => {
  // Helper to parse price
  const getTicketPrice = (rawJenis: string): number => {
    const jenis = normalizeJenisTiket(rawJenis);
    if (!jenis) return 0;
    const upper = jenis.toUpperCase();
    
    if (upper.includes('100K') || upper.includes('PROMO')) return 100000;
    if (upper.includes('50K') || upper.includes('MAHASISWA')) return 50000;
    if (upper.includes('SILVER')) return 130000;
    if (upper.includes('VIP')) return 185000;
    
    // Fallback parsing numeric values
    const match = jenis.match(/\d+/);
    if (match) {
      const num = parseInt(match[0]);
      if (num < 1000) return num * 1000; // e.g. 185 -> 185000
      return num;
    }
    return 0;
  };

  const getTicketQty = (p: Participant): number => {
    // Karena sistem sudah memecah tiket borongan menjadi baris individual saat import,
    // 1 baris data di tabel = 1 tiket fisik (1 barcode). 
    // Menggunakan p.jumlah_tiket akan menyebabkan penghitungan ganda (double count).
    return 1;
  };

  // Stats Calculation
  const analysisStats = useMemo(() => {
    let revenueLunas = 0;
    let revenuePending = 0;
    let ticketsLunas = 0;
    let ticketsPending = 0;

    const ticketCategories: Record<string, { lunasQty: number; pendingQty: number; lunasRev: number; pendingRev: number }> = {
      'VIP Gold 185K': { lunasQty: 0, pendingQty: 0, lunasRev: 0, pendingRev: 0 },
      'Silver 130K': { lunasQty: 0, pendingQty: 0, lunasRev: 0, pendingRev: 0 },
      'SILVER DISKON 50K': { lunasQty: 0, pendingQty: 0, lunasRev: 0, pendingRev: 0 },
      'Silver Diskon 100k': { lunasQty: 0, pendingQty: 0, lunasRev: 0, pendingRev: 0 },
    };

    const paymentMethods: Record<string, { qty: number; rev: number }> = {};

    participants.forEach(p => {
      const price = getTicketPrice(p.jenis_tiket);
      const qty = getTicketQty(p);
      const total = price * qty;
      const category = normalizeJenisTiket(p.jenis_tiket) || 'Lainnya';

      // Initialize category if not exists
      if (!ticketCategories[category]) {
        ticketCategories[category] = { lunasQty: 0, pendingQty: 0, lunasRev: 0, pendingRev: 0 };
      }

      if (p.validasi_bayar === 'SUDAH') {
        revenueLunas += total;
        ticketsLunas += qty;
        ticketCategories[category].lunasQty += qty;
        ticketCategories[category].lunasRev += total;
      } else {
        revenuePending += total;
        ticketsPending += qty;
        ticketCategories[category].pendingQty += qty;
        ticketCategories[category].pendingRev += total;
      }

      // Payment Method Stats (Only for valid methods)
      const method = p.metode_pembayaran?.trim() || 'Belum Ditentukan';
      if (!paymentMethods[method]) {
        paymentMethods[method] = { qty: 0, rev: 0 };
      }
      paymentMethods[method].qty += qty;
      if (p.validasi_bayar === 'SUDAH') {
        paymentMethods[method].rev += total;
      }
    });

    // Recent 6 transactions (Lunas/Pending) sorted by created_at desc
    const recentTransactions = [...participants]
      .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
      .slice(0, 6);

    return {
      revenueLunas,
      revenuePending,
      ticketsLunas,
      ticketsPending,
      ticketCategories,
      paymentMethods: Object.entries(paymentMethods)
        .sort((a, b) => b[1].qty - a[1].qty)
        .slice(0, 5),
      recentTransactions,
    };
  }, [participants]);

  // Format Rupiah helper
  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const totalRevenue = analysisStats.revenueLunas + analysisStats.revenuePending;
  const totalTickets = analysisStats.ticketsLunas + analysisStats.ticketsPending;

  const exportToPDF = () => {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    const primaryColor = [15, 23, 42]; // slate-900
    const secondaryColor = [71, 85, 105]; // slate-600
    const borderColor = [226, 232, 240]; // slate-200
    const lightBg = [248, 250, 252]; // slate-50

    // Title & Header
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.text('LAPORAN ANALISIS PENJUALAN TIKET', 40, 50);

    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    pdf.text('Event: Jeda Sejenak Menguatkan Hati 2026', 40, 68);
    pdf.text(`Tanggal Laporan: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 40, 82);

    // Decorative Line
    pdf.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.setLineWidth(1.5);
    pdf.line(40, 95, 555, 95);

    // SECTION 1: RINGKASAN PENDAPATAN
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.text('1. RINGKASAN PENDAPATAN', 40, 120);

    // Table/Grid summary box
    pdf.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    pdf.rect(40, 135, 515, 60, 'F');
    pdf.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    pdf.setLineWidth(1);
    pdf.rect(40, 135, 515, 60, 'S');

    // Box Columns
    // Col 1: Pendapatan Lunas
    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    pdf.text('PENDAPATAN LUNAS', 60, 155);
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(16, 185, 129); // green-500
    pdf.text(formatRupiah(analysisStats.revenueLunas), 60, 175);

    // Col 2: Pendapatan Tertunda
    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    pdf.text('PENDAPATAN TERTUNDA', 240, 155);
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(217, 119, 6); // orange-600
    pdf.text(formatRupiah(analysisStats.revenuePending), 240, 175);

    // Col 3: Tiket Terjual
    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    pdf.text('TOTAL TIKET TERJUAL', 420, 155);
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(2, 132, 199); // blue-600
    pdf.text(`${totalTickets} Tiket`, 420, 175);

    // SECTION 2: KATEGORI TIKET
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.text('2. PENJUALAN PER KATEGORI TIKET', 40, 220);

    // Headers for table
    let tableY = 240;
    pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.rect(40, tableY, 515, 20, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8.5);
    pdf.setFont('Helvetica', 'bold');
    pdf.text('Kategori', 50, tableY + 14);
    pdf.text('Qty Lunas', 180, tableY + 14);
    pdf.text('Qty Pending', 260, tableY + 14);
    pdf.text('Total Qty', 340, tableY + 14);
    pdf.text('Total Nominal', 450, tableY + 14);

    tableY += 20;

    // Rows
    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(15, 23, 42);

    Object.entries(analysisStats.ticketCategories).forEach(([name, cat]) => {
      const totalCatQty = cat.lunasQty + cat.pendingQty;
      const totalCatRev = cat.lunasRev + cat.pendingRev;

      // Draw background row borders
      pdf.setDrawColor(241, 245, 249);
      pdf.line(40, tableY + 20, 555, tableY + 20);

      pdf.text(name, 50, tableY + 14);
      pdf.text(`${cat.lunasQty}`, 180, tableY + 14);
      pdf.text(`${cat.pendingQty}`, 260, tableY + 14);
      pdf.text(`${totalCatQty}`, 340, tableY + 14);
      pdf.text(formatRupiah(totalCatRev), 450, tableY + 14);

      tableY += 20;
    });

    // SECTION 3: METODE PEMBAYARAN
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.text('3. METODE PEMBAYARAN TERPOPULER (LUNAS)', 40, tableY + 35);

    tableY += 50;

    // Table Headers
    pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.rect(40, tableY, 515, 20, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8.5);
    pdf.setFont('Helvetica', 'bold');
    pdf.text('Metode Pembayaran', 50, tableY + 14);
    pdf.text('Jumlah Pengguna', 250, tableY + 14);
    pdf.text('Total Nominal Lunas', 450, tableY + 14);

    tableY += 20;

    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(15, 23, 42);

    if (analysisStats.paymentMethods.length > 0) {
      analysisStats.paymentMethods.forEach(([method, data]) => {
        pdf.setDrawColor(241, 245, 249);
        pdf.line(40, tableY + 20, 555, tableY + 20);

        pdf.text(method, 50, tableY + 14);
        pdf.text(`${data.qty} Peserta`, 250, tableY + 14);
        pdf.text(formatRupiah(data.rev), 450, tableY + 14);

        tableY += 20;
      });
    } else {
      pdf.text('Belum ada transaksi pembayaran lunas.', 50, tableY + 14);
      tableY += 20;
    }

    // SECTION 4: TRANSAKSI TERBARU
    pdf.setFont('Helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.text('4. TRANSAKSI TERBARU (PENDAFTARAN TERAKHIR)', 40, tableY + 35);

    tableY += 50;

    // Table Headers
    pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.rect(40, tableY, 515, 20, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8.5);
    pdf.setFont('Helvetica', 'bold');
    pdf.text('Nama Peserta', 50, tableY + 14);
    pdf.text('Tanggal', 200, tableY + 14);
    pdf.text('Kategori Tiket', 280, tableY + 14);
    pdf.text('Jumlah', 380, tableY + 14);
    pdf.text('Total Bayar', 430, tableY + 14);
    pdf.text('Status', 510, tableY + 14);

    tableY += 20;

    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(15, 23, 42);

    analysisStats.recentTransactions.forEach(tx => {
      const price = getTicketPrice(tx.jenis_tiket);
      const qty = getTicketQty(tx);
      const total = price * qty;
      const dateFormatted = tx.created_at 
        ? new Date(tx.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
        : '-';

      pdf.setDrawColor(241, 245, 249);
      pdf.line(40, tableY + 20, 555, tableY + 20);

      pdf.text(tx.nama_lengkap.substring(0, 24), 50, tableY + 14);
      pdf.text(dateFormatted, 200, tableY + 14);
      pdf.text(normalizeJenisTiket(tx.jenis_tiket), 280, tableY + 14);
      pdf.text(`${qty}`, 380, tableY + 14);
      pdf.text(formatRupiah(total), 430, tableY + 14);
      pdf.text(tx.validasi_bayar === 'SUDAH' ? 'LUNAS' : 'PENDING', 510, tableY + 14);

      tableY += 20;
    });

    // Footer Page Number / Copyright
    pdf.setFont('Helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    pdf.text('Laporan digenerate otomatis oleh Sistem E-Tiket Ruang Tenang. Rahasia dan Terbatas.', 40, 810);
    pdf.text('Halaman 1 dari 1', 500, 810);

    pdf.save(`Laporan-Analisis-Penjualan-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="analysis-container">
      {/* Header with Export button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>Analisis Penjualan Tiket</h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>Laporan ringkasan penjualan dan analitik pendapatan event.</p>
        </div>
        <button 
          className="btn-action-outline" 
          onClick={exportToPDF}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontWeight: 600, fontSize: '0.85rem' }}
        >
          <FileDown size={18} /> <span>Ekspor PDF Laporan</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="analysis-summary-grid">
        <div className="analysis-card green">
          <div className="card-icon"><ShieldCheck size={24} /></div>
          <div className="card-info">
            <span className="label">Pendapatan Lunas</span>
            <h2 className="value">{formatRupiah(analysisStats.revenueLunas)}</h2>
            <span className="subtext">{analysisStats.ticketsLunas} Tiket Terverifikasi</span>
          </div>
        </div>

        <div className="analysis-card gold">
          <div className="card-icon"><Clock size={24} /></div>
          <div className="card-info">
            <span className="label">Pendapatan Tertunda</span>
            <h2 className="value">{formatRupiah(analysisStats.revenuePending)}</h2>
            <span className="subtext">{analysisStats.ticketsPending} Tiket Menunggu Verifikasi</span>
          </div>
        </div>

        <div className="analysis-card blue">
          <div className="card-icon"><Tag size={24} /></div>
          <div className="card-info">
            <span className="label">Total Tiket Terjual</span>
            <h2 className="value">{totalTickets} Tiket</h2>
            <span className="subtext">Potensi Pendapatan: {formatRupiah(totalRevenue)}</span>
          </div>
        </div>
      </div>

      <div className="analysis-details-grid">
        {/* Column 1: Ticket Categories & Payment Methods */}
        <div className="details-col-left">
          {/* Ticket Categories Card */}
          <div className="details-card-glass">
            <h3>Kategori Tiket</h3>
            <div className="category-stats-list">
              {Object.entries(analysisStats.ticketCategories).map(([name, cat]) => {
                const totalCatQty = cat.lunasQty + cat.pendingQty;
                const percentLunas = totalTickets > 0 ? Math.round((cat.lunasQty / totalTickets) * 100) : 0;
                
                return (
                  <div key={name} className="category-stat-item">
                    <div className="item-header">
                      <span className="name">{name}</span>
                      <span className="qty">{cat.lunasQty} / {totalCatQty} Pcs (Lunas)</span>
                    </div>
                    <div className="progress-bar-container">
                      <div className="progress-bar-fill" style={{ width: `${percentLunas}%`, background: name.includes('VIP') ? 'linear-gradient(90deg, #d97706, #f59e0b)' : 'linear-gradient(90deg, #7c3aed, #a78bfa)' }}></div>
                    </div>
                    <div className="item-footer">
                      <span>Pendapatan: {formatRupiah(cat.lunasRev)}</span>
                      {cat.pendingRev > 0 && <span className="pending-rev">Tertunda: {formatRupiah(cat.pendingRev)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Methods Card */}
          <div className="details-card-glass">
            <h3>Metode Pembayaran (Lunas)</h3>
            <div className="payment-stats-list">
              {analysisStats.paymentMethods.length > 0 ? (
                analysisStats.paymentMethods.map(([method, data]) => {
                  const percent = totalTickets > 0 ? Math.round((data.qty / totalTickets) * 100) : 0;
                  return (
                    <div key={method} className="payment-stat-item">
                      <div className="payment-header">
                        <span className="method-name">{method}</span>
                        <span className="method-qty">{data.qty} Peserta</span>
                      </div>
                      <div className="progress-bar-container mini">
                        <div className="progress-bar-fill" style={{ width: `${percent}%`, background: 'linear-gradient(90deg, #059669, #10b981)' }}></div>
                      </div>
                      <div className="payment-rev-text">{formatRupiah(data.rev)}</div>
                    </div>
                  );
                })
              ) : (
                <p className="no-data-text">Belum ada data pembayaran</p>
              )}
            </div>
          </div>
        </div>

        {/* Column 2: Recent Transactions */}
        <div className="details-col-right">
          <div className="details-card-glass full-height">
            <h3>Transaksi Terbaru</h3>
            <div className="recent-table-container">
              <table className="recent-table">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Tanggal</th>
                    <th>Tiket</th>
                    <th>Jumlah</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {analysisStats.recentTransactions.length > 0 ? (
                    analysisStats.recentTransactions.map((tx, idx) => {
                      const price = getTicketPrice(tx.jenis_tiket);
                      const qty = getTicketQty(tx);
                      const total = price * qty;
                      const dateFormatted = tx.created_at 
                        ? new Date(tx.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
                        : '-';
                      
                      return (
                        <tr key={tx.barcode || idx}>
                          <td className="tx-name" title={tx.nama_lengkap}>{tx.nama_lengkap}</td>
                          <td>{dateFormatted}</td>
                          <td><span className="category-tag small">{normalizeJenisTiket(tx.jenis_tiket)}</span></td>
                          <td style={{ textAlign: 'center' }}>{qty}</td>
                          <td className="tx-total">{formatRupiah(total)}</td>
                          <td>
                            <span className={`status-tag ${tx.validasi_bayar === 'SUDAH' ? 'approved' : 'pending'}`}>
                              {tx.validasi_bayar === 'SUDAH' ? 'Lunas' : 'Belum'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>Belum ada transaksi</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean, message: string } | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'verified' | 'pending' | 'attended' | 'wa_not_sent' | 'wa_sent'>('all');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sales_analysis'>('dashboard');

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

    if (file.name.startsWith('~$')) {
      setScanResult({ success: false, message: 'Harap pilih file aslinya. File dengan awalan ~$ adalah file sementara (sedang dibuka).' });
      setTimeout(() => setScanResult(null), 4000);
      e.target.value = ''; // Reset input
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const json: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        if (json.length === 0) {
          setScanResult({ success: false, message: 'File Excel kosong atau tidak terbaca.' });
          setTimeout(() => setScanResult(null), 4000);
          return;
        }

        const mapped = json.flatMap(row => {
          const findValue = (keywords: string[], exclude: string[] = []) => {
            const key = Object.keys(row).find(k => 
              keywords.some(kw => k.toLowerCase().includes(kw)) &&
              !exclude.some(ex => k.toLowerCase().includes(ex))
            );
            return key ? row[key] : null;
          };

          const nama = findValue(['nama lengkap', 'nama']) || 'Tanpa Nama';
          const wa = findValue(['whatsapp', 'wa', 'hp', 'telp']) || '-';
          const kategori = findValue(['kategori', 'jenis', 'tiket'], ['kelamin']) || 'VIP Gold 185K';
          const qtyRaw = findValue(['jumlah', 'quantity', 'qty']);
          
          const email = findValue(['email']);
          const jenis_kelamin = findValue(['kelamin']);
          const usia = findValue(['usia', 'umur']);
          const alamat = findValue(['alamat', 'domisili']);
          const metode_pembayaran = findValue(['metode pembayaran']);
          const bukti_transfer = findValue(['bukti transfer']);
          const nama_pengirim = findValue(['nama pengirim']);
          const harapan_event = findValue(['harapan', 'dapatkan dari event ini']);
          
          let qty = parseInt(String(qtyRaw), 10);
          if (isNaN(qty) || qty < 1) qty = 1;

          const results = [];
          
          for (let i = 0; i < qty; i++) {
            const participantName = qty > 1 ? `${nama} (Tiket ${i + 1})` : nama.toString().trim();
            let barcode = findValue(['barcode']);
            
            // If qty > 1, we must generate unique barcodes for each ticket, even if one is provided
            if (!barcode || qty > 1) {
               barcode = Math.floor(10000000 + Math.random() * 90000000).toString();
            }

            let standardWa = wa.toString().trim();
            if (standardWa.startsWith('08')) {
              standardWa = '+62' + standardWa.substring(1);
            } else if (standardWa.startsWith('628')) {
              standardWa = '+' + standardWa;
            }

            results.push({
              barcode: barcode.toString().trim(),
              nama_lengkap: participantName,
              whatsapp: standardWa,
              jenis_tiket: kategori.toString().trim(),
              validasi_bayar: 'BELUM',
              status_absen: 'BELUM',
              email: email?.toString().trim() || null,
              jenis_kelamin: jenis_kelamin?.toString().trim() || null,
              usia: usia?.toString().trim() || null,
              alamat: alamat?.toString().trim() || null,
              jumlah_tiket: qty,
              metode_pembayaran: metode_pembayaran?.toString().trim() || null,
              bukti_transfer: bukti_transfer?.toString().trim() || null,
              nama_pengirim: nama_pengirim?.toString().trim() || null,
              harapan_event: harapan_event?.toString().trim() || null
            });
          }
          
          return results;
        });

        // Cek data lama di database untuk pencocokan (Upsert)
        const { data: existingData, error: fetchError } = await supabase.from('participants').select('*');
        if (fetchError) throw fetchError;

        const availableExisting = [...(existingData || [])];
        const upsertPayload = mapped.map(newP => {
          // Cari apakah nama lengkap sudah ada di database (abaikan besar/kecil huruf)
          const matchIndex = availableExisting.findIndex(extP => extP.nama_lengkap.toLowerCase() === newP.nama_lengkap.toLowerCase());
          
          if (matchIndex !== -1) {
             const match = availableExisting[matchIndex];
             // Hapus dari pool agar tidak terduplikasi jika ada nama yang sama persis lebih dari 1 di Excel
             availableExisting.splice(matchIndex, 1);

             // Jika sudah ada, gunakan barcode lama dan pertahankan status yang sudah berjalan
             return {
               ...newP,
               barcode: match.barcode,
               validasi_bayar: match.validasi_bayar,
               status_absen: match.status_absen,
               waktu_absen: match.waktu_absen,
               status_wa: match.status_wa
             };
          }
          return newP;
        });

        // Eksekusi Upsert (Update jika barcode sudah ada, Insert jika barcode baru)
        const { error } = await supabase.from('participants').upsert(upsertPayload, { onConflict: 'barcode' });
        
        if (error) {
          console.error("Supabase Upsert Error:", error);
          setScanResult({ success: false, message: `Gagal memproses Excel: ${error.message} (Detail: ${error.details || ''})` });
        } else {
          setScanResult({ success: true, message: `Berhasil memproses dan sinkronisasi ${upsertPayload.length} data dari Excel.` });
          fetchParticipants();
        }
      } catch (err: any) {
        console.error("Excel Parse Error:", err);
        setScanResult({ success: false, message: `Error memproses Excel: ${err.message}` });
      } finally {
        setTimeout(() => setScanResult(null), 8000);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; // Reset input allow re-selecting same file
  }, [fetchParticipants]);

  const handleAddOrEdit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      nama_lengkap: formData.get('nama_lengkap') as string,
      jenis_tiket: formData.get('jenis_tiket') as string,
      validasi_bayar: formData.get('validasi_bayar') as any,
      whatsapp: formData.get('whatsapp') as string,
      email: (formData.get('email') as string) || null,
      jenis_kelamin: (formData.get('jenis_kelamin') as string) || null,
      usia: (formData.get('usia') as string) || null,
      alamat: (formData.get('alamat') as string) || null,
      metode_pembayaran: (formData.get('metode_pembayaran') as string) || null,
      bukti_transfer: (formData.get('bukti_transfer') as string) || null,
      nama_pengirim: (formData.get('nama_pengirim') as string) || null,
      harapan_event: (formData.get('harapan_event') as string) || null,
      status_wa: (formData.get('status_wa') as string) || 'BELUM',
    };

    let result;
    if (editingParticipant) {
      result = await supabase.from('participants').update(data).eq('barcode', editingParticipant.barcode);
    } else {
      const generatedBarcode = Math.floor(100000 + Math.random() * 900000).toString();
      result = await supabase.from('participants').insert([{ 
        ...data, 
        barcode: generatedBarcode, 
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

  const toggleWAStatus = useCallback(async (barcode: string, currentStatus?: string) => {
    const newStatus = currentStatus === 'SUDAH' ? 'BELUM' : 'SUDAH';
    const { error } = await supabase
      .from('participants')
      .update({ status_wa: newStatus })
      .eq('barcode', barcode);

    if (error) {
      setScanResult({ success: false, message: 'Gagal memperbarui status WA!' });
    } else {
      setScanResult({ success: true, message: `Status WA diperbarui` });
      fetchParticipants();
    }
    setTimeout(() => setScanResult(null), 3000);
  }, [fetchParticipants]);

  const sendWhatsApp = useCallback(async (p: Participant) => {
    const ticketUrl = `${window.location.origin}/t/${p.barcode}`;
    const message = `Halo *${p.nama_lengkap}*,\n\nTerima kasih telah mendaftar. Berikut adalah E-Tiket Anda:\n\n*Nomor Tiket:* ${formatTicketCode(p.barcode)}\n*Jenis Tiket:* ${normalizeJenisTiket(p.jenis_tiket)}\n\n*Lihat E-Tiket Resmi:* \n${ticketUrl}\n\nMohon tunjukkan barcode di link tersebut kepada panitia saat registrasi ulang. Sampai jumpa di acara Jeda Sejenak Menguatkan Hati!`;
    window.open(`https://wa.me/${p.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');

    if (p.status_wa !== 'SUDAH') {
      const { error } = await supabase
        .from('participants')
        .update({ status_wa: 'SUDAH' })
        .eq('barcode', p.barcode);
      if (!error) {
        fetchParticipants();
      }
    }
  }, [fetchParticipants]);

  const stopScanner = useCallback(async (scanner: Html5Qrcode) => {
    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
      scanner.clear();
    } catch (e) {
      // ignore
    }
  }, []);

  const startScanner = useCallback(() => {
    setShowScanner(true);
    setTimeout(async () => {
      // Adaptive qrbox: 80% of min(width, height) or max 300px
      const minDim = Math.min(window.innerWidth, window.innerHeight);
      const qrboxSize = Math.min(Math.floor(minDim * 0.75), 300);

      const html5Qrcode = new Html5Qrcode("reader", {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
        ],
        verbose: false,
      });

      const onScanSuccess = async (decodedText: string) => {
        await stopScanner(html5Qrcode);
        const { data } = await supabase.from('participants').select('*').eq('barcode', decodedText).single();
        if (data) {
          if (data.validasi_bayar === 'SUDAH') {
            await supabase.from('participants').update({ status_absen: 'SUDAH' }).eq('barcode', decodedText);
            setScanResult({ success: true, message: `✅ Check-in Berhasil: ${data.nama_lengkap}` });
            fetchParticipants();
          } else {
            setScanResult({ success: false, message: `⚠️ Pembayaran Belum Diverifikasi! (${data.nama_lengkap})` });
          }
        } else {
          setScanResult({ success: false, message: '❌ Tiket Tidak Valid / Tidak Ditemukan!' });
        }
        setShowScanner(false);
        setTimeout(() => setScanResult(null), 4000);
      };

      try {
        // Prefer environment-facing (rear) camera, fallback to any
        await html5Qrcode.start(
          { facingMode: { ideal: 'environment' } },
          {
            fps: 30,
            qrbox: { width: qrboxSize, height: qrboxSize },
            aspectRatio: 1.0,
            disableFlip: false,
            experimentalFeatures: { useBarCodeDetectorIfSupported: true },
          },
          onScanSuccess,
          () => {} // ignore frame errors
        );
      } catch {
        // Fallback: try any available camera
        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            const camId = devices[devices.length - 1].id; // prefer last = rear
            await html5Qrcode.start(
              camId,
              {
                fps: 30,
                qrbox: { width: qrboxSize, height: qrboxSize },
                aspectRatio: 1.0,
                disableFlip: false,
                experimentalFeatures: { useBarCodeDetectorIfSupported: true },
              },
              onScanSuccess,
              () => {}
            );
          }
        } catch (err2) {
          setScanResult({ success: false, message: 'Kamera tidak dapat diakses. Pastikan izin kamera sudah diberikan.' });
          setShowScanner(false);
          setTimeout(() => setScanResult(null), 4000);
        }
      }

      // Save scanner ref for cleanup when modal is closed
      (window as any).__activeScanner = html5Qrcode;
    }, 200);
  }, [fetchParticipants, stopScanner]);

  const stats = useMemo(() => ({
    total: participants.length,
    verified: participants.filter(p => p.validasi_bayar === 'SUDAH').length,
    pending: participants.filter(p => p.validasi_bayar === 'BELUM').length,
    attended: participants.filter(p => p.status_absen === 'SUDAH').length,
    waNotSent: participants.filter(p => !p.status_wa || p.status_wa !== 'SUDAH').length,
    waSent: participants.filter(p => p.status_wa === 'SUDAH').length,
  }), [participants]);

  const filteredParticipants = useMemo(() => {
    let result = participants;

    // Apply category filter first
    if (activeCategoryFilter !== 'all') {
      result = result.filter(p => normalizeJenisTiket(p.jenis_tiket) === activeCategoryFilter);
    }

    // Apply active filter
    if (activeFilter === 'verified') {
      result = result.filter(p => p.validasi_bayar === 'SUDAH');
    } else if (activeFilter === 'pending') {
      result = result.filter(p => p.validasi_bayar === 'BELUM');
    } else if (activeFilter === 'attended') {
      result = result.filter(p => p.status_absen === 'SUDAH');
    } else if (activeFilter === 'wa_not_sent') {
      result = result.filter(p => !p.status_wa || p.status_wa !== 'SUDAH');
    } else if (activeFilter === 'wa_sent') {
      result = result.filter(p => p.status_wa === 'SUDAH');
    }

    // Then apply search
    if (searchTerm) {
      result = result.filter(p =>
        p.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return result;
  }, [participants, searchTerm, activeFilter, activeCategoryFilter]);

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
            <img src="/teh-inan-portrait.jpg" alt="Teh Inan" className="avatar-img" />
            <div className="avatar-overlay"></div>
          </div>
          <div className="logo-wrapper">
             <h2 className="brand-title-premium">Ruang<span>Tenang</span></h2>
          </div>
          <p className="brand-subtitle">Official Event Management</p>
        </div>
        
        <nav className="sidebar-nav">
          <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')} title="Dashboard">
            <LayoutDashboard size={20} /> <span>Dashboard</span>
          </button>
          <button className={`nav-item ${activeTab === 'sales_analysis' ? 'active' : ''}`} onClick={() => setActiveTab('sales_analysis')} title="Analisis Penjualan">
            <Database size={20} /> <span>Analisis Penjualan</span>
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
          <p>"Jeda Sejenak, Menguatkan Hati"</p>
          <span>Jeda Sejenak 2026</span>
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
          <div className="header-profile" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span>Admin Panitia</span>
            <div className="admin-avatar">A</div>
            <button 
              onClick={async () => {
                await supabase.auth.signOut();
                navigate('/login');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: '#fee2e2',
                color: '#ef4444',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.85rem'
              }}
              title="Keluar"
            >
              <LogOut size={16} /> Keluar
            </button>
          </div>
        </header>

        <div className="scroll-area">
          {activeTab === 'dashboard' ? (
            <>
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
                <span className="label">Belum Lunas</span>
                <span className="value">{stats.pending}</span>
              </div>
            </div>
            <div className="stat-card-premium purple">
              <div className="stat-icon-box"><History /></div>
              <div className="stat-text">
                <span className="label">Sudah Hadir</span>
                <span className="value">{stats.attended}</span>
              </div>
            </div>
          </section>

          {/* Filter Pills */}
          <div className="filter-pills-bar">
            <div className="filter-pills-label"><Filter size={14} /> Filter:</div>
            <div className="filter-pills">
              <button
                className={`filter-pill ${activeFilter === 'all' ? 'active all' : ''}`}
                onClick={() => { setActiveFilter('all'); setCurrentPage(1); }}
              >
                <Users size={14} /> Semua <span className="pill-count">{stats.total}</span>
              </button>
              <button
                className={`filter-pill ${activeFilter === 'verified' ? 'active verified' : ''}`}
                onClick={() => { setActiveFilter('verified'); setCurrentPage(1); }}
              >
                <ShieldCheck size={14} /> Terverifikasi <span className="pill-count">{stats.verified}</span>
              </button>
              <button
                className={`filter-pill ${activeFilter === 'pending' ? 'active pending' : ''}`}
                onClick={() => { setActiveFilter('pending'); setCurrentPage(1); }}
              >
                <Clock size={14} /> Belum Lunas <span className="pill-count">{stats.pending}</span>
              </button>
              <button
                className={`filter-pill ${activeFilter === 'attended' ? 'active attended' : ''}`}
                onClick={() => { setActiveFilter('attended'); setCurrentPage(1); }}
              >
                <CheckCircle size={14} /> Sudah Hadir <span className="pill-count">{stats.attended}</span>
              </button>
              <button
                className={`filter-pill ${activeFilter === 'wa_not_sent' ? 'active wa-not-sent' : ''}`}
                onClick={() => { setActiveFilter('wa_not_sent'); setCurrentPage(1); }}
              >
                <MessageSquareOff size={14} /> Belum Kirim WA <span className="pill-count">{stats.waNotSent}</span>
              </button>
              <button
                className={`filter-pill ${activeFilter === 'wa_sent' ? 'active wa-sent' : ''}`}
                onClick={() => { setActiveFilter('wa_sent'); setCurrentPage(1); }}
              >
                <MessageCircle size={14} /> Sudah Kirim WA <span className="pill-count">{stats.waSent}</span>
              </button>
            </div>
          </div>

          {/* Table/Grid Actions */}
          <div className="content-toolbar">
            <div className="toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <h3>Daftar Peserta <span className="count-tag">{filteredParticipants.length}</span></h3>
              <select 
                className="filter-select-premium"
                value={activeCategoryFilter}
                onChange={(e) => { setActiveCategoryFilter(e.target.value); setCurrentPage(1); }}
                title="Filter berdasarkan kategori tiket"
              >
                <option value="all">Semua Kategori Tiket</option>
                <option value="VIP Gold 185K">VIP Gold 185K</option>
                <option value="Silver 130K">Silver 130K</option>
                <option value="SILVER DISKON 50K">SILVER DISKON 50K</option>
                <option value="Silver Diskon 100k">Silver Diskon 100k</option>
              </select>
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
                      <th style={{ width: '60px', textAlign: 'center' }}>No.</th>
                      <th>Nama Peserta</th>
                      <th>Kategori</th>
                      <th>Status Bayar</th>
                      <th>Status Hadir</th>
                      <th>Status WA</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedParticipants.map((p, index) => {
                      const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;
                      return (
                        <tr key={p.id || `p-${index}`}>
                          <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#6b7280' }}>{rowNumber}</td>
                          <td>
                            <div className="cell-user">
                              <div className="avatar-mini">{p.nama_lengkap.charAt(0)}</div>
                              <div className="user-details">
                                <span className="name">{p.nama_lengkap}</span>
                                <span className="code">{formatTicketCode(p.barcode)}</span>
                              </div>
                            </div>
                          </td>
                          <td><span className="category-tag">{normalizeJenisTiket(p.jenis_tiket)}</span></td>
                          <td>
                            <span className={`status-tag ${p.validasi_bayar === 'SUDAH' ? 'approved' : 'pending'}`}>
                              {p.validasi_bayar === 'SUDAH' ? 'Lunas' : 'Belum Lunas'}
                            </span>
                          </td>
                          <td>
                            <span className={`status-tag ${p.status_absen === 'SUDAH' ? 'attended' : 'not-yet'}`}>
                              {p.status_absen === 'SUDAH' ? 'Hadir' : 'Belum Hadir'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
                              <input 
                                type="checkbox" 
                                checked={p.status_wa === 'SUDAH'} 
                                onChange={() => toggleWAStatus(p.barcode, p.status_wa)}
                                style={{ width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0 }}
                                title="Tandai Status WA Terkirim"
                              />
                              <span 
                                className={`status-tag ${p.status_wa === 'SUDAH' ? 'attended' : 'not-yet'}`}
                                onClick={() => toggleWAStatus(p.barcode, p.status_wa)}
                                style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
                              >
                                {p.status_wa === 'SUDAH' ? 'Terkirim' : 'Belum Terkirim'}
                              </span>
                            </div>
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
                              <button className={`action-circle wa ${p.status_wa === 'SUDAH' ? 'sent' : ''}`} onClick={() => sendWhatsApp(p)} title={p.status_wa === 'SUDAH' ? 'Kirim Ulang WA' : 'Kirim WA'}><MessageCircle size={14} /></button>
                              <button className="action-circle edit" onClick={() => { setEditingParticipant(p); setShowAddModal(true); }} title="Edit Data"><Edit size={14} /></button>
                              <button className="action-circle view" onClick={() => window.open(`/t/${p.barcode}`, '_blank')} title="Lihat Tiket"><ExternalLink size={14} /></button>
                              <button className="action-circle delete" onClick={() => deleteParticipant(p.barcode)} title="Hapus Data"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="participant-grid">
                {paginatedParticipants.map((p, index) => {
                  const cardNumber = (currentPage - 1) * itemsPerPage + index + 1;
                  return (
                    <div key={p.id || `g-${index}`} className="user-card-premium">
                      <div className="card-top">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#9ca3af' }}>#{cardNumber}</span>
                          <div className="card-avatar">{p.nama_lengkap.charAt(0)}</div>
                        </div>
                        <div className="card-status-dot" style={{ background: p.validasi_bayar === 'SUDAH' ? '#10b981' : '#f59e0b' }}></div>
                      </div>
                      <div className="card-content">
                        <h4>{p.nama_lengkap}</h4>
                        <p className="p-category">{normalizeJenisTiket(p.jenis_tiket)}</p>
                        <code className="p-code">{formatTicketCode(p.barcode)}</code>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', fontSize: '0.85rem' }}>
                          <input 
                            type="checkbox" 
                            checked={p.status_wa === 'SUDAH'} 
                            onChange={() => toggleWAStatus(p.barcode, p.status_wa)}
                            style={{ cursor: 'pointer', width: '14px', height: '14px' }}
                            title="Tandai Status WA Terkirim"
                          />
                          <span 
                            style={{ fontWeight: 500, color: p.status_wa === 'SUDAH' ? '#9d174d' : '#475569', cursor: 'pointer' }}
                            onClick={() => toggleWAStatus(p.barcode, p.status_wa)}
                          >
                            WA: {p.status_wa === 'SUDAH' ? 'Terkirim' : 'Belum Terkirim'}
                          </span>
                        </div>
                      </div>
                       <div className="card-actions">
                        {p.validasi_bayar === 'BELUM' && (
                          <button onClick={() => updateParticipantStatus(p.barcode, 'SUDAH')} className="verify">Verifikasi</button>
                        )}
                        <button onClick={() => sendWhatsApp(p)} className="wa">
                          {p.status_wa === 'SUDAH' ? 'Kirim Ulang WA' : 'Kirim WA'}
                        </button>
                        <button onClick={() => { setEditingParticipant(p); setShowAddModal(true); }}>Edit</button>
                      </div>
                    </div>
                  );
                })}
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
            </>
          ) : (
            <SalesAnalysis participants={participants} />
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
                
                <div className="input-row">
                  <div className="input-group">
                    <label>Nomor WhatsApp</label>
                    <input name="whatsapp" defaultValue={editingParticipant?.whatsapp} required placeholder="Contoh: 0812345678" />
                  </div>
                  <div className="input-group">
                    <label>Email</label>
                    <input name="email" type="email" defaultValue={editingParticipant?.email} placeholder="Email" />
                  </div>
                </div>

                <div className="input-row">
                  <div className="input-group">
                    <label>Jenis Kelamin</label>
                    <select name="jenis_kelamin" defaultValue={editingParticipant?.jenis_kelamin || ''}>
                      <option value="">Pilih...</option>
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Usia</label>
                    <input name="usia" type="number" defaultValue={editingParticipant?.usia} placeholder="Usia" />
                  </div>
                </div>

                <div className="input-group">
                  <label>Alamat / Domisili</label>
                  <input name="alamat" defaultValue={editingParticipant?.alamat} placeholder="Alamat" />
                </div>

                <div className="input-row">
                  <div className="input-group">
                    <label>Metode Pembayaran</label>
                    <input name="metode_pembayaran" defaultValue={editingParticipant?.metode_pembayaran} placeholder="Transfer Bank, dll" />
                  </div>
                  <div className="input-group">
                    <label>Nama Pengirim</label>
                    <input name="nama_pengirim" defaultValue={editingParticipant?.nama_pengirim} placeholder="Nama di Rekening" />
                  </div>
                </div>

                <div className="input-group">
                  <label>Bukti Transfer (Link/Teks)</label>
                  <input name="bukti_transfer" defaultValue={editingParticipant?.bukti_transfer} placeholder="URL Bukti Transfer" />
                </div>

                <div className="input-group">
                  <label>Harapan Event</label>
                  <textarea name="harapan_event" defaultValue={editingParticipant?.harapan_event} placeholder="Harapan mengikuti event" rows={2} style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb'}}></textarea>
                </div>

                <div className="input-row">
                  <div className="input-group">
                    <label>Kategori Tiket</label>
                    <select name="jenis_tiket" defaultValue={editingParticipant?.jenis_tiket || 'VIP Gold 185K'}>
                      <option value="VIP Gold 185K">VIP Gold 185K</option>
                      <option value="Silver 130K">Silver 130K</option>
                      <option value="Spesial Mahasiswa">Spesial Mahasiswa</option>
                      <option value="Silver 130k (Diskon 100k)">Silver 130k (Diskon 100k)</option>
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

                <div className="input-row">
                  <div className="input-group">
                    <label>Status Kirim WA</label>
                    <select name="status_wa" defaultValue={editingParticipant?.status_wa || 'BELUM'}>
                      <option value="BELUM">Belum Terkirim</option>
                      <option value="SUDAH">Terkirim</option>
                    </select>
                  </div>
                  <div className="input-group" style={{ visibility: 'hidden' }}>
                    <label>Placeholder</label>
                    <select><option>N/A</option></select>
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
                <div className="scanner-title">
                  <Camera size={22} className="scanner-title-icon" />
                  <h3>Scan Barcode Peserta</h3>
                </div>
                <button
                  onClick={async () => {
                    const sc = (window as any).__activeScanner;
                    if (sc) {
                      try { if (sc.isScanning) await sc.stop(); sc.clear(); } catch {}
                      delete (window as any).__activeScanner;
                    }
                    setShowScanner(false);
                  }}
                  className="close-btn"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="scanner-viewport">
                <div id="reader"></div>
                <div className="scanner-corners">
                  <span className="corner tl"/>
                  <span className="corner tr"/>
                  <span className="corner bl"/>
                  <span className="corner br"/>
                </div>
              </div>
              <p className="scanner-hint">
                <span>📷</span> Arahkan kamera ke barcode atau QR Code pada tiket peserta
              </p>
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
