require('@testing-library/jest-dom');
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

const { fetch, Headers, Request, Response, FormData, File } = require('undici');

global.fetch = fetch;
global.Headers = Headers;
global.Request = Request;
global.Response = Response;
global.FormData = FormData;
global.File = File;

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
