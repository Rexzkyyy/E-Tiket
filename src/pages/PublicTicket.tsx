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
    <div className="public-container">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="ticket-wrapper"
      >
        <div ref={ticketRef} className="premium-ticket">
          <div className="ticket-header-banner">TIKET MASUK RESMI</div>
          
          <div className="ticket-logo-box">
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#063162', textAlign: 'center' }}>
              ruang<span style={{ color: '#0ea5e9' }}>tenang</span>
            </div>
            <div style={{ fontSize: '0.6rem', color: '#64748b', textAlign: 'center' }}>Menemukan Diri, Menata Hati</div>
          </div>

          <div style={{ textAlign: 'center', padding: '0 20px' }}>
            <h1 className="ticket-main-title">Jalan Pulang</h1>
            <p className="ticket-tagline">"Tempat Kamu Bisa Jujur Tanpa Dihakimi"</p>
          </div>

          <div className="ticket-heart-divider">
            <span></span>
            <Plus size={14} style={{ color: '#063162', transform: 'rotate(45deg)' }} />
            <span></span>
          </div>

          <div className="ticket-details-grid">
            <div className="detail-row">
              <div className="detail-label">HARI/TANGGAL</div>
              <div className="detail-separator">:</div>
              <div className="detail-value">Sabtu, 11 Juli 2026</div>
            </div>
            <div className="detail-row">
              <div className="detail-label">WAKTU</div>
              <div className="detail-separator">:</div>
              <div className="detail-value">08.00 - 11.00</div>
            </div>
            <div className="detail-row">
              <div className="detail-label">LOKASI</div>
              <div className="detail-separator">:</div>
              <div className="detail-value">Hotel Zahra, Kota Kendari</div>
            </div>
            <div className="detail-row">
              <div className="detail-label">KATEGORI</div>
              <div className="detail-separator">:</div>
              <div className="detail-value">{participant.jenis_tiket.toUpperCase()}</div>
            </div>
            <div className="detail-row">
              <div className="detail-label">PESERTA</div>
              <div className="detail-separator">:</div>
              <div className="detail-value">{participant.nama_lengkap.toUpperCase()}</div>
            </div>
          </div>

          <div className="ticket-number-box">
            <div className="ticket-number-label">NO. TIKET</div>
            <div className="ticket-number-value">000{participant.barcode.slice(-1)}</div>
          </div>

          <div style={{ padding: '0 32px 20px', display: 'flex', justifyContent: 'center', background: 'white' }}>
            <Barcode 
              value={participant.barcode} 
              format="CODE128" 
              width={1.2} 
              height={50} 
              displayValue={true}
              background="transparent" 
            />
          </div>

          <div className="ticket-footer-dark">
            TIKET INI HANYA BERLAKU UNTUK 1 (SATU) ORANG
            <span>Tunjukkan barcode ini kepada petugas saat memasuki lokasi</span>
          </div>
        </div>

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
    </div>
  );
};

export default PublicTicket;
