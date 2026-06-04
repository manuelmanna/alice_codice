export function dataOggiIso() {
  return new Date().toISOString().split('T')[0];
}

export function dataIsoGiorniFa(giorni: number) {
  const data = new Date();
  data.setDate(data.getDate() - giorni);
  return data.toISOString().split('T')[0];
}
