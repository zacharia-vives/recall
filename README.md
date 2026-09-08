# Recall

**Live: <https://zacharia-vives.github.io/recall/>**

Recall bewaart wat je niet wil vergeten.

Een webapp voor oudere mensen die hun papieren niet meer kunnen lezen en de draad
kwijtraken. Je richt de camera op een brief, Recall maakt de letters groter, leest
de brief voor en bewaart hem als een kaart met een datum en een herinnering.

Recall is geen medisch hulpmiddel.

## Wat het nu al doet

- Kaarten bewaren met foto, wie, waar, wanneer en een herinnering
- Camera met een schuifknop om de tekst tot vier keer groter te maken
- De brief voorlezen met de stem van de telefoon
- De tekst van de brief lezen op het toestel zelf en de datum eruit halen
- Werkt zonder account en zonder internet, alles blijft op de telefoon
- Installeerbaar op het startscherm van een Android-telefoon

## Hoe je het lokaal opstart

Er is geen build stap. Je hebt alleen een webserver nodig, want de camera en de
service worker werken niet vanaf `file://`.

    python -m http.server 8080

Ga daarna naar <http://localhost:8080>.

## Structuur

    index.html                de vier schermen
    css/style.css             styling, niets kleiner dan 22px
    js/app.js                 navigatie en schermen
    js/store.js               opslag in IndexedDB, op het toestel
    js/camera.js              camera en de vergrootglasfunctie
    js/ocr.js                 tekst lezen en de datum eruit halen
    js/speech.js              voorlezen
    sw.js                     offline werken
    db/schema.sql             het Supabase schema, voor stap 5
    docs/analysis.md          de volledige analyse en de vereisten

## Afspraken in dit project

1. **Niets kleiner dan 22px** en elke knop minstens 56px hoog. Onze gebruiker
   kan 7 punten niet lezen, dat is het hele punt van de app.
2. **Alles blijft standaard op het toestel.** Er gaat pas iets naar een server
   als iemand zich aanmeldt en daar uitdrukkelijk voor kiest.
3. **De tekst van een brief wordt op het toestel gelezen**, nooit door een
   externe dienst. Een brief van het ziekenhuis is medische data.
4. **Het rijksregisternummer en rekeningnummers worden weggehaald** voor we tekst
   bewaren. Zie `redact()` in `js/ocr.js`.
5. **Nooit stil bewaren.** Wat we van een brief lezen wordt altijd eerst
   getoond en bevestigd.
6. **Nooit samenvatten.** We lezen voor wat er staat, we herschrijven niets.
7. **Geen framework en geen build stap.** Wat in de repo staat is wat online
   staat.

## Stand van zaken

| Stap | Wat | Status |
| --- | --- | --- |
| 0 | Skelet online, icoon, offline werken | klaar |
| 1 | Kaarten lokaal: maken, tonen, voorlezen, verwijderen | klaar |
| 2 | Camera met vergrootglas en foto nemen | klaar |
| 3 | Tekst lezen en datum herkennen | eerste versie |
| 4 | Herinneringen, vandaag-scherm, afvinken | te doen |
| 5 | Supabase: aanmelden met een e-maillink, synchroniseren | te doen |
| 6 | Toegankelijkheidsronde en testen met een echte gebruiker | te doen |
