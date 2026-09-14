import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { downloadComplaintPdf } from '@/utils/pdf';
import { unduhCsv } from '@/utils/unduh';
import ComplaintExportMenu from '../ComplaintExportMenu';

jest.mock('@/utils/pdf', () => ({ downloadComplaintPdf: jest.fn() }));
jest.mock('@/utils/unduh', () => ({ unduhCsv: jest.fn() }));

const complaint = {
  id: 'PGD20260912K2F8',
  title: 'Jalan berlubang',
  status: 'Diproses',
  isAnonim: false,
  reporter: { name: 'Siti Rohmah' },
};

const chatHistory = [
  { role: 'user', text: 'Mohon ditindaklanjuti.', timestamp: '10:15 WIB' },
  { role: 'admin', text: 'Sudah kami teruskan.', timestamp: '09:02 WIB' },
];

const bukaMenu = () => fireEvent.click(screen.getByRole('button', { name: /ekspor/i }));

beforeEach(() => jest.clearAllMocks());

describe('ComplaintExportMenu', () => {
  it('Ekspor PDF membawa serta riwayat percakapannya', async () => {
    render(<ComplaintExportMenu complaint={complaint} chatHistory={chatHistory} />);
    bukaMenu();

    fireEvent.click(screen.getByText(/ekspor pdf/i));

    await waitFor(() => expect(downloadComplaintPdf).toHaveBeenCalledTimes(1));
    expect(downloadComplaintPdf).toHaveBeenCalledWith({ complaint, chatHistory });
  });

  it('Ekspor Excel menulis tiap pesan sebagai satu baris', async () => {
    render(<ComplaintExportMenu complaint={complaint} chatHistory={chatHistory} />);
    bukaMenu();

    fireEvent.click(screen.getByText(/ekspor excel/i));

    await waitFor(() => expect(unduhCsv).toHaveBeenCalledTimes(1));
    expect(unduhCsv.mock.calls[0][0].rows).toHaveLength(chatHistory.length);
  });
});
