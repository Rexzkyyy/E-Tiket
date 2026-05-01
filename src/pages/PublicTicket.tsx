import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import Barcode from 'react-barcode';
import { motion } from 'framer-motion';
import { Info, Download, ShieldCheck, Plus, Image as ImageIcon } from 'lucide-react';
import html2canvas from 'html2canvas';

// Use credentials from your existing config or environment
const SB_URL = 'https://tydfbrcdvzeggrlzabfq.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5ZGZicmNkdnplZ2dybHphYmZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NTUyMDEsImV4cCI6MjA5MzAzMTIwMX0.75_AK06B7aGjIbZk_rG6KBgD6yqDHygPRYg_GHeMJ6o';
const supabase = createClient(SB_URL, SB_KEY);

interface Participant {
  barcode: string;
  nama_lengkap: string;
  jenis_tiket: string;
  validasi_bayar: string;
  status_absen: string;
  [key: string]: any;
}

const formatTicketCode = (code: string) => {
  if (!code) return '';
  if (code.startsWith('RTJP')) return code;
  if (!isNaN(Number(code)) && code.length > 5) return `RTJP${code.slice(-3)}`;
  return `RTJP${code.padStart(3, '0')}`;
};

const PublicTicket: React.FC = () => {
  const { barcode } = useParams<{ barcode: string }>();
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ticketRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const fetchTicket = async () => {
      if (!barcode) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('participants')
          .select('*')
          .eq('barcode', barcode)
          .single();

        if (error) throw error;
        setParticipant(data);
      } catch (err: any) {
        setError('Tiket tidak ditemukan atau terjadi kesalahan.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [barcode]);

  const downloadAsImage = async () => {
    if (!ticketRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(ticketRef.current, {
        scale: 3, // High quality
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const image = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = `Ticket-${participant?.nama_lengkap || 'Download'}.png`;
      link.href = image;
      link.click();
    } catch (err) {
      console.error('Download failed', err);
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="public-container">
        <div className="loading-spinner"></div>
        <p>Memuat Tiket...</p>
      </div>
    );
  }

  if (error || !participant) {
    return (
      <div className="public-container">
        <div className="card error-card">
          <Info size={48} color="#ef4444" />
          <h2>Oops!</h2>
          <p>{error || 'Tiket tidak valid.'}</p>
          <a href="/" className="btn btn-primary">Kembali ke Beranda</a>
        </div>
      </div>
    );
  }

  return (
    <div className="public-ticket-page">
      {/* Decorative Lively Background Elements */}
      <div className="bg-aurora-1"></div>
      <div className="bg-aurora-2"></div>

      {/* Page Hero branding */}
      <header className="public-hero">
        <div className="hero-content">
          <div className="coach-badge">
            <img src="/coach zul3.png" alt="Coach Zul" />
          </div>
          <div className="hero-text">
            <span className="event-date">11 JULI 2026 • HOTEL ZAHRA</span>
            <h1>JALAN PULANG</h1>
            <p>Bersama Coach Zulkifli Bilondatu</p>
          </div>
        </div>
      </header>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="ticket-wrapper"
      >
        {/* ULTIMATE HYBRID TICKET (UNIFIED HEADER & FOOTER) */}
        <div ref={ticketRef} className="ultimate-hybrid-ticket">
          {/* UNIFIED DARK HEADER */}
          <div className="unified-ticket-header">
            OFFICIAL E-TICKET • JALAN PULANG 2026
          </div>

          <div className="ticket-main-content">
            {/* Left Side: Visual Flyer */}
            <div className="visual-flyer-side">
              <img src="/tiket.jpeg" alt="Event Flyer" className="flyer-img" />
            </div>

            {/* Right Side: THE EXACT PORTRAIT STUB */}
            <div className="official-stub-side">
              {/* Decorative Notches */}
              <div className="official-stub-side-notch-bottom"></div>
              
              {/* Header Badge */}
              <div className="stub-badge">TIKET MASUK RESMI</div>
              
              {/* Logo Card */}
              <div className="stub-logo-card">
                <div className="logo-text">ruang<span>tenang</span></div>
                <div className="logo-sub">Menemukan Diri, Menata Hati</div>
              </div>

              {/* Title & Tagline */}
              <div className="stub-titles">
                <h2 className="title-serif">Jalan Pulang</h2>
                <p className="tagline-italic">"Tempat Kamu Bisa Jujur Tanpa Dihakimi"</p>
              </div>

              {/* Divider with X */}
              <div className="stub-divider-x">
                <span></span>
                <div className="x-mark">×</div>
                <span></span>
              </div>

              {/* Full Info Grid */}
              <div className="stub-info-grid">
                <div className="s-row">
                  <span className="s-label">HARI/TGL</span>
                  <span className="s-val">Sabtu, 11 Juli 2026</span>
                </div>
                <div className="s-row">
                  <span className="s-label">WAKTU</span>
                  <span className="s-val">08.00 - 11.00</span>
                </div>
                <div className="s-row">
                  <span className="s-label">LOKASI</span>
                  <span className="s-val">Hotel Zahra, Kendari</span>
                </div>
                <div className="s-row">
                  <span className="s-label">KATEGORI</span>
                  <span className="s-val">{participant.jenis_tiket.toUpperCase()}</span>
                </div>
                <div className="s-row">
                  <span className="s-label">PESERTA</span>
                  <span className="s-val">{participant.nama_lengkap.toUpperCase()}</span>
                </div>
              </div>

              {/* Yellow No Box */}
              <div className="stub-no-box">
                <div className="no-label">NO. TIKET</div>
                <div className="no-val">{formatTicketCode(participant.barcode)}</div>
              </div>

              {/* Barcode Footer */}
              <div className="stub-barcode-footer">
                <Barcode 
                  value={participant.barcode} 
                  format="CODE128" 
                  width={1.2} 
                  height={40} 
                  displayValue={false}
                  background="transparent" 
                />
                <div className="b-code">{participant.barcode}</div>
              </div>
            </div>
          </div>

          {/* UNIFIED DARK FOOTER */}
          <div className="unified-ticket-footer">
            TIKET INI HANYA BERLAKU UNTUK 1 (SATU) ORANG • TUNJUKKAN BARCODE KEPADA PETUGAS SAAT MEMASUKI LOKASI
          </div>
        </div>

        {/* Action Buttons */}
        <div className="public-actions no-print">
          <button className="btn btn-primary" onClick={downloadAsImage} disabled={isDownloading}>
            {isDownloading ? <div className="loading-spinner" style={{ width: '16px', height: '16px', margin: 0 }}></div> : <ImageIcon size={18} />}
            Simpan Sebagai Gambar (PNG)
          </button>
          <button className="btn btn-ghost" onClick={() => window.print()}>
            <Download size={18} /> Cetak / PDF
          </button>
          {participant.validasi_bayar === 'Approved' ? (
            <div className="status-badge success">
              <ShieldCheck size={18} /> Pembayaran Terverifikasi
            </div>
          ) : (
            <div className="status-badge pending">
              <Info size={18} /> Menunggu Verifikasi Pembayaran
            </div>
          )}
        </div>
      </motion.div>
      
      <footer className="public-footer">
        <p>© 2026 Ruang Tenang. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default PublicTicket;
