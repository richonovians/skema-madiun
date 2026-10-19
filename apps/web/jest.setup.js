require('@testing-library/jest-dom');

// TENGGAT `findBy*` / `waitFor` DINAIKKAN DARI BAWAAN 1.000 ms
// (19 Oktober 2026). Alasan, pengukuran, dan harga yang ditukar ada satu
// tempat: docblock `testTimeout` di `jest.config.js`. Ringkasnya, tiga dari
// empat kegagalan yang terukur di bawah beban berbunyi `Unable to find an
// element with the text`, yaitu tenggat inilah yang habis -- bukan tenggat
// uji milik jest.
//
// `configure` diambil dari `@testing-library/react`, BUKAN dari
// `@testing-library/dom`: paket yang kedua bukan dependensi langsung
// `apps/web`, jadi pnpm tak membuatnya dapat di-resolve dari sini.
const { configure } = require('@testing-library/react');
configure({ asyncUtilTimeout: 5000 });
const { TextEncoder, TextDecoder } = require('util');
const { BroadcastChannel, MessagePort, MessageChannel } = require('node:worker_threads');
const { ReadableStream, TransformStream, WritableStream } = require('node:stream/web');

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.BroadcastChannel = BroadcastChannel;
global.MessagePort = MessagePort;
global.MessageChannel = MessageChannel;
global.ReadableStream = ReadableStream;
global.TransformStream = TransformStream;
global.WritableStream = WritableStream;

const { fetch, Headers, Request, Response, FormData } = require('undici');

global.fetch = fetch;
global.Headers = Headers;
global.Request = Request;
global.Response = Response;
global.FormData = FormData;

// `File` DIAMBIL DARI `node:buffer`, BUKAN DARI UNDICI (19 Oktober 2026).
//
// Baris di atas sebelumnya ikut mengambil `File` dari undici, lalu menugaskannya
// ke `global.File`. Sejak undici 8 paket itu tak lagi mengekspor `File`, jadi
// nilainya `undefined` — dan penugasannya MENIMPA implementasi jsdom yang
// sebenarnya berfungsi. Terukur di cabang ini: undici 8.10.0, `undici.File`
// `undefined`, `node:buffer.File` sebuah fungsi.
//
// Gejalanya menuding tempat yang salah: uji yang membangun sebuah berkas gagal
// dengan "File is not a constructor", seolah ujinya keliru, padahal penyiapan
// inilah yang merusaknya. Selama itu terjadi, seluruh permukaan lampiran
// mustahil diuji di `main`.
//
// Perbaikan ini sudah ada di cabang `tester` sejak lama dan tak pernah sampai
// ke sini; itu tercatat sebagai CAT-009 dan CAT-023 di dokumen pengujian.
// Penjaganya ada di `src/__tests__/penyiapan-file-global.test.js`.
//
// `if (File)` dipertahankan, bukan dihilangkan: bila suatu saat `node:buffer`
// pun berhenti mengekspornya, yang benar adalah MEMBIARKAN `File` milik jsdom
// apa adanya, bukan menimpanya dengan `undefined` sekali lagi.
const { File } = require('node:buffer');
if (File) global.File = File;

global.ReadableStream = ReadableStream;
global.TransformStream = TransformStream;
global.WritableStream = WritableStream;

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

/**
 * `ResizeObserver` tidak ada di jsdom sama sekali, dan sejak redesain sidebar
 * (16 September 2026) AdminKabNavbar memakainya untuk mengukur tingginya
 * sendiri. Setiap uji yang memasang komponen itu jadi melempar
 * `ReferenceError` sebelum sempat memeriksa apa pun.
 *
 * Boneka yang tak melakukan apa-apa memang jawaban yang benar di sini, bukan
 * kompromi: jsdom tak menghitung tata letak, jadi pengamat ukuran sungguhan pun
 * tak akan pernah punya perubahan ukuran untuk dilaporkan. Yang dijaga uji-uji
 * itu adalah isi dan perilaku navbar, sementara tingginya diukur di peramban.
 */
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
