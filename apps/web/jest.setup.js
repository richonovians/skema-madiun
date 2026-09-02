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
