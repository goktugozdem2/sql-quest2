export function normalizeAiMessages(messages) {
  if (!Array.isArray(messages)) return [];

  let cleanMessages = messages.filter((message) => (
    message
    && message.content
    && String(message.content).trim()
  ));

  const firstUserIdx = cleanMessages.findIndex((message) => message.role === 'user');
  if (firstUserIdx > 0) {
    cleanMessages = cleanMessages.slice(firstUserIdx);
  }

  if (cleanMessages.length === 0 || cleanMessages[0].role !== 'user') {
    return [];
  }

  const validMessages = [];
  let lastRole = null;

  for (const message of cleanMessages) {
    if (message.role !== lastRole) {
      validMessages.push({ role: message.role, content: message.content });
      lastRole = message.role;
    }
  }

  return validMessages;
}
