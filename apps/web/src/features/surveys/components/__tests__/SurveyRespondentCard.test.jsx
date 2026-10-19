import React from 'react';
import { render, screen } from '@testing-library/react';
import SurveyRespondentCard from '../SurveyRespondentCard';

/**
 * KARTU DATA PENGISI pada detail respons (1 Oktober 2026, laporan pengguna:
 * "data responden bukan anonim belum tampil ketika menjawab survei").
 *
 * KARTU TERPISAH, bukan ditumpuk ke "Informasi Survei": yang satu menerangkan
 * surveinya, yang ini menerangkan orangnya. Pola yang sama sudah berdiri pada
 * detail pengaduan ("Profil Pelapor" berdiri sendiri di samping isi aduan).
 *
 * YANG PALING DIJAGA: respons yang pengisinya MEMILIH anonim tidak boleh
 * menampilkan satu pun medan, dan harus MENGATAKAN bahwa itu pilihan -- bukan
 * memajang deretan '-' yang terbaca sebagai data rusak. Itu persis jebakan yang
 * dilaporkan pengguna pada kartu "Profil Pelapor" pengaduan, dan tak perlu
 * diulang di sini.
 */
const lengkap = {
  name: 'Siti Aminah',
  phone: '081234567890',
  gender: 'perempuan',
  ageGroup: '26-35',
  isAnonim: false,
};

const anonim = { name: null, phone: null, gender: null, ageGroup: null, isAnonim: true };

describe('SurveyRespondentCard', () => {
  it('menampilkan seluruh data yang diberikan pengisi', () => {
    render(<SurveyRespondentCard respondent={lengkap} />);

    expect(screen.getByText('Siti Aminah')).toBeInTheDocument();
    expect(screen.getByText('081234567890')).toBeInTheDocument();
    expect(screen.getByText(/perempuan/i)).toBeInTheDocument();
    expect(screen.getByText('26-35')).toBeInTheDocument();
  });

  it('KONTROL: pengisi anonim tidak membocorkan satu pun medan', () => {
    render(<SurveyRespondentCard respondent={anonim} />);

    expect(screen.queryByText('Siti Aminah')).not.toBeInTheDocument();
    expect(screen.queryByText('081234567890')).not.toBeInTheDocument();
    expect(screen.queryByText(/no\. telepon/i)).not.toBeInTheDocument();
  });

  it('anonim DIJELASKAN sebagai pilihan, bukan dipajang sebagai strip kosong', () => {
    render(<SurveyRespondentCard respondent={anonim} />);

    expect(screen.getByText(/memilih mengisi survei ini sebagai anonim/i)).toBeInTheDocument();
    expect(screen.queryByText('-')).not.toBeInTheDocument();
  });

  it('medan yang kosong SENDIRIAN disembunyikan, bukan diberi strip', () => {
    // Pengisi bersesi yang mengosongkan nomor HP-nya bukan anonim: nama dan
    // demografisnya tetap ada. Memberi '-' pada nomornya mengulang jebakan
    // kartu "Profil Pelapor" pengaduan, tempat laporan ini bermula.
    render(<SurveyRespondentCard respondent={{ ...lengkap, phone: null }} />);

    expect(screen.getByText('Siti Aminah')).toBeInTheDocument();
    expect(screen.queryByText(/no\. telepon/i)).not.toBeInTheDocument();
    expect(screen.queryByText('-')).not.toBeInTheDocument();
  });

  it('tanpa prop respondent: tidak merender apa pun', () => {
    const { container } = render(<SurveyRespondentCard />);

    expect(container).toBeEmptyDOMElement();
  });
});
