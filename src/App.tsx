import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Lang = "en" | "de" | "sr" | "fr" | "es" | "it" | "ru" | "hi" | "ar" | "zh";
type TabKey = "first" | "second" | "desired" | "schedule";
type Origin = "linked" | "extra";
type DayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday";
type ThemeKey = "classic" | "lavender" | "mint" | "sunset" | "graphite" | "custom";

type Subject = {
  id: string;
  name: string;
  grades: string[];
  finalGrade: string;
  origin: Origin;
};

type DesiredGrades = Record<string, { first: string; second: string }>;

type ScheduleSlot = {
  id: string;
  time: string;
  subject: string;
};

type ScheduleState = Record<DayKey, ScheduleSlot[]>;

type AppState = {
  activeTab: TabKey;
  selectedStyle: ThemeKey;
  customHue: number;
  language: Lang;
  schoolName: string;
  studentName: string;
  className: string;
  periods: {
    first: { subjects: Subject[] };
    second: { subjects: Subject[] };
  };
  desiredGrades: DesiredGrades;
  schedule: ScheduleState;
};

const STORAGE_KEY = "grade-average-calculator-v6";
const DEFAULT_GRADE_FIELDS = 6;
const DAYS: DayKey[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];
const DEFAULT_TIMES = ["08:00", "08:50", "09:40", "10:30", "11:20", "12:10", "13:00", "13:50"];
const DEFAULT_SCHEDULE_ROW_COUNT = 6;

const LANGUAGES: { key: Lang; label: string; flag: string }[] = [
  { key: "en", label: "English", flag: "🇬🇧" },
  { key: "de", label: "Deutsch", flag: "🇩🇪" },
  { key: "sr", label: "Srpski", flag: "🇷🇸" },
  { key: "fr", label: "Français", flag: "🇫🇷" },
  { key: "es", label: "Español", flag: "🇪🇸" },
  { key: "it", label: "Italiano", flag: "🇮🇹" },
  { key: "ru", label: "Русский", flag: "🇷🇺" },
  { key: "hi", label: "हिन्दी", flag: "🇮🇳" },
  { key: "ar", label: "العربية", flag: "🇸🇦" },
  { key: "zh", label: "中文", flag: "🇨🇳" },
];
const FLAG_IMAGES: Record<Lang, string> = {
  en: "https://flagcdn.com/w40/gb.png",
  de: "https://flagcdn.com/w40/de.png",
  sr: "https://flagcdn.com/w40/rs.png",
  fr: "https://flagcdn.com/w40/fr.png",
  es: "https://flagcdn.com/w40/es.png",
  it: "https://flagcdn.com/w40/it.png",
  ru: "https://flagcdn.com/w40/ru.png",
  hi: "https://flagcdn.com/w40/in.png",
  ar: "https://flagcdn.com/w40/sa.png",
  zh: "https://flagcdn.com/w40/cn.png",
};

const Icon = ({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
  <span className={`inline-flex items-center justify-center ${className}`} style={style}>{children}</span>
);

const Plus = ({ className = "" }) => <Icon className={className}>＋</Icon>;
const Minus = ({ className = "" }) => <Icon className={className}>－</Icon>;
const Trash2 = ({ className = "" }) => <Icon className={className}>🗑</Icon>;
const RotateCcw = ({ className = "" }) => <Icon className={className}>↺</Icon>;
const BookOpen = ({ className = "" }) => <Icon className={className}>📘</Icon>;
const GraduationCap = ({ className = "" }) => <Icon className={className}>🎓</Icon>;
const ChevronRight = ({ className = "" }) => <Icon className={className}>›</Icon>;
const Sparkles = ({ className = "" }) => <Icon className={className}>✨</Icon>;
const Target = ({ className = "" }) => <Icon className={className}>◎</Icon>;
const SettingsIcon = ({ className = "" }) => <Icon className={className}>⚙</Icon>;
const InfoIcon = ({ className = "" }) => <Icon className={className}>ℹ</Icon>;

const STYLE_OPTIONS: { key: ThemeKey; labels: Record<string, string> }[] = [
  { key: "classic", labels: { en: "Cloud", de: "Cloud", sr: "Cloud" } },
  { key: "lavender", labels: { en: "Candy", de: "Candy", sr: "Candy" } },
  { key: "mint", labels: { en: "Fresh", de: "Fresh", sr: "Fresh" } },
  { key: "sunset", labels: { en: "Sunset", de: "Sunset", sr: "Sunset" } },
  { key: "graphite", labels: { en: "Midnight", de: "Midnight", sr: "Midnight" } },
  { key: "custom", labels: { en: "Remix", de: "Remix", sr: "Remix" } },
];

const T = {
  en: {
    languageName: "English",
    appTitle: "Grade Calculator",
    schoolName: "School Name",
    schoolPlaceholder: "e.g. Gymnasium am Stadtpark",
    studentName: "Student Name",
    studentPlaceholder: "e.g. Max Mustermann",
    className: "Class",
    classPlaceholder: "e.g. 10A",
    language: "Language",
    settings: "Settings",
    style: "Style",
    customColor: "Custom color",
    reset: "Reset",
    addSubject: "Add Subject",
    addExtraSubject: "Add Extra Subject",
    addFirstSubject: "Add your first subject",
    tabs: { first: "1st Half-Year", second: "2nd Half-Year", desired: "Desired Grade", schedule: "Schedule" },
    secondInfo: "Subjects from the first half-year stay linked here, and you can also add extra subjects that exist only in the second half-year.",
    desiredInfo: "This tab combines subjects from both half-years and lets you set a desired grade for each period.",
    scheduleInfo: "Weekly schedule with 8 default periods per day. You can add more periods anytime.",
    noSubjectsTitle: "No subjects yet",
    noSubjectsFirst: "Start by adding your first subject. Each subject begins with six grade fields, and you can add more whenever you need them.",
    noSubjectsSecond: "You can work with linked first-half subjects here and also add extra second-half subjects if needed.",
    noSubjectsDesired: "Add subjects in the first or second half-year to set desired grades here.",
    subjectName: "Subject name",
    subjectPlaceholder: "e.g. Mathematics",
    suggestedSubjects: "Suggested subjects",
    subjectInputHint: "Not listed? Type it.",
    extraBadge: "Extra",
    average: "Average",
    grades: "Grades",
    addGrade: "Add Grade",
    invalidGrade: "Use 1-6",
    finalGrade: "Final Grade",
    desiredGrade: "Desired Grade",
    desiredGradeDesc: "Set your target grade for each half-year.",
    desiredGradePlaceholder: "Goal",
    statusBetter: "Better than target",
    statusEqual: "On target",
    statusWorse: "Below target",
    noData: "No data",
    activePeriod: "Active period",
    overallAverage: "Overall Average",
    overallAverageDesc: "Empty fields and invalid values are automatically ignored.",
    finalGradeAverages: "Average Final Grades",
    desiredAverages: "Average Desired Grades",
    subjects: "Subjects",
    moodGreat: "You’re doing great",
    moodGood: "Nice progress",
    moodPush: "One more push",
    moodStart: "Add your first subject",
    moodGoal: "Goal mode active",
    motivation: "Status",
    schedule: {
      title: "Weekly Schedule",
      desc: "Scrollable weekly plan with time boxes and subject inputs.",
      heroLabel: "Filled periods",
      boxLabel: "Week overview",
      daysLabel: "Days",
      filledLabel: "Filled",
      time: "Time",
      subject: "Subject",
      addPeriod: "Add period",
      addRow: "Add row",
      removeRow: "Remove row",
      timePlaceholder: "08:00",
      subjectPlaceholder: "Type subject",
      days: { monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday" },
    },
    subjectSuggestions: ["Mathematics", "English", "German", "Biology", "Chemistry", "Physics", "History", "Geography", "Politics", "Economics", "Computer Science", "Art", "Music", "Sports", "French", "Spanish", "Italian", "Latin", "Religion", "Ethics"],
  },
  de: {
    languageName: "Deutsch",
    appTitle: "Notenrechner",
    schoolName: "Schule",
    schoolPlaceholder: "z. B. Gymnasium am Stadtpark",
    studentName: "Schüler",
    studentPlaceholder: "z. B. Max Mustermann",
    className: "Klasse",
    classPlaceholder: "z. B. 10A",
    language: "Sprache",
    settings: "Einstellungen",
    style: "Stil",
    customColor: "Eigene Farbe",
    reset: "Zurücksetzen",
    addSubject: "Fach hinzufügen",
    addExtraSubject: "Zusätzliches Fach hinzufügen",
    addFirstSubject: "Erstes Fach hinzufügen",
    tabs: { first: "1. Halbjahr", second: "2. Halbjahr", desired: "Wunschnote", schedule: "Stundenplan" },
    secondInfo: "Fächer aus dem ersten Halbjahr bleiben hier verknüpft. Zusätzlich können Fächer hinzugefügt werden, die nur im zweiten Halbjahr vorkommen.",
    desiredInfo: "Dieser Tab übernimmt die Fächer aus beiden Halbjahren und ermöglicht die Eingabe einer Wunschnote je Zeitraum.",
    scheduleInfo: "Wöchentlicher Stundenplan mit 8 Standardstunden pro Tag. Weitere Stunden können ergänzt werden.",
    noSubjectsTitle: "Noch keine Fächer",
    noSubjectsFirst: "Beginne mit deinem ersten Fach. Jedes Fach startet mit sechs Notenfeldern, und du kannst jederzeit weitere Felder hinzufügen.",
    noSubjectsSecond: "Hier erscheinen die verknüpften Fächer aus dem ersten Halbjahr. Zusätzlich kannst du bei Bedarf weitere Fächer für das zweite Halbjahr anlegen.",
    noSubjectsDesired: "Füge im ersten oder zweiten Halbjahr Fächer hinzu, um hier Wunschnoten zu setzen.",
    subjectName: "Fachname",
    subjectPlaceholder: "z. B. Mathematik",
    suggestedSubjects: "Vorgeschlagene Fächer",
    subjectInputHint: "Nicht dabei? Einfach eingeben.",
    extraBadge: "Zusatz",
    average: "Ø-Note",
    grades: "Noten",
    addGrade: "Note hinzufügen",
    invalidGrade: "1-6 eingeben",
    finalGrade: "Endnote",
    desiredGrade: "Wunschnote",
    desiredGradeDesc: "Lege deine Zielnote für jedes Halbjahr fest.",
    desiredGradePlaceholder: "Ziel",
    statusBetter: "Besser als Ziel",
    statusEqual: "Auf Zielniveau",
    statusWorse: "Unter Zielniveau",
    noData: "Keine Daten",
    activePeriod: "Aktiver Zeitraum",
    overallAverage: "Gesamtdurchschnitt",
    overallAverageDesc: "Leere Felder und ungültige Werte werden automatisch ignoriert.",
    finalGradeAverages: "Durchschnitt Endnoten",
    desiredAverages: "Durchschnitt Wunschnoten",
    subjects: "Fächer",
    moodGreat: "Du bist stark unterwegs",
    moodGood: "Guter Fortschritt",
    moodPush: "Noch ein Push",
    moodStart: "Füge dein erstes Fach hinzu",
    moodGoal: "Zielmodus aktiv",
    motivation: "Status",
    schedule: {
      title: "Wochenplan",
      desc: "Scrollbare Ansicht mit Zeitfeldern und Fächern.",
      heroLabel: "Gefüllte Stunden",
      boxLabel: "Wochenübersicht",
      daysLabel: "Tage",
      filledLabel: "Gefüllt",
      time: "Zeit",
      subject: "Fach",
      addPeriod: "Stunde hinzufügen",
      addRow: "Reihe hinzufügen",
      removeRow: "Reihe entfernen",
      timePlaceholder: "08:00",
      subjectPlaceholder: "Fach eingeben",
      days: { monday: "Montag", tuesday: "Dienstag", wednesday: "Mittwoch", thursday: "Donnerstag", friday: "Freitag" },
    },
    subjectSuggestions: ["Mathematik", "Deutsch", "Englisch", "Biologie", "Chemie", "Physik", "Geschichte", "Geografie", "Politik", "Wirtschaft", "Informatik", "Kunst", "Musik", "Sport", "Französisch", "Spanisch", "Italienisch", "Latein", "Religion", "Ethik"],
  },
  sr: {
    languageName: "Srpski",
    appTitle: "Računar ocena",
    schoolName: "Naziv škole",
    schoolPlaceholder: "npr. Gimnazija am Stadtpark",
    studentName: "Ime učenika",
    studentPlaceholder: "npr. Maks Mustermann",
    className: "Razred",
    classPlaceholder: "npr. 10A",
    language: "Jezik",
    settings: "Podešavanja",
    style: "Stil",
    customColor: "Custom boja",
    reset: "Resetuj",
    addSubject: "Dodaj predmet",
    addExtraSubject: "Dodaj dodatni predmet",
    addFirstSubject: "Dodaj prvi predmet",
    tabs: { first: "1. polugodište", second: "2. polugodište", desired: "Željena ocena", schedule: "Raspored časova" },
    secondInfo: "Predmeti iz prvog polugodišta ostaju povezani ovde, a možeš dodati i dodatne predmete koji postoje samo u drugom polugodištu.",
    desiredInfo: "Ovaj tab preuzima predmete iz oba polugodišta i omogućava da postaviš željenu ocenu za svaki period.",
    scheduleInfo: "Nedeljni raspored sa 8 podrazumevanih časova po danu. Možeš da dodaš još časova.",
    noSubjectsTitle: "Još nema predmeta",
    noSubjectsFirst: "Počni dodavanjem prvog predmeta. Svaki predmet ima šest polja za ocene, a po potrebi možeš dodati još.",
    noSubjectsSecond: "Ovde se prikazuju povezani predmeti iz prvog polugodišta, a po potrebi možeš dodati i posebne predmete za drugo polugodište.",
    noSubjectsDesired: "Dodaj predmete u prvo ili drugo polugodište da bi ovde postavio željene ocene.",
    subjectName: "Naziv predmeta",
    subjectPlaceholder: "npr. Matematika",
    suggestedSubjects: "Predloženi predmeti",
    subjectInputHint: "Nema ga? Upiši ga.",
    extraBadge: "Dodatni",
    average: "Prosek",
    grades: "Ocene",
    addGrade: "Dodaj ocenu",
    invalidGrade: "Unesi 1-6",
    finalGrade: "Zaključna ocena",
    desiredGrade: "Željena ocena",
    desiredGradeDesc: "Postavi ciljnu ocenu za svako polugodište.",
    desiredGradePlaceholder: "Cilj",
    statusBetter: "Bolje od cilja",
    statusEqual: "Na cilju",
    statusWorse: "Ispod cilja",
    noData: "Nema podataka",
    activePeriod: "Aktivni period",
    overallAverage: "Ukupan prosek",
    overallAverageDesc: "Prazna polja i neispravne vrednosti se automatski ignorišu.",
    finalGradeAverages: "Prosek zaključnih ocena",
    desiredAverages: "Prosek željenih ocena",
    subjects: "Predmeti",
    moodGreat: "Odlično ti ide",
    moodGood: "Dobar napredak",
    moodPush: "Još malo jače",
    moodStart: "Dodaj prvi predmet",
    moodGoal: "Cilj režim aktivan",
    motivation: "Status",
    schedule: {
      title: "Nedeljni raspored",
      desc: "Pregledan raspored sa skrolom, vremenom i predmetima.",
      heroLabel: "Popunjeni časovi",
      boxLabel: "Pregled nedelje",
      daysLabel: "Dani",
      filledLabel: "Popunjeno",
      time: "Vreme",
      subject: "Predmet",
      addPeriod: "Dodaj čas",
      addRow: "Dodaj red",
      removeRow: "Ukloni red",
      timePlaceholder: "08:00",
      subjectPlaceholder: "Upiši predmet",
      days: { monday: "Ponedeljak", tuesday: "Utorak", wednesday: "Sreda", thursday: "Četvrtak", friday: "Petak" },
    },
    subjectSuggestions: ["Matematika", "Srpski", "Engleski", "Nemački", "Biologija", "Hemija", "Fizika", "Istorija", "Geografija", "Politika", "Ekonomija", "Informatika", "Likovno", "Muzičko", "Fizičko", "Francuski", "Španski", "Italijanski", "Latinski", "Etika"],
  },
  fr: { languageName: "Français", appTitle: "Calculateur de notes", schoolName: "École", schoolPlaceholder: "ex. Gymnasium am Stadtpark", studentName: "Élève", studentPlaceholder: "ex. Max Mustermann", className: "Classe", classPlaceholder: "ex. 10A", language: "Langue", settings: "Paramètres", style: "Style", customColor: "Couleur personnalisée", reset: "Réinitialiser", addSubject: "Ajouter une matière", addExtraSubject: "Ajouter une matière supplémentaire", addFirstSubject: "Ajouter la première matière", tabs: { first: "1er semestre", second: "2e semestre", desired: "Note visée", schedule: "Emploi du temps" }, secondInfo: "Les matières du premier semestre restent liées ici, et vous pouvez aussi ajouter des matières supplémentaires qui n'existent qu'au deuxième semestre.", desiredInfo: "Cet onglet reprend les matières des deux semestres et vous permet de définir une note visée pour chaque période.", scheduleInfo: "Emploi du temps hebdomadaire avec 8 cours par défaut par jour.", noSubjectsTitle: "Aucune matière pour le moment", noSubjectsFirst: "Commencez par ajouter votre première matière.", noSubjectsSecond: "Les matières liées du premier semestre apparaissent ici, et vous pouvez aussi ajouter des matières spécifiques au deuxième semestre.", noSubjectsDesired: "Ajoutez des matières pour définir ici vos notes visées.", subjectName: "Nom de la matière", subjectPlaceholder: "ex. Mathématiques", suggestedSubjects: "Matières suggérées", subjectInputHint: "Pas dans la liste ? Saisis-la.", extraBadge: "Supplémentaire", average: "Moyenne", grades: "Notes", addGrade: "Ajouter une note", invalidGrade: "Saisir 1-6", finalGrade: "Note finale", desiredGrade: "Note visée", desiredGradeDesc: "Définissez votre objectif.", desiredGradePlaceholder: "Objectif", statusBetter: "Meilleur que l'objectif", statusEqual: "Objectif atteint", statusWorse: "En dessous de l'objectif", noData: "Pas de données", activePeriod: "Période active", overallAverage: "Moyenne générale", overallAverageDesc: "Les champs vides et les valeurs invalides sont ignorés.", finalGradeAverages: "Moyenne des notes finales", desiredAverages: "Moyenne des notes visées", subjects: "Matières", moodGreat: "Tu gères très bien", moodGood: "Bonne progression", moodPush: "Encore un effort", moodStart: "Ajoute ta première matière", moodGoal: "Mode objectif actif", motivation: "Statut", schedule: { title: "Emploi du temps", desc: "Vue défilante avec heures et matières.", heroLabel: "Cours remplis", boxLabel: "Vue semaine", daysLabel: "Jours", filledLabel: "Rempli", time: "Heure", subject: "Matière", addPeriod: "Ajouter un cours",
      addRow: "Ajouter une ligne",
      removeRow: "Supprimer la ligne", timePlaceholder: "08:00", subjectPlaceholder: "Saisir une matière", days: { monday: "Lundi", tuesday: "Mardi", wednesday: "Mercredi", thursday: "Jeudi", friday: "Vendredi" } }, subjectSuggestions: ["Mathématiques", "Français", "Allemand", "Biologie", "Chimie", "Physique", "Histoire", "Géographie", "Politique", "Économie", "Informatique", "Arts plastiques", "Musique", "Sport", "Anglais", "Espagnol", "Italien", "Latin", "Religion", "Éthique"] },
  es: { languageName: "Español", appTitle: "Calculadora de notas", schoolName: "Escuela", schoolPlaceholder: "p. ej. Gymnasium am Stadtpark", studentName: "Alumno", studentPlaceholder: "p. ej. Max Mustermann", className: "Clase", classPlaceholder: "p. ej. 10A", language: "Idioma", settings: "Configuración", style: "Estilo", customColor: "Color personalizada", reset: "Restablecer", addSubject: "Añadir asignatura", addExtraSubject: "Añadir asignatura extra", addFirstSubject: "Añadir la primera asignatura", tabs: { first: "1.º semestre", second: "2.º semestre", desired: "Nota deseada", schedule: "Horario" }, secondInfo: "Las asignaturas del primer semestre permanecen vinculadas aquí, y también puedes añadir asignaturas extra que solo existan en el segundo semestre.", desiredInfo: "Esta pestaña toma las asignaturas de ambos semestres y te permite fijar una nota deseada para cada período.", scheduleInfo: "Horario semanal con 8 clases por defecto por día.", noSubjectsTitle: "Todavía no hay asignaturas", noSubjectsFirst: "Empieza añadiendo tu primera asignatura.", noSubjectsSecond: "Aquí aparecen las asignaturas vinculadas del primer semestre, y también puedes añadir asignaturas exclusivas del segundo semestre.", noSubjectsDesired: "Añade asignaturas para definir aquí tus notas deseadas.", subjectName: "Nombre de la asignatura", subjectPlaceholder: "p. ej. Matemáticas", suggestedSubjects: "Asignaturas sugeridas", subjectInputHint: "¿No está? Escríbela.", extraBadge: "Extra", average: "Promedio", grades: "Notas", addGrade: "Añadir nota", invalidGrade: "Usa 1-6", finalGrade: "Nota final", desiredGrade: "Nota deseada", desiredGradeDesc: "Define tu nota objetivo.", desiredGradePlaceholder: "Meta", statusBetter: "Mejor que la meta", statusEqual: "En la meta", statusWorse: "Por debajo de la meta", noData: "Sin datos", activePeriod: "Período activo", overallAverage: "Promedio general", overallAverageDesc: "Los campos vacíos y los valores no válidos se ignoran automáticamente.", finalGradeAverages: "Promedio de notas finales", desiredAverages: "Promedio de notas deseadas", subjects: "Asignaturas", moodGreat: "Vas muy bien", moodGood: "Buen progreso", moodPush: "Un pequeño empujón", moodStart: "Añade tu primera asignatura", moodGoal: "Modo objetivo activo", motivation: "Estado", schedule: { title: "Horario", desc: "Vista desplazable con horas y asignaturas.", heroLabel: "Clases completas", boxLabel: "Resumen semanal", daysLabel: "Días", filledLabel: "Lleno", time: "Hora", subject: "Asignatura", addPeriod: "Añadir clase",
      addRow: "Añadir fila",
      removeRow: "Quitar fila", timePlaceholder: "08:00", subjectPlaceholder: "Escribe asignatura", days: { monday: "Lunes", tuesday: "Martes", wednesday: "Miércoles", thursday: "Jueves", friday: "Viernes" } }, subjectSuggestions: ["Matemáticas", "Español", "Alemán", "Biología", "Química", "Física", "Historia", "Geografía", "Política", "Economía", "Informática", "Arte", "Música", "Deporte", "Francés", "Inglés", "Italiano", "Latín", "Religión", "Ética"] },
  it: { languageName: "Italiano", appTitle: "Calcolatore voti", schoolName: "Scuola", schoolPlaceholder: "es. Gymnasium am Stadtpark", studentName: "Studente", studentPlaceholder: "es. Max Mustermann", className: "Classe", classPlaceholder: "es. 10A", language: "Lingua", settings: "Impostazioni", style: "Stile", customColor: "Colore personalizzato", reset: "Reimposta", addSubject: "Aggiungi materia", addExtraSubject: "Aggiungi materia extra", addFirstSubject: "Aggiungi la prima materia", tabs: { first: "1° semestre", second: "2° semestre", desired: "Voto desiderato", schedule: "Orario" }, secondInfo: "Le materie del primo semestre restano collegate qui, e puoi anche aggiungere materie extra presenti solo nel secondo semestre.", desiredInfo: "Questa scheda unisce le materie di entrambi i semestri e ti permette di impostare un voto desiderato per ogni periodo.", scheduleInfo: "Orario settimanale con 8 lezioni predefinite al giorno.", noSubjectsTitle: "Nessuna materia ancora", noSubjectsFirst: "Inizia aggiungendo la tua prima materia.", noSubjectsSecond: "Qui compaiono le materie collegate del primo semestre, e puoi anche aggiungere materie specifiche del secondo semestre.", noSubjectsDesired: "Aggiungi materie per impostare qui i voti desiderati.", subjectName: "Nome della materia", subjectPlaceholder: "es. Matematica", suggestedSubjects: "Materie suggerite", subjectInputHint: "Non c'è? Scrivila tu.", extraBadge: "Extra", average: "Media", grades: "Voti", addGrade: "Aggiungi voto", invalidGrade: "Usa 1-6", finalGrade: "Voto finale", desiredGrade: "Voto desiderato", desiredGradeDesc: "Imposta il tuo voto obiettivo.", desiredGradePlaceholder: "Obiettivo", statusBetter: "Meglio dell'obiettivo", statusEqual: "In linea con l'obiettivo", statusWorse: "Sotto l'obiettivo", noData: "Nessun dato", activePeriod: "Periodo attivo", overallAverage: "Media generale", overallAverageDesc: "I campi vuoti e i valori non validi vengono ignorati automaticamente.", finalGradeAverages: "Media voti finali", desiredAverages: "Media voti desiderati", subjects: "Materie", moodGreat: "Stai andando alla grande", moodGood: "Buon progresso", moodPush: "Ancora un piccolo sforzo", moodStart: "Aggiungi la prima materia", moodGoal: "Modalità obiettivo attiva", motivation: "Stato", schedule: { title: "Orario", desc: "Vista scorrevole con orari e materie.", heroLabel: "Lezioni compilate", boxLabel: "Panoramica settimana", daysLabel: "Giorni", filledLabel: "Compilato", time: "Orario", subject: "Materia", addPeriod: "Aggiungi ora",
      addRow: "Aggiungi riga",
      removeRow: "Rimuovi riga", timePlaceholder: "08:00", subjectPlaceholder: "Scrivi materia", days: { monday: "Lunedì", tuesday: "Martedì", wednesday: "Mercoledì", thursday: "Giovedì", friday: "Venerdì" } }, subjectSuggestions: ["Matematica", "Italiano", "Inglese", "Tedesco", "Biologia", "Chimica", "Fisica", "Storia", "Geografia", "Politica", "Economia", "Informatica", "Arte", "Musica", "Sport", "Francese", "Spagnolo", "Latino", "Religione", "Etica"] },
  ru: { languageName: "Русский", appTitle: "Калькулятор оценок", schoolName: "Школа", schoolPlaceholder: "например, Gymnasium am Stadtpark", studentName: "Ученик", studentPlaceholder: "например, Max Mustermann", className: "Класс", classPlaceholder: "например, 10A", language: "Язык", settings: "Настройки", style: "Стиль", customColor: "Свой цвет", reset: "Сброс", addSubject: "Добавить предмет", addExtraSubject: "Добавить доп. предмет", addFirstSubject: "Добавить первый предмет", tabs: { first: "1-е полугодие", second: "2-е полугодие", desired: "Желаемая оценка", schedule: "Расписание" }, secondInfo: "Предметы из первого полугодия остаются связанными здесь, и можно добавить дополнительные предметы только для второго полугодия.", desiredInfo: "Эта вкладка объединяет предметы из обоих полугодий и позволяет задать желаемую оценку для каждого периода.", scheduleInfo: "Недельное расписание с 8 уроками по умолчанию на день.", noSubjectsTitle: "Пока нет предметов", noSubjectsFirst: "Начни с добавления первого предмета.", noSubjectsSecond: "Здесь отображаются связанные предметы из первого полугодия, и можно добавить отдельные предметы для второго полугодия.", noSubjectsDesired: "Добавь предметы, чтобы задать желаемые оценки.", subjectName: "Название предмета", subjectPlaceholder: "например, Математика", suggestedSubjects: "Предлагаемые предметы", subjectInputHint: "Нет в списке? Введи сам.", extraBadge: "Доп.", average: "Средний", grades: "Оценки", addGrade: "Добавить оценку", invalidGrade: "Введите 1-6", finalGrade: "Итоговая оценка", desiredGrade: "Желаемая оценка", desiredGradeDesc: "Задай целевую оценку.", desiredGradePlaceholder: "Цель", statusBetter: "Лучше цели", statusEqual: "На уровне цели", statusWorse: "Ниже цели", noData: "Нет данных", activePeriod: "Активный период", overallAverage: "Общий средний балл", overallAverageDesc: "Пустые поля и неверные значения игнорируются.", finalGradeAverages: "Среднее итоговых оценок", desiredAverages: "Среднее желаемых оценок", subjects: "Предметы", moodGreat: "У тебя отлично получается", moodGood: "Хороший прогресс", moodPush: "Ещё немного", moodStart: "Добавь первый предмет", moodGoal: "Режим цели активен", motivation: "Статус", schedule: { title: "Расписание", desc: "Прокручиваемый вид со временем и предметами.", heroLabel: "Заполненные уроки", boxLabel: "Обзор недели", daysLabel: "Дни", filledLabel: "Заполнено", time: "Время", subject: "Предмет", addPeriod: "Добавить урок",
      addRow: "Добавить ряд",
      removeRow: "Удалить ряд", timePlaceholder: "08:00", subjectPlaceholder: "Введите предмет", days: { monday: "Понедельник", tuesday: "Вторник", wednesday: "Среда", thursday: "Четверг", friday: "Пятница" } }, subjectSuggestions: ["Математика", "Русский", "Английский", "Немецкий", "Биология", "Химия", "Физика", "История", "География", "Политика", "Экономика", "Информатика", "Искусство", "Музыка", "Спорт", "Французский", "Испанский", "Латынь", "Религия", "Этика"] },
  hi: { languageName: "हिन्दी", appTitle: "ग्रेड कैलकुलेटर", schoolName: "स्कूल", schoolPlaceholder: "उदाहरण: Gymnasium am Stadtpark", studentName: "छात्र", studentPlaceholder: "उदाहरण: Max Mustermann", className: "कक्षा", classPlaceholder: "उदाहरण: 10A", language: "भाषा", settings: "सेटिंग्स", style: "स्टाइल", customColor: "कस्टम रंग", reset: "रीसेट", addSubject: "विषय जोड़ें", addExtraSubject: "अतिरिक्त विषय जोड़ें", addFirstSubject: "पहला विषय जोड़ें", tabs: { first: "पहला सत्र", second: "दूसरा सत्र", desired: "इच्छित ग्रेड", schedule: "समय-सारिणी" }, secondInfo: "पहले सत्र के विषय यहाँ जुड़े रहते हैं, और आप केवल दूसरे सत्र के लिए अतिरिक्त विषय भी जोड़ सकते हैं।", desiredInfo: "यह टैब दोनों सत्रों के विषयों को जोड़ता है और हर अवधि के लिए इच्छित ग्रेड सेट करने देता है।", scheduleInfo: "साप्ताहिक समय-सारिणी 8 डिफ़ॉल्ट पीरियड के साथ।", noSubjectsTitle: "अभी कोई विषय नहीं", noSubjectsFirst: "पहला विषय जोड़कर शुरू करें।", noSubjectsSecond: "यहाँ पहले सत्र के जुड़े विषय दिखाई देंगे, और ज़रूरत हो तो दूसरे सत्र के विषय भी जोड़ सकते हैं।", noSubjectsDesired: "विषय जोड़ें ताकि यहाँ लक्ष्य ग्रेड सेट कर सकें।", subjectName: "विषय का नाम", subjectPlaceholder: "उदाहरण: गणित", suggestedSubjects: "सुझाए गए विषय", subjectInputHint: "सूची में नहीं है? खुद लिखें।", extraBadge: "अतिरिक्त", average: "औसत", grades: "ग्रेड", addGrade: "ग्रेड जोड़ें", invalidGrade: "1-6 दर्ज करें", finalGrade: "अंतिम ग्रेड", desiredGrade: "इच्छित ग्रेड", desiredGradeDesc: "लक्ष्य ग्रेड सेट करें।", desiredGradePlaceholder: "लक्ष्य", statusBetter: "लक्ष्य से बेहतर", statusEqual: "लक्ष्य पर", statusWorse: "लक्ष्य से नीचे", noData: "कोई डेटा नहीं", activePeriod: "सक्रिय अवधि", overallAverage: "कुल औसत", overallAverageDesc: "खाली फ़ील्ड और अमान्य मान नज़रअंदाज़ हो जाते हैं।", finalGradeAverages: "अंतिम ग्रेड का औसत", desiredAverages: "इच्छित ग्रेड का औसत", subjects: "विषय", moodGreat: "तुम बहुत अच्छा कर रहे हो", moodGood: "अच्छी प्रगति", moodPush: "थोड़ा और प्रयास", moodStart: "पहला विषय जोड़ें", moodGoal: "लक्ष्य मोड सक्रिय है", motivation: "स्थिति", schedule: { title: "समय-सारिणी", desc: "स्क्रोल होने वाला दृश्य, समय और विषय सहित।", heroLabel: "भरे हुए पीरियड", boxLabel: "सप्ताह अवलोकन", daysLabel: "दिन", filledLabel: "भरा", time: "समय", subject: "विषय", addPeriod: "पीरियड जोड़ें",
      addRow: "पंक्ति जोड़ें",
      removeRow: "पंक्ति हटाएँ", timePlaceholder: "08:00", subjectPlaceholder: "विषय लिखें", days: { monday: "सोमवार", tuesday: "मंगलवार", wednesday: "बुधवार", thursday: "गुरुवार", friday: "शुक्रवार" } }, subjectSuggestions: ["गणित", "हिन्दी", "अंग्रेज़ी", "जर्मन", "जीवविज्ञान", "रसायन विज्ञान", "भौतिकी", "इतिहास", "भूगोल", "राजनीति", "अर्थशास्त्र", "कंप्यूटर विज्ञान", "कला", "संगीत", "खेल", "फ्रेंच", "स्पैनिश", "लैटिन", "धर्म", "नीति"] },
  ar: { languageName: "العربية", appTitle: "حاسبة الدرجات", schoolName: "المدرسة", schoolPlaceholder: "مثال: Gymnasium am Stadtpark", studentName: "الطالب", studentPlaceholder: "مثال: Max Mustermann", className: "الصف", classPlaceholder: "مثال: 10A", language: "اللغة", settings: "الإعدادات", style: "النمط", customColor: "لون مخصص", reset: "إعادة تعيين", addSubject: "إضافة مادة", addExtraSubject: "إضافة مادة إضافية", addFirstSubject: "إضافة أول مادة", tabs: { first: "الفصل الأول", second: "الفصل الثاني", desired: "الدرجة المطلوبة", schedule: "الجدول" }, secondInfo: "تبقى مواد الفصل الأول مرتبطة هنا، ويمكنك أيضاً إضافة مواد إضافية موجودة فقط في الفصل الثاني.", desiredInfo: "يجمع هذا التبويب المواد من الفصلين ويسمح لك بتحديد الدرجة المطلوبة لكل فترة.", scheduleInfo: "جدول أسبوعي مع 8 حصص افتراضية يومياً.", noSubjectsTitle: "لا توجد مواد بعد", noSubjectsFirst: "ابدأ بإضافة أول مادة.", noSubjectsSecond: "هنا تظهر المواد المرتبطة من الفصل الأول، ويمكنك أيضاً إضافة مواد منفصلة للفصل الثاني.", noSubjectsDesired: "أضف مواد لتحديد الدرجات المطلوبة.", subjectName: "اسم المادة", subjectPlaceholder: "مثال: الرياضيات", suggestedSubjects: "مواد مقترحة", subjectInputHint: "غير موجودة؟ اكتبها بنفسك.", extraBadge: "إضافي", average: "المعدل", grades: "الدرجات", addGrade: "إضافة درجة", invalidGrade: "أدخل 1-6", finalGrade: "الدرجة النهائية", desiredGrade: "الدرجة المطلوبة", desiredGradeDesc: "حدد الدرجة المستهدفة.", desiredGradePlaceholder: "الهدف", statusBetter: "أفضل من الهدف", statusEqual: "على الهدف", statusWorse: "أقل من الهدف", noData: "لا توجد بيانات", activePeriod: "الفترة النشطة", overallAverage: "المعدل العام", overallAverageDesc: "يتم تجاهل الخانات الفارغة والقيم غير الصحيحة تلقائياً.", finalGradeAverages: "متوسط الدرجات النهائية", desiredAverages: "متوسط الدرجات المطلوبة", subjects: "المواد", moodGreat: "أنت تبلي بلاءً رائعاً", moodGood: "تقدم جيد", moodPush: "دفعة إضافية واحدة", moodStart: "أضف أول مادة", moodGoal: "وضع الهدف مفعل", motivation: "الحالة", schedule: { title: "الجدول", desc: "عرض قابل للتمرير مع الوقت والمواد.", heroLabel: "الحصص المعبأة", boxLabel: "نظرة أسبوعية", daysLabel: "الأيام", filledLabel: "معبأ", time: "الوقت", subject: "المادة", addPeriod: "إضافة حصة",
      addRow: "إضافة صف",
      removeRow: "حذف الصف", timePlaceholder: "08:00", subjectPlaceholder: "اكتب المادة", days: { monday: "الاثنين", tuesday: "الثلاثاء", wednesday: "الأربعاء", thursday: "الخميس", friday: "الجمعة" } }, subjectSuggestions: ["الرياضيات", "العربية", "الإنجليزية", "الألمانية", "الأحياء", "الكيمياء", "الفيزياء", "التاريخ", "الجغرافيا", "السياسة", "الاقتصاد", "علوم الحاسوب", "الفن", "الموسيقى", "الرياضة", "الفرنسية", "الإسبانية", "الدين", "الأخلاق"] },
  zh: { languageName: "中文", appTitle: "成绩计算器", schoolName: "学校", schoolPlaceholder: "例如：Gymnasium am Stadtpark", studentName: "学生", studentPlaceholder: "例如：Max Mustermann", className: "班级", classPlaceholder: "例如：10A", language: "语言", settings: "设置", style: "样式", customColor: "自定义颜色", reset: "重置", addSubject: "添加科目", addExtraSubject: "添加额外科目", addFirstSubject: "添加第一个科目", tabs: { first: "上学期", second: "下学期", desired: "目标成绩", schedule: "课程表" }, secondInfo: "上学期的科目会在这里保持关联，你也可以添加只在下学期存在的额外科目。", desiredInfo: "此标签页会合并两个学期的科目，并允许你为每个阶段设置目标成绩。", scheduleInfo: "每周课程表，默认每天 8 节课。", noSubjectsTitle: "还没有科目", noSubjectsFirst: "先添加你的第一个科目。", noSubjectsSecond: "这里会显示与上学期关联的科目，也可以为下学期单独添加额外科目。", noSubjectsDesired: "请先添加科目再设置目标成绩。", subjectName: "科目名称", subjectPlaceholder: "例如：数学", suggestedSubjects: "推荐科目", subjectInputHint: "列表里没有？直接输入。", extraBadge: "额外", average: "平均", grades: "成绩", addGrade: "添加成绩", invalidGrade: "请输入 1-6", finalGrade: "期末成绩", desiredGrade: "目标成绩", desiredGradeDesc: "为每个学期设置目标成绩。", desiredGradePlaceholder: "目标", statusBetter: "优于目标", statusEqual: "达到目标", statusWorse: "低于目标", noData: "无数据", activePeriod: "当前阶段", overallAverage: "总平均分", overallAverageDesc: "空白字段和无效值会被自动忽略。", finalGradeAverages: "期末成绩平均值", desiredAverages: "目标成绩平均值", subjects: "科目", moodGreat: "你做得很棒", moodGood: "进展不错", moodPush: "再加把劲", moodStart: "添加第一个科目", moodGoal: "目标模式已开启", motivation: "状态", schedule: { title: "课程表", desc: "可滚动查看时间和科目。", heroLabel: "已填写课程", boxLabel: "一周概览", daysLabel: "天数", filledLabel: "已填写", time: "时间", subject: "科目", addPeriod: "添加课程",
      addRow: "添加一行",
      removeRow: "删除一行", timePlaceholder: "08:00", subjectPlaceholder: "输入科目", days: { monday: "周一", tuesday: "周二", wednesday: "周三", thursday: "周四", friday: "周五" } }, subjectSuggestions: ["数学", "中文", "英语", "德语", "生物", "化学", "物理", "历史", "地理", "政治", "经济", "计算机科学", "美术", "音乐", "体育", "法语", "西班牙语", "拉丁语", "宗教", "伦理"] },
} as const;


const SCHEDULE_TEXTS: Record<Lang, typeof T.en.schedule> = {
  en: T.en.schedule,
  de: T.de.schedule,
  sr: T.sr.schedule,
  fr: { title: "Emploi du temps", desc: "Vue défilante avec heures et matières.", heroLabel: "Cours remplis", boxLabel: "Vue semaine", daysLabel: "Jours", filledLabel: "Rempli", time: "Heure", subject: "Matière", addPeriod: "Ajouter un cours",
      addRow: "Ajouter une ligne",
      removeRow: "Supprimer la ligne", timePlaceholder: "08:00", subjectPlaceholder: "Saisir une matière", days: { monday: "Lundi", tuesday: "Mardi", wednesday: "Mercredi", thursday: "Jeudi", friday: "Vendredi" } },
  es: { title: "Horario", desc: "Vista desplazable con horas y asignaturas.", heroLabel: "Clases completas", boxLabel: "Resumen semanal", daysLabel: "Días", filledLabel: "Lleno", time: "Hora", subject: "Asignatura", addPeriod: "Añadir clase",
      addRow: "Añadir fila",
      removeRow: "Quitar fila", timePlaceholder: "08:00", subjectPlaceholder: "Escribe asignatura", days: { monday: "Lunes", tuesday: "Martes", wednesday: "Miércoles", thursday: "Jueves", friday: "Viernes" } },
  it: { title: "Orario", desc: "Vista scorrevole con orari e materie.", heroLabel: "Lezioni compilate", boxLabel: "Panoramica settimana", daysLabel: "Giorni", filledLabel: "Compilato", time: "Orario", subject: "Materia", addPeriod: "Aggiungi ora",
      addRow: "Aggiungi riga",
      removeRow: "Rimuovi riga", timePlaceholder: "08:00", subjectPlaceholder: "Scrivi materia", days: { monday: "Lunedì", tuesday: "Martedì", wednesday: "Mercoledì", thursday: "Giovedì", friday: "Venerdì" } },
  ru: { title: "Расписание", desc: "Прокручиваемый вид со временем и предметами.", heroLabel: "Заполненные уроки", boxLabel: "Обзор недели", daysLabel: "Дни", filledLabel: "Заполнено", time: "Время", subject: "Предмет", addPeriod: "Добавить урок",
      addRow: "Добавить ряд",
      removeRow: "Удалить ряд", timePlaceholder: "08:00", subjectPlaceholder: "Введите предмет", days: { monday: "Понедельник", tuesday: "Вторник", wednesday: "Среда", thursday: "Четверг", friday: "Пятница" } },
  hi: { title: "समय-सारिणी", desc: "स्क्रोल होने वाला दृश्य, समय और विषय सहित।", heroLabel: "भरे हुए पीरियड", boxLabel: "सप्ताह अवलोकन", daysLabel: "दिन", filledLabel: "भरा", time: "समय", subject: "विषय", addPeriod: "पीरियड जोड़ें",
      addRow: "पंक्ति जोड़ें",
      removeRow: "पंक्ति हटाएँ", timePlaceholder: "08:00", subjectPlaceholder: "विषय लिखें", days: { monday: "सोमवार", tuesday: "मंगलवार", wednesday: "बुधवार", thursday: "गुरुवार", friday: "शुक्रवार" } },
  ar: { title: "الجدول", desc: "عرض قابل للتمرير مع الوقت والمواد.", heroLabel: "الحصص المعبأة", boxLabel: "نظرة أسبوعية", daysLabel: "الأيام", filledLabel: "معبأ", time: "الوقت", subject: "المادة", addPeriod: "إضافة حصة",
      addRow: "إضافة صف",
      removeRow: "حذف الصف", timePlaceholder: "08:00", subjectPlaceholder: "اكتب المادة", days: { monday: "الاثنين", tuesday: "الثلاثاء", wednesday: "الأربعاء", thursday: "الخميس", friday: "الجمعة" } },
  zh: { title: "课程表", desc: "可滚动查看时间和科目。", heroLabel: "已填写课程", boxLabel: "一周概览", daysLabel: "天数", filledLabel: "已填写", time: "时间", subject: "科目", addPeriod: "添加课程",
      addRow: "添加一行",
      removeRow: "删除一行", timePlaceholder: "08:00", subjectPlaceholder: "输入科目", days: { monday: "周一", tuesday: "周二", wednesday: "周三", thursday: "周四", friday: "周五" } },
};

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

function emptySubject(overrides: Partial<Subject> = {}): Subject {
  return { id: randomId(), name: "", grades: Array(DEFAULT_GRADE_FIELDS).fill(""), finalGrade: "", origin: "linked", ...overrides };
}

function emptySchedule(): ScheduleState {
  return Object.fromEntries(DAYS.map((day) => [day, Array.from({ length: DEFAULT_SCHEDULE_ROW_COUNT }, (_, i) => ({ id: randomId(), time: DEFAULT_TIMES[i] || "", subject: "" }))])) as ScheduleState;
}

function normalizeSchedule(schedule: unknown): ScheduleState {
  const base = emptySchedule();
  if (!schedule || typeof schedule !== "object") return base;
  const src = schedule as Record<string, ScheduleSlot[]>;
  return Object.fromEntries(
    DAYS.map((day) => {
      const items = Array.isArray(src[day]) ? src[day] : [];
      const normalized = items.map((slot, i) => ({ id: slot?.id || randomId(), time: slot?.time ?? DEFAULT_TIMES[i] ?? "", subject: slot?.subject ?? "" }));
      while (normalized.length < DEFAULT_SCHEDULE_ROW_COUNT) normalized.push({ id: randomId(), time: DEFAULT_TIMES[normalized.length] || "", subject: "" });
      return [day, normalized];
    })
  ) as ScheduleState;
}

function initialState(): AppState {
  return { activeTab: "first", selectedStyle: "classic", customHue: 220, language: "de", schoolName: "", studentName: "", className: "", periods: { first: { subjects: [] }, second: { subjects: [] } }, desiredGrades: {}, schedule: emptySchedule() };
}

function num(value: string) {
  if ((value || "").trim() === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1 || n > 6) return null;
  return n;
}

function sanitizeGrade(value: string) {
  return value.replace(/[^1-6]/g, "").slice(0, 1);
}

function formatTimeInput(value: string) {
  const digits = (value || "").replace(/[^0-9]/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function avg(values: string[]) {
  const valid = values.map(num).filter((v): v is number => v !== null);
  if (!valid.length) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function fmtAvg(value: number | null) {
  return value === null ? "—" : value.toFixed(2);
}

function syncSecond(first: Subject[], second: Subject[]) {
  const linked = first.map((s) => {
    const existing = second.find((x) => x.id === s.id && x.origin === "linked");
    return existing ? { ...existing, name: s.name, origin: "linked" as const } : emptySubject({ id: s.id, name: s.name, origin: "linked" });
  });
  const extra = second.filter((s) => s.origin === "extra");
  return [...linked, ...extra];
}

function desiredSubjects(first: Subject[], second: Subject[]) {
  const map = new Map<string, Pick<Subject, "id" | "name" | "origin">>();
  [...first, ...second].forEach((s) => {
    if (!map.has(s.id)) map.set(s.id, { id: s.id, name: s.name, origin: s.origin });
  });
  return Array.from(map.values());
}

function syncDesired(items: ReturnType<typeof desiredSubjects>, current: DesiredGrades) {
  return Object.fromEntries(items.map((s) => [s.id, { first: current?.[s.id]?.first || "", second: current?.[s.id]?.second || "" }])) as DesiredGrades;
}

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function hsla(h: number, s: number, l: number, a = 1) {
  return `hsla(${h}, ${s}%, ${l}%, ${a})`;
}

function normalizeName(name: string) {
  return (name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function subjectIcon(name: string) {
  const value = normalizeName(name);
  if (["mat", "math", "mathe", "matemat"].some((x) => value.includes(x))) return "∑";
  if (["bio", "biolog"].some((x) => value.includes(x))) return "🧬";
  if (["chem", "hem"].some((x) => value.includes(x))) return "🧪";
  if (["phys", "fiz"].some((x) => value.includes(x))) return "⚛";
  if (["gesch", "histo", "istor"].some((x) => value.includes(x))) return "🏛";
  if (["geo", "erd", "geograf"].some((x) => value.includes(x))) return "🌍";
  if (["politik", "polit", "econom", "ekonom", "wirtschaft"].some((x) => value.includes(x))) return "📊";
  if (["info", "informat", "computer"].some((x) => value.includes(x))) return "💻";
  if (["kunst", "art", "likov"].some((x) => value.includes(x))) return "🎨";
  if (["musik", "music", "muz"].some((x) => value.includes(x))) return "🎵";
  if (["sport", "fizick", "physical"].some((x) => value.includes(x))) return "🏃";
  if (["engl", "deutsch", "german", "franz", "french", "span", "ital", "serb", "srp", "lang"].some((x) => value.includes(x))) return "🗣";
  return "📘";
}

function targetStatus(current: number | null, desired: string) {
  const d = num(desired);
  if (current === null || d === null) return "none";
  if (current < d) return "better";
  if (current > d) return "worse";
  return "equal";
}

function targetProgress(current: number | null, desired: string) {
  const d = num(desired);
  if (current === null || d === null) return null;
  const maxDistance = 6 - d;
  if (maxDistance <= 0) return current <= d ? 100 : 0;
  return Math.max(0, Math.min(100, ((6 - current) / maxDistance) * 100));
}

function statusUi(status: string, t: typeof T.en) {
  if (status === "better") return { symbol: "↑", label: t.statusBetter, className: "border-green-200 bg-green-50 text-green-700" };
  if (status === "worse") return { symbol: "↓", label: t.statusWorse, className: "border-red-200 bg-red-50 text-red-700" };
  if (status === "equal") return { symbol: "=", label: t.statusEqual, className: "border-blue-200 bg-blue-50 text-blue-700" };
  return { symbol: "•", label: t.noData, className: "border-slate-200 bg-slate-50 text-slate-500" };
}

function motivation({ isDesired, overall, desiredOverall, count, t }: { isDesired: boolean; overall: number | null; desiredOverall: number | null; count: number; t: typeof T.en }) {
  if (isDesired) {
    if (desiredOverall === null) return { label: t.moodStart, className: "border-slate-200 bg-slate-50 text-slate-600" };
    return { label: t.moodGoal, className: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700" };
  }
  if (!count || overall === null) return { label: t.moodStart, className: "border-slate-200 bg-slate-50 text-slate-600" };
  if (overall <= 2) return { label: t.moodGreat, className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
  if (overall <= 3.2) return { label: t.moodGood, className: "border-sky-200 bg-sky-50 text-sky-700" };
  return { label: t.moodPush, className: "border-amber-200 bg-amber-50 text-amber-700" };
}

const APP_INFO = {
  creator: "Your name / studio",
  websiteLabel: "Website",
  websiteUrl: "",
  forumLabel: "Forum",
  forumUrl: "",
  instagramLabel: "Instagram",
  instagramUrl: "",
  discordLabel: "Discord",
  discordUrl: "",
  emailLabel: "Email",
  emailValue: "",
  videos: [
    { title: "How to use the app", url: "" },
    { title: "Schedule tab guide", url: "" },
  ],
};

const INFO_TEXT = {
  button: "Info",
  title: "App Information",
  madeBy: "Made by",
  links: "Links",
  videos: "Video Guides",
  empty: "Add your link here",
};

const THEMES = {
  classic: { pageBg: "bg-[radial-gradient(circle_at_18%_16%,_rgba(255,255,255,0.95),_transparent_12%),radial-gradient(circle_at_76%_18%,_rgba(255,255,255,0.88),_transparent_14%),radial-gradient(circle_at_top,_rgba(147,197,253,0.34),_transparent_34%),linear-gradient(to_bottom,_#eff6ff,_#dbeafe_44%,_#f8fbff)]", panel: "border border-white/75 bg-white/68 shadow-[0_14px_55px_rgba(59,130,246,0.10)]", card: "border border-white/70 bg-white/66 shadow-[0_14px_42px_rgba(59,130,246,0.10)]", sidePanel: "border border-white/80 bg-white/80 shadow-[0_14px_52px_rgba(59,130,246,0.10)]", activeTab: "bg-sky-600 text-white shadow-[0_10px_24px_rgba(14,116,144,0.20)]", primaryButton: "bg-sky-600 text-white shadow-[0_16px_40px_rgba(14,116,144,0.22)] hover:bg-sky-700", heroCard: "bg-gradient-to-br from-sky-600 to-blue-500 text-white shadow-[0_14px_34px_rgba(59,130,246,0.24)]", averagesBox: "border border-sky-200 bg-gradient-to-br from-sky-50 to-white shadow-[0_10px_24px_rgba(59,130,246,0.10)]", averagesLabel: "text-sky-700", secondInfo: "border border-sky-100 bg-sky-50/85 text-slate-700", secondInfoIcon: "text-sky-600", desiredInfo: "border border-blue-100 bg-blue-50/85 text-slate-700", desiredInfoIcon: "text-blue-600", iconBubble: "bg-sky-100 text-sky-700", desiredBubble: "bg-blue-100 text-blue-700", extraBadge: "bg-sky-50 text-sky-700", finalBox: "border-2 border-sky-300 bg-gradient-to-br from-sky-50 to-white shadow-[0_8px_18px_rgba(59,130,246,0.12)]", finalLabel: "text-sky-700", finalInput: "border-sky-300 focus:border-sky-500 focus:ring-sky-100" },
  lavender: { pageBg: "bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.18),_transparent_26%),linear-gradient(to_bottom,_#faf5ff,_#eef2ff_52%,_#fff7ed)]", panel: "border border-white/80 bg-white/72 shadow-[0_16px_56px_rgba(139,92,246,0.10)]", card: "border border-white/78 bg-white/70 shadow-[0_16px_42px_rgba(139,92,246,0.10)]", sidePanel: "border border-white/80 bg-white/85 shadow-[0_16px_56px_rgba(139,92,246,0.10)]", activeTab: "bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-[0_10px_24px_rgba(168,85,247,0.24)]", primaryButton: "bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-[0_16px_36px_rgba(168,85,247,0.22)] hover:from-violet-700 hover:to-fuchsia-600", heroCard: "bg-gradient-to-br from-violet-700 to-fuchsia-500 text-white shadow-[0_16px_34px_rgba(168,85,247,0.24)]", averagesBox: "border border-violet-200 bg-gradient-to-br from-violet-50 to-white shadow-[0_10px_24px_rgba(168,85,247,0.10)]", averagesLabel: "text-violet-700", secondInfo: "border border-violet-100 bg-violet-50/80 text-slate-700", secondInfoIcon: "text-violet-600", desiredInfo: "border border-fuchsia-100 bg-fuchsia-50/80 text-slate-700", desiredInfoIcon: "text-fuchsia-600", iconBubble: "bg-violet-100 text-violet-700", desiredBubble: "bg-fuchsia-100 text-fuchsia-700", extraBadge: "bg-fuchsia-50 text-fuchsia-700", finalBox: "border-2 border-violet-300 bg-gradient-to-br from-violet-50 to-white shadow-[0_8px_18px_rgba(168,85,247,0.12)]", finalLabel: "text-violet-700", finalInput: "border-violet-300 focus:border-violet-500 focus:ring-violet-100" },
  mint: { pageBg: "bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_26%),linear-gradient(to_bottom,_#f0fdf4,_#ecfeff_52%,_#f8fafc)]", panel: "border border-white/80 bg-white/72 shadow-[0_16px_56px_rgba(16,185,129,0.10)]", card: "border border-white/78 bg-white/70 shadow-[0_16px_42px_rgba(16,185,129,0.10)]", sidePanel: "border border-white/80 bg-white/85 shadow-[0_16px_56px_rgba(16,185,129,0.10)]", activeTab: "bg-gradient-to-r from-emerald-600 to-cyan-500 text-white shadow-[0_10px_24px_rgba(16,185,129,0.22)]", primaryButton: "bg-gradient-to-r from-emerald-600 to-cyan-500 text-white shadow-[0_16px_36px_rgba(16,185,129,0.22)] hover:from-emerald-700 hover:to-cyan-600", heroCard: "bg-gradient-to-br from-emerald-700 to-cyan-500 text-white shadow-[0_16px_34px_rgba(16,185,129,0.24)]", averagesBox: "border border-cyan-200 bg-gradient-to-br from-cyan-50 to-white shadow-[0_10px_24px_rgba(34,211,238,0.10)]", averagesLabel: "text-cyan-700", secondInfo: "border border-cyan-100 bg-cyan-50/80 text-slate-700", secondInfoIcon: "text-cyan-600", desiredInfo: "border border-emerald-100 bg-emerald-50/80 text-slate-700", desiredInfoIcon: "text-emerald-600", iconBubble: "bg-emerald-100 text-emerald-700", desiredBubble: "bg-teal-100 text-teal-700", extraBadge: "bg-emerald-50 text-emerald-700", finalBox: "border-2 border-cyan-300 bg-gradient-to-br from-cyan-50 to-white shadow-[0_8px_18px_rgba(34,211,238,0.12)]", finalLabel: "text-cyan-700", finalInput: "border-cyan-300 focus:border-cyan-500 focus:ring-cyan-100" },
  sunset: { pageBg: "bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.18),_transparent_26%),linear-gradient(to_bottom,_#fff7ed,_#fef2f2_52%,_#f8fafc)]", panel: "border border-white/80 bg-white/72 shadow-[0_16px_56px_rgba(249,115,22,0.10)]", card: "border border-white/78 bg-white/70 shadow-[0_16px_42px_rgba(249,115,22,0.10)]", sidePanel: "border border-white/80 bg-white/85 shadow-[0_16px_56px_rgba(249,115,22,0.10)]", activeTab: "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-[0_10px_24px_rgba(249,115,22,0.22)]", primaryButton: "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-[0_16px_36px_rgba(249,115,22,0.22)] hover:from-orange-600 hover:to-rose-600", heroCard: "bg-gradient-to-br from-orange-600 to-rose-500 text-white shadow-[0_16px_34px_rgba(249,115,22,0.24)]", averagesBox: "border border-orange-200 bg-gradient-to-br from-orange-50 to-white shadow-[0_10px_24px_rgba(249,115,22,0.10)]", averagesLabel: "text-orange-700", secondInfo: "border border-orange-100 bg-orange-50/80 text-slate-700", secondInfoIcon: "text-orange-600", desiredInfo: "border border-rose-100 bg-rose-50/80 text-slate-700", desiredInfoIcon: "text-rose-600", iconBubble: "bg-orange-100 text-orange-700", desiredBubble: "bg-rose-100 text-rose-700", extraBadge: "bg-rose-50 text-rose-700", finalBox: "border-2 border-orange-300 bg-gradient-to-br from-orange-50 to-white shadow-[0_8px_18px_rgba(249,115,22,0.12)]", finalLabel: "text-orange-700", finalInput: "border-orange-300 focus:border-orange-500 focus:ring-orange-100" },
  graphite: { pageBg: "bg-[radial-gradient(circle_at_top,_rgba(71,85,105,0.12),_transparent_26%),linear-gradient(to_bottom,_#f8fafc,_#e2e8f0_52%,_#f8fafc)]", panel: "border border-slate-200/80 bg-white/76 shadow-[0_16px_56px_rgba(51,65,85,0.10)]", card: "border border-slate-200/80 bg-white/78 shadow-[0_16px_42px_rgba(51,65,85,0.10)]", sidePanel: "border border-slate-200/80 bg-white/82 shadow-[0_16px_56px_rgba(51,65,85,0.10)]", activeTab: "bg-gradient-to-r from-slate-700 to-slate-900 text-white shadow-[0_10px_24px_rgba(51,65,85,0.22)]", primaryButton: "bg-gradient-to-r from-slate-700 to-slate-900 text-white shadow-[0_16px_36px_rgba(51,65,85,0.20)] hover:from-slate-800 hover:to-black", heroCard: "bg-gradient-to-br from-slate-800 to-black text-white shadow-[0_16px_34px_rgba(15,23,42,0.24)]", averagesBox: "border border-slate-200 bg-gradient-to-br from-slate-50 to-white shadow-[0_10px_24px_rgba(51,65,85,0.10)]", averagesLabel: "text-slate-700", secondInfo: "border border-slate-200 bg-slate-50 text-slate-700", secondInfoIcon: "text-slate-600", desiredInfo: "border border-slate-200 bg-slate-50 text-slate-700", desiredInfoIcon: "text-slate-600", iconBubble: "bg-slate-100 text-slate-700", desiredBubble: "bg-slate-200 text-slate-700", extraBadge: "bg-slate-100 text-slate-700", finalBox: "border-2 border-slate-300 bg-gradient-to-br from-slate-50 to-white shadow-[0_8px_18px_rgba(51,65,85,0.12)]", finalLabel: "text-slate-700", finalInput: "border-slate-300 focus:border-slate-500 focus:ring-slate-100" },
  custom: { pageBg: "bg-[radial-gradient(circle_at_top,_rgba(191,219,254,0.32),_transparent_28%),linear-gradient(to_bottom,_#f8fafc,_#eef2ff_55%,_#f8fafc)]", panel: "border border-white/80 bg-white/72 shadow-[0_16px_56px_rgba(59,130,246,0.10)]", card: "border border-white/78 bg-white/70 shadow-[0_16px_42px_rgba(59,130,246,0.10)]", sidePanel: "border border-white/80 bg-white/82 shadow-[0_16px_56px_rgba(59,130,246,0.10)]", activeTab: "bg-slate-900 text-white shadow-[0_8px_24px_rgba(15,23,42,0.16)]", primaryButton: "bg-slate-900 text-white shadow-[0_16px_40px_rgba(15,23,42,0.22)] hover:bg-slate-800", heroCard: "bg-slate-900 text-white shadow-[0_12px_30px_rgba(15,23,42,0.24)]", averagesBox: "border border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-[0_10px_24px_rgba(59,130,246,0.10)]", averagesLabel: "text-blue-700", secondInfo: "border border-blue-100 bg-blue-50/80 text-slate-700", secondInfoIcon: "text-blue-600", desiredInfo: "border border-emerald-100 bg-emerald-50/80 text-slate-700", desiredInfoIcon: "text-emerald-600", iconBubble: "bg-slate-100 text-slate-700", desiredBubble: "bg-emerald-50 text-emerald-700", extraBadge: "bg-emerald-50 text-emerald-700", finalBox: "border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-white shadow-[0_8px_18px_rgba(59,130,246,0.12)]", finalLabel: "text-blue-700", finalInput: "border-blue-300 focus:border-blue-500 focus:ring-blue-100" },
} as const;


export default function App() {
  const [state, setState] = useState<AppState>(() => {
    if (typeof window === "undefined") return initialState();
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return initialState();
      const parsed = JSON.parse(raw);
      const first = (parsed?.periods?.first?.subjects || []).map((s: Subject) => ({ ...s, origin: "linked" as const }));
      const second = syncSecond(first, (parsed?.periods?.second?.subjects || []).map((s: Subject) => ({ ...s, origin: s.origin === "extra" ? "extra" : "linked" })));
      const desired = desiredSubjects(first, second);
      return {
        activeTab: parsed.activeTab || "first",
        selectedStyle: parsed.selectedStyle || "classic",
        customHue: typeof parsed.customHue === "number" ? parsed.customHue : 220,
        language: parsed.language || "de",
        schoolName: parsed.schoolName || "",
        studentName: parsed.studentName || "",
        className: parsed.className || "",
        periods: { first: { subjects: first }, second: { subjects: second } },
        desiredGrades: syncDesired(desired, parsed.desiredGrades || {}),
        schedule: normalizeSchedule(parsed.schedule),
      };
    } catch {
      return initialState();
    }
  });

  const [openSubjectPickerId, setOpenSubjectPickerId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [langMenuPos, setLangMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const pendingScrollSubjectId = useRef<string | null>(null);
  const langButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (!pendingScrollSubjectId.current) return;
    const id = pendingScrollSubjectId.current;
    const frame = window.requestAnimationFrame(() => {
      const element = document.getElementById(`subject-card-${id}`);
      if (element) element.scrollIntoView({ behavior: "smooth", block: "center" });
      pendingScrollSubjectId.current = null;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [state.periods.first.subjects, state.periods.second.subjects, state.activeTab]);

  const t = ((T as unknown) as Record<string, typeof T.en>)[state.language] || T.en;
  const theme = THEMES[state.selectedStyle];
  const isCustomStyle = state.selectedStyle === "custom";
  const accentHue = state.customHue;
  const accent = hsla(accentHue, 85, 48);
  const accentDark = hsla(accentHue, 85, 42);
  const accentText = hsla(accentHue, 75, 38);
  const accentSoft = hsla(accentHue, 70, 76);
  const accentTint = hsla(accentHue, 100, 97);
  const accentTintStrong = hsla(accentHue, 100, 95);
  const accentShadow = hsla(accentHue, 85, 48, 0.22);
  const customPageStyle = isCustomStyle ? { backgroundImage: `radial-gradient(circle at top, ${hsla(accentHue, 85, 55, 0.18)}, transparent 26%), linear-gradient(to bottom, #f8fafc, #eef2ff 52%, #ffffff)` } : undefined;

  const isFirstTab = state.activeTab === "first";
  const isSecondTab = state.activeTab === "second";
  const isDesiredTab = state.activeTab === "desired";
  const isScheduleTab = state.activeTab === "schedule";
  const activeSubjects = isDesiredTab || isScheduleTab ? [] : state.periods[state.activeTab].subjects;
  const desired = useMemo(() => desiredSubjects(state.periods.first.subjects, state.periods.second.subjects), [state.periods.first.subjects, state.periods.second.subjects]);
  const overallAverage = useMemo(() => (isDesiredTab || isScheduleTab ? null : avg(activeSubjects.flatMap((s) => s.grades))), [activeSubjects, isDesiredTab, isScheduleTab]);
  const firstFinalAverage = useMemo(() => avg(state.periods.first.subjects.map((s) => s.finalGrade)), [state.periods.first.subjects]);
  const secondFinalAverage = useMemo(() => avg(state.periods.second.subjects.map((s) => s.finalGrade)), [state.periods.second.subjects]);
  const firstDesiredAverage = useMemo(() => avg((Object.values(state.desiredGrades) as Array<{ first: string; second: string }>).map((x) => x.first)), [state.desiredGrades]);
  const secondDesiredAverage = useMemo(() => avg((Object.values(state.desiredGrades) as Array<{ first: string; second: string }>).map((x) => x.second)), [state.desiredGrades]);
  const desiredOverallAverage = useMemo(() => {
    const values = Object.values(state.desiredGrades) as Array<{ first: string; second: string }>;
    return avg([...values.map((x) => x.first), ...values.map((x) => x.second)]);
  }, [state.desiredGrades]);
  const motivationBadge = useMemo(() => motivation({ isDesired: isDesiredTab, overall: overallAverage, desiredOverall: desiredOverallAverage, count: activeSubjects.length, t }), [isDesiredTab, overallAverage, desiredOverallAverage, activeSubjects.length, t]);
  const scheduleStats = useMemo(() => {
    const all = DAYS.flatMap((d) => state.schedule[d]);
    return { total: all.length, filled: all.filter((x) => x.subject.trim() !== "").length };
  }, [state.schedule]);
  const scheduleSubjectOptions = useMemo(() => Array.from(new Set([
    ...state.periods.first.subjects.map((s) => s.name),
    ...state.periods.second.subjects.map((s) => s.name),
    ...DAYS.flatMap((d) => state.schedule[d].map((x) => x.subject)),
    ...t.subjectSuggestions,
  ].filter(Boolean))), [state.periods.first.subjects, state.periods.second.subjects, state.schedule, t.subjectSuggestions]);

  const updateTopField = (field: keyof Pick<AppState, "schoolName" | "studentName" | "className" | "language">, value: string) => setState((prev) => ({ ...prev, [field]: value } as AppState));
  const updateSetting = <K extends keyof Pick<AppState, "selectedStyle" | "customHue">>(field: K, value: AppState[K]) => setState((prev) => ({ ...prev, [field]: value }));
  const switchTab = (tab: TabKey) => { setOpenSubjectPickerId(null); setIsSettingsOpen(false); setIsInfoOpen(false); setIsLangOpen(false); setLangMenuPos(null); setState((prev) => ({ ...prev, activeTab: tab })); };

  const setFirstSubjects = (updater: (subjects: Subject[]) => Subject[]) => {
    setState((prev) => {
      const first = updater(prev.periods.first.subjects).map((s) => ({ ...s, origin: "linked" as const }));
      const second = syncSecond(first, prev.periods.second.subjects);
      return { ...prev, periods: { first: { subjects: first }, second: { subjects: second } }, desiredGrades: syncDesired(desiredSubjects(first, second), prev.desiredGrades) };
    });
  };

  const setSecondSubjects = (updater: (subjects: Subject[]) => Subject[]) => {
    setState((prev) => {
      const second = updater(prev.periods.second.subjects);
      return { ...prev, periods: { ...prev.periods, second: { subjects: second } }, desiredGrades: syncDesired(desiredSubjects(prev.periods.first.subjects, second), prev.desiredGrades) };
    });
  };

  const addSubject = () => {
    if (isDesiredTab || isScheduleTab) return;
    const next = emptySubject({ origin: isFirstTab ? "linked" : "extra" });
    pendingScrollSubjectId.current = next.id;
    if (isFirstTab) setFirstSubjects((items) => [...items, next]);
    else setSecondSubjects((items) => [...items, next]);
  };

  const removeSubject = (id: string) => {
    if (isDesiredTab || isScheduleTab) return;
    if (isFirstTab) setFirstSubjects((items) => items.filter((s) => s.id !== id));
    else setSecondSubjects((items) => items.filter((s) => !(s.id === id && s.origin === "extra")));
  };

  const updateSubjectName = (id: string, name: string) => {
    if (isDesiredTab || isScheduleTab) return;
    if (isFirstTab) setFirstSubjects((items) => items.map((s) => (s.id === id ? { ...s, name } : s)));
    else setSecondSubjects((items) => items.map((s) => (s.id === id && s.origin === "extra" ? { ...s, name } : s)));
  };

  const updateGrade = (id: string, index: number, value: string) => {
    const sanitized = sanitizeGrade(value);
    const updater = (items: Subject[]) => items.map((s) => {
      if (s.id !== id) return s;
      const grades = [...s.grades];
      grades[index] = sanitized;
      return { ...s, grades };
    });
    if (isFirstTab) setFirstSubjects(updater);
    else if (isSecondTab) setSecondSubjects(updater);
  };

  const addGradeField = (id: string) => {
    const updater = (items: Subject[]) => items.map((s) => (s.id === id ? { ...s, grades: [...s.grades, ""] } : s));
    if (isFirstTab) setFirstSubjects(updater); else if (isSecondTab) setSecondSubjects(updater);
  };

  const removeGradeField = (id: string, index: number) => {
    const updater = (items: Subject[]) => items.map((s) => (s.id !== id || index < DEFAULT_GRADE_FIELDS ? s : { ...s, grades: s.grades.filter((_, i) => i !== index) }));
    if (isFirstTab) setFirstSubjects(updater); else if (isSecondTab) setSecondSubjects(updater);
  };

  const updateFinalGrade = (id: string, value: string) => {
    const sanitized = sanitizeGrade(value);
    const updater = (items: Subject[]) => items.map((s) => (s.id === id ? { ...s, finalGrade: sanitized } : s));
    if (isFirstTab) setFirstSubjects(updater); else if (isSecondTab) setSecondSubjects(updater);
  };

  const updateDesiredGrade = (id: string, key: "first" | "second", value: string) => {
    const sanitized = sanitizeGrade(value);
    setState((prev) => ({ ...prev, desiredGrades: { ...prev.desiredGrades, [id]: { first: prev.desiredGrades?.[id]?.first || "", second: prev.desiredGrades?.[id]?.second || "", [key]: sanitized } } }));
  };

  const updateScheduleSlot = (day: DayKey, slotId: string, field: "time" | "subject", value: string) => {
    const nextValue = field === "time" ? formatTimeInput(value) : value;
    setState((prev) => ({ ...prev, schedule: { ...prev.schedule, [day]: prev.schedule[day].map((slot) => (slot.id === slotId ? { ...slot, [field]: nextValue } : slot)) } }));
  };
  const addScheduleRow = () => setState((prev) => {
    const currentCount = Math.max(...DAYS.map((d) => prev.schedule[d].length), DEFAULT_SCHEDULE_ROW_COUNT);
    return { ...prev, schedule: Object.fromEntries(DAYS.map((day) => [day, [...prev.schedule[day], { id: randomId(), time: DEFAULT_TIMES[currentCount] || "", subject: "" }]])) as ScheduleState };
  });
  const removeScheduleRow = (rowIndex: number) => setState((prev) => {
    const currentCount = Math.max(...DAYS.map((d) => prev.schedule[d].length), 0);
    if (currentCount <= 1) return prev;
    return { ...prev, schedule: Object.fromEntries(DAYS.map((day) => [day, prev.schedule[day].filter((_, i) => i !== rowIndex)])) as ScheduleState };
  });

  const toggleLangMenu = () => {
    if (isLangOpen) {
      setIsLangOpen(false);
      setLangMenuPos(null);
      return;
    }
    const rect = langButtonRef.current?.getBoundingClientRect();
    if (rect) {
      setLangMenuPos({ top: rect.bottom + 8, left: rect.left, width: rect.width });
    }
    setIsLangOpen(true);
  };

  const resetAll = () => {
    const next = initialState();
    next.language = state.language;
    next.selectedStyle = state.selectedStyle;
    next.customHue = state.customHue;
    setOpenSubjectPickerId(null);
    setIsSettingsOpen(false);
    setIsInfoOpen(false);
    pendingScrollSubjectId.current = null;
    setState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const renderMainContent = () => {
    if (isScheduleTab) {
      const scheduleRowCount = Math.max(...DAYS.map((day) => state.schedule[day].length), DEFAULT_SCHEDULE_ROW_COUNT);
      const scheduleRows = Array.from({ length: scheduleRowCount }, (_, index) => ({
        index,
        time: state.schedule[DAYS[0]]?.[index]?.time || DEFAULT_TIMES[index] || "",
      }));

      return (
        <section className="overflow-x-auto pb-24">
          <datalist id="schedule-subject-options">
            {scheduleSubjectOptions.map((option) => <option key={option} value={option} />)}
          </datalist>
          <div className="mb-3 flex items-center justify-start gap-2">
            <button type="button" onClick={() => removeScheduleRow(scheduleRows.length - 1)} disabled={scheduleRows.length <= 1} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" aria-label={t.schedule.removeRow || 'Remove row'}><Minus className="h-4 w-4" /></button>
            <button type="button" onClick={addScheduleRow} className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl text-sm font-medium transition hover:-translate-y-0.5", theme.primaryButton)} style={isCustomStyle ? { background: accent, boxShadow: `0 12px 24px ${accentShadow}`, color: "white" } : undefined} aria-label={t.schedule.addRow || t.schedule.addPeriod}><Plus className="h-4 w-4" /></button>
          </div>
          <div className={cn("min-w-[920px] overflow-hidden rounded-[24px] border border-white/50 backdrop-blur-2xl backdrop-saturate-150", theme.card)}>
            <div className="grid grid-cols-[96px_repeat(5,minmax(150px,1fr))] border-b border-slate-200/80 bg-white/65 text-sm font-semibold text-slate-900">
              <div className="px-3 py-3 text-[11px] uppercase tracking-[0.14em] text-slate-500">{t.schedule.time}</div>
              {DAYS.map((day) => <div key={day} className="border-l border-slate-200/80 px-3 py-3 text-center">{t.schedule.days[day]}</div>)}
            </div>
            {scheduleRows.map((row) => (
              <div key={row.index} className="grid grid-cols-[96px_repeat(5,minmax(150px,1fr))] border-b border-slate-200/70 last:border-b-0">
                <div className="bg-slate-50/80 px-2 py-2">
                  <input value={state.schedule[DAYS[0]]?.[row.index]?.time || row.time} onChange={(e) => updateScheduleSlot(DAYS[0], state.schedule[DAYS[0]][row.index].id, "time", e.target.value)} placeholder={t.schedule.timePlaceholder} className="w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-center text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70" />
                </div>
                {DAYS.map((day) => {
                  const slot = state.schedule[day]?.[row.index];
                  return (
                    <div key={`${day}-${row.index}`} className="border-l border-slate-200/70 bg-white/70 p-2">
                      <input list="schedule-subject-options" value={slot?.subject || ""} onChange={(e) => slot && updateScheduleSlot(day, slot.id, "subject", e.target.value)} placeholder={t.schedule.subjectPlaceholder} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70" />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (isDesiredTab) {
      if (!desired.length) {
        return <section className={cn("rounded-[28px] border border-dashed border-slate-300/90 p-8 text-center shadow-[0_12px_40px_rgba(15,23,42,0.04)] backdrop-blur-xl sm:p-10", theme.card)}><div className={cn("mx-auto flex h-14 w-14 items-center justify-center rounded-2xl", theme.iconBubble)}><Target className="h-6 w-6" /></div><h2 className="mt-4 text-xl font-semibold text-slate-900">{t.noSubjectsTitle}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 sm:text-base">{t.noSubjectsDesired}</p></section>;
      }
      return (
        <section className="grid gap-4 pb-24 lg:grid-cols-2">
          {desired.map((subject, index) => {
            const firstSubject = state.periods.first.subjects.find((x) => x.id === subject.id);
            const secondSubject = state.periods.second.subjects.find((x) => x.id === subject.id);
            const firstAverage = firstSubject ? avg(firstSubject.grades) : null;
            const secondAverage = secondSubject ? avg(secondSubject.grades) : null;
            const firstDesired = state.desiredGrades?.[subject.id]?.first || "";
            const secondDesired = state.desiredGrades?.[subject.id]?.second || "";
            const firstUi = statusUi(targetStatus(firstAverage, firstDesired), t);
            const secondUi = statusUi(targetStatus(secondAverage, secondDesired), t);
            const firstProgress = targetProgress(firstAverage, firstDesired);
            const secondProgress = targetProgress(secondAverage, secondDesired);
            return (
              <article key={subject.id} id={`subject-card-${subject.id}`} className={cn("rounded-[24px] border border-white/50 p-4 backdrop-blur-2xl backdrop-saturate-150 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_44px_rgba(15,23,42,0.10)]", theme.card)}>
                <div className="flex flex-wrap items-start gap-3">
                  <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-base font-semibold", theme.desiredBubble)} style={isCustomStyle ? { background: accentTintStrong, color: accentText } : undefined}>{subjectIcon(subject.name)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-900">{subject.name || t.subjectPlaceholder}</div>
                    <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">#{index + 1}</div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[
                    { title: t.tabs.first, desired: firstDesired, average: firstAverage, ui: firstUi, progress: firstProgress, period: "first" as const },
                    { title: t.tabs.second, desired: secondDesired, average: secondAverage, ui: secondUi, progress: secondProgress, period: "second" as const },
                  ].map((item) => (
                    <div key={item.period} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">{item.title}</div>
                      <input inputMode="numeric" maxLength={1} value={item.desired} onChange={(e) => updateDesiredGrade(subject.id, item.period, e.target.value)} placeholder={t.desiredGradePlaceholder} className="mt-2 w-full rounded-xl border border-emerald-200 bg-white px-2.5 py-1.5 text-center text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100" />
                      <div className={cn("mt-2 rounded-xl border px-2 py-1 text-[11px] font-medium", item.ui.className)}><span className="mr-1 font-semibold">{item.ui.symbol}</span>{item.ui.label}</div>
                      <div className="mt-2 rounded-xl border border-slate-200 bg-white px-2 py-2 text-[11px] text-slate-600">
                        <div className="flex items-center justify-between gap-2"><span className="font-medium text-slate-500">{fmtAvg(item.average)} → {item.desired || "—"}</span><span className="font-semibold text-slate-900">{item.progress === null ? "—" : `${Math.round(item.progress)}%`}</span></div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${item.progress || 0}%` }} /></div>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </section>
      );
    }

    if (!activeSubjects.length) {
      return <section className={cn("rounded-[28px] border border-dashed border-slate-300/90 p-8 text-center shadow-[0_12px_40px_rgba(15,23,42,0.04)] backdrop-blur-xl sm:p-10", theme.card)}><div className={cn("mx-auto flex h-14 w-14 items-center justify-center rounded-2xl", theme.iconBubble)}><BookOpen className="h-6 w-6" /></div><h2 className="mt-4 text-xl font-semibold text-slate-900">{t.noSubjectsTitle}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 sm:text-base">{isFirstTab ? t.noSubjectsFirst : t.noSubjectsSecond}</p><button type="button" onClick={addSubject} className={cn("mt-6 inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition hover:-translate-y-0.5", theme.primaryButton)} style={isCustomStyle ? { background: accent, boxShadow: `0 16px 36px ${accentShadow}`, color: "white" } : undefined}><Plus className="h-4 w-4" />{isFirstTab ? t.addFirstSubject : t.addSubject}</button></section>;
    }

    return (
      <section className="grid gap-4 overflow-visible pb-24 lg:grid-cols-2">
        {activeSubjects.map((subject, index) => {
          const subjectAverage = avg(subject.grades);
          const filteredSuggestions = t.subjectSuggestions.filter((item) => item.toLowerCase().includes(subject.name.trim().toLowerCase()));
          const editable = isFirstTab || (isSecondTab && subject.origin === "extra");
          const deletable = isFirstTab || (isSecondTab && subject.origin === "extra");
          return (
            <article key={subject.id} id={`subject-card-${subject.id}`} className={cn("relative overflow-visible rounded-[26px] border border-white/50 p-4 backdrop-blur-2xl backdrop-saturate-150 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_48px_rgba(15,23,42,0.10)]", theme.card)}>
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-start gap-3">
                  <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-base font-semibold", theme.iconBubble)}>{subjectIcon(subject.name)}</div>
                  <div className="relative min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2"><label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{t.subjectName} · #{index + 1}</label>{!isFirstTab && subject.origin === "extra" ? <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em]", theme.extraBadge)}>{t.extraBadge}</span> : null}</div>
                    <input value={subject.name} onChange={(e) => updateSubjectName(subject.id, e.target.value)} onFocus={() => editable && setOpenSubjectPickerId(subject.id)} onClick={() => editable && setOpenSubjectPickerId(subject.id)} onBlur={() => window.setTimeout(() => setOpenSubjectPickerId((current) => (current === subject.id ? null : current)), 120)} readOnly={!editable} placeholder={t.subjectPlaceholder} className={cn("w-full rounded-2xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4", editable ? "border-slate-200 focus:border-slate-400 focus:ring-slate-200/70" : "cursor-default border-slate-200 bg-slate-50 text-slate-700")} />
                    {editable ? <p className="mt-2 text-xs leading-5 text-slate-500">{t.subjectInputHint}</p> : null}
                    {editable && openSubjectPickerId === subject.id ? (
                      <div className="mt-2 max-h-56 overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
                        <div className="mb-1 px-2 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">{t.suggestedSubjects}</div>
                        <div className="space-y-1">
                          {(filteredSuggestions.length ? filteredSuggestions : t.subjectSuggestions).map((suggestion) => (
                            <button key={suggestion} type="button" onMouseDown={(e) => { e.preventDefault(); updateSubjectName(subject.id, suggestion); setOpenSubjectPickerId(null); }} className="flex w-full items-center justify-between rounded-2xl bg-white px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"><span>{suggestion}</span><ChevronRight className="h-4 w-4 text-slate-400" /></button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex h-[64px] w-[104px] shrink-0 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-2 text-center"><div className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[9px] font-medium uppercase tracking-[0.08em] text-slate-500">{t.average}</div><div className="mt-1 text-xl font-semibold tracking-tight text-slate-900">{fmtAvg(subjectAverage)}</div></div>
                  {deletable ? <button type="button" onClick={() => removeSubject(subject.id)} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button> : null}
                </div>
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-slate-900">{t.grades}</h3><button type="button" onClick={() => addGradeField(subject.id)} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"><Plus className="h-3.5 w-3.5" />{t.addGrade}</button></div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {subject.grades.map((grade, gradeIndex) => {
                      const hasError = grade.trim() !== "" && num(grade) === null;
                      const canRemove = gradeIndex >= DEFAULT_GRADE_FIELDS;
                      return <div key={`${subject.id}-${gradeIndex}`} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-2"><div className="mb-1.5 flex items-center justify-between"><label className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">G{gradeIndex + 1}</label>{canRemove ? <button type="button" onClick={() => removeGradeField(subject.id, gradeIndex)} className="text-slate-400 transition hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button> : null}</div><input inputMode="numeric" maxLength={1} value={grade} onChange={(e) => updateGrade(subject.id, gradeIndex, e.target.value)} placeholder="1-6" className={cn("w-full rounded-xl border bg-white px-2.5 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4", hasError ? "border-red-300 focus:border-red-400 focus:ring-red-100" : "border-slate-200 focus:border-slate-400 focus:ring-slate-200/70")} /><p className="mt-1 min-h-[14px] text-[10px] leading-4 text-red-500">{hasError ? t.invalidGrade : ""}</p></div>;
                    })}
                  </div>
                </div>
                <div className={cn("rounded-[18px] px-3 py-2", theme.finalBox)} style={isCustomStyle ? { borderColor: accentSoft, background: `linear-gradient(to bottom right, ${accentTint}, white)`, boxShadow: `0 8px 18px ${hsla(accentHue, 85, 48, 0.12)}` } : undefined}><div className="flex items-center justify-between gap-3"><div><div className={cn("text-[10px] font-semibold uppercase tracking-[0.14em]", theme.finalLabel)} style={isCustomStyle ? { color: accentText } : undefined}>{t.finalGrade}</div><div className="mt-0.5 text-[11px] text-slate-500">{tabLabels[state.activeTab]}</div></div><div className="w-16 sm:w-20"><input inputMode="numeric" maxLength={1} value={subject.finalGrade} onChange={(e) => updateFinalGrade(subject.id, e.target.value)} className={cn("w-full rounded-xl border-2 bg-white px-2 py-1.5 text-center text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4", theme.finalInput)} style={isCustomStyle ? { borderColor: hsla(accentHue, 70, 70, 1) } : undefined} /></div></div></div>
              </div>
            </article>
          );
        })}
      </section>
    );
  };

  const flag = LANGUAGES.find((x) => x.key === state.language)?.flag || "🌐";
  const tabLabels = t.tabs;
  const scheduleText = SCHEDULE_TEXTS[state.language] || SCHEDULE_TEXTS.en;

  return (
    <div className={cn("min-h-screen text-slate-900", theme.pageBg)} style={customPageStyle} dir={state.language === "ar" ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <main className="space-y-6 overflow-visible">
            <section className={cn("overflow-visible rounded-[30px] p-5 backdrop-blur-2xl backdrop-saturate-150 sm:p-7", theme.panel)}>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-4xl flex-1">
                  <div className="mb-4 flex items-center gap-3"><div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", theme.iconBubble)}><GraduationCap className="h-5 w-5" /></div><h1 className="text-2xl font-semibold tracking-tight text-slate-900">{t.appTitle}</h1></div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                    <div><label className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{t.schoolName}</label><input value={state.schoolName} onChange={(e) => updateTopField("schoolName", e.target.value)} placeholder={t.schoolPlaceholder} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70" /></div>
                    <div><label className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{t.studentName}</label><input value={state.studentName} onChange={(e) => updateTopField("studentName", e.target.value)} placeholder={t.studentPlaceholder} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70" /></div>
                    <div><label className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{t.className}</label><input value={state.className} onChange={(e) => updateTopField("className", e.target.value)} placeholder={t.classPlaceholder} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70" /></div>
                    <div><label className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{t.language}</label><button ref={langButtonRef} type="button" onClick={toggleLangMenu} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition hover:bg-slate-50 focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70"><span className="flex min-w-0 items-center gap-2 truncate text-left"><img src={FLAG_IMAGES[state.language]} alt="" className="h-4 w-6 rounded-sm object-cover shadow-sm" /><span className="truncate">{LANGUAGES.find((x) => x.key === state.language)?.label}</span></span><span className="ml-3 text-slate-400">▾</span></button></div>
                  </div>
                </div>
                <div className="flex w-full items-center justify-end gap-2 lg:w-auto"><button type="button" onClick={() => { setOpenSubjectPickerId(null); setIsInfoOpen((p) => !p); setIsSettingsOpen(false); }} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50"><InfoIcon className="h-4 w-4" />{INFO_TEXT.button}</button><button type="button" onClick={() => { setOpenSubjectPickerId(null); setIsSettingsOpen((p) => !p); setIsInfoOpen(false); }} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50"><SettingsIcon className="h-4 w-4" />{t.settings}</button></div>
              </div>
              <div className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">{(Object.keys(tabLabels) as TabKey[]).map((tab) => <button key={tab} type="button" onClick={() => switchTab(tab)} className={cn("w-full rounded-2xl px-4 py-3 text-sm font-medium transition", state.activeTab === tab ? theme.activeTab : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50")} style={isCustomStyle && state.activeTab === tab ? { background: accent, boxShadow: `0 10px 24px ${accentShadow}`, color: "white" } : undefined}>{tabLabels[tab]}</button>)}</div>
                <button type="button" onClick={resetAll} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 lg:w-auto"><RotateCcw className="h-4 w-4" />{t.reset}</button>
              </div>
              {isSecondTab ? <div className={cn("mt-4 inline-flex items-start gap-2 rounded-2xl px-3 py-2 text-xs leading-5", theme.secondInfo)} style={isCustomStyle ? { borderColor: accentSoft, background: accentTint } : undefined}><Sparkles className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", theme.secondInfoIcon)} style={isCustomStyle ? { color: accentText } : undefined} />{t.secondInfo}</div> : null}
              {isDesiredTab ? <div className={cn("mt-4 inline-flex items-start gap-2 rounded-2xl px-3 py-2 text-xs leading-5", theme.desiredInfo)} style={isCustomStyle ? { borderColor: accentSoft, background: accentTint } : undefined}><Target className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", theme.desiredInfoIcon)} style={isCustomStyle ? { color: accentText } : undefined} />{t.desiredInfo}</div> : null}
              {isScheduleTab ? <div className={cn("mt-4 inline-flex items-start gap-2 rounded-2xl px-3 py-2 text-xs leading-5", theme.secondInfo)} style={isCustomStyle ? { borderColor: accentSoft, background: accentTint } : undefined}><Sparkles className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", theme.secondInfoIcon)} style={isCustomStyle ? { color: accentText } : undefined} />{t.scheduleInfo}</div> : null}
            </section>
            {renderMainContent()}
          </main>

          <aside className="lg:sticky lg:top-8">
            <div className={cn("overflow-hidden rounded-[30px] p-5 backdrop-blur-2xl backdrop-saturate-150 sm:p-6", theme.sidePanel)}>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium tracking-wide text-slate-600">{t.activePeriod}</div>
              <h2 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">{tabLabels[state.activeTab]}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{isScheduleTab ? t.schedule.desc : isDesiredTab ? t.desiredGradeDesc : t.overallAverageDesc}</p>
              <div className={cn("mt-6 rounded-[24px] p-5 text-white", theme.heroCard)} style={isCustomStyle ? { background: `linear-gradient(135deg, ${accentDark}, ${accent})`, boxShadow: `0 16px 34px ${hsla(accentHue, 85, 48, 0.24)}` } : undefined}>
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-300">{isScheduleTab ? t.schedule.heroLabel : isDesiredTab ? t.desiredGrade : t.overallAverage}</div>
                <div className="mt-2 text-4xl font-semibold tracking-tight">{isScheduleTab ? `${scheduleStats.filled}/${scheduleStats.total}` : fmtAvg(isDesiredTab ? desiredOverallAverage : overallAverage)}</div>
                <p className="mt-3 text-sm leading-6 text-slate-300">{isScheduleTab ? t.schedule.desc : isDesiredTab ? t.desiredGradeDesc : t.overallAverageDesc}</p>
              </div>
              {!isScheduleTab ? <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 backdrop-blur-xl"><div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{t.motivation}</div><div className={cn("mt-2 inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold", motivationBadge.className)}>{motivationBadge.label}</div></div> : null}
              <div className={cn("mt-4 rounded-[22px] p-4", theme.averagesBox)} style={isCustomStyle ? { borderColor: accentSoft, background: `linear-gradient(to bottom right, ${accentTint}, white)`, boxShadow: `0 10px 24px ${hsla(accentHue, 85, 48, 0.1)}` } : undefined}>
                <div className={cn("text-xs font-semibold uppercase tracking-[0.16em]", theme.averagesLabel)} style={isCustomStyle ? { color: accentText } : undefined}>{isScheduleTab ? t.schedule.boxLabel : isDesiredTab ? t.desiredAverages : t.finalGradeAverages}</div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-center"><div className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">{isScheduleTab ? t.schedule.daysLabel : t.tabs.first}</div><div className="mt-1 text-xl font-semibold text-slate-900">{isScheduleTab ? DAYS.length : fmtAvg(isDesiredTab ? firstDesiredAverage : firstFinalAverage)}</div></div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-center"><div className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">{isScheduleTab ? t.schedule.filledLabel : t.tabs.second}</div><div className="mt-1 text-xl font-semibold text-slate-900">{isScheduleTab ? scheduleStats.filled : fmtAvg(isDesiredTab ? secondDesiredAverage : secondFinalAverage)}</div></div>
                </div>
              </div>
              <div className="mt-5 grid gap-3"><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">{isScheduleTab ? t.schedule.filledLabel : t.subjects}</div><div className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{isScheduleTab ? scheduleStats.filled : isDesiredTab ? desired.length : activeSubjects.length}</div></div></div>
              {!isDesiredTab && !isScheduleTab ? <button type="button" onClick={addSubject} className={cn("mt-4 hidden w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition hover:-translate-y-0.5 lg:inline-flex", theme.primaryButton)} style={isCustomStyle ? { background: accent, boxShadow: `0 16px 36px ${accentShadow}`, color: "white" } : undefined}><Plus className="h-4 w-4" />{isFirstTab ? t.addSubject : t.addExtraSubject}</button> : null}
            </div>
          </aside>
        </div>
      </div>
      {isLangOpen && langMenuPos ? createPortal(
        <div className="fixed inset-0 z-[999]" onClick={() => { setIsLangOpen(false); setLangMenuPos(null); }}>
          <div className="absolute max-h-72 overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.16)]" style={{ top: langMenuPos.top, left: langMenuPos.left, width: langMenuPos.width }} onClick={(e) => e.stopPropagation()}>
            {LANGUAGES.map((language) => (
              <button
                key={language.key}
                type="button"
                onClick={() => { updateTopField("language", language.key as Lang); setIsLangOpen(false); setLangMenuPos(null); }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
              >
                <img src={FLAG_IMAGES[language.key]} alt="" className="h-4 w-6 rounded-sm object-cover shadow-sm" />
                <span>{language.label}</span>
              </button>
            ))}
          </div>
        </div>,
        document.body
      ) : null}

      {!isDesiredTab && !isScheduleTab ? <button type="button" onClick={addSubject} className={cn("fixed bottom-4 left-4 right-4 z-40 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition hover:-translate-y-0.5 sm:bottom-6 sm:left-auto sm:right-6 sm:w-auto lg:hidden", theme.primaryButton)} style={isCustomStyle ? { background: accent, boxShadow: `0 16px 36px ${accentShadow}`, color: "white" } : undefined}><Plus className="h-4 w-4" />{isFirstTab ? t.addSubject : t.addExtraSubject}</button> : null}
      {isInfoOpen ? <div className="fixed inset-0 z-[201] flex items-start justify-center p-4 pt-16 sm:pt-24"><button type="button" aria-label="Close info" onClick={() => setIsInfoOpen(false)} className="fixed inset-0 z-[200] bg-slate-900/20 backdrop-blur-[1px]" /><div className="relative z-[201] max-h-[80vh] w-full max-w-lg overflow-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.18)]"><div className="mb-4 flex items-center justify-between gap-3"><div className="text-lg font-semibold text-slate-900">{INFO_TEXT.title}</div><button type="button" onClick={() => setIsInfoOpen(false)} className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50">OK</button></div><div className="space-y-4 text-sm text-slate-700"><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{INFO_TEXT.madeBy}</div><div className="mt-2 font-medium text-slate-900">{APP_INFO.creator}</div></div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{INFO_TEXT.links}</div><div className="mt-3 space-y-3"><div><div className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">{APP_INFO.websiteLabel}</div>{APP_INFO.websiteUrl ? <a href={APP_INFO.websiteUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block break-all text-sky-700 underline underline-offset-4">{APP_INFO.websiteUrl}</a> : <div className="mt-1 text-slate-500">{INFO_TEXT.empty}</div>}</div><div><div className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">{APP_INFO.forumLabel}</div>{APP_INFO.forumUrl ? <a href={APP_INFO.forumUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block break-all text-sky-700 underline underline-offset-4">{APP_INFO.forumUrl}</a> : <div className="mt-1 text-slate-500">{INFO_TEXT.empty}</div>}</div><div><div className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">{APP_INFO.instagramLabel}</div>{APP_INFO.instagramUrl ? <a href={APP_INFO.instagramUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block break-all text-sky-700 underline underline-offset-4">{APP_INFO.instagramUrl}</a> : <div className="mt-1 text-slate-500">{INFO_TEXT.empty}</div>}</div><div><div className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">{APP_INFO.discordLabel}</div>{APP_INFO.discordUrl ? <a href={APP_INFO.discordUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block break-all text-sky-700 underline underline-offset-4">{APP_INFO.discordUrl}</a> : <div className="mt-1 text-slate-500">{INFO_TEXT.empty}</div>}</div><div><div className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">{APP_INFO.emailLabel}</div>{APP_INFO.emailValue ? <a href={`mailto:${APP_INFO.emailValue}`} className="mt-1 inline-block break-all text-sky-700 underline underline-offset-4">{APP_INFO.emailValue}</a> : <div className="mt-1 text-slate-500">{INFO_TEXT.empty}</div>}</div></div></div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{INFO_TEXT.videos}</div><div className="mt-3 space-y-3">{APP_INFO.videos.map((video) => <div key={video.title}><div className="font-medium text-slate-900">{video.title}</div>{video.url ? <a href={video.url} target="_blank" rel="noreferrer" className="mt-1 inline-block break-all text-sky-700 underline underline-offset-4">{video.url}</a> : <div className="mt-1 text-slate-500">{INFO_TEXT.empty}</div>}</div>)}</div></div></div></div></div> : null}
      {isSettingsOpen ? <div className="fixed inset-0 z-[201] flex items-start justify-center p-4 pt-16 sm:pt-24"><button type="button" aria-label="Close settings" onClick={() => setIsSettingsOpen(false)} className="fixed inset-0 z-[200] bg-slate-900/20 backdrop-blur-[1px]" /><div className="relative z-[201] max-h-[80vh] w-full max-w-sm overflow-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_24px_60px_rgba(15,23,42,0.18)]"><div className="mb-3 flex items-center justify-between gap-3"><div className="text-base font-semibold text-slate-900">{t.style}</div><button type="button" onClick={() => setIsSettingsOpen(false)} className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50">OK</button></div><div className="grid grid-cols-2 gap-2">{STYLE_OPTIONS.map((option) => { const active = state.selectedStyle === option.key; return <button key={option.key} type="button" onClick={() => updateSetting("selectedStyle", option.key)} className={cn("rounded-2xl border px-3 py-3 text-left text-sm font-medium transition", active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100")}>{option.labels[state.language] || option.labels.en}</button>; })}</div>{state.selectedStyle === "custom" ? <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3"><div className="mb-2 text-sm font-semibold text-slate-900">{t.customColor}</div><div className="mb-3 h-3 w-full rounded-full" style={{ background: "linear-gradient(90deg, hsl(0 85% 55%), hsl(60 85% 55%), hsl(120 85% 45%), hsl(180 85% 45%), hsl(240 85% 60%), hsl(300 85% 55%), hsl(360 85% 55%))" }} /><input type="range" min={0} max={360} value={state.customHue} onChange={(e) => updateSetting("customHue", Number(e.target.value))} className="w-full cursor-pointer" style={{ accentColor: accent }} /><div className="mt-3 flex items-center justify-between"><div className="text-xs text-slate-500">{state.customHue}°</div><div className="h-7 w-7 rounded-full border border-white shadow-sm" style={{ backgroundColor: accent }} /></div></div> : null}</div></div> : null}
    </div>
  );
}
