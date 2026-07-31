import type { Bolge } from "./types";

export const bolgeler: Bolge[] = [
  {
    ad: "Bahçe",
    masalar: [
      { ad: "B 1", dolu: true, tutar: 290, sure: "1s 12dk", garson: "Mert" },
      { ad: "B 2", dolu: false },
      { ad: "B 3", dolu: false },
      { ad: "B 4", dolu: true, tutar: 850, sure: "34dk", garson: "Pelin" },
      { ad: "B 5", dolu: false },
      { ad: "B 6", dolu: false },
    ],
  },
  {
    ad: "Salon",
    masalar: [
      { ad: "S 1", dolu: false },
      { ad: "S 2", dolu: true, tutar: 1240, sure: "2s 05dk", garson: "Veysel" },
      { ad: "S 3", dolu: false },
      { ad: "S 4", dolu: false },
    ],
  },
];