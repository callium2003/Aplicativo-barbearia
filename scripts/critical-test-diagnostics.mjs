export function createDiagnosticBuffer(sanitize, limit = 6000) {
  let buffer = '';
  return {
    append(chunk) { buffer = (buffer + String(chunk)).slice(-limit); },
    // Eventos podem dividir uma chave: redigir somente após recompor o buffer.
    read() { return sanitize(buffer); },
  };
}
