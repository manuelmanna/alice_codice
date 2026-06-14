export function dataOggiIso() {
  return new Date().toISOString().split('T')[0];
}

// Restituisce la data ISO (YYYY-MM-DD) di "giorni" giorni fa rispetto ad oggi.
export function dataIsoGiorniFa(giorni: number) {
  // Crea un oggetto Date con la data/ora corrente
  const data = new Date();

  // Sottrae il numero di giorni passato dal giorno corrente.
  data.setDate(data.getDate() - giorni);

  // Converte la data in stringa ISO (es. "2026-06-14T12:34:56.789Z"),
  // poi prende solo la parte della data (prima della 'T'): "YYYY-MM-DD"
  return data.toISOString().split('T')[0];
}