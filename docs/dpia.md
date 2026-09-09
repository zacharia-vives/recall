# Recall - data protection impact assessment

Written 8 September 2026. Article 35 GDPR.

**Why there is one at all.** Recall is used by older people with mild memory
loss, and what goes into it is a hospital letter, a medication schedule, a bank
statement, a notary's letter, an identity card. That is special category data
about people whose ability to look after their own interests is reduced, and it
is systematic, so Article 35(3)(b) is triggered on the data and Article 35(1) on
the vulnerability of the people. Two of the nine criteria in the EDPB guidelines
would already have been enough.

This is a student project. It is written as if it were going live, because that
is the only way to find out whether it could.

---

## 1. Who is who

| Role | Who | What that means |
| --- | --- | --- |
| **Controller** | Whoever operates Recall. Today that is the four of us as a school project, and it would be the company if this were sold | Decides what is collected and why, answers to the person and to the supervisory authority |
| **Data subject** | The keeper, the older person whose papers these are. Also, incidentally, the people named on her cards: her daughter, her cardiologist | The people the data is about |
| **Household members** | The family who help. They see and add cards | Not controllers of our processing. Their own use of the app for their own family is the household exemption, Article 2(2)(c). Ours is not: we provide the means |
| **Processor: Supabase** | Postgres, authentication and file storage. Project in Frankfurt, `eu-central-1` | Article 28 processor. A data processing agreement and the standard contractual clauses are needed before this is real, and today they are not signed. See section 8 |
| **Processor: GitHub Pages** | Serves the two pages and the scripts | Sees IP addresses in its request logs. Same paperwork gap |
| **Third country recipient: Cloudflare** | `cdnjs.cloudflare.com` serves the OCR library, and the language data comes from a second host | The browser's request carries her IP address to a US company. This is a real transfer and a real finding. See section 8 |

## 2. What is processed, and what is refused

| Data | Where it comes from | Article 9? |
| --- | --- | --- |
| Card name, who, where, when, tags | Typed by family, or read off a letter | Ordinary, unless the content is health |
| Photo of a letter, a person, a place | Her camera | Often health data by content |
| The text read off a letter | On-device OCR | Often health data by content |
| The sentence Recall says out loud | Written by family | Ordinary |
| Reminder times, and whether one was done | The app | Reveals a care routine. Treated as health-adjacent |
| Household membership, display names | Family setup | Ordinary |
| Activity log: who added or changed what | The app | Ordinary |
| Consent record: version, time, which account | The consent screen | Ordinary |

**Deliberately not collected**, and this is a design decision rather than an
omission: location, when she opened the app, how long she looked at anything,
read receipts on cards, any analytics or telemetry of any kind, any advertising
identifier, her name as an account (the keeper has no account), her email (the
keeper never signs in), and the national register number or bank account number,
which are stripped out of the read text before anything is stored.

There is no profiling and no automated decision making, so Article 22 does not
apply. Nothing is summarised, inferred or scored: the app repeats what is on the
paper.

## 3. Lawful basis

| Processing | Article 6 | Article 9 |
| --- | --- | --- |
| Everything on her own phone, before any household | No processing by us at all: nothing leaves the device, nothing reaches a server we control | Not applicable |
| Sharing cards with her household | 6(1)(a), her consent | 9(2)(a), explicit consent |
| The activity log she can read | 6(1)(c) and 6(1)(f): a record of what family did is how the surveillance risk is controlled | Same consent as the cards it describes |
| The consent record itself | 6(1)(c), Article 7(1) requires being able to demonstrate consent | Not applicable |

**Why consent and not legitimate interests.** Article 9 leaves little else for
health data in this setting, and there is a better reason: the whole product
rests on her being able to say no to her family without losing the app. A
legitimate interests balancing test that ends in "she gets watched anyway" is
the wrong answer for this user.

**How consent is taken.** On her own phone, before a single card is uploaded,
on a screen of its own that is read out loud in her language, in short
sentences, at 22 pixels or larger. It says what would be shared, with whom,
where it would be kept, that letters from a doctor are treated as needing a
clear yes, that she can refuse and keep the app, and that she can stop later.
Two buttons, equally prominent: yes, share with my family, and no, keep it all
on this phone. No means the household link is removed from the phone, so there
is nothing to share with and nothing is sent. It is recorded with the version of
the notice that was read, the time, and which account was present.

Where that record lives is worth one line, because Article 7(1) is about being
able to demonstrate it. It goes in the `consents` table, and since patch 002 was
applied on 9 September her own phone can write it there, which is where it
belongs. If that write is ever refused, the app falls back to the activity log:
insert only, no update policy, no delete policy, carrying the same three facts
and the same notice version. Either way the record exists and she is never
blocked from answering. Since the notice exists in three languages, the record
says which language was read as well as which version.

**Withdrawal.** Article 7(3), as easy as giving: the help screen has stop
sharing with my family, behind one question. It marks the consent withdrawn,
never deletes the record, removes the link, and tells her plainly that what her
family already has stays with them until they delete it. That last sentence is
the honest limit of a household model and she is told it before she says yes.

**Capacity.** Consent must be freely given by someone who can give it. Where
capacity is materially reduced and a Belgian court has appointed a
bewindvoerder under the law of 17 March 2013, that person consents instead, and
the app cannot tell the difference: it is a setup instruction for the family,
written on the family app, not a technical control. This is a known limit, and
section 9 lists it as such.

## 4. The principles, one by one

| Article 5 | How |
| --- | --- |
| Lawfulness, fairness, transparency | Consent, spoken, before anything moves. The notice is the screen, not a link to a policy nobody reads |
| Purpose limitation | One purpose: helping her keep track of her own things. No secondary use, no research use, no product analytics |
| Data minimisation | Six fields per card and no free text of any length, because a smaller shape is a smaller risk. The list of things deliberately not collected in section 2 is the substance of this |
| Accuracy | Nothing is filed silently: what was read off a letter is shown and read back before it is kept, and the date it found is offered as a question rather than written in |
| Storage limitation | A binned card sits for thirty days and is then gone. There is no history of edits beyond the activity log. The local store lives only on her device |
| Integrity and confidentiality | Section 6 |
| Accountability | This document, the requirement list in `docs/analysis.md`, the twenty five automated isolation checks, and the test plan in `docs/test-plan.md` |

## 5. Necessity and proportionality

The purpose is not "a memory app". It is: an older person cannot read her own
post and loses the thread of appointments, and the family member who could help
does not live there. Everything in the shape of the product follows from
choosing the least intrusive way to do that:

- The camera and the reading happen because she cannot read the print, and the
  filing is a side effect of that. No extra data is collected for it.
- The reading runs on her device. Cloud OCR is more accurate and was rejected:
  a hospital letter never reaches a third party.
- Nothing is uploaded until a person deliberately links the phone.
- The family gets what it needs to help and nothing that would let it watch:
  three reminder states, no timestamps of her using the app, no read receipts.
- Everything the family does is written where she can read it, which turns an
  invisible power into a visible one.

## 6. Security, Article 32

| Measure | State |
| --- | --- |
| Every rule about who may read or change what is enforced in Postgres, never in the browser | Live, and proven by twenty five automated checks with two separate accounts |
| A keeper phone may add a card but never edit or delete one | Live, tested |
| No delete policy on cards at all: a card goes to a bin, it is never destroyed by a click | Live |
| The activity log is insert only: no update policy, no delete policy | Live |
| Photos in a private bucket, reachable only through a short lived signed link, and only for a member of that household | Live |
| The keeper phone has an identity with no password: an anonymous session promoted by a code the family made, good for fifteen minutes, single use | Live |
| Claiming a code can never change a role that already exists | Live, database trigger, patch 001 |
| Transport is HTTPS end to end, with HSTS on the host | Live |
| The public repository ships only the anon key, which is designed to be public; the service role key is never in the code | Live |
| Secret scanning and push protection on the repository | On |
| An optional four or six digit code, and Face ID or a fingerprint, before the app opens | Live |
| Encryption at rest of the cards on the device | **Not done.** The lock is a screen lock, not encryption, and the analysis says so in as many words. Doing it properly needs a family held recovery key, or she can lose her own memory for good. On the roadmap |
| Backups | Supabase daily backups on the free plan, seven days. Restore has not been rehearsed |
| Breach procedure | Section 7 |

## 7. If something goes wrong

A breach here would be a household boundary failing, or the photo bucket
becoming readable. Both would expose health data about a vulnerable person, so
the risk to rights and freedoms is high and Article 34 notification to the
people affected would be likely, not only Article 33 to the authority.

| Step | Who | When |
| --- | --- | --- |
| Contain: revoke the anon key, take the household policies to deny, pull the site | Zacharia | Immediately |
| Assess what was reachable and by whom, from the Postgres logs | Zacharia | Same day |
| Notify the Belgian Data Protection Authority | Controller | Within 72 hours of becoming aware, Article 33 |
| Tell the households, in plain language, in the app and by email to the helpers | Controller | Without undue delay, Article 34 |
| Write it down, cause and fix | Zacharia | Within a week |

Nothing about this is theatre: the reason the activity log is insert only and
the reason isolation has an automated test is so that this section can be
answered with evidence rather than with an apology.

## 8. Transfers, and the two open findings

**Supabase.** The project sits in Frankfurt and the data stays in the EU at
rest. Supabase is a US company, so support access is a transfer, and the answer
is the Article 28 data processing agreement plus the standard contractual
clauses, which Supabase publishes and which have to be accepted by the
controller. **They are not accepted today.** For a school project on invented
family data that is tolerable; the day one real household uses this, it is not.

**Cloudflare and the language data.** The OCR library is loaded from
`cdnjs.cloudflare.com` and its Dutch and English language data from a second
public host. That means her browser tells a US company her IP address and which
page she was on, every time she reads a letter. It is a small thing that
contradicts a large claim, and the fix is cheap: put the library and the
language data in the repository and serve them from the same origin as the app.
**Recommended, and on the roadmap as the first compliance item.**

**GitHub Pages.** Serves the two pages, sees IP addresses in its logs. Same
paperwork as Supabase, same conclusion.

## 9. The people's rights, honestly

| Right | State |
| --- | --- |
| Information, Articles 12 to 14 | The consent screen, read out loud, in short sentences. This is the strongest part |
| Access, Article 15 | She can see every card and the whole activity log in the app, and the help screen counts exactly what Recall holds about her and says where it is. P20 |
| Rectification, Article 16 | Family can edit any card. She cannot, by design, because an accidental edit is worse for her than a wrong field; she can ask, and the log shows what changed |
| Erasure, Article 17 | Family can bin a card and the bin empties after thirty days. Deleting a whole household deletes everything in it, cascaded, and that works |
| Portability, Article 20 | **Done, 9 September.** The help screen has a copy of everything: one file with every card, the reminders, the checklist items, the phone numbers and the photos as text, in one press. P21 |
| Restriction, Article 18 | Partly: stop sharing halts everything new. Freezing what is already there is not built |
| Objection, Article 21 | Not applicable: consent, not legitimate interests |
| Not being subject to automated decisions, Article 22 | Nothing automated decides anything. There is no profiling |

## 10. Every EU rule this touches, and where we stand

This is the part a jury asks about, because the app keeps legal and medical
paper.

### GDPR, Regulation 2016/679

Covered above: Article 5 principles in section 4, Article 6 and 9 in section 3,
Article 7 consent and withdrawal in section 3, Articles 12 to 22 in section 9,
Article 25 by design and by default is the whole local-first architecture,
Article 28 processors in section 1 and section 8, Article 30 records of
processing is section 2 of this document, Article 32 security in section 6,
Articles 33 and 34 breach in section 7, Article 35 is this document, Articles 44
and following transfers in section 8.

Article 25 deserves one sentence of its own: the default state of this app is
that nothing leaves the device. That is not a setting she has to find. It is
what happens if nobody ever links the phone.

### Belgian law

| Rule | Where we stand |
| --- | --- |
| Wet van 30 juli 2018 betreffende de bescherming van natuurlijke personen met betrekking tot de verwerking van persoonsgegevens, the Belgian GDPR implementation | Applies as the national frame. Supervisory authority: the Gegevensbeschermingsautoriteit in Brussels |
| Wet van 8 augustus 1983 tot regeling van een Rijksregister, and the authorisation regime for using the national register number | This is exactly why the number is stripped out of the read text before storage. Using it needs a legal ground and an authorisation we have no business holding |
| Wet van 22 augustus 2002 betreffende de rechten van de patiënt | We are not a care provider and hold no patient record. The app repeats what her own letter says and gives no advice, which is the line that keeps it out of this law |
| Wet van 17 maart 2013 tot hervorming van de regelingen inzake onbekwaamheid, bewindvoering | Where a court has appointed a bewindvoerder, that person consents. A setup instruction, not a technical control, and listed as a limit in section 3 |
| Belgian consumer and distance selling rules, for the subscription | Not applicable yet, nothing is sold. Fourteen day withdrawal and clear pricing would apply on the day it is |

### Other EU instruments

| Rule | Applies? | Where we stand |
| --- | --- | --- |
| **ePrivacy Directive 2002/58**, storage on a device | Yes | What Recall stores on the device is what the app needs to work at all, which is the strictly necessary exemption. There are no cookies, no trackers, no third party storage. The only thing that reaches a third party is the OCR library request in section 8 |
| **European Accessibility Act, Directive 2019/882** and the harmonised standard EN 301 549, which points at WCAG 2.1 AA | Yes, on the day this is sold as a service | Built to WCAG 2.2 AA, which is stricter. Axe reports zero violations on every screen of both apps. Nothing under 22 pixels, every button at least 56, contrast at least 4.5 to 1 everywhere, everything reachable by keyboard with a visible focus. The half that a laptop cannot test, a screen reader and an old phone, is on Thursday |
| **Medical Devices Regulation 2017/745**, and Rule 11 on software | No, deliberately | Recall has no medical purpose: it magnifies, reads aloud, files and repeats. It does not diagnose, monitor, predict, dose or interpret. It says so on its first screen, on every card and in the consent notice. The line is written into the requirements as S1 to S6 and the wording is reviewed rather than assumed. If a future version were to interpret a prescription or track whether medication was actually taken, that line would move and this answer would change |
| **AI Act, Regulation 2024/1689** | Barely, and we do not claim otherwise | There is no AI system in Recall. Reading a letter is optical character recognition, pattern matching on shapes, running on the device, and the voice is the one built into her phone. Nothing generates, summarises or infers. If a regulator were to call the OCR an AI system, it sits at minimal risk with no obligations beyond transparency, and the transparency is already there because the app shows what it read. Worth naming for its own sake: Article 5 prohibits exploiting the vulnerabilities of a person because of age or disability. Every design decision in section 5 pushes the other way |
| **Data Act, Regulation 2023/2854** | No | No connected product, no industrial data, no cloud switching obligation at this size |
| **Digital Services Act** and **Digital Markets Act** | No | Not an intermediary, not a platform, not a gatekeeper. No user to user content |
| **NIS2, Directive 2022/2555** | No, today | A four person project is below every size threshold. A company selling this to care organisations would want to look again, because the customers may themselves be in scope and would push the obligations down by contract |
| **European Health Data Space, Regulation 2025/327** | Not yet | Recall is not an electronic health record system and holds no EHR data as defined. If a later version were to receive data from a hospital system, or to make her cards available to one, this becomes the governing frame and the interoperability and secondary use rules apply. Roadmap, named, not hand waved |
| **eIDAS 2, Regulation 2024/1183**, and the EU Digital Identity Wallet | Roadmap | The identity work already on the roadmap, itsme and FranceConnect and the wallet, is one function in this app because all three are OpenID Connect. What is missing is a contract and a legal entity, not code |
| **Accessibility of public sector bodies, Directive 2016/2102** | Only if a public body distributed it | Same standard as the Accessibility Act, already met |

## 11. Risks, and what is done about them

| Risk | Who is hurt | Before | What is done | After |
| --- | --- | --- | --- | --- |
| One household can read another's cards or photos | The keeper | High | Row level security in Postgres, a security definer function behind every policy, twenty five automated checks run against the live database | Low |
| The family uses the app to watch rather than to help | The keeper | High | Three reminder states and no more, no location, no usage times, no read receipts, and every family action in a log she can read | Medium, because it is a social risk and code can only shape it |
| She is asked for a yes she does not understand | The keeper | High | The notice is read out loud, in short sentences, on her own phone, with a real no that keeps the app working. Where a bewindvoerder exists, they consent | Medium |
| A phone is lost or picked up in a waiting room | The keeper | Medium | An optional code and Face ID, and the family can move Recall to a new phone and remove the old one in three steps | Medium, and honest about it: a screen lock, not encryption |
| The national register number ends up stored | The keeper | Medium | Stripped before storage, with a test that reads a letter carrying one and checks the stored text | Low |
| A hospital letter reaches a third party | The keeper | High | The reading runs on the device. Cloud OCR was rejected for this reason | Low, except for the IP address leak in section 8 |
| The letter is sent away to be read out loud in a nicer voice | The keeper | Medium | The best sounding voices on Windows and Android are online ones, and those post the text to a server. Refused, by name and by the localService flag. Only voices that speak on the device are offered, and the help screen says so where family picks one | Low |
| Her local store breaks and she thinks her cards are lost | The keeper | Medium | A screen of its own that says what happened and what to do, rather than an empty Today screen | Low |
| No processor paperwork | Everyone | High for a real deployment | Nothing yet. Section 8 | High, and the first thing to fix before a real household |
| She cannot get her data out in a portable form | The keeper | Medium | Nothing yet. Section 9 | Medium, first thing to build after Friday |

## 12. Conclusion

With the measures in place, the residual risk to the people whose data this is
sits at **medium**, which is acceptable for a demonstration on invented family
data and **not yet acceptable for a real household**. Three things stand between
those two states, in order:

1. The processor paperwork with Supabase and GitHub, and self-hosting the OCR
   library so no third country sees her IP address.
2. Export, so Article 20 is answered by the product and not by a promise.
3. Encryption at rest with a family held recovery key, so a lost phone is a
   lost phone and not a lost life story.

None of the three is hard. All three are on the roadmap, and this document is
the reason they are in that order.

*Reviewed by: Zacharia Janssen, 8 September 2026. To be reviewed again before
any real household uses Recall, and whenever the consent notice changes.*
