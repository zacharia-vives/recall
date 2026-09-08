# Recall - analyse en vereisten

Versie 1, 8 september 2026. Deze tekst is de bron voor wat we bouwen. Als code en
deze tekst niet overeenkomen, is een van de twee fout en praten we erover.

## 1. Scope

De professor bracht het idee terug tot een module: **de kaartenbak, met de camera
erin als de manier waarop er iets in komt.** De rest staat op de roadmap voor de
eindpresentatie.

In een zin: *een kaartenbak voor de gewone dingen die een vergeetachtig persoon
kwijtraakt, gevuld door er een camera op te richten, en voorgelezen.*

Wat we uitdrukkelijk **niet** bouwen: stappen tellen, beloningen, memory walks,
familie die kaarten instuurt, WhatsApp of Instagram, gezichtsherkenning,
medische uitspraken, en aanmelden met itsme.

## 2. Gebruikers

| Rol | Wie | Wat dit betekent voor de UI |
| --- | --- | --- |
| De bewaarder | 70 tot 90 jaar, milde vergeetachtigheid, slechte nabijzicht | Kan 7 punten niet lezen, beeft, houdt geen mappen bij, onthoudt geen wachtwoord |
| De helper | Volwassen kind, meestal een dochter van veertig of vijftig | Installeert het, zet het op, is degene die zou betalen |

## 3. Functionele vereisten

MoSCoW. Must is de demo en schuift niet.

### R1 Kaarten

| ID | Vereiste | Prio |
| --- | --- | --- |
| R1.1 | Kaart maken met foto, naam en soort | Must |
| R1.2 | Precies zes velden: media, wie, waar, wanneer, labels, herinnering | Must |
| R1.3 | Lijst van kaarten, nieuwste eerst, grote kaarten met foto | Must |
| R1.4 | Een kaart openen, alle velden op 22px of groter | Must |
| R1.5 | Kaart voorlezen met een druk op de knop, in het Nederlands | Must |
| R1.6 | Kaart aanpassen en verwijderen | Should |
| R1.7 | Zoeken op naam, personen en labels | Should |
| R1.8 | Een vraag stellen en het antwoord horen | Could |
| R1.9 | Vrije tekst van willekeurige lengte | Won't |

### R2 Camera

| ID | Vereiste | Prio |
| --- | --- | --- |
| R2.1 | Live camera met vergrootglas, 1x tot 4x | Must |
| R2.2 | Foto nemen en bij de kaart bewaren | Must |
| R2.3 | De gelezen tekst voorlezen | Must |
| R2.4 | De datum in de tekst vinden en voorstellen | Must |
| R2.5 | Bewaren in een stap, geen formulier om in te vullen | Must |
| R2.6 | Een bestaande foto kiezen in plaats van de camera | Should |
| R2.7 | Zaklamp en scherpstellen bij tikken | Could |
| R2.8 | Een gezicht herkennen en de persoon benoemen | Won't |

### R3 Herinneringen

| ID | Vereiste | Prio |
| --- | --- | --- |
| R3.1 | Een herinnering hoort bij een kaart, staat nooit alleen | Must |
| R3.2 | Vandaag-scherm: wat komt er, groot, voorgelezen bij tikken | Must |
| R3.3 | Herhalen: elke dag, twee keer per dag, elke week | Should |
| R3.4 | Afvinken, en zien dat het afgevinkt is | Should |
| R3.5 | Melding terwijl de app dicht is | Could |
| R3.6 | Herinneren via sms of telefoon | Won't |

### R4 Account en synchroniseren

| ID | Vereiste | Prio |
| --- | --- | --- |
| R4.1 | Werkt volledig zonder account, data op het toestel | Must |
| R4.2 | Optioneel aanmelden met een e-maillink, geen wachtwoord | Should |
| R4.3 | Wie aangemeld is, ziet enkel zijn eigen kaarten | Should |
| R4.4 | Een kaart definitief verwijderen, foto inbegrepen | Should |
| R4.5 | Alles exporteren als foto's plus een JSON bestand | Could |
| R4.6 | Gedeelde huishoudaccounts | Could |
| R4.7 | itsme of FranceConnect | Won't |

## 4. Niet-functionele vereisten

| ID | Vereiste |
| --- | --- |
| N1 | Nooit tekst kleiner dan 22px, knoppen minstens 56px hoog |
| N2 | Contrast minstens 4.5:1 voor tekst |
| N3 | Alles bereikbaar met het toetsenbord, focus altijd zichtbaar |
| N4 | WCAG 2.2 AA als doel, want de European Accessibility Act geldt hier |
| N5 | Geen tijdslimieten, geen beweging die je niet kan uitzetten |
| N6 | Eerste scherm bruikbaar in minder dan 3 seconden op een oude Android |
| N7 | Werkt offline om te lezen en voor het vandaag-scherm |
| N8 | Installeerbaar op het startscherm met het Recall icoon |
| N9 | Kaarten en foto's zijn privé voor hun eigenaar |
| N10 | Nederlands eerst, Engels daarna, Frans later |

## 5. Gegevensbescherming

Mensen zetten hier geen vakantiefoto's in. Ze zetten er **ziekenhuisbrieven,
bankuittreksels, verzekeringspolissen en identiteitskaarten** in, want dat zijn
precies de papieren die ze niet kunnen lezen en niet durven kwijtraken. Dat maakt
dit een verwerking van bijzondere categorieën persoonsgegevens over een kwetsbaar
persoon.

| Categorie | Voorbeeld | Gevolg |
| --- | --- | --- |
| Gezondheidsgegevens | Brief van cardiologie, medicatieschema | Artikel 9, uitdrukkelijke toestemming nodig |
| Rijksregisternummer | Staat op bijna elke officiële brief | Eigen rechtsgrond nodig, dus wij bewaren het niet |
| Financiële gegevens | Bankuittreksel, pensioenfiche | Geen artikel 9, wel veel schade bij een lek |
| Gegevens van anderen | De dokter, de dochter, een kleinkind | Mensen die nooit iets toestemden |
| Biometrie | Alleen als gezichtsherkenning ooit aan gaat | Artikel 9, daarom niet in v1 |

De huishoudelijke uitzondering van artikel 2(2)(c) dekt de gebruiker, niet ons.
Zodra die documenten in ons Supabase project staan, zijn **wij**
verwerkingsverantwoordelijke.

### Toestemming bij verminderde bekwaamheid

- Een tik op een knop is geen toestemming. Het eerste scherm is kort, in gewoon
  Nederlands, op 22px, en **de app leest het voor**. Een privacyverklaring die je
  niet kan lezen is geen transparantie onder artikel 12.
- Er is een pad voor toestemming samen met de helper. Waar iemand onder
  bescherming staat (vertrouwenspersoon of bewindvoerder), stemt die persoon toe.
- Intrekken moet even makkelijk zijn als geven: één knop, zelfde grootte.
- **Lokaal is de standaard.** Zonder account gaat er niets weg van de telefoon en
  is er dus geen verwerking. Dat is artikel 25 en het is ook onze beste demo.

### P vereisten

| ID | Vereiste | Prio |
| --- | --- | --- |
| P1 | Lokaal als standaard, uploaden alleen na aanmelden en kiezen | Must |
| P2 | Tekst lezen gebeurt op het toestel, nooit bij een externe dienst | Must |
| P3 | Rijksregisternummer en IBAN wegfilteren voor we tekst bewaren | Must |
| P4 | Toestemmingsscherm dat wordt voorgelezen, voor er iets uploadt | Must |
| P5 | Foto's in een privébucket, enkel via korte ondertekende links | Must |
| P6 | Row level security op elke tabel, controle in de database | Must |
| P7 | Geen service key en geen geheimen in de repo, enkel de anon key | Must |
| P8 | Verwijderen is echt weg: rij, herinneringen en foto | Must |
| P9 | Mijn account en alles erin verwijderen vanuit de app | Should |
| P10 | Alles exporteren | Should |
| P11 | Enkel de EU regio, en een verwerkersovereenkomst met Supabase | Should |
| P12 | Zichtbare toegang: als een helper meekijkt, staat dat met naam op het scherm van de bewaarder | Should |
| P13 | Geen analytics, geen trackers, geen externe fonts in de app | Should |
| P14 | Optioneel slot op de app, pincode of vingerafdruk | Could |

### Papierwerk

Een DPIA (artikel 35 geldt hier dubbel: artikel 9 gegevens en kwetsbare personen),
een verwerkingsregister (artikel 30), een privacyverklaring in gewoon Nederlands,
een procedure voor datalekken met de 72 uur naar de Gegevensbeschermingsautoriteit
(artikel 33), en een lijst van subverwerkers: Supabase en GitHub, en dat is alles.

## 6. Veiligheid

De andere helft van "juridische documenten" is niet privacy, het is fout zijn. Als
Recall de verkeerde datum of de verkeerde dosis toont aan iemand die de app meer
vertrouwt dan zijn eigen geheugen, doen we echte schade.

| ID | Vereiste | Prio |
| --- | --- | --- |
| S1 | Nooit stil bewaren, elke datum wordt naast de foto getoond en bevestigd | Must |
| S2 | Voorlezen wat er staat, nooit samenvatten of herschrijven | Must |
| S3 | Geen advies, geen dosislogica, geen interpretatie | Must |
| S4 | "Recall is geen medisch hulpmiddel" op het eerste scherm en bij info | Must |
| S5 | Nooit de enige kopie, de app zegt de papieren brief te bewaren | Should |
| S6 | Geen noodfuncties en niets dat lijkt op toezicht | Must |

## 7. Wat deze stack kan en niet kan

| Mogelijkheid | Kan het? | Hoe of waarom niet |
| --- | --- | --- |
| Camera en vergrootglas | Ja | getUserMedia, https komt van GitHub Pages |
| Voorlezen | Ja | Web Speech API, gratis en offline op de meeste toestellen |
| Tekst lezen op het toestel | Ja | Tesseract.js, Nederlands model ongeveer 15 MB |
| Spraakcommando's | Deels | Chrome en Safari wel, Firefox niet |
| Foto's bewaren | Ja | Supabase Storage 1 GB gratis, lokaal IndexedDB |
| Enkel je eigen data zien | Ja | Row level security in Postgres |
| Aanmelden zonder wachtwoord | Ja | Supabase magic link |
| Melding als de app dicht is | Deels | Web Push, maar iets moet die versturen: een geplande Supabase functie |
| Melding lokaal plannen | Nee | Notification Triggers bestaat niet in browsers |
| Stappen tellen in de achtergrond | Nee | Vereist Health Connect of HealthKit, dus een native app |
| WhatsApp lezen | Nee | Er is geen API voor privéberichten |

## 8. Architectuur

Statische PWA op GitHub Pages, zonder build stap. Supabase voor database,
aanmelden en foto's, rechtstreeks vanuit de browser. Alles wat rekent gebeurt in
de browser of in de database.

Twee regels houden het simpel:

1. De app werkt **zonder account en zonder netwerk**. Dezelfde vier functies in
   `js/store.js` schrijven naar IndexedDB of naar Supabase.
2. **Geen geheimen in de client.** De anon key is publiek bedoeld, alles wat telt
   staat in de policies van de database.

## 9. Bouwvolgorde

| Stap | Wat | Uren |
| --- | --- | --- |
| 0 | Skelet online: repo, Pages, icoon, offline | 4 |
| 1 | Kaarten lokaal, R1.1 tot R1.5 | 10 |
| 2 | Camera, R2.1, R2.2, R2.5. Hierna is de demo compleet | 10 |
| 3 | Tekst en datums, R2.3, R2.4 | 12 |
| 4 | Herinneringen, R3.1 tot R3.4 | 8 |
| 5 | Supabase, R4.2 tot R4.4 | 10 |
| 6 | Toegankelijkheidsronde en testen met een echte gebruiker | 8 |

## 10. Klaar is klaar

- Live op een publieke https url, installeerbaar op Android met het Recall icoon.
- Elke Must is af en in twee minuten te tonen, offline.
- Axe geeft nul fouten, Lighthouse toegankelijkheid 100, elke knop 56px of meer.
- Twee accounts bewijzen dat ze elkaars kaarten niet zien.
- Geen enkel geheim in de repo behalve de publieke anon key.
- De redactietest slaagt: een brief met een rijksregisternummer levert geen
  bewaard rijksregisternummer op.
- Eén echte persoon boven de zeventig heeft het alleen gebruikt, en wat er
  fout ging staat opgeschreven.
