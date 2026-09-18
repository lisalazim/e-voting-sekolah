export function getVotingStatusMessage(status: string): string {
  const messages: Record<string, string> = {
    already_voted: "Suara sudah tercatat.",
    candidate_invalid: "Kandidat tidak valid.",
    closed: "Pemilihan telah ditutup.",
    invalid_token: "Token tidak valid atau tidak dapat digunakan.",
    not_open: "Kotak suara belum dibuka.",
    paused: "Kotak suara sedang dijeda.",
    rate_limited: "Terlalu banyak percobaan. Silakan tunggu beberapa saat.",
    session_expired: "Sesi pemilih sudah kedaluwarsa. Masukkan token kembali.",
    session_invalid: "Sesi pemilih tidak valid. Masukkan token kembali.",
  };

  return messages[status] ?? "Permintaan belum bisa diproses.";
}
