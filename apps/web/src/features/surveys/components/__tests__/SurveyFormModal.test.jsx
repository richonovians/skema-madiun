import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SurveyFormModal from '../admin-kab/SurveyFormModal';

/**
 * Saklar "izinkan pengisian tanpa login". Tanpa kendali ini kolom
 * `izinkanAnonim` tak dapat dinyalakan dari antarmuka sama sekali —
 * `allowMultipleSubmit` membuktikan bahwa kolom DTO tidak otomatis punya
 * kendalinya: ia sudah lama ada dan tak pernah muncul di formulir mana pun.
 *
 * Mode `edit` dipakai dengan sengaja: mode `create` menuntut OPD dipilih lewat
 * Dropdown mengapung, yang tak ada hubungannya dengan yang diuji di sini.
 */
const props = {
  mode: 'edit',
  initialValues: { title: 'SKM Loket', period: '2026-Q3', izinkanAnonim: false },
  opdName: 'Dinas Kesehatan',
  onCancel: () => {},
};

describe('SurveyFormModal — saklar anonim', () => {
  it('baku tidak mengizinkan anonim', () => {
    render(<SurveyFormModal {...props} onSubmit={() => {}} />);

    expect(screen.getByRole('checkbox', { name: /tanpa login/i })).not.toBeChecked();
  });

  it('mengikuti nilai awal survei yang sedang diubah', () => {
    render(
      <SurveyFormModal
        {...props}
        initialValues={{ ...props.initialValues, izinkanAnonim: true }}
        onSubmit={() => {}}
      />,
    );

    expect(screen.getByRole('checkbox', { name: /tanpa login/i })).toBeChecked();
  });

  it('meneruskan izinkanAnonim saat disimpan', () => {
    const onSubmit = jest.fn();
    render(<SurveyFormModal {...props} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('checkbox', { name: /tanpa login/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ izinkanAnonim: true }));
  });

  it('memberi tahu admin bahwa pengisian berulang tidak ditegakkan sistem', () => {
    render(<SurveyFormModal {...props} onSubmit={() => {}} />);

    // Admin yang menyalakan saklar ini berhak tahu batas integritasnya.
    expect(screen.getByText(/penanda di peramban/i)).toBeInTheDocument();
  });
});
