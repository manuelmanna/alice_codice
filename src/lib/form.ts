export function leggiTesto(formData: FormData, campo: string) {
  const valore = formData.get(campo);
  return typeof valore === 'string' ? valore : '';
}

export function leggiTestoOpzionale(formData: FormData, campo: string) {
  const valore = leggiTesto(formData, campo);
  return valore || null;
}

export function leggiNumeroOpzionale(formData: FormData, campo: string) {
  const valore = leggiTesto(formData, campo);
  if (!valore) return null;

  const numero = Number.parseInt(valore, 10);
  return Number.isNaN(numero) ? null : numero;
}

export function emailValida(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
