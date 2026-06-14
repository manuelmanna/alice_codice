// Restituisce la percentuale (intero) di `parte` rispetto a `totale`.
// Se `totale` è zero o negativo, restituisce 100 per indicare "completo".
export function calcolaPercentuale(parte: number, totale: number) {
  // Se non c'è niente da completare (totale <= 0), considero la percentuale piena.
  if (totale <= 0) return 100;

  // Calcola la frazione, moltiplica per 100 e arrotonda al numero intero più vicino.
  return Math.round((parte / totale) * 100);
}
