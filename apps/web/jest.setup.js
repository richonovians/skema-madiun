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

const { fetch, Headers, Request, Response, FormData } = require('undici');

global.fetch = fetch;
global.Headers = Headers;
global.Request = Request;
global.Response = Response;
global.FormData = FormData;

// `File` diambil dari `node:buffer`, BUKAN dari undici.
//
// Sejak undici 8 `File` tak lagi diekspor dari sana, sehingga
// `const { File } = require('undici')` bernilai `undefined` — dan menugaskannya
// ke `global.File` justru MENIMPA implementasi jsdom yang sebenarnya berfungsi.
// Akibatnya setiap uji yang membangun sebuah berkas gagal dengan
// "File is not a constructor", pesan yang menuding uji-nya padahal
// penyiapan inilah yang merusaknya. Seluruh permukaan lampiran — formulir
// pengaduan dan balasan percakapan — mustahil diuji selama itu terjadi.
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
