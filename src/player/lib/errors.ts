/** Últimos erros do player, enviados no ping para aparecerem no painel. */
const log: Array<{ at: string; msg: string }> = [];
export function reportPlayerError(msg: string) {
  log.push({ at: new Date().toISOString(), msg: msg.slice(0, 300) });
  while (log.length > 5) log.shift();
}
export function recentErrors() {
  return [...log];
}
