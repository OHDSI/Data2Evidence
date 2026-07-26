// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";

// @ts-ignore
window.crypto = require("crypto");

// jsdom implements no layout, so it ships no scrollIntoView. Components that keep
// a list scrolled to the latest item (the AI assistant conversation) would throw
// in their mount effect without this.
Element.prototype.scrollIntoView = jest.fn();

// jsdom predates the WHATWG Streams globals that every browser now has. The AI
// SDK's streaming chat transport parses its response through them at import
// time, so any test that transitively imports the AI assistant fails to load
// without these. Node provides the same implementations.
const webStreams = require("node:stream/web");
const { TextDecoder, TextEncoder } = require("node:util");
const missingBrowserGlobals: Record<string, unknown> = {
  ReadableStream: webStreams.ReadableStream,
  WritableStream: webStreams.WritableStream,
  TransformStream: webStreams.TransformStream,
  TextDecoder,
  TextEncoder,
};
for (const [name, value] of Object.entries(missingBrowserGlobals)) {
  if (!(name in globalThis)) {
    // @ts-ignore assigning a missing browser global
    globalThis[name] = value;
  }
}

global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
