// Pays et operateurs FedaPay (Mobile Money sans redirection).
export const COUNTRIES = [
  { id: "bj", flag: "🇧🇯", name: "Benin", dial: "229", len: 10, ph: "01XXXXXXXX", ops: [["MTN", "mtn_open"], ["MOOV", "moov"], ["CELTIIS", "sbin"]] },
  { id: "tg", flag: "🇹🇬", name: "Togo", dial: "228", len: 8, ph: "90123456", ops: [["MOOV", "moov_tg"], ["Togocom", "togocel"]] },
  { id: "ci", flag: "🇨🇮", name: "Cote d'Ivoire", dial: "225", len: 10, ph: "0712345678", ops: [["MTN", "mtn_ci"]] },
  { id: "ne", flag: "🇳🇪", name: "Niger", dial: "227", len: 8, ph: "96123456", ops: [["Airtel", "airtel_ne"]] },
  { id: "sn", flag: "🇸🇳", name: "Senegal", dial: "221", len: 9, ph: "771234567", ops: [["Free", "free_sn"]] },
  { id: "gn", flag: "🇬🇳", name: "Guinee", dial: "224", len: 9, ph: "621234567", ops: [["MTN", "mtn_open_gn"]] },
];
