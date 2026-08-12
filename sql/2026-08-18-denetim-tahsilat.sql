-- Denetim defteri artık yalnız ürünleri değil tahsilatları da kaydediyor:
-- silinen tahsilat ve düzeltilen ödeme tipi. "Hangi ürün" sütunu bu yüzden
-- daha geniş bir soruya cevap veriyor — ürün adı ya da ödeme tipi.
alter table denetim_kayitlari rename column kalem_ad to konu;
