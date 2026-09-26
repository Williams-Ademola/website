export type CourseKey = "stat" | "phys" | "hist";
export type Tag = CourseKey | "admin";

export interface Week {
  n: number;
  start: string;
  end: string;
  title: string;
  note?: string;
  brk?: boolean;
  exam?: boolean;
  tasks: [Tag, string][];
  due: [Tag, string, string][];
}

export const TAG_LABEL: Record<Tag, string> = {
  stat: "stat",
  phys: "phys",
  hist: "hist",
  admin: "todo",
};

export const COURSE_NAME: Record<CourseKey, string> = {
  stat: "statistics",
  phys: "physics",
  hist: "history",
};

export const WEEKS: Week[] = [
  {
    n: 3, start: "2026-09-21", end: "2026-09-27", title: "catch-up week",
    note: "registered two weeks late. this week is about getting level, not getting ahead. admin first.",
    tasks: [
      ["admin", "email the physics instructor about late registration, missed quizzes and workshop 1"],
      ["admin", "email the history instructor about map test 1"],
      ["admin", "clear the nights before both stats tests and the physics midterm"],
      ["admin", "install r and rstudio"],
      ["stat", "work through unit 1 and unit 2 notes"],
      ["stat", "unit 3 (simple random samples) in class, rewrite notes same day"],
      ["stat", "start the running cheat sheet with units 2 and 3"],
      ["phys", "read 1.1 to 1.2 and the math review slides"],
      ["phys", "read 2.1 to 2.4 (kinematic variables)"],
      ["phys", "do every quiz that's open or gets unlocked"],
      ["hist", "read the syllabus, instructor letter and levack introduction"],
      ["hist", "unit 1: levack ch. 1, writing history ch. 1 to 3"],
      ["hist", "unit 2: levack ch. 2, discovering ch. 1, writing history ch. 4 to 5"],
      ["hist", "pick the assignment 1 question and read its sources"],
    ],
    due: [["stat", "fri sep 25", "assignment 1 released"]],
  },
  {
    n: 4, start: "2026-09-28", end: "2026-10-04", title: "first deadline",
    note: "no classes wed sep 30.",
    tasks: [
      ["stat", "unit 4 (stratified sampling)"],
      ["stat", "finish assignment 1 by thursday night"],
      ["phys", "read 2.5 to 2.8 (kinematics equations, free fall, graphs)"],
      ["phys", "read 3.2 (vectors)"],
      ["hist", "finish unit 2 learning activities"],
      ["hist", "assignment 1: thesis and outline, then body paragraphs"],
      ["phys", "finish quizzes 1 to 4 before tuesday 11:30am (unlocked, 3 attempts each, best mark counts)"],
      ["phys", "work the workshop 1 solutions until you can solve each problem without looking"],
      ["phys", "go through the kinematics lecture slides and the onenote lecture solutions"],
      ["hist", "write map test 1 once it opens (access starts tuesday)"],
    ],
    due: [
      ["phys", "tue sep 29", "quizzes 1 to 4 due before 11:30am"],
      ["hist", "tue sep 29", "map test 1 opens (1.5%)"],
      ["stat", "fri oct 2", "assignment 1 due 11:59pm (10%)"],
    ],
  },
  {
    n: 5, start: "2026-10-05", end: "2026-10-11", title: "history essay week",
    tasks: [
      ["stat", "unit 5 (multistage, cluster, systematic sampling)"],
      ["phys", "read 3.3, 3.1 and 3.4 (components, 2d motion, projectiles)"],
      ["hist", "unit 3: levack ch. 3 to 5, discovering ch. 2 to 3"],
      ["hist", "final edit of assignment 1, check chicago footnotes"],
    ],
    due: [["phys", "tue oct 6", "quizzes due"], ["hist", "fri oct 9", "assignment 1 due (5%)"]],
  },
  {
    n: 6, start: "2026-10-12", end: "2026-10-18", title: "test prep",
    note: "thanksgiving mon oct 12. no stats class fri oct 16.",
    tasks: [
      ["stat", "units 5 and 6 in class"],
      ["stat", "finish the cheat sheet for units 2 to 4, do practice problems"],
      ["phys", "workshop 2 in class tuesday"],
      ["phys", "read 4.1 to 4.4 and 4.8 (newton's laws)"],
      ["hist", "levack ch. 6, discovering ch. 4 to 5"],
      ["hist", "start assignment 2 (library research)"],
    ],
    due: [["phys", "tue oct 13", "workshop 2 and quizzes"]],
  },
  {
    n: 7, start: "2026-10-19", end: "2026-10-25", title: "stats test 1",
    tasks: [
      ["stat", "term test 1 monday"],
      ["stat", "unit 6 (ratio estimators)"],
      ["phys", "read 4.5 to 4.7 (force applications)"],
      ["phys", "midterm prep: redo quizzes and chapter 2 to 4 problems"],
      ["hist", "levack ch. 7, keep researching assignment 2"],
    ],
    due: [["stat", "mon oct 19", "term test 1, units 2 to 4 (20%)"], ["phys", "tue oct 20", "quizzes due"]],
  },
  {
    n: 8, start: "2026-10-26", end: "2026-11-01", title: "physics midterm",
    tasks: [
      ["phys", "midterm wednesday 7pm"],
      ["phys", "read 5.1 (friction), workshop 3 thursday"],
      ["stat", "unit 7 (experimental design)"],
      ["stat", "start assignment 2 the day it's released"],
      ["hist", "unit 4: levack ch. 8 to 9, writing history ch. 6 to 7"],
      ["hist", "read the assignment 1 feedback"],
    ],
    due: [
      ["phys", "tue oct 27", "quizzes due"],
      ["phys", "wed oct 28", "midterm 7 to 9pm (25%)"],
      ["phys", "thu oct 29", "workshop 3"],
      ["stat", "fri oct 30", "assignment 2 released"],
    ],
  },
  {
    n: 9, start: "2026-11-02", end: "2026-11-08", title: "double deadline friday",
    note: "both assignment 2s are due friday night. finish stats by wednesday.",
    tasks: [
      ["stat", "unit 8 (completely randomized designs)"],
      ["stat", "submit assignment 2 by wednesday"],
      ["phys", "read 6.1 to 6.3 and 6.5 (circular motion, gravitation)"],
      ["hist", "levack ch. 10, discovering ch. 7 to 8"],
      ["hist", "final edit of assignment 2"],
    ],
    due: [
      ["phys", "tue nov 3", "quizzes due"],
      ["stat", "fri nov 6", "assignment 2 due 11:59pm (10%)"],
      ["hist", "fri nov 6", "assignment 2 due (6%)"],
    ],
  },
  {
    n: 10, start: "2026-11-09", end: "2026-11-15", title: "fall break", brk: true,
    note: "no classes. test 2 prep and getting ahead in history, then rest a little.",
    tasks: [
      ["stat", "cheat sheet for units 5 to 8, practice problems"],
      ["phys", "go over midterm mistakes, preview 10.1 to 10.2"],
      ["hist", "get ahead on unit 5: levack ch. 11, discovering ch. 9 to 10"],
      ["hist", "choose the assignment 3 question"],
    ],
    due: [],
  },
  {
    n: 11, start: "2026-11-16", end: "2026-11-22", title: "stats test 2",
    tasks: [
      ["stat", "term test 2 monday"],
      ["stat", "unit 9 (one-way anova)"],
      ["phys", "read 10.1 to 10.2 (rotational kinematics), workshop 4 thursday"],
      ["hist", "writing history ch. 8 to 9, start assignment 3"],
      ["admin", "enter every mark in grades before the vw deadline"],
    ],
    due: [
      ["stat", "mon nov 16", "term test 2, units 5 to 8 (20%)"],
      ["phys", "tue nov 17", "quizzes due"],
      ["phys", "thu nov 19", "workshop 4"],
    ],
  },
  {
    n: 12, start: "2026-11-23", end: "2026-11-29", title: "vw deadline",
    tasks: [
      ["stat", "unit 9 continued"],
      ["phys", "read 7.1 to 7.4, 7.7 and 7.9 (work and energy)"],
      ["hist", "levack ch. 12 to 13, draft assignment 3"],
    ],
    due: [["phys", "tue nov 24", "quizzes due"], ["admin", "tue nov 24", "voluntary withdrawal deadline"]],
  },
  {
    n: 13, start: "2026-11-30", end: "2026-12-06", title: "last essay of the fall",
    tasks: [
      ["stat", "unit 10 (block designs, two-way anova)"],
      ["phys", "read 8.1 and 8.3 to 8.6 (momentum, collisions)"],
      ["hist", "discovering ch. 11, final edit of assignment 3"],
    ],
    due: [["phys", "tue dec 1", "quizzes due"], ["hist", "fri dec 4", "assignment 3 due (5%)"]],
  },
  {
    n: 14, start: "2026-12-07", end: "2026-12-11", title: "last classes",
    tasks: [
      ["stat", "finish unit 10, start a fresh final cheat sheet"],
      ["phys", "workshop 5 tuesday, bring questions to thursday review"],
      ["hist", "unit 6: levack ch. 14 to 15, discovering ch. 12 to 13"],
      ["hist", "build a midterm review sheet for units 1 to 5"],
    ],
    due: [["phys", "tue dec 8", "workshop 5 and last quizzes"]],
  },
  {
    n: 15, start: "2026-12-12", end: "2026-12-23", title: "exams", exam: true,
    note: "dates come from the registrar. keep the night before each exam clear.",
    tasks: [
      ["stat", "final exam: 3 hours, all units, one handwritten cheat sheet (40%)"],
      ["phys", "final exam: cumulative, formula sheet provided (40%)"],
      ["hist", "midterm exam: 2 hours, units 1 to 5, short answers plus essays (20%)"],
    ],
    due: [],
  },
];

export const WINTER: [string, string][] = [
  ["jan 22", "map test 2 (1.5%)"],
  ["feb 5", "assignment 4, research paper (10%)"],
  ["feb 26", "assignment 5, library research (6%)"],
  ["apr 2", "assignment 6, research paper (10%)"],
  ["apr 13 to 25", "final exam, units 6 to 10, must pass to pass the course (35%)"],
];

export const NEXT: [CourseKey, string, string, boolean][] = [
  ["phys", "2026-09-29T11:30", "physics quizzes 1 to 4", false],
  ["stat", "2026-10-02T23:59", "stats assignment 1", false],
  ["hist", "2026-10-09T23:59", "history assignment 1", false],
  ["phys", "2026-10-13T11:30", "physics workshop 2", false],
  ["stat", "2026-10-19T10:30", "stats term test 1", true],
  ["phys", "2026-10-28T19:00", "physics midterm", true],
  ["phys", "2026-10-29T11:30", "physics workshop 3", false],
  ["stat", "2026-11-06T23:59", "stats assignment 2", false],
  ["hist", "2026-11-06T23:59", "history assignment 2", false],
  ["stat", "2026-11-16T10:30", "stats term test 2", true],
  ["phys", "2026-11-19T11:30", "physics workshop 4", false],
  ["hist", "2026-12-04T23:59", "history assignment 3", false],
  ["phys", "2026-12-08T11:30", "physics workshop 5", false],
];

export interface Course {
  items: [string, string, number][];
  note: string;
}

export const COURSES: Record<CourseKey, Course> = {
  stat: {
    items: [
      ["a1", "assignment 1", 10],
      ["a2", "assignment 2", 10],
      ["t1", "term test 1", 20],
      ["t2", "term test 2", 20],
      ["fin", "final exam", 40],
    ],
    note: "fixed cutoffs: a+ 90, a 80, b+ 75, b 70, c+ 65, c 60, d 50.",
  },
  phys: {
    items: [
      ["qz", "homework quizzes (avg)", 15],
      ["ws", "workshops (avg)", 20],
      ["mid", "midterm", 25],
      ["fin", "final exam", 40],
    ],
    note: "workshop 1 is excused and its weight is spread over the other four, so each remaining workshop is 5%. curved around the class mean, but cutoffs never go above a 80, b+ 75, b 70. these targets are the worst case.",
  },
  hist: {
    items: [
      ["m1", "map test 1", 1.5],
      ["h1", "assignment 1", 5],
      ["h2", "assignment 2", 6],
      ["h3", "assignment 3", 5],
      ["mid", "midterm exam", 20],
      ["m2", "map test 2", 1.5],
      ["h4", "assignment 4", 10],
      ["h5", "assignment 5", 6],
      ["h6", "assignment 6", 10],
      ["fin", "final exam", 35],
    ],
    note: "full year. must pass the final and submit every essay to pass. grade lands in april.",
  },
};

export const TARGETS: [string, number][] = [
  ["a", 80],
  ["b+", 75],
  ["b", 70],
  ["c+", 65],
  ["c", 60],
];

export const POINTS: [number, string, number][] = [
  [90, "a+", 4.5], [80, "a", 4], [75, "b+", 3.5], [70, "b", 3],
  [65, "c+", 2.5], [60, "c", 2], [50, "d", 1], [0, "f", 0],
];

export interface Resource {
  name: string;
  url?: string;
  time: string;
  why: string;
}

export const NOTES: Record<CourseKey, string> = {
  stat: "take notes by hand, since the test cheat sheet has to be handwritten. after each unit, squeeze it onto a quarter of the cheat sheet: formulas, when to use each sampling scheme, one worked example. redo lecture examples in rstudio the same week.",
  phys: "a formula sheet is provided, so notes should be solved problems, not formulas. one page per topic: the diagram, what's given, which equation, and the trap. 3 to 5 end-of-section openstax problems per reading. keep every workshop solution for exam review. lecture slides sit under content, grouped by the five course topics, and worked lecture solutions are in the course onenote. read the assigned sections from the syllabus reading guide before each class.",
  hist: "read with sq3r. five lines per chapter: when, who, what changed, why it mattered, one piece of evidence. record full citation details the moment you take a note so chicago footnotes take minutes. keep every draft and research note.",
};

export const RESOURCES: Record<CourseKey, Resource[]> = {
  stat: [
    { name: "penn state stat 506, sampling theory", url: "https://online.stat.psu.edu/stat506/", time: "~30-45 min / lesson", why: "lines up with units 3 to 6: srs, stratified, cluster, ratio estimation" },
    { name: "penn state stat 503, design of experiments", url: "https://online.stat.psu.edu/stat503/", time: "~45 min / lesson", why: "units 7 to 10: randomization, blocking, anova" },
    { name: "r for data science (2e), ch. 1 to 3", url: "https://r4ds.hadley.nz/", time: "~2 hrs total", why: "enough r to be comfortable in rstudio" },
    { name: "seeing theory", url: "https://seeing-theory.brown.edu/", time: "~20 min / chapter", why: "interactive sampling distributions if unit 1 feels shaky" },
  ],
  phys: [
    { name: "openstax college physics 2e", url: "https://openstax.org/details/books/college-physics-2e", time: "~30-40 min / section", why: "the required text, free" },
    { name: "the physics classroom", url: "https://www.physicsclassroom.com/", time: "~15-20 min / lesson", why: "clear write-ups on vectors, projectiles, newton's laws, momentum" },
    { name: "khan academy physics", url: "https://www.khanacademy.org/science/physics", time: "~5-12 min / video", why: "1d motion, 2d motion and forces units to catch up" },
    { name: "crash course physics, ep. 1 to 10", time: "~10 min / episode", why: "quick conceptual refreshers before a reading" },
  ],
  hist: [
    { name: "crash course world history, early episodes", time: "~11 min / episode", why: "fast context for units 1 to 4" },
    { name: "purdue owl, chicago notes and bibliography", url: "https://owl.purdue.edu/", time: "~25 min", why: "footnote and bibliography formats the essays are marked on" },
    { name: "u of m academic learning centre writing tutoring", time: "30-60 min / session", why: "book one for each fall essay" },
  ],
};
