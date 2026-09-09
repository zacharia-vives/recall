// Three languages, because a Belgian letter is Dutch or French and the person
// holding the phone should not have to work in English. Requirements L1 to L6.
//
// The English text also stays in index.html and helper.html, so a page that is
// read before this module runs still says something sensible, and so the markup
// is readable on its own.
//
// One key, three translations, side by side. Anybody adding a string sees
// straight away which language is missing, which is why they sit together
// rather than in three separate files.

const STORE_KEY = "recall.lang";
const FALLBACK = "en";

// What the phone's own voice is asked to speak. Belgian variants, because
// nl-NL and fr-FR sound wrong in Kortrijk.
const SPOKEN = { en: "en-GB", nl: "nl-BE", fr: "fr-BE" };

export const LANGUAGES = [
  { code: "nl", label: "Nederlands" },
  { code: "fr", label: "Français" },
  { code: "en", label: "English" }
];

const WORDS = {
  /* the frame */
  "app.skip":            { en: "Skip to the content", nl: "Ga naar de inhoud", fr: "Aller au contenu" },
  "app.help":            { en: "How it works", nl: "Hoe het werkt", fr: "Comment ça marche" },
  "app.back":            { en: "Back", nl: "Terug", fr: "Retour" },
  "app.close":           { en: "Close", nl: "Sluiten", fr: "Fermer" },
  "app.yes":             { en: "Yes", nl: "Ja", fr: "Oui" },
  "app.cancel":          { en: "Cancel", nl: "Annuleren", fr: "Annuler" },
  "app.keepit":          { en: "No, keep it", nl: "Nee, hou het", fr: "Non, le garder" },
  "app.sure":            { en: "Are you sure?", nl: "Weet u het zeker?", fr: "Vous êtes sûr ?" },
  "tabs.menu":           { en: "Main menu", nl: "Hoofdmenu", fr: "Menu principal" },
  "tabs.today":          { en: "Today", nl: "Vandaag", fr: "Aujourd'hui" },
  "tabs.camera":         { en: "Camera", nl: "Camera", fr: "Caméra" },
  "tabs.records":        { en: "Everything", nl: "Alles", fr: "Tout" },

  /* the language picker */
  "lang.heading":        { en: "Language", nl: "Taal", fr: "Langue" },
  "lang.hint":           { en: "Recall writes and speaks in this language. Pick the one their post is written in.",
                           nl: "Recall schrijft en spreekt in deze taal. Kies de taal waarin de post gelezen wordt.",
                           fr: "Recall écrit et parle dans cette langue. Choisissez celle dans laquelle le courrier est lu." },
  "lang.label":          { en: "Language", nl: "Taal", fr: "Langue" },
  "lang.changed":        { en: "Recall now speaks this language.", nl: "Recall spreekt nu deze taal.", fr: "Recall parle maintenant cette langue." },

  /* the lock, R7.3 and R7.4 */
  "lock.title":          { en: "Recall is locked", nl: "Recall is vergrendeld", fr: "Recall est verrouillé" },
  "lock.say":            { en: "Type your numbers.", nl: "Typ uw cijfers.", fr: "Tapez vos chiffres." },
  "lock.wrong":          { en: "That is not it. Try again.", nl: "Dat is het niet. Probeer opnieuw.", fr: "Ce n'est pas ça. Réessayez." },
  "lock.face":           { en: "Use Face ID", nl: "Gebruik Face ID", fr: "Utiliser Face ID" },
  "lock.again":          { en: "Start again", nl: "Opnieuw", fr: "Recommencer" },
  "lock.rescue":         { en: "Family: unlock this phone", nl: "Familie: deze telefoon ontgrendelen", fr: "Famille : déverrouiller ce téléphone" },
  "lock.rescue.body":    { en: "Make a new phone code in the family app and type it here. It unlocks this phone and takes the numbers off it, so you can set new ones.",
                           nl: "Maak een nieuwe telefooncode in de familie-app en typ die hier. Dat ontgrendelt deze telefoon en haalt de cijfers eraf, zodat u nieuwe kunt instellen.",
                           fr: "Créez un nouveau code dans l'application famille et tapez-le ici. Cela déverrouille ce téléphone et retire les chiffres, pour que vous puissiez en définir de nouveaux." },
  "lock.rescue.label":   { en: "Code from the family app", nl: "Code uit de familie-app", fr: "Code de l'application famille" },
  "lock.rescue.submit":  { en: "Unlock this phone", nl: "Deze telefoon ontgrendelen", fr: "Déverrouiller ce téléphone" },

  /* first run */
  "welcome.title":       { en: "This is Recall", nl: "Dit is Recall", fr: "Voici Recall" },
  "welcome.p1":          { en: "Recall keeps the things you would hate to lose.",
                           nl: "Recall bewaart de dingen die u niet wilt verliezen.",
                           fr: "Recall garde les choses que vous ne voulez pas perdre." },
  "welcome.p2":          { en: "Point the camera at a letter. Recall makes the print bigger and reads it out loud, and then it keeps it for you.",
                           nl: "Richt de camera op een brief. Recall maakt de letters groter, leest ze voor en bewaart de brief voor u.",
                           fr: "Dirigez la caméra vers une lettre. Recall agrandit le texte, le lit à voix haute, puis le garde pour vous." },
  "welcome.p3":          { en: "Everything stays on this phone until someone in your family links it.",
                           nl: "Alles blijft op deze telefoon tot iemand van uw familie hem koppelt.",
                           fr: "Tout reste sur ce téléphone jusqu'à ce qu'un membre de votre famille le relie." },
  "welcome.read":        { en: "Read this out loud", nl: "Lees dit voor", fr: "Lire ceci à voix haute" },
  "welcome.start":       { en: "Start", nl: "Beginnen", fr: "Commencer" },

  /* the line that keeps Recall out of the medical devices regulation, S1 to S6 */
  "safety.notmedical":   { en: "Recall is not a medical device. Keep your papers, and always follow what your doctor or pharmacist tells you.",
                           nl: "Recall is geen medisch hulpmiddel. Houd uw papieren bij en volg altijd wat uw arts of apotheker zegt.",
                           fr: "Recall n'est pas un dispositif médical. Gardez vos papiers et suivez toujours ce que dit votre médecin ou votre pharmacien." },

  /* the wedged store, R8.1 */
  "stuck.title":         { en: "Recall cannot open its store", nl: "Recall kan zijn opslag niet openen", fr: "Recall ne peut pas ouvrir sa mémoire" },
  "stuck.p1":            { en: "Something in this device's own storage is stuck, so Recall cannot read your cards. This is not something you did.",
                           nl: "Er zit iets vast in de opslag van dit toestel, dus Recall kan uw kaarten niet lezen. Dit is niet uw fout.",
                           fr: "Quelque chose est bloqué dans la mémoire de cet appareil, donc Recall ne peut pas lire vos fiches. Ce n'est pas de votre faute." },
  "stuck.p2":            { en: "<b>First try this:</b> close Recall everywhere else, in every tab and window, and press the button below.",
                           nl: "<b>Probeer dit eerst:</b> sluit Recall overal elders, in elk tabblad en elk venster, en druk op de knop hieronder.",
                           fr: "<b>Essayez d'abord ceci :</b> fermez Recall partout ailleurs, dans chaque onglet et chaque fenêtre, puis appuyez sur le bouton ci-dessous." },
  "stuck.p3":            { en: "If that does not help, Recall can start fresh on this device. Cards your family added come straight back. Cards that were only ever kept here cannot be brought back.",
                           nl: "Als dat niet helpt, kan Recall op dit toestel opnieuw beginnen. Kaarten die uw familie toevoegde komen gewoon terug. Kaarten die alleen hier stonden, kunnen niet terugkomen.",
                           fr: "Si cela n'aide pas, Recall peut repartir de zéro sur cet appareil. Les fiches ajoutées par votre famille reviennent aussitôt. Celles qui n'existaient qu'ici ne peuvent pas revenir." },
  "stuck.retry":         { en: "Try again", nl: "Opnieuw proberen", fr: "Réessayer" },
  "stuck.fresh":         { en: "Start fresh on this device", nl: "Op dit toestel opnieuw beginnen", fr: "Repartir de zéro sur cet appareil" },
  "stuck.closeall":      { en: "Close every Recall tab, then close the browser completely and open it again. Your family cards are safe.",
                           nl: "Sluit elk Recall-tabblad, sluit dan de browser helemaal en open hem opnieuw. Uw familiekaarten zijn veilig.",
                           fr: "Fermez chaque onglet Recall, puis fermez complètement le navigateur et rouvrez-le. Les fiches de votre famille sont en sécurité." },
  "stuck.opened":        { en: "It opened. Your cards are here.", nl: "Het is gelukt. Uw kaarten zijn er.", fr: "Cela a fonctionné. Vos fiches sont là." },
  "stuck.freshask":      { en: "Start fresh on this device? Cards that were only ever kept here cannot be brought back.",
                           nl: "Op dit toestel opnieuw beginnen? Kaarten die alleen hier stonden, kunnen niet terugkomen.",
                           fr: "Repartir de zéro sur cet appareil ? Les fiches qui n'existaient qu'ici ne pourront pas revenir." },

  /* consent, P4 and P15 to P19 */
  "consent.title":       { en: "Your family would like to help", nl: "Uw familie wil u helpen", fr: "Votre famille aimerait vous aider" },
  "consent.what":        { en: "<b>What that means.</b> The cards you keep, their photos, what Recall reads off your letters and whether a reminder was done would be kept for your family as well, on a computer in Germany, not only on this phone.",
                           nl: "<b>Wat dat betekent.</b> De kaarten die u bewaart, hun foto's, wat Recall van uw brieven leest en of een herinnering gedaan is, worden dan ook voor uw familie bewaard, op een computer in Duitsland, niet alleen op deze telefoon.",
                           fr: "<b>Ce que cela veut dire.</b> Les fiches que vous gardez, leurs photos, ce que Recall lit sur vos lettres et si un rappel a été fait seraient aussi gardés pour votre famille, sur un ordinateur en Allemagne, et pas seulement sur ce téléphone." },
  "consent.who":         { en: "<b>Who can see them.</b> Only the people your family has let in. You can see their names on your Today screen, and everything they do is written down where you can read it.",
                           nl: "<b>Wie ze kan zien.</b> Alleen de mensen die uw familie heeft toegelaten. U ziet hun namen op uw scherm Vandaag, en alles wat zij doen wordt opgeschreven waar u het kunt lezen.",
                           fr: "<b>Qui peut les voir.</b> Uniquement les personnes que votre famille a laissées entrer. Vous voyez leurs noms sur votre écran Aujourd'hui, et tout ce qu'elles font est noté là où vous pouvez le lire." },
  "consent.special":     { en: "<b>Some of it is private in a special way.</b> Letters from a doctor or a hospital say things about your health, and papers from a lawyer or a bank say things about your money. The law asks for your clear yes before those are shared, and that is what this screen is.",
                           nl: "<b>Sommige dingen zijn op een bijzondere manier privé.</b> Brieven van een dokter of een ziekenhuis zeggen iets over uw gezondheid, en papieren van een advocaat of een bank zeggen iets over uw geld. De wet vraagt uw duidelijke ja voordat die gedeeld worden, en dat is wat dit scherm is.",
                           fr: "<b>Certaines choses sont privées d'une façon particulière.</b> Les lettres d'un médecin ou d'un hôpital parlent de votre santé, et les papiers d'un avocat ou d'une banque parlent de votre argent. La loi demande votre oui clair avant de les partager, et c'est à cela que sert cet écran." },
  "consent.no":          { en: "<b>You can say no.</b> Recall keeps working on this phone on its own. Nothing goes anywhere.",
                           nl: "<b>U mag nee zeggen.</b> Recall blijft op deze telefoon gewoon werken. Er gaat niets weg.",
                           fr: "<b>Vous pouvez dire non.</b> Recall continue de fonctionner seul sur ce téléphone. Rien ne part ailleurs." },
  "consent.stop":        { en: "<b>You can stop later.</b> Ask for the help screen and press stop sharing. What your family already has stays with them until they delete it, and nothing new is shared.",
                           nl: "<b>U kunt later stoppen.</b> Vraag het hulpscherm en druk op stoppen met delen. Wat uw familie al heeft, blijft bij hen tot zij het verwijderen, en er wordt niets nieuws meer gedeeld.",
                           fr: "<b>Vous pouvez arrêter plus tard.</b> Demandez l'écran d'aide et appuyez sur arrêter le partage. Ce que votre famille a déjà reste chez elle jusqu'à ce qu'elle le supprime, et rien de nouveau n'est partagé." },
  "consent.readagain":   { en: "Read this to me again", nl: "Lees dit nog eens voor", fr: "Relisez-moi ceci" },
  "consent.yes":         { en: "Yes, share with my family", nl: "Ja, deel met mijn familie", fr: "Oui, partager avec ma famille" },
  "consent.nothanks":    { en: "No, keep it all on this phone", nl: "Nee, hou alles op deze telefoon", fr: "Non, garder tout sur ce téléphone" },
  "consent.thanks":      { en: "Thank you. Fetching the cards your family made.",
                           nl: "Dank u. Recall haalt de kaarten van uw familie op.",
                           fr: "Merci. Recall va chercher les fiches faites par votre famille." },
  "consent.failed":      { en: "That did not save. Nothing has been shared.",
                           nl: "Dat is niet opgeslagen. Er is niets gedeeld.",
                           fr: "Cela n'a pas été enregistré. Rien n'a été partagé." },
  "consent.declined":    { en: "Nothing is shared. Recall stays on this phone.",
                           nl: "Er wordt niets gedeeld. Recall blijft op deze telefoon.",
                           fr: "Rien n'est partagé. Recall reste sur ce téléphone." },

  /* what Recall knows, P20. Article 15, in a form she can actually use */
  "knows.heading":       { en: "What Recall knows about you", nl: "Wat Recall over u weet", fr: "Ce que Recall sait de vous" },
  "knows.hint":          { en: "Everything Recall keeps about you, counted. Nothing else is collected: not where you are, not when you opened the app, not how long you looked at anything.",
                           nl: "Alles wat Recall over u bewaart, geteld. Er wordt niets anders bijgehouden: niet waar u bent, niet wanneer u de app opende, niet hoe lang u naar iets keek.",
                           fr: "Tout ce que Recall garde sur vous, compté. Rien d'autre n'est collecté : ni où vous êtes, ni quand vous avez ouvert l'application, ni combien de temps vous avez regardé quelque chose." },
  "knows.cards":         { en: "Cards", nl: "Kaarten", fr: "Fiches" },
  "knows.photos":        { en: "Photos", nl: "Foto's", fr: "Photos" },
  "knows.reminders":     { en: "Reminders", nl: "Herinneringen", fr: "Rappels" },
  "knows.readtext":      { en: "Letters Recall has read", nl: "Brieven die Recall gelezen heeft", fr: "Lettres lues par Recall" },
  "knows.whereon":       { en: "Kept on this phone and, since you said yes, for your family in Germany.",
                           nl: "Bewaard op deze telefoon en, sinds u ja zei, voor uw familie in Duitsland.",
                           fr: "Gardé sur ce téléphone et, depuis votre oui, pour votre famille en Allemagne." },
  "knows.whereoff":      { en: "Kept on this phone only. Nothing has been sent anywhere.",
                           nl: "Alleen op deze telefoon bewaard. Er is niets weggestuurd.",
                           fr: "Gardé uniquement sur ce téléphone. Rien n'a été envoyé ailleurs." },
  "knows.export":        { en: "Give me a copy of everything", nl: "Geef mij een kopie van alles", fr: "Donnez-moi une copie de tout" },
  "knows.exported":      { en: "Your copy is saved in your downloads.", nl: "Uw kopie staat in uw downloads.", fr: "Votre copie est dans vos téléchargements." },
  "knows.policy":        { en: "Read the whole privacy notice", nl: "Lees de hele privacyverklaring", fr: "Lire toute la déclaration de confidentialité" },

  /* today */
  "today.title":         { en: "Today", nl: "Vandaag", fr: "Aujourd'hui" },
  "install.text":        { en: "Keep Recall on your home screen, so it is one tap away.",
                           nl: "Zet Recall op uw beginscherm, dan is het één tik weg.",
                           fr: "Gardez Recall sur votre écran d'accueil, à une seule touche." },
  "install.yes":         { en: "Add to my home screen", nl: "Op mijn beginscherm zetten", fr: "Ajouter à mon écran d'accueil" },
  "install.no":          { en: "Not now", nl: "Niet nu", fr: "Pas maintenant" },

  /* everything */
  "records.title":       { en: "Everything you kept", nl: "Alles wat u bewaarde", fr: "Tout ce que vous avez gardé" },
  "records.search":      { en: "Search", nl: "Zoeken", fr: "Rechercher" },
  "records.searchph":    { en: "a name, a place or a word", nl: "een naam, een plaats of een woord", fr: "un nom, un lieu ou un mot" },
  "records.none":        { en: "Nothing kept yet.", nl: "Nog niets bewaard.", fr: "Rien de gardé pour le moment." },
  "records.nohits":      { en: "Nothing found for that.", nl: "Daar is niets voor gevonden.", fr: "Rien trouvé pour cela." },
  "record.title":        { en: "Card", nl: "Kaart", fr: "Fiche" },
  "record.read":         { en: "Read it out loud", nl: "Lees het voor", fr: "Lire à voix haute" },

  /* the camera */
  "capture.title":       { en: "Point at the letter", nl: "Richt op de brief", fr: "Dirigez vers la lettre" },
  "capture.starting":    { en: "Starting the camera. Allow it if your browser asks.",
                           nl: "De camera start. Geef toestemming als de browser het vraagt.",
                           fr: "La caméra démarre. Autorisez-la si le navigateur le demande." },
  "capture.bigger":      { en: "Make it bigger", nl: "Maak het groter", fr: "Agrandir" },
  "capture.read":        { en: "Read it out loud", nl: "Lees het voor", fr: "Lire à voix haute" },
  "capture.shoot":       { en: "Take the photo and keep it", nl: "Neem de foto en bewaar ze", fr: "Prendre la photo et la garder" },
  "capture.pick":        { en: "Choose a photo", nl: "Kies een foto", fr: "Choisir une photo" },

  /* reading a letter */
  "ocr.found":           { en: "What Recall read", nl: "Wat Recall gelezen heeft", fr: "Ce que Recall a lu" },
  "ocr.readagain":       { en: "Read it out loud", nl: "Lees het voor", fr: "Lire à voix haute" },

  /* keeping a card */
  "new.title":           { en: "What are we keeping?", nl: "Wat bewaren we?", fr: "Qu'est-ce qu'on garde ?" },
  "new.shotalt":         { en: "The photo you just took", nl: "De foto die u net nam", fr: "La photo que vous venez de prendre" },
  "new.whatisthis":      { en: "What is this?", nl: "Wat is dit?", fr: "Qu'est-ce que c'est ?" },
  "kind.letter":         { en: "A letter", nl: "Een brief", fr: "Une lettre" },
  "kind.person":         { en: "A person", nl: "Een persoon", fr: "Une personne" },
  "kind.place":          { en: "A place", nl: "Een plaats", fr: "Un lieu" },
  "field.name":          { en: "Name of the card", nl: "Naam van de kaart", fr: "Nom de la fiche" },
  "field.who":           { en: "Who", nl: "Wie", fr: "Qui" },
  "field.whoph":         { en: "Marie, doctor Vermeulen", nl: "Marie, dokter Vermeulen", fr: "Marie, docteur Vermeulen" },
  "field.where":         { en: "Where", nl: "Waar", fr: "Où" },
  "field.whereph":       { en: "AZ Groeninge, Kortrijk", nl: "AZ Groeninge, Kortrijk", fr: "AZ Groeninge, Courtrai" },
  "field.when":          { en: "When", nl: "Wanneer", fr: "Quand" },
  "field.remind":        { en: "Remind me", nl: "Herinner mij", fr: "Me rappeler" },
  "remind.never":        { en: "do not remind me", nl: "herinner mij niet", fr: "ne pas me rappeler" },
  "remind.daybefore":    { en: "the day before", nl: "de dag ervoor", fr: "la veille" },
  "remind.daily":        { en: "every day", nl: "elke dag", fr: "chaque jour" },
  "remind.twice":        { en: "twice a day", nl: "twee keer per dag", fr: "deux fois par jour" },
  "new.submit":          { en: "Keep it", nl: "Bewaar het", fr: "Garder" },
  "new.needname":        { en: "Give the card a name first.", nl: "Geef de kaart eerst een naam.", fr: "Donnez d'abord un nom à la fiche." },
  "new.kept":            { en: "Kept.", nl: "Bewaard.", fr: "C'est gardé." },

  /* the help screen */
  "help.title":          { en: "How does Recall work?", nl: "Hoe werkt Recall?", fr: "Comment fonctionne Recall ?" },
  "help.step1":          { en: "Press <b>Camera</b> and point it at a letter or a photo.",
                           nl: "Druk op <b>Camera</b> en richt op een brief of een foto.",
                           fr: "Appuyez sur <b>Caméra</b> et dirigez-la vers une lettre ou une photo." },
  "help.step2":          { en: "Recall makes the letters bigger and reads them out loud.",
                           nl: "Recall maakt de letters groter en leest ze voor.",
                           fr: "Recall agrandit le texte et le lit à voix haute." },
  "help.step3":          { en: "Press <b>Keep it</b>. Recall keeps the date and puts it on your Today screen on the day.",
                           nl: "Druk op <b>Bewaar het</b>. Recall houdt de datum bij en zet de kaart op de dag zelf op uw scherm Vandaag.",
                           fr: "Appuyez sur <b>Garder</b>. Recall retient la date et met la fiche sur votre écran Aujourd'hui le jour même." },
  "help.family":         { en: "For family", nl: "Voor de familie", fr: "Pour la famille" },
  "help.familyp":        { en: "Family can add cards and set reminders at", nl: "Familie kan kaarten toevoegen en herinneringen zetten op", fr: "La famille peut ajouter des fiches et régler des rappels sur" },
  "help.familylink":     { en: "Recall for family", nl: "Recall voor de familie", fr: "Recall pour la famille" },
  "help.refresh":        { en: "Check for new family cards", nl: "Kijk of er nieuwe familiekaarten zijn", fr: "Vérifier s'il y a de nouvelles fiches" },
  "help.linkp":          { en: "Linking this phone? Type the six letter code from the family app.",
                           nl: "Deze telefoon koppelen? Typ de code van zes letters uit de familie-app.",
                           fr: "Relier ce téléphone ? Tapez le code de six lettres de l'application famille." },
  "help.code":           { en: "Code", nl: "Code", fr: "Code" },
  "help.linkbtn":        { en: "Link this phone", nl: "Deze telefoon koppelen", fr: "Relier ce téléphone" },

  /* the voice, N13 to N15 */
  "voice.heading":       { en: "The voice", nl: "De stem", fr: "La voix" },
  "voice.hint":          { en: "Phones come with several. Try them and leave the one that suits best: it is the voice heard every day. Only voices that speak on the phone itself are offered, so a letter is never sent away to be read.",
                           nl: "Telefoons hebben er meerdere. Probeer ze en laat de stem staan die het beste bevalt: het is de stem die elke dag te horen is. Alleen stemmen die op de telefoon zelf spreken worden aangeboden, zodat een brief nooit wordt weggestuurd om gelezen te worden.",
                           fr: "Les téléphones en ont plusieurs. Essayez-les et laissez celle qui convient le mieux : c'est la voix entendue chaque jour. Seules les voix qui parlent sur le téléphone même sont proposées, ainsi une lettre n'est jamais envoyée ailleurs pour être lue." },
  "voice.label":         { en: "Voice", nl: "Stem", fr: "Voix" },
  "voice.try":           { en: "Try this voice", nl: "Probeer deze stem", fr: "Essayer cette voix" },
  "voice.saved":         { en: "Saved. Press try to hear it.", nl: "Bewaard. Druk op proberen om ze te horen.", fr: "Enregistré. Appuyez sur essayer pour l'entendre." },
  "voice.only":          { en: "Nothing to choose here, so Recall uses the voice the phone has.",
                           nl: "Hier is niets te kiezen, dus Recall gebruikt de stem van de telefoon.",
                           fr: "Rien à choisir ici, donc Recall utilise la voix du téléphone." },
  "voice.missing":       { en: "This device has no voice for this language, so text is read with a foreign accent. On Android: Settings, Text to speech. On Windows: Settings, Time and language, Speech.",
                           nl: "Dit toestel heeft geen stem voor deze taal, dus tekst wordt met een vreemd accent gelezen. Op Android: Instellingen, Tekst naar spraak. Op Windows: Instellingen, Tijd en taal, Spraak.",
                           fr: "Cet appareil n'a pas de voix pour cette langue, donc le texte est lu avec un accent étranger. Sur Android : Paramètres, Synthèse vocale. Sur Windows : Paramètres, Heure et langue, Voix." },
  "voice.sample":        { en: "Good afternoon. Your appointment with the cardiologist is tomorrow at ten o'clock.",
                           nl: "Goedemiddag. Uw afspraak bij de cardioloog is morgen om tien uur.",
                           fr: "Bonjour. Votre rendez-vous chez le cardiologue est demain à dix heures." },

  /* sharing, and stopping */
  "share.heading":       { en: "Sharing with your family", nl: "Delen met uw familie", fr: "Partage avec votre famille" },
  "share.on":            { en: "Your cards are shared with your family. They can add cards and set reminders, and you can see everything they do.",
                           nl: "Uw kaarten worden gedeeld met uw familie. Zij kunnen kaarten toevoegen en herinneringen zetten, en u ziet alles wat zij doen.",
                           fr: "Vos fiches sont partagées avec votre famille. Elle peut ajouter des fiches et régler des rappels, et vous voyez tout ce qu'elle fait." },
  "share.stop":          { en: "Stop sharing with my family", nl: "Stop met delen met mijn familie", fr: "Arrêter le partage avec ma famille" },
  "share.stopask":       { en: "Stop sharing new cards with your family? What they already have stays with them until they delete it.",
                           nl: "Stoppen met nieuwe kaarten delen met uw familie? Wat zij al hebben, blijft bij hen tot zij het verwijderen.",
                           fr: "Arrêter de partager de nouvelles fiches avec votre famille ? Ce qu'elle a déjà reste chez elle jusqu'à ce qu'elle le supprime." },
  "share.stopyes":       { en: "Yes, stop sharing", nl: "Ja, stop met delen", fr: "Oui, arrêter le partage" },
  "share.stopping":      { en: "Stopping.", nl: "Bezig met stoppen.", fr: "Arrêt en cours." },
  "share.stopped":       { en: "Stopped. Nothing new is shared. Your cards stay on this phone.",
                           nl: "Gestopt. Er wordt niets nieuws gedeeld. Uw kaarten blijven op deze telefoon.",
                           fr: "Arrêté. Rien de nouveau n'est partagé. Vos fiches restent sur ce téléphone." },

  /* the phone code */
  "code.heading":        { en: "A code to unlock this phone", nl: "Een code om deze telefoon te ontgrendelen", fr: "Un code pour déverrouiller ce téléphone" },
  "code.hint":           { en: "Only if it is wanted. The person has to be able to use this device alone, so nothing here is compulsory, and the code never locks anybody out for good: you can always unlock the device with a fresh code from the family app.",
                           nl: "Alleen als het gewenst is. De persoon moet dit toestel alleen kunnen gebruiken, dus niets hiervan is verplicht, en de code sluit niemand definitief buiten: u kunt het toestel altijd ontgrendelen met een nieuwe code uit de familie-app.",
                           fr: "Seulement si vous le souhaitez. La personne doit pouvoir utiliser cet appareil seule, donc rien ici n'est obligatoire, et le code n'enferme jamais personne dehors : vous pouvez toujours déverrouiller l'appareil avec un nouveau code de l'application famille." },
  "code.label1":         { en: "Numbers, four or six", nl: "Cijfers, vier of zes", fr: "Chiffres, quatre ou six" },
  "code.label2":         { en: "Type them again", nl: "Typ ze nog eens", fr: "Tapez-les à nouveau" },
  "code.submit":         { en: "Use this code", nl: "Gebruik deze code", fr: "Utiliser ce code" },
  "code.faceon":         { en: "Also allow Face ID", nl: "Face ID ook toestaan", fr: "Autoriser aussi Face ID" },
  "code.faceoff":        { en: "Turn Face ID off", nl: "Face ID uitzetten", fr: "Désactiver Face ID" },
  "code.locknow":        { en: "Lock the phone now", nl: "Vergrendel de telefoon nu", fr: "Verrouiller le téléphone maintenant" },
  "code.lockoff":        { en: "Take the code off", nl: "Haal de code eraf", fr: "Retirer le code" },

  /* linking */

  /* ---------------- the family app ---------------- */
  "h.brand":             { en: "for family", nl: "voor de familie", fr: "pour la famille" },
  "h.signout":           { en: "Sign out", nl: "Afmelden", fr: "Se déconnecter" },
  "h.unconfigured":      { en: "Not connected yet", nl: "Nog niet verbonden", fr: "Pas encore connecté" },
  "h.signin":            { en: "Sign in", nl: "Aanmelden", fr: "Connexion" },
  "h.signinp":           { en: "We send a link to your email. No password to remember, and nothing to install.",
                           nl: "Wij sturen een link naar uw e-mail. Geen wachtwoord om te onthouden en niets te installeren.",
                           fr: "Nous envoyons un lien à votre adresse e-mail. Aucun mot de passe à retenir, rien à installer." },
  "h.email":             { en: "Your email", nl: "Uw e-mailadres", fr: "Votre adresse e-mail" },
  "h.sendlink":          { en: "Send me the link", nl: "Stuur mij de link", fr: "Envoyez-moi le lien" },
  "h.whose":             { en: "Whose cards?", nl: "Wiens kaarten?", fr: "Les fiches de qui ?" },
  "h.newhh":             { en: "Set up a new household", nl: "Een nieuw huishouden opzetten", fr: "Créer un nouveau foyer" },
  "h.hhname":            { en: "Name it after the person", nl: "Noem het naar de persoon", fr: "Nommez-le d'après la personne" },
  "h.hhnameph":          { en: "At my mother, Godelieve", nl: "Bij mijn moeder, Godelieve", fr: "Chez ma mère, Godelieve" },
  "h.myname":            { en: "Your own name, so they can see who helps", nl: "Uw eigen naam, zodat de persoon ziet wie helpt", fr: "Votre nom, pour que la personne voie qui aide" },
  "h.create":            { en: "Create it", nl: "Maak het aan", fr: "Créer" },
  "h.tabs":              { en: "Sections", nl: "Onderdelen", fr: "Sections" },
  "h.follow":            { en: "Follow up", nl: "Opvolging", fr: "Suivi" },
  "h.cards":             { en: "Cards", nl: "Kaarten", fr: "Fiches" },
  "h.house":             { en: "Household", nl: "Huishouden", fr: "Foyer" },
  "h.coming":            { en: "What is coming", nl: "Wat er aankomt", fr: "Ce qui arrive" },
  "h.missed":            { en: "Missed", nl: "Gemist", fr: "Manqué" },
  "h.donelist":          { en: "Done", nl: "Gedaan", fr: "Fait" },
  "h.addcard":           { en: "Add a card", nl: "Kaart toevoegen", fr: "Ajouter une fiche" },
  "h.whatisit":          { en: "What is it", nl: "Wat is het", fr: "Qu'est-ce que c'est" },
  "h.cardname":          { en: "Name of the card", nl: "Naam van de kaart", fr: "Nom de la fiche" },
  "h.cardnameph":        { en: "Cardiology, check-up", nl: "Cardiologie, controle", fr: "Cardiologie, contrôle" },
  "h.whoph":             { en: "doctor Vermeulen, Marie", nl: "dokter Vermeulen, Marie", fr: "docteur Vermeulen, Marie" },
  "h.photo":             { en: "Photo, optional", nl: "Foto, niet verplicht", fr: "Photo, facultative" },
  "h.spoken":            { en: "What Recall should say out loud", nl: "Wat Recall moet voorlezen", fr: "Ce que Recall doit dire à voix haute" },
  "h.spokenph":          { en: "Your appointment with the cardiologist is tomorrow at ten.",
                           nl: "Uw afspraak bij de cardioloog is morgen om tien uur.",
                           fr: "Votre rendez-vous chez le cardiologue est demain à dix heures." },
  "h.remindher":         { en: "Send a reminder", nl: "Herinnering sturen", fr: "Envoyer un rappel" },
  "h.rep.none":          { en: "no reminder", nl: "geen herinnering", fr: "pas de rappel" },
  "h.rep.once":          { en: "once, the day before", nl: "een keer, de dag ervoor", fr: "une fois, la veille" },
  "h.rep.daily":         { en: "every day", nl: "elke dag", fr: "chaque jour" },
  "h.rep.twice":         { en: "twice a day", nl: "twee keer per dag", fr: "deux fois par jour" },
  "h.rep.weekly":        { en: "every week", nl: "elke week", fr: "chaque semaine" },
  "h.remindat":          { en: "Reminder time", nl: "Tijd van de herinnering", fr: "Heure du rappel" },
  "h.remindhint":        { en: "A reminder waits on the Today screen and is read out loud when Recall is opened. Recall cannot make a closed phone ring, so for something that really matters, call as well.",
                           nl: "Een herinnering wacht op het scherm Vandaag en wordt voorgelezen zodra Recall geopend wordt. Recall kan een gesloten telefoon niet laten rinkelen, dus bel ook even voor iets dat echt belangrijk is.",
                           fr: "Un rappel attend sur l'écran Aujourd'hui et est lu à voix haute à l'ouverture de Recall. Recall ne peut pas faire sonner un téléphone fermé, donc pour quelque chose de vraiment important, appelez aussi." },
  "h.savecard":          { en: "Save the card", nl: "Kaart opslaan", fr: "Enregistrer la fiche" },
  "h.bin":               { en: "The bin", nl: "De prullenbak", fr: "La corbeille" },
  "h.binhint":           { en: "Cards stay here for thirty days before they are gone for good.",
                           nl: "Kaarten blijven hier dertig dagen voordat ze definitief weg zijn.",
                           fr: "Les fiches restent ici trente jours avant de disparaître définitivement." },
  "h.access":            { en: "Who has access", nl: "Wie toegang heeft", fr: "Qui a accès" },
  "h.phones":            { en: "Their devices", nl: "De toestellen", fr: "Les appareils" },
  "h.setupphone":        { en: "Set up a device", nl: "Een toestel instellen", fr: "Configurer un appareil" },
  "h.step1":             { en: "1. What happens", nl: "1. Wat er gebeurt", fr: "1. Ce qui se passe" },
  "h.step2":             { en: "2. Show the square", nl: "2. Toon het vierkant", fr: "2. Montrez le carré" },
  "h.step3":             { en: "3. Finish", nl: "3. Afronden", fr: "3. Terminer" },
  "h.w1":                { en: "The cards live in the household, not on the device, so a new device has everything the moment it is linked. Nothing is copied and nothing is lost. The old device keeps working until you remove it here, which is the last step.",
                           nl: "De kaarten staan in het huishouden, niet op het toestel, dus een nieuw toestel heeft alles zodra het gekoppeld is. Er wordt niets gekopieerd en er gaat niets verloren. Het oude toestel blijft werken tot u het hier verwijdert, en dat is de laatste stap.",
                           fr: "Les fiches vivent dans le foyer, pas sur l'appareil, donc un nouvel appareil a tout dès qu'il est relié. Rien n'est copié et rien n'est perdu. L'ancien appareil continue de fonctionner jusqu'à ce que vous le retiriez ici, ce qui est la dernière étape." },
  "h.phonename":         { en: "What to call this device", nl: "Hoe dit toestel heet", fr: "Comment appeler cet appareil" },
  "h.phonenameph":       { en: "Godelieve, new phone", nl: "Godelieve, nieuwe telefoon", fr: "Godelieve, nouveau téléphone" },
  "h.makecode":          { en: "Make the code", nl: "Maak de code", fr: "Créer le code" },
  "h.w2":                { en: "On their device, open the camera and point it at this square. It opens Recall and links the device. If the camera will not cooperate, the six letters can be typed instead. Both are good for fifteen minutes.",
                           nl: "Open op het toestel de camera en richt op dit vierkant. Dat opent Recall en koppelt het toestel. Als de camera niet meewerkt, kunnen ook de zes letters getypt worden. Beide blijven vijftien minuten geldig.",
                           fr: "Sur l'appareil, ouvrez la caméra et dirigez-la vers ce carré. Cela ouvre Recall et relie l'appareil. Si la caméra ne coopère pas, les six lettres peuvent être tapées à la place. Les deux sont valables quinze minutes." },
  "h.waiting":           { en: "Waiting for the device.", nl: "Wachten op het toestel.", fr: "En attente de l'appareil." },
  "h.newcode":           { en: "Make a new code", nl: "Maak een nieuwe code", fr: "Créer un nouveau code" },
  "h.stopwaiting":       { en: "Stop waiting", nl: "Stop met wachten", fr: "Arrêter d'attendre" },
  "h.linked":            { en: "That phone is linked.", nl: "Die telefoon is gekoppeld.", fr: "Ce téléphone est relié." },
  "h.replacehint":       { en: "If this replaces an older phone, remove the old one here. It loses access the moment you do.",
                           nl: "Als dit een oudere telefoon vervangt, verwijder de oude hier. Die verliest toegang op het moment dat u dat doet.",
                           fr: "Si celui-ci remplace un ancien téléphone, retirez l'ancien ici. Il perd l'accès dès ce moment." },
  "h.finished":          { en: "Finished", nl: "Klaar", fr: "Terminé" },
  "h.invite":            { en: "Invite another helper", nl: "Nog een helper uitnodigen", fr: "Inviter une autre personne" },
  "h.theiremail":        { en: "Their email", nl: "Hun e-mailadres", fr: "Son adresse e-mail" },
  "h.makeinvite":        { en: "Create an invitation", nl: "Maak een uitnodiging", fr: "Créer une invitation" },
  "h.whathappened":      { en: "What has happened", nl: "Wat er gebeurd is", fr: "Ce qui s'est passé" },
  "h.logthepoint":       { en: "They can read this list too. That is the point of it.",
                           nl: "De persoon kan deze lijst ook lezen. Dat is juist de bedoeling.",
                           fr: "La personne peut aussi lire cette liste. C'est justement le but." },
  "h.backtokeeper":      { en: "Back to the Recall app", nl: "Terug naar de Recall-app", fr: "Retour à l'application Recall" },
  "h.privacy":           { en: "Privacy and what we keep", nl: "Privacy en wat wij bewaren", fr: "Confidentialité et ce que nous gardons" },

  /* ---------------- what the app says while it runs ---------------- */
  "run.today.empty":     { en: "Point the camera at a letter to add something.",
                           nl: "Richt de camera op een brief om iets toe te voegen.",
                           fr: "Dirigez la caméra vers une lettre pour ajouter quelque chose." },
  "run.reminder":        { en: "Reminder", nl: "Herinnering", fr: "Rappel" },
  "run.lastdone":        { en: "Last done", nl: "Laatst gedaan", fr: "Fait la dernière fois" },
  "run.photoalt":        { en: "Photo on this card", nl: "Foto op deze kaart", fr: "Photo sur cette fiche" },
  "run.nospeech":        { en: "This browser cannot read out loud.",
                           nl: "Deze browser kan niet voorlezen.",
                           fr: "Ce navigateur ne peut pas lire à voix haute." },
  "run.deleteask":       { en: "This card and its photo will be deleted. Are you sure?",
                           nl: "Deze kaart en de foto worden verwijderd. Weet u het zeker?",
                           fr: "Cette fiche et sa photo seront supprimées. Vous êtes sûr ?" },
  "run.deleteyes":       { en: "Yes, delete it", nl: "Ja, verwijderen", fr: "Oui, supprimer" },
  "run.deleted":         { en: "The card is deleted.", nl: "De kaart is verwijderd.", fr: "La fiche est supprimée." },
  "run.markeddone":      { en: "Marked done.", nl: "Als gedaan aangevinkt.", fr: "Marqué comme fait." },
  "run.cameranotready":  { en: "The camera is not ready yet.", nl: "De camera is nog niet klaar.", fr: "La caméra n'est pas encore prête." },

  "run.welcomespoken":   { en: "This is Recall. Recall keeps the things you would hate to lose. Point the camera at a letter. Recall makes the print bigger and reads it out loud, and then it keeps it for you.",
                           nl: "Dit is Recall. Recall bewaart de dingen die u niet wilt verliezen. Richt de camera op een brief. Recall maakt de letters groter, leest ze voor en bewaart de brief voor u.",
                           fr: "Voici Recall. Recall garde les choses que vous ne voulez pas perdre. Dirigez la caméra vers une lettre. Recall agrandit le texte, le lit à voix haute, puis le garde pour vous." },

  /* the notice, spoken. The same words as the screen, in the order they are
     read. Whenever either changes, the notice version changes with it. */
  "run.consentspoken":   { en: "Your family would like to help. That means the cards you keep, their photos, what Recall reads off your letters and whether a reminder was done would be kept for your family as well, on a computer in Germany, not only on this phone. Only the people your family has let in can see them, you can see their names, and everything they do is written down where you can read it. Letters from a doctor say things about your health, and papers from a lawyer or a bank say things about your money. The law asks for your clear yes before those are shared, and that is what this is. You can say no, and Recall keeps working on this phone on its own. You can stop later, in the help screen, and nothing new is shared after that. Recall is not a medical device. Keep your papers, and always follow what your doctor or pharmacist tells you.",
                           nl: "Uw familie wil u helpen. Dat betekent dat de kaarten die u bewaart, hun foto's, wat Recall van uw brieven leest en of een herinnering gedaan is, ook voor uw familie bewaard worden, op een computer in Duitsland, niet alleen op deze telefoon. Alleen de mensen die uw familie heeft toegelaten kunnen ze zien, u ziet hun namen, en alles wat zij doen wordt opgeschreven waar u het kunt lezen. Brieven van een dokter zeggen iets over uw gezondheid, en papieren van een advocaat of een bank zeggen iets over uw geld. De wet vraagt uw duidelijke ja voordat die gedeeld worden, en dat is wat dit is. U mag nee zeggen, en Recall blijft op deze telefoon gewoon werken. U kunt later stoppen, in het hulpscherm, en daarna wordt er niets nieuws gedeeld. Recall is geen medisch hulpmiddel. Houd uw papieren bij en volg altijd wat uw arts of apotheker zegt.",
                           fr: "Votre famille aimerait vous aider. Cela veut dire que les fiches que vous gardez, leurs photos, ce que Recall lit sur vos lettres et si un rappel a été fait seraient aussi gardés pour votre famille, sur un ordinateur en Allemagne, et pas seulement sur ce téléphone. Seules les personnes que votre famille a laissées entrer peuvent les voir, vous voyez leurs noms, et tout ce qu'elles font est noté là où vous pouvez le lire. Les lettres d'un médecin parlent de votre santé, et les papiers d'un avocat ou d'une banque parlent de votre argent. La loi demande votre oui clair avant de les partager, et c'est à cela que sert ceci. Vous pouvez dire non, et Recall continue de fonctionner seul sur ce téléphone. Vous pouvez arrêter plus tard, dans l'écran d'aide, et rien de nouveau n'est partagé ensuite. Recall n'est pas un dispositif médical. Gardez vos papiers et suivez toujours ce que dit votre médecin ou votre pharmacien." },

  /* the lock */
  "run.notlinked":       { en: "This phone is not linked to a family, so there is no code to check.",
                           nl: "Deze telefoon is niet aan een familie gekoppeld, dus er is geen code om na te kijken.",
                           fr: "Ce téléphone n'est relié à aucune famille, donc il n'y a pas de code à vérifier." },
  "run.unlocked":        { en: "The phone is unlocked and the code is off. Set a new one in the help screen.",
                           nl: "De telefoon is ontgrendeld en de code staat af. Stel een nieuwe in in het hulpscherm.",
                           fr: "Le téléphone est déverrouillé et le code est retiré. Définissez-en un nouveau dans l'écran d'aide." },
  "run.badlockcode":     { en: "That code did not work.", nl: "Die code werkte niet.", fr: "Ce code n'a pas fonctionné." },
  "run.lockasks":        { en: "This phone asks for {n} numbers when Recall is opened.",
                           nl: "Deze telefoon vraagt {n} cijfers als Recall geopend wordt.",
                           fr: "Ce téléphone demande {n} chiffres à l'ouverture de Recall." },
  "run.lockasksface":    { en: "This phone asks for {n} numbers, or Face ID, when Recall is opened.",
                           nl: "Deze telefoon vraagt {n} cijfers, of Face ID, als Recall geopend wordt.",
                           fr: "Ce téléphone demande {n} chiffres, ou Face ID, à l'ouverture de Recall." },
  "run.locknothing":     { en: "This phone asks for nothing. Recall opens straight away.",
                           nl: "Deze telefoon vraagt niets. Recall gaat direct open.",
                           fr: "Ce téléphone ne demande rien. Recall s'ouvre directement." },
  "run.codeshort":       { en: "Four or six numbers.", nl: "Vier of zes cijfers.", fr: "Quatre ou six chiffres." },
  "run.codenomatch":     { en: "The two do not match.", nl: "De twee zijn niet gelijk.", fr: "Les deux ne correspondent pas." },
  "run.codeset":         { en: "Done. Recall will ask for those numbers next time it opens.",
                           nl: "Klaar. Recall vraagt die cijfers de volgende keer bij het openen.",
                           fr: "C'est fait. Recall demandera ces chiffres à la prochaine ouverture." },
  "run.codeoff":         { en: "The code is off.", nl: "De code staat af.", fr: "Le code est retiré." },
  "run.facelook":        { en: "Ask them to look at the device.", nl: "Vraag om naar het toestel te kijken.", fr: "Demandez de regarder l'appareil." },
  "run.faceon":          { en: "Face ID works on this phone now. The numbers still work too.",
                           nl: "Face ID werkt nu op deze telefoon. De cijfers werken nog altijd ook.",
                           fr: "Face ID fonctionne maintenant sur ce téléphone. Les chiffres fonctionnent toujours aussi." },
  "run.faceoff":         { en: "Face ID is off. The numbers still work.",
                           nl: "Face ID staat af. De cijfers werken nog.",
                           fr: "Face ID est désactivé. Les chiffres fonctionnent encore." },
  "run.facefailed":      { en: "That did not work. Type your numbers instead.",
                           nl: "Dat werkte niet. Typ uw cijfers.",
                           fr: "Cela n'a pas fonctionné. Tapez vos chiffres." },

  /* linking and syncing */
  "run.onemoment":       { en: "One moment.", nl: "Een ogenblik.", fr: "Un instant." },
  "run.checkingcode":    { en: "Checking the code.", nl: "De code wordt nagekeken.", fr: "Vérification du code." },
  "run.linkedfetch":     { en: "This phone is linked. Fetching the family cards.",
                           nl: "Deze telefoon is gekoppeld. De familiekaarten worden opgehaald.",
                           fr: "Ce téléphone est relié. Récupération des fiches de la famille." },
  "run.linkedok":        { en: "This phone is linked. Family can add cards now.",
                           nl: "Deze telefoon is gekoppeld. De familie kan nu kaarten toevoegen.",
                           fr: "Ce téléphone est relié. La famille peut maintenant ajouter des fiches." },
  "run.linkedfamily":    { en: "This phone is linked to the family.", nl: "Deze telefoon is aan de familie gekoppeld.", fr: "Ce téléphone est relié à la famille." },
  "run.linkfailed":      { en: "That link did not work.", nl: "Die koppeling werkte niet.", fr: "Ce lien n'a pas fonctionné." },
  "run.unreachable":     { en: "Could not reach the family cards.", nl: "De familiekaarten konden niet bereikt worden.", fr: "Impossible d'atteindre les fiches de la famille." },
  "run.syncproblem":     { en: "Something did not sync.", nl: "Iets is niet gesynchroniseerd.", fr: "Quelque chose ne s'est pas synchronisé." },
  "run.syncnew":         { en: "Up to date, new cards arrived.", nl: "Bijgewerkt, er zijn nieuwe kaarten.", fr: "À jour, de nouvelles fiches sont arrivées." },
  "run.syncsame":        { en: "Up to date, nothing new.", nl: "Bijgewerkt, niets nieuws.", fr: "À jour, rien de nouveau." },
  "run.looking":         { en: "Looking for new cards.", nl: "Er wordt naar nieuwe kaarten gekeken.", fr: "Recherche de nouvelles fiches." },
  "run.storefailed":     { en: "The store on this device did not open.", nl: "De opslag op dit toestel ging niet open.", fr: "La mémoire de cet appareil ne s'est pas ouverte." },
  "run.clearing":        { en: "Clearing the store on this device.", nl: "De opslag op dit toestel wordt gewist.", fr: "Effacement de la mémoire de cet appareil." },
  "run.installed":       { en: "Recall is on your home screen.", nl: "Recall staat op uw beginscherm.", fr: "Recall est sur votre écran d'accueil." },
  "run.iphonehint":      { en: "Keep Recall on the home screen.", nl: "Zet Recall op het beginscherm.", fr: "Gardez Recall sur l'écran d'accueil." },

  /* reading, live and from a photo */
  "run.livereading":     { en: "Recall is reading what you see. The first time takes a moment.",
                           nl: "Recall leest wat u ziet. De eerste keer duurt even.",
                           fr: "Recall lit ce que vous voyez. La première fois prend un instant." },
  "run.livepercent":     { en: "Recall is reading what you see. {n} per cent.",
                           nl: "Recall leest wat u ziet. {n} procent.",
                           fr: "Recall lit ce que vous voyez. {n} pour cent." },
  "run.nowords":         { en: "No words found. Hold the phone still, a little further away.",
                           nl: "Geen woorden gevonden. Houd de telefoon stil, een beetje verder weg.",
                           fr: "Aucun mot trouvé. Tenez le téléphone immobile, un peu plus loin." },
  "run.readingaloud":    { en: "Reading it out loud. Press again to stop.",
                           nl: "Recall leest het voor. Druk opnieuw om te stoppen.",
                           fr: "Recall le lit à voix haute. Appuyez à nouveau pour arrêter." },
  "run.livefailed":      { en: "Recall could not read this. Try the photo instead.",
                           nl: "Recall kon dit niet lezen. Probeer de foto.",
                           fr: "Recall n'a pas pu lire ceci. Essayez la photo." },
  "run.letterreading":   { en: "Recall is reading the letter. The first time takes a moment.",
                           nl: "Recall leest de brief. De eerste keer duurt even.",
                           fr: "Recall lit la lettre. La première fois prend un instant." },
  "run.letterpercent":   { en: "Recall is reading the letter. {n} per cent.",
                           nl: "Recall leest de brief. {n} procent.",
                           fr: "Recall lit la lettre. {n} pour cent." },
  "run.datefound":       { en: "Recall read: {date}. Is that right?", nl: "Recall las: {date}. Is dat juist?", fr: "Recall a lu : {date}. Est-ce correct ?" },
  "run.nodate":          { en: "Recall found no date. Fill one in yourself if you need it.",
                           nl: "Recall vond geen datum. Vul er zelf een in als u die nodig hebt.",
                           fr: "Recall n'a trouvé aucune date. Indiquez-en une vous-même si besoin." },
  "run.letterfailed":    { en: "Recall could not read the text. You can still keep the card.",
                           nl: "Recall kon de tekst niet lezen. U kunt de kaart toch bewaren.",
                           fr: "Recall n'a pas pu lire le texte. Vous pouvez garder la fiche quand même." },

  /* the family app while it runs */
  "hrun.checkemail":     { en: "Check your email. The link brings you straight back here.",
                           nl: "Kijk in uw e-mail. De link brengt u meteen hier terug.",
                           fr: "Regardez votre e-mail. Le lien vous ramène directement ici." },
  "hrun.creating":       { en: "Creating...", nl: "Bezig...", fr: "Création..." },
  "hrun.hhready":        { en: "The household is ready.", nl: "Het huishouden is klaar.", fr: "Le foyer est prêt." },
  "hrun.nothingdue":     { en: "Nothing is due.", nl: "Er staat niets te gebeuren.", fr: "Rien de prévu." },
  "hrun.nothingmissed":  { en: "Nothing was missed.", nl: "Er is niets gemist.", fr: "Rien n'a été manqué." },
  "hrun.nothingdone":    { en: "Nothing marked done yet.", nl: "Nog niets als gedaan aangevinkt.", fr: "Rien encore marqué comme fait." },
  "hrun.needsname":      { en: "The card needs a name.", nl: "De kaart heeft een naam nodig.", fr: "La fiche a besoin d'un nom." },
  "hrun.updated":        { en: "The card is updated.", nl: "De kaart is bijgewerkt.", fr: "La fiche est mise à jour." },
  "hrun.added":          { en: "The card is added.", nl: "De kaart is toegevoegd.", fr: "La fiche est ajoutée." },
  "hrun.expired":        { en: "The code has expired. Make a new one.", nl: "De code is verlopen. Maak een nieuwe.", fr: "Le code a expiré. Créez-en un nouveau." },
  "hrun.phonelinked":    { en: "{name} is linked and has every card.", nl: "{name} is gekoppeld en heeft alle kaarten.", fr: "{name} est relié et a toutes les fiches." },
  "hrun.qrfailed":       { en: "The square did not load. The six letters can be typed instead.",
                           nl: "Het vierkant is niet geladen. De zes letters kunnen getypt worden.",
                           fr: "Le carré ne s'est pas affiché. Les six lettres peuvent être tapées." },
  "hrun.invitelink":     { en: "Send them this link:", nl: "Stuur hen deze link:", fr: "Envoyez-lui ce lien :" },
  "hrun.notwaiting":     { en: "Not waiting any more. The code still works for fifteen minutes.",
                           nl: "Er wordt niet meer gewacht. De code werkt nog vijftien minuten.",
                           fr: "On n'attend plus. Le code fonctionne encore quinze minutes." },
  "hrun.phoneset":       { en: "The device is set up.", nl: "Het toestel is ingesteld.", fr: "L'appareil est configuré." },
  "hrun.binask":         { en: "Move {title} to the bin? It stays there for thirty days.",
                           nl: "{title} naar de prullenbak? Het blijft daar dertig dagen.",
                           fr: "Mettre {title} à la corbeille ? Elle y reste trente jours." },
  "hrun.binyes":         { en: "Yes, to the bin", nl: "Ja, naar de prullenbak", fr: "Oui, à la corbeille" },
  "hrun.deleteask":      { en: "Delete {label} and everything in it? This cannot be undone.",
                           nl: "{label} en alles erin verwijderen? Dit kan niet ongedaan gemaakt worden.",
                           fr: "Supprimer {label} et tout ce qu'il contient ? C'est irréversible." },
  "hrun.removeask":      { en: "Remove {name}? This shows up in the list of what has happened.",
                           nl: "{name} verwijderen? Dat komt in de lijst van wat er gebeurd is.",
                           fr: "Retirer {name} ? Cela apparaît dans la liste de ce qui s'est passé." },
  "hrun.removeyes":      { en: "Yes, remove", nl: "Ja, verwijderen", fr: "Oui, retirer" },
  "hrun.removed":        { en: "Removed.", nl: "Verwijderd.", fr: "Retiré." },
  "hrun.youarein":       { en: "You are in.", nl: "U bent binnen.", fr: "Vous y êtes." },
  "run.passed":          { en: "this one has passed", nl: "deze is al voorbij", fr: "celui-ci est passé" },
  "run.markdone":        { en: "Mark done", nl: "Zet op gedaan", fr: "Marquer comme fait" },
  "run.deletecard":      { en: "Delete this card", nl: "Verwijder deze kaart", fr: "Supprimer cette fiche" },
  "run.nothingdue":      { en: "Nothing is due today or tomorrow.", nl: "Er staat niets voor vandaag of morgen.", fr: "Rien de prévu aujourd'hui ni demain." },
  "run.nothingfound":    { en: "Nothing found.", nl: "Niets gevonden.", fr: "Rien trouvé." },
  "run.cardgone":        { en: "This card does not exist any more.", nl: "Deze kaart bestaat niet meer.", fr: "Cette fiche n'existe plus." },
  "run.kind":            { en: "Kind", nl: "Soort", fr: "Type" },
  "run.tags":            { en: "Tags", nl: "Labels", fr: "Étiquettes" },
  "rep.once":            { en: "once", nl: "een keer", fr: "une fois" },
  "rep.daily":           { en: "every day", nl: "elke dag", fr: "chaque jour" },
  "rep.twice":           { en: "twice a day", nl: "twee keer per dag", fr: "deux fois par jour" },
  "rep.weekly":          { en: "every week", nl: "elke week", fr: "chaque semaine" },
  "run.carddisclaimer":  { en: "Recall is not a medical device. Keep the paper letter, and always follow what your doctor or pharmacist tells you.",
                           nl: "Recall is geen medisch hulpmiddel. Houd de papieren brief bij en volg altijd wat uw arts of apotheker zegt.",
                           fr: "Recall n'est pas un dispositif médical. Gardez la lettre papier et suivez toujours ce que dit votre médecin ou votre pharmacien." },
  "filter.heading":      { en: "Show", nl: "Toon", fr: "Afficher" },
  "filter.letters":      { en: "Letters", nl: "Brieven", fr: "Lettres" },
  "filter.people":       { en: "People", nl: "Mensen", fr: "Personnes" },
  "filter.places":       { en: "Places", nl: "Plaatsen", fr: "Lieux" },
  "filter.noneon":       { en: "Nothing is switched on. Press one of the three above.",
                           nl: "Er staat niets aan. Druk op een van de drie hierboven.",
                           fr: "Rien n'est activé. Appuyez sur l'un des trois ci-dessus." },
  "run.dateat":          { en: "at", nl: "om", fr: "à" },
  "run.canseeone":       { en: "{who} can see your cards.", nl: "{who} kan uw kaarten zien.", fr: "{who} peut voir vos fiches." },
  "run.canseemany":      { en: "{who} can see your cards.", nl: "{who} kunnen uw kaarten zien.", fr: "{who} peuvent voir vos fiches." },
  "run.and":             { en: "and", nl: "en", fr: "et" },
  "run.afamilymember":   { en: "family", nl: "familie", fr: "la famille" },
  "cam.nosupport":       { en: "This phone or browser does not allow the camera. Choose a photo instead.",
                           nl: "Deze telefoon of browser staat de camera niet toe. Kies in plaats daarvan een foto.",
                           fr: "Ce téléphone ou ce navigateur n'autorise pas la caméra. Choisissez une photo à la place." },
  "cam.allow":           { en: "Allow the camera. If that does not work, choose a photo instead.",
                           nl: "Geef de camera toestemming. Als dat niet lukt, kies dan een foto.",
                           fr: "Autorisez la caméra. Si cela ne marche pas, choisissez une photo." },
  "cam.norights":        { en: "The camera has no permission yet. Allow it, or choose a photo instead.",
                           nl: "De camera heeft nog geen toestemming. Geef die, of kies een foto.",
                           fr: "La caméra n'a pas encore l'autorisation. Donnez-la, ou choisissez une photo." },
  "cam.wontstart":       { en: "The camera will not start. Choose a photo instead.",
                           nl: "De camera start niet. Kies in plaats daarvan een foto.",
                           fr: "La caméra ne démarre pas. Choisissez une photo à la place." },
  "store.othertab":      { en: "Recall is open in another tab. Close it and try again.",
                           nl: "Recall staat open in een ander tabblad. Sluit dat en probeer opnieuw.",
                           fr: "Recall est ouvert dans un autre onglet. Fermez-le et réessayez." },
  "store.wontopen":      { en: "The store on this device will not open.",
                           nl: "De opslag op dit toestel gaat niet open.",
                           fr: "La mémoire de cet appareil ne s'ouvre pas." },
  "store.closetabs":     { en: "Close Recall in your other tabs first, then try again.",
                           nl: "Sluit Recall eerst in uw andere tabbladen en probeer dan opnieuw.",
                           fr: "Fermez d'abord Recall dans vos autres onglets, puis réessayez." },
  /* a document on a card, F1 to F4 */
  "file.heading":        { en: "A document", nl: "Een document", fr: "Un document" },
  "file.choose":         { en: "Add a document", nl: "Voeg een document toe", fr: "Ajouter un document" },
  "file.hint":           { en: "A letter that arrived by email, as a text file, a Word document or a pdf. It is read on this phone and never sent anywhere.",
                           nl: "Een brief die per e-mail kwam, als tekstbestand, Word-document of pdf. Hij wordt op deze telefoon gelezen en nooit weggestuurd.",
                           fr: "Une lettre arrivée par e-mail, en fichier texte, document Word ou pdf. Elle est lue sur ce téléphone et jamais envoyée ailleurs." },
  "file.reading":        { en: "Reading the document.", nl: "Het document wordt gelezen.", fr: "Lecture du document." },
  "file.read":           { en: "Recall read this document.", nl: "Recall heeft dit document gelezen.", fr: "Recall a lu ce document." },
  "file.cannotread":     { en: "Recall cannot read the words in this one out loud. You can still open it and look at it.",
                           nl: "Recall kan de woorden hierin niet voorlezen. U kunt het wel openen en bekijken.",
                           fr: "Recall ne peut pas lire les mots de celui-ci à voix haute. Vous pouvez quand même l'ouvrir et le regarder." },
  "file.pdfnote":        { en: "A pdf shows itself here. Reading a pdf out loud is not built yet.",
                           nl: "Een pdf laat zich hier zien. Een pdf voorlezen is nog niet gebouwd.",
                           fr: "Un pdf s'affiche ici. Lire un pdf à voix haute n'est pas encore en place." },
  "file.open":           { en: "Open the document", nl: "Open het document", fr: "Ouvrir le document" },
  "file.remove":         { en: "Take the document off", nl: "Haal het document eraf", fr: "Retirer le document" },
  "file.toobig":         { en: "That document is too big. Ten megabytes is the most Recall keeps.",
                           nl: "Dat document is te groot. Tien megabyte is het meeste dat Recall bewaart.",
                           fr: "Ce document est trop grand. Dix mégaoctets est le maximum que Recall garde." },
  "file.attached":       { en: "Document", nl: "Document", fr: "Document" },

  /* looking at something closely, F5 */
  "big.open":            { en: "Make this bigger", nl: "Maak dit groter", fr: "Agrandir ceci" },
  "big.close":           { en: "Close", nl: "Sluiten", fr: "Fermer" },
  "big.hint":            { en: "Press anywhere to close.", nl: "Druk ergens om te sluiten.", fr: "Appuyez n'importe où pour fermer." },

  /* checklists, F6 to F9 */
  "kind.list":           { en: "A checklist", nl: "Een lijstje", fr: "Une liste" },
  "filter.lists":        { en: "Lists", nl: "Lijstjes", fr: "Listes" },
  "list.items":          { en: "The things on the list", nl: "De dingen op het lijstje", fr: "Les choses sur la liste" },
  "list.itemshint":      { en: "One on each line.", nl: "Eén per lijn.", fr: "Une par ligne." },
  "list.add":            { en: "Add something", nl: "Voeg iets toe", fr: "Ajouter quelque chose" },
  "list.additem":        { en: "Something to add", nl: "Iets om toe te voegen", fr: "Quelque chose à ajouter" },
  "list.progress":       { en: "{done} of {total} done", nl: "{done} van {total} gedaan", fr: "{done} sur {total} fait" },
  "list.alldone":        { en: "All done.", nl: "Alles gedaan.", fr: "Tout est fait." },
  "list.empty":          { en: "Nothing on this list yet.", nl: "Nog niets op dit lijstje.", fr: "Rien sur cette liste pour le moment." },
  "list.readaloud":      { en: "Read the list out loud", nl: "Lees het lijstje voor", fr: "Lire la liste à voix haute" },
  "list.stillto":        { en: "Still to do:", nl: "Nog te doen:", fr: "Encore à faire :" },
  "list.remove":         { en: "Take this off the list", nl: "Haal dit van het lijstje", fr: "Retirer ceci de la liste" },
  "list.fromphoto":      { en: "Make a checklist out of this", nl: "Maak hier een lijstje van", fr: "En faire une liste" },
  "list.madefromphoto":  { en: "Recall made a checklist out of what it read. Change anything that is wrong.",
                           nl: "Recall heeft een lijstje gemaakt van wat het gelezen heeft. Pas aan wat niet juist is.",
                           fr: "Recall a fait une liste de ce qu'il a lu. Corrigez ce qui ne va pas." },
  "list.lookslike":      { en: "This looks like a list. Shall Recall make a checklist out of it?",
                           nl: "Dit lijkt op een lijstje. Moet Recall er een lijstje van maken?",
                           fr: "Cela ressemble à une liste. Recall doit-il en faire une liste ?" },
  "list.yesmake":        { en: "Yes, make a checklist", nl: "Ja, maak een lijstje", fr: "Oui, faire une liste" },
  "list.nokeepletter":   { en: "No, keep it as a letter", nl: "Nee, hou het als brief", fr: "Non, garder comme lettre" },

  /* calling somebody, F10 to F13 */
  "phone.label":         { en: "Phone number", nl: "Telefoonnummer", fr: "Numéro de téléphone" },
  "phone.ph":            { en: "0475 12 34 56", nl: "0475 12 34 56", fr: "0475 12 34 56" },
  "phone.hint":          { en: "So a reminder can be a call, with a button that rings the number.",
                           nl: "Zodat een herinnering een telefoontje kan zijn, met een knop die het nummer belt.",
                           fr: "Pour qu'un rappel puisse être un appel, avec un bouton qui compose le numéro." },
  "phone.call":          { en: "Call {who}", nl: "Bel {who}", fr: "Appeler {who}" },
  "phone.callnow":       { en: "Call now", nl: "Bel nu", fr: "Appeler maintenant" },
  "phone.nonumber":      { en: "There is no number on this card yet. A helper can add one.",
                           nl: "Er staat nog geen nummer op deze kaart. Een familielid kan er een toevoegen.",
                           fr: "Il n'y a pas encore de numéro sur cette fiche. Un proche peut en ajouter un." },
  "phone.notanumber":    { en: "That does not look like a phone number.", nl: "Dat lijkt geen telefoonnummer.", fr: "Cela ne ressemble pas à un numéro de téléphone." },
  "remind.what":         { en: "What kind of reminder", nl: "Wat voor herinnering", fr: "Quel genre de rappel" },
  "remind.normal":       { en: "Just remind me", nl: "Alleen herinneren", fr: "Simplement me rappeler" },
  "remind.call":         { en: "Remind me to call", nl: "Herinner mij om te bellen", fr: "Me rappeler d'appeler" },
  "remind.timetocall":   { en: "Time to call {who}.", nl: "Tijd om {who} te bellen.", fr: "C'est l'heure d'appeler {who}." },
  "h.remindkind":        { en: "What kind", nl: "Welk soort", fr: "Quel genre" },
  "h.phone":             { en: "Phone number, for a call reminder", nl: "Telefoonnummer, voor een belherinnering", fr: "Numéro de téléphone, pour un rappel d'appel" },
  "h.items":             { en: "The things on the list, one per line", nl: "De dingen op het lijstje, één per lijn", fr: "Les choses sur la liste, une par ligne" },

  "hrun.wentwrong":      { en: "That did not work.", nl: "Dat werkte niet.", fr: "Cela n'a pas fonctionné." }
};

/* ---------------- the machinery ---------------- */

function stored() {
  try {
    return window.localStorage.getItem(STORE_KEY) || "";
  } catch (err) {
    return "";
  }
}

// A Belgian phone is usually set to Dutch or French already, so the first guess
// comes from the phone rather than from us. English is the last resort.
function fromDevice() {
  const list = window.navigator.languages || [window.navigator.language || ""];
  for (const tag of list) {
    const short = String(tag).slice(0, 2).toLowerCase();
    if (short === "nl" || short === "fr" || short === "en") return short;
  }
  return FALLBACK;
}

function known(code) {
  return code === "nl" || code === "fr" || code === "en";
}

// ?lang=fr makes a link openable in one language. It sets the choice once, on
// arrival, rather than winning every time it is asked: otherwise the picker in
// the app would quietly stop working for anybody who followed such a link.
function seedFromLink() {
  try {
    const asked = new URL(window.location.href).searchParams.get("lang");
    if (!asked || !known(asked.toLowerCase())) return;
    window.localStorage.setItem(STORE_KEY, asked.toLowerCase());
  } catch (err) {
    // no storage, so the link cannot be remembered. Nothing else breaks.
  }
}

seedFromLink();

export function lang() {
  const mine = stored();
  if (known(mine)) return mine;
  return fromDevice();
}

export function spokenLang() {
  return SPOKEN[lang()] || SPOKEN.en;
}

export function setLang(next) {
  if (!SPOKEN[next]) return;
  try {
    window.localStorage.setItem(STORE_KEY, next);
  } catch (err) {
    // A phone with storage switched off still gets the language for this visit.
  }
  document.documentElement.lang = next;
  apply();
  document.dispatchEvent(new CustomEvent("langchange", { detail: next }));
}

export function t(key, vars) {
  const row = WORDS[key];
  if (!row) {
    // Loud on purpose: a missing key is a bug and the tests look for this.
    window.console.warn("Recall: no such text key, " + key);
    return key;
  }
  let out = row[lang()] || row[FALLBACK] || key;
  if (vars) {
    Object.keys(vars).forEach((name) => {
      out = out.split("{" + name + "}").join(String(vars[name]));
    });
  }
  return out;
}

// Everything in the markup carrying one of these attributes gets its text from
// the dictionary. Plain text, markup, placeholders, alt text and labels for a
// screen reader all need their own attribute, because they land in different
// places on the element.
export function apply(root) {
  const where = root || document;

  where.querySelectorAll("[data-t]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-t"));
  });
  where.querySelectorAll("[data-t-html]").forEach((el) => {
    el.innerHTML = t(el.getAttribute("data-t-html"));
  });
  where.querySelectorAll("[data-t-ph]").forEach((el) => {
    el.setAttribute("placeholder", t(el.getAttribute("data-t-ph")));
  });
  where.querySelectorAll("[data-t-aria]").forEach((el) => {
    el.setAttribute("aria-label", t(el.getAttribute("data-t-aria")));
  });
  where.querySelectorAll("[data-t-alt]").forEach((el) => {
    el.setAttribute("alt", t(el.getAttribute("data-t-alt")));
  });
  where.querySelectorAll("[data-t-title]").forEach((el) => {
    el.setAttribute("title", t(el.getAttribute("data-t-title")));
  });

  document.documentElement.lang = lang();
}

// Used by the tests, and by anybody who wants to know what is not translated.
export function keys() {
  return Object.keys(WORDS);
}

export function missing() {
  const gaps = [];
  Object.keys(WORDS).forEach((key) => {
    ["en", "nl", "fr"].forEach((code) => {
      const value = WORDS[key][code];
      if (!value || !String(value).trim()) gaps.push(key + " has no " + code);
    });
  });
  return gaps;
}
