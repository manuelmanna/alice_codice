export function calcolaPercentuale(parte: number, totale: number) {
  // Se non c'e' niente da completare, considero la percentuale piena.
  if (totale <= 0) return 100;

  return Math.round((parte / totale) * 100);
}
